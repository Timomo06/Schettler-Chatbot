import { NextRequest, NextResponse } from "next/server";
import { MobileDeError, testMobileDeConnection, withMobileDeadline } from "@/lib/profcar/mobile-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: NextRequest) {
  // Fail closed in production, including deployments with a forged localhost Host.
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404, headers });
  const localHosts = ["localhost", "127.0.0.1", "[::1]"];
  const host = request.headers.get("host") ?? "";
  if (!localHosts.includes(request.nextUrl.hostname) || !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) {
    return new NextResponse(null, { status: 404, headers });
  }
  // Block cross-site browser requests; no CORS permissions are emitted.
  const origin = request.headers.get("origin");
  if ((origin && origin !== `${request.nextUrl.protocol}//${host}`) || request.headers.get("sec-fetch-site") === "cross-site") {
    return new NextResponse(null, { status: 403, headers });
  }
  try {
    return NextResponse.json({ ok: true, ...await withMobileDeadline(testMobileDeConnection, 14_000, request.signal) }, { headers });
  } catch (error) {
    // Never serialize/log errors, raw responses, credentials or request headers.
    return NextResponse.json({
      ok: false, error: error instanceof MobileDeError ? error.code : "MOBILE_TEST_FAILED",
      ...(error instanceof MobileDeError && error.upstreamStatus ? { upstreamStatus: error.upstreamStatus } : {}),
    }, { status: error instanceof MobileDeError && error.code === "TIMEOUT" ? 504 : 502, headers });
  }
}
