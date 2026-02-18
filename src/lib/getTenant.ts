import { TENANTS, TenantId } from "./tenants";

export function getTenantFromPath(pathname: string): TenantId {
  const segments = pathname.split("/").filter(Boolean);
  const candidate = segments[0] as TenantId | undefined;

  if (candidate && TENANTS[candidate]) {
    return candidate;
  }

  return "demo";
}
