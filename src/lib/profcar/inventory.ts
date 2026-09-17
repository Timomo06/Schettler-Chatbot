import type { ProfCarVehicle } from "./model";
import { mapMobileAdToProfCarVehicle, type MobileRawAd } from "./mobile-mapper";

export interface MobileInventorySnapshot {
  sellerId: string;
  ads: MobileRawAd[];
  expectedTotal: number;
  /** Adapter must fetch ALL pages and details, reject warnings and filtered snapshots. */
  complete: boolean;
  errors: string[];
}
export interface SyncRun {
  id: string;
  sellerId: string;
  startedAt: string;
  completedAt: string;
  status: "succeeded" | "failed";
  vehicleCount: number;
  errorCode: "SYNC_FAILED" | null;
}
export interface InventoryState {
  revision: number;
  vehicles: ProfCarVehicle[];
  rawAds: Record<string, MobileRawAd>;
  lastSuccessfulSync: string | null;
  liveValidated: boolean;
}
export interface ProfCarInventoryRepository {
  read(sellerId: string): Promise<InventoryState>;
  /** One transaction: compare revision, store state + successful run, or change nothing.
   * Must also reject concurrent edits to extras; retry from a fresh read.
   */
  commit(sellerId: string, expectedRevision: number, state: InventoryState, run: SyncRun): Promise<void>;
  recordFailure(run: SyncRun): Promise<void>;
}
export interface ProfCarSyncDependencies {
  sellerId: string;
  fetchSnapshot: () => Promise<MobileInventorySnapshot>;
  repository: ProfCarInventoryRepository;
  now?: () => Date;
}
/** Explicit manual invocation only. No network, timers or DB side effects on import. */
export async function syncProfCarInventory(deps: ProfCarSyncDependencies): Promise<SyncRun> {
  const now = deps.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const id = globalThis.crypto.randomUUID();
  try {
    // Read before fetching so a slower older sync cannot overwrite a newer one.
    const previous = await deps.repository.read(deps.sellerId);
    const snapshot = await deps.fetchSnapshot();
    if (snapshot.sellerId !== deps.sellerId || !snapshot.complete || snapshot.errors.length ||
      !Number.isSafeInteger(snapshot.expectedTotal) || snapshot.expectedTotal < 0 ||
      snapshot.ads.length !== snapshot.expectedTotal) throw new Error("Incomplete inventory");
    const mapped = snapshot.ads.map(mapMobileAdToProfCarVehicle);
    if (mapped.some(v => v.mobileSellerId !== deps.sellerId) || new Set(mapped.map(v => v.id)).size !== mapped.length) throw new Error("Invalid inventory identities");
    const completedAt = now().toISOString();
    const incomingIds = new Set(mapped.map(v => v.id));
    const oldById = new Map(previous.vehicles.map(v => [v.id, v]));
    const vehicles: ProfCarVehicle[] = mapped.map(v => ({ ...v, extras: oldById.get(v.id)?.extras ?? {}, lastSuccessfulSync: completedAt }));
    for (const old of previous.vehicles) {
      if (incomingIds.has(old.id)) continue;
      vehicles.push(old.source === "mobile.de" && old.mobileSellerId === deps.sellerId
        ? { ...old, availabilityStatus: "inactive", lastSuccessfulSync: completedAt } : old);
    }
    const rawAds = { ...previous.rawAds };
    mapped.forEach((v, index) => { rawAds[v.id] = structuredClone(snapshot.ads[index]); });
    const run: SyncRun = { id, sellerId: deps.sellerId, startedAt, completedAt, status: "succeeded", vehicleCount: mapped.length, errorCode: null };
    await deps.repository.commit(deps.sellerId, previous.revision, {
      revision: previous.revision + 1, vehicles, rawAds, lastSuccessfulSync: completedAt, liveValidated: true,
    }, run);
    return run;
  } catch {
    // Do not log raw payloads, credentials or provider error bodies.
    const run: SyncRun = { id, sellerId: deps.sellerId, startedAt, completedAt: now().toISOString(), status: "failed", vehicleCount: 0, errorCode: "SYNC_FAILED" };
    await deps.repository.recordFailure(run);
    return run;
  }
}
/** Last successful live snapshot survives errors; demos remain until first success.
 * An explicitly successful empty inventory is empty, not a fallback to sold demos.
 */
export function selectProfCarInventory(demos: readonly ProfCarVehicle[], state: InventoryState | null): readonly ProfCarVehicle[] {
  return state?.liveValidated && state.lastSuccessfulSync
    ? state.vehicles.filter(v => v.source === "mobile.de" && v.availabilityStatus === "listed")
    : demos;
}

/** Local test adapter only; replace with a transactional DB repository for production. */
export class MemoryProfCarInventoryRepository implements ProfCarInventoryRepository {
  private states = new Map<string, InventoryState>();
  readonly runs: SyncRun[] = [];
  async read(sellerId: string): Promise<InventoryState> {
    return structuredClone(this.states.get(sellerId) ?? { revision: 0, vehicles: [], rawAds: {}, lastSuccessfulSync: null, liveValidated: false });
  }
  async commit(sellerId: string, expectedRevision: number, state: InventoryState, run: SyncRun): Promise<void> {
    if ((this.states.get(sellerId)?.revision ?? 0) !== expectedRevision) throw new Error("Inventory changed concurrently");
    this.states.set(sellerId, structuredClone(state));
    this.runs.push(structuredClone(run));
  }
  async recordFailure(run: SyncRun): Promise<void> { this.runs.push(structuredClone(run)); }
}
