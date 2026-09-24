import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryState,
  ProfCarInventoryRepository,
  SyncRun,
} from "./inventory";
import type { ProfCarExtras, ProfCarVehicle, VehicleFile } from "./model";

type InventoryMetaRow = {
  seller_id: string;
  revision: number | string;
  last_successful_sync: string | null;
  live_validated: boolean;
  last_sync_status: "succeeded" | "failed" | null;
  last_sync_attempt: string | null;
};

type VehicleRow = {
  id: string;
  normalized_data: Record<string, unknown>;
  mobile_raw_data?: Record<string, unknown>;
  profcar_extras?: ProfCarExtras | null;
  availability_status: ProfCarVehicle["availabilityStatus"];
  last_successful_sync: string | null;
};

let cachedClient: SupabaseClient | null = null;

function getClient() {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("PROFCAR_INVENTORY_STORAGE_NOT_CONFIGURED");
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

function revision(value: number | string | undefined) {
  const parsed = Number(value ?? 0);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("INVALID_INVENTORY_REVISION");
  return parsed;
}

function hydrateVehicle(row: VehicleRow, files: VehicleFile[] = []): ProfCarVehicle {
  const normalized = row.normalized_data as unknown as ProfCarVehicle;
  if (!normalized || typeof normalized !== "object" || normalized.id !== row.id) {
    throw new Error("INVALID_STORED_VEHICLE");
  }
  const extras = row.profcar_extras && typeof row.profcar_extras === "object"
    ? structuredClone(row.profcar_extras)
    : {};
  if (files.length) extras.vehicleFiles = files;
  return {
    ...structuredClone(normalized),
    extras,
    availabilityStatus: row.availability_status,
    lastSuccessfulSync: row.last_successful_sync,
  };
}

export class SupabaseProfCarInventoryRepository implements ProfCarInventoryRepository {
  async read(sellerId: string): Promise<InventoryState> {
    const client = getClient();
    const { data: meta, error: metaError } = await client
      .from("profcar_inventory_state")
      .select("seller_id, revision, last_successful_sync, live_validated, last_sync_status, last_sync_attempt")
      .eq("seller_id", sellerId)
      .maybeSingle<InventoryMetaRow>();
    if (metaError) throw new Error("PROFCAR_INVENTORY_READ_FAILED");
    return {
      revision: revision(meta?.revision),
      // A sync only needs the revision. The database RPC preserves extras,
      // marks missing vehicles inactive and never updates vehicle files.
      // Avoid downloading a potentially huge private provider archive here.
      vehicles: [],
      rawAds: {},
      lastSuccessfulSync: meta?.last_successful_sync ?? null,
      liveValidated: meta?.live_validated === true,
    };
  }

  async commit(
    sellerId: string,
    expectedRevision: number,
    state: InventoryState,
    run: SyncRun,
  ): Promise<void> {
    const listed = state.vehicles.filter(
      vehicle =>
        vehicle.source === "mobile.de" &&
        vehicle.mobileSellerId === sellerId &&
        vehicle.availabilityStatus === "listed",
    );
    const vehicles = listed.map(vehicle => {
      const normalizedData = structuredClone(vehicle) as unknown as Record<string, unknown>;
      delete normalizedData.extras;
      return {
        id: vehicle.id,
        mobileAdId: vehicle.mobileAdId,
        mobileSellerId: vehicle.mobileSellerId,
        normalizedData,
        rawData: state.rawAds[vehicle.id] ?? {},
      };
    });
    const { error } = await getClient().rpc("profcar_commit_inventory", {
      p_seller_id: sellerId,
      p_expected_revision: expectedRevision,
      p_completed_at: run.completedAt,
      p_vehicles: vehicles,
      p_run: run,
    });
    if (error) throw new Error("PROFCAR_INVENTORY_COMMIT_FAILED");
  }

  async recordFailure(run: SyncRun): Promise<void> {
    const { error } = await getClient().rpc("profcar_record_sync_failure", {
      p_run: run,
    });
    if (error) throw new Error("PROFCAR_SYNC_FAILURE_RECORD_FAILED");
  }
}

export type PublicProfCarInventory = {
  sellerId: string | null;
  vehicles: ProfCarVehicle[];
  liveValidated: boolean;
  lastSuccessfulSync: string | null;
  lastSyncStatus: "succeeded" | "failed" | null;
  lastSyncAttempt: string | null;
};

/** Read-only projection: never selects provider payloads or private ProfCar extras. */
export async function readPublicProfCarInventory(): Promise<PublicProfCarInventory | null> {
  const client = getClient();
  const configuredSellerId = process.env.MOBILE_DE_SELLER_ID?.trim();
  let metaQuery = client
    .from("profcar_inventory_state")
    .select("seller_id, revision, last_successful_sync, live_validated, last_sync_status, last_sync_attempt")
    .order("last_successful_sync", { ascending: false, nullsFirst: false })
    .limit(1);
  if (configuredSellerId) metaQuery = metaQuery.eq("seller_id", configuredSellerId);
  const { data: metas, error: metaError } = await metaQuery;
  if (metaError) throw new Error("PROFCAR_INVENTORY_READ_FAILED");
  const meta = (metas?.[0] ?? null) as InventoryMetaRow | null;
  if (!meta) return null;
  const { data: rows, error: vehicleError } = await client
    .from("profcar_vehicles")
    .select("id, normalized_data, availability_status, last_successful_sync")
    .eq("mobile_seller_id", meta.seller_id)
    .eq("availability_status", "listed");
  if (vehicleError) throw new Error("PROFCAR_INVENTORY_READ_FAILED");
  return {
    sellerId: meta.seller_id,
    vehicles: ((rows ?? []) as VehicleRow[]).map(row => hydrateVehicle(row)),
    liveValidated: meta.live_validated,
    lastSuccessfulSync: meta.last_successful_sync,
    lastSyncStatus: meta.last_sync_status,
    lastSyncAttempt: meta.last_sync_attempt,
  };
}
