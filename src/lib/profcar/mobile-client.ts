import "server-only";
import { mapMobileAdToProfCarVehicle } from "./mobile-mapper";
import type { ProfCarVehicle } from "./model";

export class MobileDeError extends Error {
  constructor(public readonly code: string, public readonly upstreamStatus?: number) {
    super(code);
    this.name = "MobileDeError";
  }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new MobileDeError("INVALID_API_RESPONSE");
  return value as Record<string, unknown>;
}
function collection(value: unknown, key: string): Record<string, unknown>[] {
  const body = object(value);
  if (
    (body.errors && (!Array.isArray(body.errors) || body.errors.length)) ||
    (body.warnings && (!Array.isArray(body.warnings) || body.warnings.length)) ||
    !Array.isArray(body[key])
  ) throw new MobileDeError("INVALID_API_RESPONSE");
  return body[key].map(object);
}
const clean = (value: string | null) => value?.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 200) ?? null;
/** Explicit allowlist: no descriptions, contacts, private references, raw payloads or extras. */
function sample(vehicle: ProfCarVehicle) {
  return {
    id: vehicle.id, mobileAdId: vehicle.mobileAdId, make: clean(vehicle.make), model: clean(vehicle.model),
    title: clean(vehicle.title), price: vehicle.price, currency: clean(vehicle.currency), mileage: vehicle.mileage,
    firstRegistration: vehicle.firstRegistration, powerKw: vehicle.powerKw, powerPs: vehicle.powerPs,
    fuel: clean(vehicle.fuel), gearbox: clean(vehicle.gearbox), category: clean(vehicle.category),
    images: vehicle.images.slice(0, 3), mobileUrl: vehicle.mobileUrl,
  };
}
/** Deadline includes headers AND response body; race also bounds stalled transports. */
export async function withMobileDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parentSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: () => void = () => {};
  const deadline = new Promise<never>((_, reject) => {
    abort = () => {
      controller.abort();
      reject(new MobileDeError("TIMEOUT"));
    };
    timer = setTimeout(abort, timeoutMs);
    parentSignal?.addEventListener("abort", abort, { once: true });
    if (parentSignal?.aborted) abort();
  });
  try {
    return await Promise.race([
      deadline,
      Promise.resolve().then(() => {
        if (controller.signal.aborted) throw new MobileDeError("TIMEOUT");
        return operation(controller.signal);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", abort);
  }
}

/** Read-only diagnostic; deliberately does not commit a sync or promote live inventory. */
function mobileConfiguration() {
  const username = process.env.MOBILE_DE_USERNAME;
  const password = process.env.MOBILE_DE_PASSWORD;
  const configuredUrl = process.env.MOBILE_DE_BASE_URL;
  if (!username || !password || !configuredUrl) throw new MobileDeError("MISSING_CONFIGURATION");
  if (configuredUrl !== "https://services.mobile.de") throw new MobileDeError("INVALID_BASE_URL");
  return { username, password, configuredUrl };
}

function dealerHomepageUrl() {
  const slug = (process.env.MOBILE_DE_DEALER_SLUG || "PROFCAR").trim();
  if (!/^[A-Z0-9_-]{2,80}$/i.test(slug)) throw new MobileDeError("INVALID_DEALER_SLUG");
  return new URL(`https://home.mobile.de/${slug}`);
}

function activeInventoryCacheUrl() {
  const raw = process.env.PROFCAR_ACTIVE_INVENTORY_URL?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new MobileDeError("INVALID_ACTIVE_INVENTORY_URL");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "profcar.com" ||
    url.pathname !== "/vehicles-cache.json" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new MobileDeError("INVALID_ACTIVE_INVENTORY_URL");
  }
  return url;
}

function activeInventoryMaxAgeMinutes() {
  const raw = process.env.PROFCAR_ACTIVE_INVENTORY_MAX_AGE_MINUTES?.trim() || "180";
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 15 || value > 1_440) {
    throw new MobileDeError("INVALID_ACTIVE_INVENTORY_MAX_AGE");
  }
  return value;
}

export function parseActiveInventoryCache(
  value: unknown,
  now = new Date(),
  maxAgeMinutes = 180,
) {
  const body = object(value);
  if (typeof body.updatedAt !== "string" || !Array.isArray(body.vehicles) || !body.vehicles.length) {
    throw new MobileDeError("INVALID_ACTIVE_INVENTORY");
  }
  const updatedAt = new Date(body.updatedAt);
  const ageMs = now.getTime() - updatedAt.getTime();
  if (!Number.isFinite(updatedAt.getTime()) || ageMs < -10 * 60_000 || ageMs > maxAgeMinutes * 60_000) {
    throw new MobileDeError("STALE_ACTIVE_INVENTORY");
  }
  const ids = new Set<string>();
  for (const entry of body.vehicles) {
    const vehicle = object(entry);
    if (typeof vehicle.id !== "string" || !/^\d{7,14}$/.test(vehicle.id) || ids.has(vehicle.id)) {
      throw new MobileDeError("INVALID_ACTIVE_INVENTORY");
    }
    ids.add(vehicle.id);
  }
  return ids;
}

async function fetchCachedActiveAdIds(url: URL, signal?: AbortSignal) {
  console.info("ProfCar active inventory cache request", { start: true });
  try {
    return await withMobileDeadline(async requestSignal => {
      let response: Response;
      try {
        response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          redirect: "error",
          signal: requestSignal,
        });
      } catch {
        throw new MobileDeError(requestSignal.aborted ? "TIMEOUT" : "CONNECTION_FAILED");
      }
      if (!response.ok) throw new MobileDeError("ACTIVE_INVENTORY_HTTP_ERROR", response.status);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        throw new MobileDeError("INVALID_ACTIVE_INVENTORY");
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new MobileDeError(requestSignal.aborted ? "TIMEOUT" : "INVALID_ACTIVE_INVENTORY");
      }
      return parseActiveInventoryCache(body, new Date(), activeInventoryMaxAgeMinutes());
    }, 12_000, signal);
  } finally {
    console.info("ProfCar active inventory cache request", { complete: true });
  }
}

