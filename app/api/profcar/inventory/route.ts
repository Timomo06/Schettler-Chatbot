import { NextResponse } from "next/server";
import { getProfCarInventoryPayload } from "@/lib/profcar/public-inventory";
import { fetchProfCarMobileInventory, withMobileDeadline } from "@/lib/profcar/mobile-client";
import { syncProfCarInventory } from "@/lib/profcar/inventory";
import { SupabaseProfCarInventoryRepository } from "@/lib/profcar/supabase-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTO_REFRESH_COOLDOWN_MS = 5 * 60_000;
let refreshInFlight: Promise<void> | null = null;

function shouldRefresh(payload: Awaited<ReturnType<typeof getProfCarInventoryPayload>>) {
  if (payload.mode !== "stale") return false;
  const lastAttempt = Date.parse(payload.lastSyncAttempt || "");
  return !Number.isFinite(lastAttempt) || Date.now() - lastAttempt >= AUTO_REFRESH_COOLDOWN_MS;
}

async function refreshStaleInventory() {
  if (refreshInFlight) return refreshInFlight;
  const sellerId = process.env.MOBILE_DE_SELLER_ID?.trim() || "";
  if (!/^\d+$/.test(sellerId)) return;

  refreshInFlight = (async () => {
    await syncProfCarInventory({
      sellerId,
      fetchSnapshot: () => withMobileDeadline(
        signal => fetchProfCarMobileInventory(signal),
        28_000,
      ),
      repository: new SupabaseProfCarInventoryRepository(),
    });
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function GET() {
  let payload = await getProfCarInventoryPayload();
  if (shouldRefresh(payload)) {
    await refreshStaleInventory();
    payload = await getProfCarInventoryPayload();
  }
  return NextResponse.json(
    { ok: true, ...payload },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
