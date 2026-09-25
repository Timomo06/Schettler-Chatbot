import { test } from "node:test";
import assert from "node:assert/strict";
import { parseActiveInventoryCache, testMobileDeConnection, withMobileDeadline } from "./mobile-client";

test("active inventory cache is fresh, complete and duplicate-free", () => {
  const now = new Date("2026-09-25T12:30:00.000Z");
  assert.deepEqual(
    [...parseActiveInventoryCache({
      updatedAt: "2026-09-25T14:00:00+02:00",
      vehicles: [{ id: "459051092" }, { id: "40617028693408" }],
    }, now, 180)],
    ["459051092", "40617028693408"],
  );
  assert.throws(() => parseActiveInventoryCache({
    updatedAt: "2026-09-25T08:00:00.000Z",
    vehicles: [{ id: "459051092" }],
  }, now, 180), { message: "STALE_ACTIVE_INVENTORY" });
  assert.throws(() => parseActiveInventoryCache({
    updatedAt: now.toISOString(),
    vehicles: [{ id: "459051092" }, { id: "459051092" }],
  }, now, 180), { message: "INVALID_ACTIVE_INVENTORY" });
});

test("GET-only seller discovery, normalized samples and safe failures", async () => {
  const originalFetch = globalThis.fetch;
  const keys = ["MOBILE_DE_USERNAME", "MOBILE_DE_PASSWORD", "MOBILE_DE_BASE_URL", "MOBILE_DE_SELLER_ID", "MOBILE_DE_DEALER_SLUG"] as const;
  const previous = keys.map(key => process.env[key]);
  process.env.MOBILE_DE_USERNAME = "test-user";
  process.env.MOBILE_DE_PASSWORD = "test-secret";
  process.env.MOBILE_DE_BASE_URL = "https://services.mobile.de";
  process.env.MOBILE_DE_DEALER_SLUG = "PROFCAR";
  delete process.env.MOBILE_DE_SELLER_ID;
  const paths: string[] = [];
  let failure: "none" | "http" | "network" | "ambiguous" | "json" = "none";
  let httpStatus = 401;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname;
    paths.push(`${url.hostname}${path}${url.search}`);
    assert.equal(init?.method, "GET"); assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal);
    if (failure === "http") return new Response("private upstream response", { status: httpStatus });
    if (failure === "json") return new Response("not JSON");
    if (failure === "network") throw new Error("private network error");
    if (url.hostname === "home.mobile.de") {
      const category = url.searchParams.get("vc");
      const content = category === "Car"
        ? ["1", "2", "3"].map((id, index) => `listingId\\\":${id.padStart(7, "0")},\\\"testId\\\":\\\"listing-${index + 1}\\\"`).join(" ")
        : category === "VanUpTo7500"
          ? "listingId\\\":0999999,\\\"testId\\\":\\\"recommended-listing\\\" listingId\\\":0000004,\\\"testId\\\":\\\"listing-1\\\""
          : '<input value="Car"/><div><div>(<!-- -->3<!-- -->)</div><input value="VanUpTo7500"/><div><div>(<!-- -->1<!-- -->)</div>';
      return new Response(content, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (path === "/seller-api/sellers") return Response.json({ sellers: failure === "ambiguous"
      ? [{ mobileSellerId: "2", companyName: "Dealer A" }, { mobileSellerId: "3", companyName: "Dealer B" }]
      : [{ mobileSellerId: "2", companyName: "ProfCar" }] });
    assert.equal(path, "/seller-api/sellers/2/ads");
    return Response.json({ ads: [1, 2, 3, 4, 99].map(id => ({
      mobileAdId: String(id).padStart(7, "0"), mobileSellerId: "2", make: "BMW", model: "520d", power: 140,
      description: "private description", internalNumber: "private internal number", vin: "private VIN",
      images: [{ ref: "https://example.com/car.jpg" }],
    })) });
  };
  try {
    const result = await testMobileDeConnection();
    assert.ok(paths.includes("services.mobile.de/seller-api/sellers"));
    assert.ok(paths.includes("services.mobile.de/seller-api/sellers/2/ads"));
    assert.ok(paths.includes("home.mobile.de/PROFCAR?vc=Car"));
    assert.ok(paths.includes("home.mobile.de/PROFCAR?vc=VanUpTo7500"));
    assert.equal(result.adCount, 4); assert.equal(result.sampleVehicles.length, 3);
    assert.equal(result.sampleVehicles[0].powerPs, 190);
    assert.deepEqual(result.sampleVehicles[0].images, ["https://example.com/car.jpg"]);
    assert.equal(result.interfaceAccess.sellerApi, "read");
    assert.equal(result.interfaceAccess.publicDealerInventory, "read");
    assert.equal(result.interfaceAccess.searchApi, "unauthorized");
    assert.ok(!JSON.stringify(result).includes("private")); assert.ok(!JSON.stringify(result).includes("test-secret"));
    failure = "http";
    await assert.rejects(testMobileDeConnection, { message: "UPSTREAM_UNAUTHORIZED", upstreamStatus: 401 });
    for (const [status, message] of [[403, "UPSTREAM_FORBIDDEN"], [404, "UPSTREAM_NOT_FOUND"]] as const) {
      httpStatus = status;
      await assert.rejects(testMobileDeConnection, { message, upstreamStatus: status });
    }
    failure = "json";
    await assert.rejects(testMobileDeConnection, { message: "INVALID_JSON_RESPONSE" });
    failure = "network";
    await assert.rejects(testMobileDeConnection, { message: "CONNECTION_FAILED" });
    failure = "ambiguous";
    await assert.rejects(testMobileDeConnection, { message: "AMBIGUOUS_SELLER" });
    const calls = paths.length;
    process.env.MOBILE_DE_BASE_URL = "https://example.com";
    await assert.rejects(testMobileDeConnection, { message: "INVALID_BASE_URL" });
    assert.equal(paths.length, calls);
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; });
  }
});


test("deadline aborts transport even when it never settles", async () => {
  let signal: AbortSignal | undefined;
  await assert.rejects(withMobileDeadline(s => {
    signal = s;
    return new Promise(() => {});
  }, 20), { message: "TIMEOUT" });
  assert.equal(signal?.aborted, true);
});

test("shared deadline interrupts the second request and its body", async () => {
  let bodySignal: AbortSignal | undefined;
  await assert.rejects(withMobileDeadline(async parent => {
    await withMobileDeadline(async () => "first response", 12_000, parent);
    return withMobileDeadline(signal => {
      bodySignal = signal;
      return new Promise(() => {});
    }, 12_000, parent);
  }, 30), { message: "TIMEOUT" });
  assert.equal(bodySignal?.aborted, true);
});
