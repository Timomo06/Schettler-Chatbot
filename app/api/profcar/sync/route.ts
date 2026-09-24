import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { fetchProfCarMobileInventory, MobileDeError, withMobileDeadline } from "@/lib/profcar/mobile-client";
import { syncProfCarInventory } from "@/lib/profcar/inventory";
import { SupabaseProfCarInventoryRepository } from "@/lib/profcar/supabase-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function authorized(request: NextRequest) {
  const expected = (process.env.PROFCAR_SYNC_SECRET || process.env.CRON_SECRET || "").trim();
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (!expected || !provided) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function run(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401, headers: responseHeaders });
  }
  const sellerId = process.env.MOBILE_DE_SELLER_ID?.trim() || "";
  if (!/^\d+$/.test(sellerId)) {
    return NextResponse.json({ ok: false, error: "SELLER_ID_NOT_CONFIGURED" }, { status: 503, headers: responseHeaders });
  }
  try {
    const runResult = await syncProfCarInventory({
      sellerId,
      // Keeping the provider read inside syncProfCarInventory ensures a failed
      // connection is persisted immediately and the public view becomes stale.
      fetchSnapshot: () => withMobileDeadline(
        signal => fetchProfCarMobileInventory(signal),
        28_000,
        request.signal,
      ),
      repository: new SupabaseProfCarInventoryRepository(),
    });
    if (runResult.status !== "succeeded") {
      return NextResponse.json({ ok: false, error: "SYNC_FAILED" }, { status: 502, headers: responseHeaders });
    }
    return NextResponse.json({
      ok: true,
      sellerId,
      vehicleCount: runResult.vehicleCount,
      completedAt: runResult.completedAt,
    }, { headers: responseHeaders });
  } catch (error) {
    const code = error instanceof MobileDeError ? error.code : "SYNC_FAILED";
    return NextResponse.json(
      { ok: false, error: code },
      { status: code === "TIMEOUT" ? 504 : 502, headers: responseHeaders },
    );
  }
}

export const POST = run;
export const GET = run;
