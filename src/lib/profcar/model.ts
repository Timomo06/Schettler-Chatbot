/** Public normalized data. Unknown values stay null; no raw API payloads here. */
export type EvidenceStatus = "verified" | "profcar_reported" | "unknown";
export type Evidence =
  | { status: "verified"; evidenceIds: [string, ...string[]] }
  | { status: "profcar_reported" | "unknown"; evidenceIds?: string[] };
export type VehicleFact = {
  id: string;
  summary: string;
  date: string | null;
  evidence: Evidence;
  approvedForAi: boolean;
};
export type VehicleFile = {
  id: string;
  provider: "dropbox" | "drive" | "manual";
  externalId: string | null;
  name: string;
  kind: "maintenance" | "repair" | "condition" | "other";
  /** Evidence review is independent of whether a file exists. */
  reviewedAt: string | null;
};
export interface ProfCarExtras {
  vehicleFiles?: VehicleFile[];
  maintenanceRecords?: VehicleFact[];
  repairs?: VehicleFact[];
  conditionReports?: VehicleFact[];
  financing?: { provider: "santander" | "kosyfa"; externalReference: string | null; status: "not_requested" | "draft" };
  appointments?: { id: string; purpose: "test_drive" | "consultation"; requestedAt: string | null; status: "draft"; calendarReference: string | null }[];
  tradeInRequests?: { id: string; status: "draft"; vehicleDescription: string }[];
  aiContext?: { typicalModelChecks: string[] };
}
export interface ProfCarVehicle {
  id: string;
  source: "demo" | "mobile.de";
  mobileAdId: string | null;
  mobileSellerId: string | null;
  internalNumber: string | null;
  make: string | null;
  model: string | null;
  modelDescription: string | null;
  title: string;
  /** Gross consumer price in currency units; never a financing quote. */
  price: number | null;
  currency: string | null;
  mileage: number | null;
  /** YYYY-MM (or YYYY if only year is known in demo). */
  firstRegistration: string | null;
  powerKw: number | null;
  powerPs: number | null;
  fuel: string | null;
  gearbox: string | null;
  category: string | null;
  exteriorColor: string | null;
  equipment: string[];
  description: string | null;
  images: string[];
  mobileUrl: string | null;
  modificationDate: string | null;
  availabilityStatus: "listed" | "inactive" | "unknown";
  lastSuccessfulSync: string | null;
  /** Owned exclusively by ProfCar, never by the mobile.de mapper. */
  extras: ProfCarExtras;
}
