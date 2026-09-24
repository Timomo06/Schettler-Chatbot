import type { ProfCarVehicle } from "./model";

/** New JSON Search/Seller API. Raw data is stored separately, unchanged. */
export type MobileRawAd = Readonly<Record<string, unknown>>;
const text = (v: unknown): string | null => typeof v === "string" && v.trim() ? v.trim() : null;
function number(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v !== "number" && !(typeof v === "string" && /^\d+(\.\d+)?$/.test(v))) throw new Error("Invalid mobile.de number");
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid mobile.de number");
  return n;
}
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid mobile.de object");
  return v as Record<string, unknown>;
}
function url(v: unknown): string | null {
  try { const u = new URL(String(v)); return u.protocol === "https:" && !u.username && !u.password ? u.href : null; } catch { return null; }
}
const EQUIPMENT = ["abs", "esp", "navigationSystem", "centralLocking", "electricWindows", "alloyWheels", "sunroof", "panoramicGlassRoof", "heatedSeats", "memorySeats", "heatPump", "startStopSystem"];
export function mapMobileAdToProfCarVehicle(input: unknown): ProfCarVehicle {
  const ad = object(input);
  const mobileAdId = text(ad.mobileAdId), mobileSellerId = text(ad.mobileSellerId);
  if (!mobileAdId || !mobileSellerId || !/^\d+$/.test(mobileAdId) || !/^\d+$/.test(mobileSellerId)) throw new Error("Missing/invalid mobile.de identity");
  const make = text(ad.make), model = text(ad.model), modelDescription = text(ad.modelDescription);
  const registration = text(ad.firstRegistration);
  if (registration && !/^\d{4}(0[1-9]|1[0-2])$/.test(registration)) throw new Error("Invalid firstRegistration");
  const modificationDate = text(ad.modificationDate);
  if (modificationDate && !Number.isFinite(Date.parse(modificationDate))) throw new Error("Invalid modificationDate");
  const price = ad.price == null ? {} : object(ad.price);
  const powerKw = number(ad.power);
  if (ad.images != null && !Array.isArray(ad.images)) throw new Error("Invalid images");
  return {
    id: `mobile:${mobileSellerId}:${mobileAdId}`, source: "mobile.de", mobileAdId, mobileSellerId,
    internalNumber: text(ad.internalNumber), make, model, modelDescription,
    title: [make, modelDescription || model].filter(Boolean).join(" ") || `Fahrzeug ${mobileAdId}`,
    price: price.type === "ON_REQUEST" ? null : number(price.consumerPriceGross), currency: text(price.currency),
    mileage: number(ad.mileage), firstRegistration: registration ? `${registration.slice(0, 4)}-${registration.slice(4)}` : null,
    powerKw, powerPs: powerKw === null ? null : Math.round(powerKw * 1.359621617),
    fuel: text(ad.fuel), gearbox: text(ad.gearbox), category: text(ad.category), exteriorColor: text(ad.exteriorColor),
    equipment: EQUIPMENT.filter(key => ad[key] === true),
    description: text(ad.plainTextDescription) || text(ad.description),
    images: ((ad.images || []) as unknown[]).map(image => {
      const img = object(image);
      return url(img.xxxl) || url(img.xxl) || url(img.xl) || url(img.l) || url(img.m) || url(img.ref);
    }).filter((u): u is string => u !== null),
    mobileUrl: url(ad.detailPageUrl), modificationDate, availabilityStatus: "listed", lastSuccessfulSync: null, extras: {},
  };
}
