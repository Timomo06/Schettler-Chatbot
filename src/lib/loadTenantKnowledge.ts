import { promises as fs } from "node:fs";
import path from "node:path";

import { getTenant, type TenantId } from "@/lib/tenants";

function isMissingFileError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export async function loadTenantKnowledge(
  requestedTenantId: TenantId | string,
): Promise<string> {
  const tenant = getTenant(requestedTenantId);
  const tenantDirectory = path.resolve(
    process.cwd(),
    "src",
    "tenants",
    tenant.id,
  );
  const safeTenantRoot = `${tenantDirectory}${path.sep}`;

  const knowledgeParts = await Promise.all(
    tenant.knowledge.files.map(async (fileName) => {
      const absolutePath = path.resolve(tenantDirectory, fileName);

      if (!absolutePath.startsWith(safeTenantRoot)) {
        throw new Error(`Ungültiger Knowledge-Pfad: ${fileName}`);
      }

      try {
        return (await fs.readFile(absolutePath, "utf8")).trim();
      } catch (error) {
        if (isMissingFileError(error)) {
          console.error("❌ Knowledge-Datei fehlt:", {
            requestedTenant: requestedTenantId,
            tenant: tenant.id,
            file: absolutePath,
          });

          return "";
        }

        throw error;
      }
    }),
  );

  const knowledge = knowledgeParts.filter(Boolean).join("\n\n---\n\n").trim();

  console.log("🧠 Tenant-Knowledge geladen:", {
    requestedTenant: requestedTenantId,
    tenant: tenant.id,
    files: tenant.knowledge.files,
    knowledgeLength: knowledge.length,
  });

  if (!knowledge) {
    throw new Error(
      `Kein Knowledge für Tenant "${tenant.id}" geladen. Erwartete Datei(en): ${tenant.knowledge.files.join(", ")}`,
    );
  }

  return knowledge;
}
