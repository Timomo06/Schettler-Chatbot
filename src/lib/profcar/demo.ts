import type { ProfCarVehicle } from "./model";

export type ProfCarDemoPresentation = {
  id: string;
  brand: string;
  name: string;
  price: number;
  monthly: number;
  year: number;
  km: number;
  power: number;
  fuel: string;
  note: string;
  strength: string;
  tags: string[];
};

const DEMO_PRESENTATION: ProfCarDemoPresentation[] = [
  {
    id: "golf-gti",
    brand: "Volkswagen",
    name: "Golf VIII GTI",
    price: 24990,
    monthly: 227,
    year: 2024,
    km: 86188,
    power: 245,
    fuel: "Benzin",
    note: "Standheizung · HUD · Matrix · ACC · Rückfahrkamera",
    strength: "Sportlich, modern und trotzdem alltagstauglich",
    tags: ["sportlich", "alltag", "gti", "volkswagen", "vw", "schnell"],
  },
  {
    id: "bmw-520d",
    brand: "BMW",
    name: "520d xDrive Luxury Line",
    price: 27590,
    monthly: 250,
    year: 2021,
    km: 98574,
    power: 190,
    fuel: "Diesel",
    note: "Laserlicht · ACC · 360° · AHK · Nappa",
    strength: "Komfortabel und besonders stark auf langen Strecken",
    tags: ["komfort", "autobahn", "langstrecke", "diesel", "bmw"],
  },
  {
    id: "mercedes-gla",
    brand: "Mercedes-Benz",
    name: "GLA 200 AMG Line",
    price: 20299,
    monthly: 184,
    year: 2019,
    km: 72500,
    power: 156,
    fuel: "Benzin",
    note: "AHK · Totwinkel · Memory · LED · PDC",
    strength: "Kompakter Premium-SUV für Alltag und Familie",
    tags: ["suv", "komfort", "alltag", "familie", "mercedes", "gla"],
  },
  {
    id: "seat-arona",
    brand: "SEAT",
    name: "Arona 1.0 TSI Style",
    price: 14599,
    monthly: 133,
    year: 2022,
    km: 49300,
    power: 95,
    fuel: "Benzin",
    note: "ACC · Kamera · Voll-LED · CarPlay · Sitzheizung",
    strength: "Preisbewusster, moderner Alltags-SUV",
    tags: ["günstig", "suv", "alltag", "seat", "sparsam"],
  },
  {
    id: "mercedes-e63",
    brand: "Mercedes-AMG",
    name: "E 63 AMG 4MATIC",
    price: 33199,
    monthly: 301,
    year: 2014,
    km: 117850,
    power: 557,
    fuel: "Benzin",
    note: "Panorama · Massage · Belüftung · Harman Kardon",
    strength: "Maximale Leistung mit Oberklasse-Komfort",
    tags: ["sportlich", "leistung", "schnell", "amg", "mercedes"],
  },
  {
    id: "audi-a3",
    brand: "Audi",
    name: "A3 Sportback 1.0 TFSI",
    price: 17390,
    monthly: 158,
    year: 2018,
    km: 28600,
    power: 116,
    fuel: "Benzin",
    note: "PDC · Xenon · Navigation · Bluetooth · Klimaautomatik",
    strength: "Kompakt, hochwertig und mit geringer Laufleistung",
    tags: ["alltag", "kompakt", "audi", "günstig", "wenig kilometer"],
  },
  {
    id: "bmw-x3",
    brand: "BMW",
    name: "X3 M40d",
    price: 31499,
    monthly: 286,
    year: 2019,
    km: 89900,
    power: 326,
    fuel: "Diesel",
    note: "M Performance · xDrive · Premium-SUV · Langstreckenkomfort",
    strength: "Kräftiger Premium-SUV mit viel Platz und Langstreckenqualität",
    tags: ["suv", "familie", "autobahn", "diesel", "bmw", "leistung"],
  },
  {
    id: "bmw-840d",
    brand: "BMW",
    name: "840d xDrive",
    price: 42599,
    monthly: 386,
    year: 2020,
    km: 148102,
    power: 320,
    fuel: "Diesel",
    note: "Gran Turismo · xDrive · Oberklasse · 320 PS",
    strength: "Luxuriöser Reise-GT für Komfort, Leistung und lange Strecken",
    tags: ["luxus", "komfort", "autobahn", "diesel", "bmw", "sportlich"],
  },
  {
    id: "audi-a8",
    brand: "Audi",
    name: "A8 3.0 TDI quattro",
    price: 22990,
    monthly: 209,
    year: 2015,
    km: 220200,
    power: 262,
    fuel: "Diesel",
    note: "quattro · Oberklasse · Automatik · Langstreckenfahrzeug",
    strength: "Viel Oberklasse und Komfort zu einem attraktiven Einstiegspreis",
    tags: ["luxus", "komfort", "autobahn", "diesel", "audi"],
  },
  {
    id: "seat-leon",
    brand: "SEAT",
    name: "Leon 1.5 eTSI",
    price: 24299,
    monthly: 221,
    year: 2024,
    km: 7983,
    power: 150,
    fuel: "Benzin",
    note: "Sehr geringe Laufleistung · modern · kompakt · 150 PS",
    strength: "Nahezu neuer, moderner Allrounder mit sehr wenig Kilometern",
    tags: ["alltag", "kompakt", "wenig kilometer", "seat", "modern"],
  },
  {
    id: "bmw-m6",
    brand: "BMW",
    name: "M6 Cabrio Competition",
    price: 22990,
    monthly: 209,
    year: 2014,
    km: 196000,
    power: 575,
    fuel: "Benzin",
    note: "Motorschaden · nicht fahrbereit · Sonderangebot für Fachkundige",
    strength: "Extrem leistungsstarkes Projektfahrzeug – ausdrücklich mit Motorschaden",
    tags: ["sportlich", "leistung", "cabrio", "bmw", "projektfahrzeug"],
  },
];

