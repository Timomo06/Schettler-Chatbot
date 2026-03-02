import { NextRequest, NextResponse } from "next/server";

const hostTenantMap: Record<string, string> = {
  "zahnputzpulver.de": "zahnputzpulver",
  "www.zahnputzpulzver.de": "zahnputzpulver",
  "btdesigns.de": "btdesigns",
  "www.btdesigns.de": "btdesigns",
  "localhost:3000": "demo",
};

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();
  const tenant = hostTenantMap[host] ?? "demo";

  const url = req.nextUrl.clone();

  // nur setzen, wenn noch nicht vorhanden (sonst unnötige rewrites)
  if (!url.searchParams.get("tenant")) {
    url.searchParams.set("tenant", tenant);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/widget/:path*"],
};