function publicCategoryCounts(html: string) {
  const categories = new Map<string, number>();
  const pattern = /<input[^>]+value="([A-Za-z][A-Za-z0-9]*)"[^>]*\/><div[\s\S]{0,3000}?<div>\(<!-- -->(\d+)<!-- -->\)<\/div>/g;
  for (const match of html.matchAll(pattern)) {
    const count = Number(match[2]);
    if (!Number.isSafeInteger(count) || count < 0 || categories.has(match[1])) {
      throw new MobileDeError("INVALID_PUBLIC_INVENTORY");
    }
    categories.set(match[1], count);
  }
  if (!categories.size) throw new MobileDeError("INVALID_PUBLIC_INVENTORY");
  return [...categories].map(([category, count]) => ({ category, count }));
}

function publicListingIds(html: string) {
  return new Set(
    // Exclude mobile.de's cross-category "recommended-listing" card. Only
    // numbered listing cards belong to the selected dealer category.
    [...html.matchAll(/listingId[^0-9]{1,32}(\d{7,14})(?:(?!listingId)[\s\S]){0,240}?testId[^A-Za-z0-9]{1,32}listing-\d+/g)]
      .map(match => match[1]),
  );
}

async function publicDealerGet(url: URL, signal?: AbortSignal) {
  console.info("mobile.de public inventory request", { category: url.searchParams.get("vc") || "categories", start: true });
  try {
    return await withMobileDeadline(async requestSignal => {
      let response: Response;
      try {
        response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "text/html",
            "User-Agent": "Mozilla/5.0 (compatible; ProfCarInventorySync/1.0)",
          },
          cache: "no-store",
          redirect: "error",
          signal: requestSignal,
        });
      } catch {
        throw new MobileDeError(requestSignal.aborted ? "TIMEOUT" : "CONNECTION_FAILED");
      }
      if (!response.ok) throw new MobileDeError("PUBLIC_INVENTORY_HTTP_ERROR", response.status);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("text/html")) throw new MobileDeError("INVALID_PUBLIC_INVENTORY");
      return response.text();
    }, 12_000, signal);
  } finally {
    console.info("mobile.de public inventory request", { category: url.searchParams.get("vc") || "categories", complete: true });
  }
}

/**
 * Seller API accounts can retain old, unpublished ads without exposing an active flag.
 * The public dealer page is therefore the fail-closed source of truth for which IDs
 * are currently visible; full vehicle data still comes from the authenticated API.
 */
async function fetchPublicActiveAdIds(signal?: AbortSignal) {
  const baseUrl = dealerHomepageUrl();
  const categories = publicCategoryCounts(await publicDealerGet(baseUrl, signal))
    .filter(entry => entry.count > 0);
  if (!categories.length) return new Set<string>();
  const pages = await Promise.all(categories.map(async entry => {
    const url = new URL(baseUrl);
    url.searchParams.set("vc", entry.category);
    const ids = publicListingIds(await publicDealerGet(url, signal));
    if (ids.size !== entry.count) throw new MobileDeError("INCOMPLETE_PUBLIC_INVENTORY");
    return ids;
  }));
  const ids = new Set(pages.flatMap(page => [...page]));
  const expected = categories.reduce((sum, entry) => sum + entry.count, 0);
  if (ids.size !== expected) throw new MobileDeError("INCOMPLETE_PUBLIC_INVENTORY");
  return ids;
}

async function fetchActiveAdIds(signal?: AbortSignal) {
  const cacheUrl = activeInventoryCacheUrl();
  return cacheUrl
    ? fetchCachedActiveAdIds(cacheUrl, signal)
    : fetchPublicActiveAdIds(signal);
}

