import { NextResponse } from "next/server";
import { getProfCarInventoryPayload } from "@/lib/profcar/public-inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getProfCarInventoryPayload();
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
