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

async function readKnowledgeFile(
  tenantDirectory: string,
  safeTenantRoot: string,
  fileName: string,
): Promise<{ content: string; usedFile: string } | null> {
  const absolutePath = path.resolve(tenantDirectory, fileName);

  if (!absolutePath.startsWith(safeTenantRoot)) {
    throw new Error(`Ungültiger Knowledge-Pfad: ${fileName}`);
  }

  try {
    const content = (await fs.readFile(absolutePath, "utf8")).trim();

    if (!content) {
      return null;
    }

    return {
      content,
      usedFile: fileName,
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }

    throw error;
  }
}

function getKnowledgeFileCandidates(configuredFileName: string) {
  const candidates = [configuredFileName];

  // Fahrschul-Demos existieren im Projekt teils als eKnowledge.md,
  // teils als knowledge.md. Der Loader akzeptiert deshalb beide Namen.
  if (configuredFileName === "eKnowledge.md") {
    candidates.push("knowledge.md");
  } else if (configuredFileName === "knowledge.md") {
    candidates.push("eKnowledge.md");
  }

  return [...new Set(candidates)];
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

  const knowledgeParts: string[] = [];
  const loadedFiles: string[] = [];

  for (const configuredFileName of tenant.knowledge.files) {
    const candidates = getKnowledgeFileCandidates(configuredFileName);

    let loaded:
      | {
          content: string;
          usedFile: string;
        }
      | null = null;

    for (const candidate of candidates) {
      loaded = await readKnowledgeFile(
        tenantDirectory,
        safeTenantRoot,
        candidate,
      );

      if (loaded) {
        break;
      }
    }

    if (!loaded) {
      console.error("❌ Knowledge-Datei fehlt:", {
        requestedTenant: requestedTenantId,
        tenant: tenant.id,
        directory: tenantDirectory,
        triedFiles: candidates,
      });

      continue;
    }

    knowledgeParts.push(loaded.content);
    loadedFiles.push(loaded.usedFile);
  }

  const knowledge = knowledgeParts.filter(Boolean).join("\n\n---\n\n").trim();

  console.log("🧠 Tenant-Knowledge geladen:", {
    requestedTenant: requestedTenantId,
    tenant: tenant.id,
    configuredFiles: tenant.knowledge.files,
    loadedFiles,
    knowledgeLength: knowledge.length,
  });

  if (!knowledge) {
    throw new Error(
      `Kein Knowledge für Tenant "${tenant.id}" geladen. Geprüft wurden: ${tenant.knowledge.files
        .flatMap(getKnowledgeFileCandidates)
        .join(", ")}`,
    );
  }

  return knowledge;
}
