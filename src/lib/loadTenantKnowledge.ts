import fs from "node:fs/promises";
import path from "node:path";
import { TenantId } from "./tenants";

const knowledgeCache = new Map<TenantId, string>();

async function readKnowledgeFile(tenantId: TenantId): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    "src",
    "tenants",
    tenantId,
    "knowledge.md",
  );

  return fs.readFile(filePath, "utf8");
}

export async function loadTenantKnowledge(
  tenantId: TenantId,
): Promise<string> {
  if (knowledgeCache.has(tenantId)) {
    return knowledgeCache.get(tenantId)!;
  }

  try {
    const content = await readKnowledgeFile(tenantId);
    knowledgeCache.set(tenantId, content);
    return content;
  } catch (err) {
    if (tenantId !== "demo") {
      return loadTenantKnowledge("demo");
    }
    return "";
  }
}