export const PROFCAR_DEMO_VEHICLES: ProfCarVehicle[] = DEMO_PRESENTATION.map(d => ({
  id: d.id, source: "demo", mobileAdId: null, mobileSellerId: null, internalNumber: null,
  make: d.brand, model: d.name, modelDescription: d.name, title: `${d.brand} ${d.name}`,
  price: d.price, currency: "EUR", mileage: d.km, firstRegistration: String(d.year),
  powerKw: null, powerPs: d.power, fuel: d.fuel, gearbox: null, category: null,
  exteriorColor: null, equipment: d.id === "bmw-m6" ? [] : d.note.split(" · "), description: d.note,
  images: [], mobileUrl: null, modificationDate: null, availabilityStatus: "unknown",
  lastSuccessfulSync: null,
  extras: d.id === "bmw-m6" ? {
    conditionReports: [{
      id: "demo-listing-engine-damage", summary: "Laut Demo-Inserat Motorschaden und nicht fahrbereit",
      date: "2026-09-04", evidence: { status: "profcar_reported" }, approvedForAi: true,
    }],
  } : {},
}));

/** Temporary presentation adapter for the existing demo UI; never accepts API data.
 * Monthly values are existing demo examples, not calculated financing offers.
 */
export type ProfCarDemoView = ProfCarVehicle & ProfCarDemoPresentation;
export const PROFCAR_DEMO_VIEWS: ProfCarDemoView[] = PROFCAR_DEMO_VEHICLES.map((vehicle, index) => ({
  ...vehicle, ...DEMO_PRESENTATION[index],
}));

export type ProfCarUiVehicle = ProfCarVehicle & {
  brand: string;
  name: string;
  /** Only demo data currently contains an advertised example rate. */
  monthly: number | null;
  year: number | null;
  km: number | null;
  power: number | null;
  note: string;
  strength: string;
  tags: string[];
};

const FUEL_LABELS: Record<string, string> = {
  PETROL: "Benzin",
  DIESEL: "Diesel",
  ELECTRICITY: "Elektro",
  HYBRID: "Hybrid",
  LPG: "Autogas",
  CNG: "Erdgas",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  abs: "ABS",
  esp: "ESP",
  navigationSystem: "Navigation",
  centralLocking: "Zentralverriegelung",
  electricWindows: "Elektrische Fensterheber",
  alloyWheels: "Leichtmetallfelgen",
  sunroof: "Schiebedach",
  panoramicGlassRoof: "Panoramadach",
  heatedSeats: "Sitzheizung",
  memorySeats: "Memory-Sitze",
  heatPump: "Wärmepumpe",
  startStopSystem: "Start-Stopp-System",
};

function compactText(value: string | null, maxLength = 150) {
  if (!value) return "";
  const clean = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1).trim()}…` : clean;
}

/** Presentation-only projection. It never fabricates a price, financing rate or availability. */
export function toProfCarUiVehicle(vehicle: ProfCarVehicle): ProfCarUiVehicle {
  const brand = vehicle.make || "Marke unbekannt";
  const name = vehicle.modelDescription || vehicle.model || vehicle.title.replace(brand, "").trim() || vehicle.title;
  const fuel = vehicle.fuel ? (FUEL_LABELS[vehicle.fuel] || vehicle.fuel) : "Unbekannt";
  const equipment = vehicle.equipment.map(item => EQUIPMENT_LABELS[item] || item);
  const note = equipment.length
    ? equipment.slice(0, 5).join(" · ")
    : compactText(vehicle.description) || "Weitere Fahrzeugdetails im Inserat";
  const tagSource = [brand, name, fuel, vehicle.category || "", ...equipment]
    .join(" ")
    .toLocaleLowerCase("de-DE")
    .split(/[^a-z0-9äöüß]+/i)
    .filter(Boolean);

  return {
    ...vehicle,
    brand,
    name,
    monthly: null,
    year: vehicle.firstRegistration ? Number(vehicle.firstRegistration.slice(0, 4)) || null : null,
    km: vehicle.mileage,
    power: vehicle.powerPs,
    fuel,
    note,
    strength: "Aktuelles mobile.de-Inserat – technische Angaben und Verfügbarkeit vor Ort prüfen",
    tags: [...new Set(tagSource)],
  };
}

export const PROFCAR_DEMO_UI_VEHICLES: ProfCarUiVehicle[] = PROFCAR_DEMO_VIEWS;