async function mobileGet(path: string, signal?: AbortSignal): Promise<unknown> {
  const { username, password, configuredUrl } = mobileConfiguration();
  const started = Date.now();
  let status: number | null = null;
  console.info("mobile.de request", { path, start: true });
  try {
    return await withMobileDeadline(async requestSignal => {
      let response: Response;
      try {
        response = await fetch(new URL(path, configuredUrl), {
          method: "GET",
          headers: {
            Accept: "application/vnd.de.mobile.api+json",
            Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
          },
          cache: "no-store",
          redirect: "error",
          signal: requestSignal,
        });
      } catch {
        throw new MobileDeError(requestSignal.aborted ? "TIMEOUT" : "CONNECTION_FAILED");
      }
      status = response.status;
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        const codes: Record<number, string> = {
          401: "UPSTREAM_UNAUTHORIZED",
          403: "UPSTREAM_FORBIDDEN",
          404: "UPSTREAM_NOT_FOUND",
        };
        throw new MobileDeError(codes[status] ?? "UPSTREAM_HTTP_ERROR", status);
      }
      try {
        return await response.json();
      } catch {
        throw new MobileDeError(requestSignal.aborted ? "TIMEOUT" : "INVALID_JSON_RESPONSE");
      }
    }, 12_000, signal);
  } finally {
    console.info("mobile.de request", { path, status, durationMs: Date.now() - started });
  }
}

export async function discoverProfCarSeller(signal?: AbortSignal) {
  const sellers = collection(await mobileGet("/seller-api/sellers", signal), "sellers");
  const configuredSellerId = process.env.MOBILE_DE_SELLER_ID?.trim();
  const matches = configuredSellerId
    ? sellers.filter(s => s.mobileSellerId === configuredSellerId)
    : sellers.filter(s => typeof s.companyName === "string" && /prof\s*car/i.test(s.companyName));
  const seller = sellers.length === 1 ? sellers[0] : matches.length === 1 ? matches[0] : null;
  if (!seller) throw new MobileDeError(sellers.length ? "AMBIGUOUS_SELLER" : "NO_SELLER");
  const sellerId = seller.mobileSellerId;
  if (typeof sellerId !== "string" || !/^\d+$/.test(sellerId)) throw new MobileDeError("INVALID_API_RESPONSE");
  return {
    sellerId,
    dealerName: clean(typeof seller.companyName === "string" ? seller.companyName : null),
  };
}

/** The Seller API documents this endpoint as "List all seller ads" (no page cursor). */
export async function fetchProfCarMobileInventory(signal?: AbortSignal) {
  const seller = await discoverProfCarSeller(signal);
  const [sellerAds, activeIds] = await Promise.all([
    mobileGet(`/seller-api/sellers/${seller.sellerId}/ads`, signal).then(value => collection(value, "ads")),
    fetchActiveAdIds(signal),
  ]);
  const ads = sellerAds.filter(ad => typeof ad.mobileAdId === "string" && activeIds.has(ad.mobileAdId));
  try {
    const ids = new Set<string>();
    for (const ad of ads) {
      if (ad.mobileSellerId !== seller.sellerId || typeof ad.mobileAdId !== "string") {
        throw new Error("Seller mismatch");
      }
      if (ids.has(ad.mobileAdId)) throw new Error("Duplicate ad");
      ids.add(ad.mobileAdId);
      mapMobileAdToProfCarVehicle(ad);
    }
    if (ids.size !== activeIds.size) throw new Error("Public listing missing in Seller API");
  } catch {
    throw new MobileDeError("INVALID_VEHICLE_DATA");
  }
  return {
    sellerId: seller.sellerId,
    dealerName: seller.dealerName,
    ads,
    expectedTotal: ads.length,
    complete: true as const,
    errors: [] as string[],
  };
}

/** Read-only diagnostic; deliberately does not commit a sync or promote live inventory. */
export async function testMobileDeConnection(signal?: AbortSignal) {
  const inventory = await fetchProfCarMobileInventory(signal);
  let vehicles: ProfCarVehicle[];
  try {
    vehicles = inventory.ads.slice(0, 3).map(mapMobileAdToProfCarVehicle);
    if (new Set(vehicles.map(v => v.id)).size !== vehicles.length) throw new Error("Duplicate ad");
  } catch { throw new MobileDeError("INVALID_VEHICLE_DATA"); }
  return {
    dealerName: inventory.dealerName,
    mobileSellerId: inventory.sellerId,
    adCount: inventory.ads.length,
    interfaceAccess: {
      sellerApi: "read" as const,
      publicDealerInventory: "read" as const,
      searchApi: "unauthorized" as const,
    },
    sampleVehicles: vehicles.slice(0, 3).map(sample),
  };
}
