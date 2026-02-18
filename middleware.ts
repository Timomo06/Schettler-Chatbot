import { NextRequest, NextResponse } from "next/server";

const hostTenantMap: Record<string, string> = {
  "zahnputzpulver.de": "zahnputzpulver",
  "www.zahnputzpulver.de": "zahnputzpulver",
  "btdesigns.de": "btdesigns",
  "www.btdesigns.de": "btdesigns",
  "localhost:3000": "demo",
};

function mapHostToTenant(hostname: string | null): string {
  if (!hostname) return "demo";
  return hostTenantMap[hostname.toLowerCase()] ?? "demo";
}

export function middleware(req: NextRequest) {
  const tenant = mapHostToTenant(req.headers.get("host"));
  const url = req.nextUrl.clone();

  url.searchParams.set("tenant", tenant);

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/widget/:path*"],
};
