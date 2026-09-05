export type TenantId =
  | "demo"
  | "zahnputzpulver"
  | "btdesigns"
  | "bauteam"
  | "willi"
  | "mm-wartung"
  | "txbikes"
  | "txbikesV2"
  | "profcar"
  | "fahrwerk-b"
  | "fahrschule-hohenbaden"
  | "fahrschule-hopla"
  | "fahrschule-alamir"
  | "fahrschule-abgefahren"
  | "petermaennchen-fahrschule"
  | "schelf-fahrschule"
  | "fahrschule-jentsch"
  | "asphaltcrew"
  | "fahrschule-malik"
  | "fahrschule7"
  | "fahrschule-niehaus"
  | "fahrschule-fritz"
  | "fahrschule-fahrtwind"
  | "fahrschule-wiesenberg"
  | "fahrschule-pawlowski"
  | "bootsfahrschule-schwerin"
  | "fahrschule-westedt"
  | "fahrschule-bollow"
  | "fahrschule-hoenemann"
  | "fahrschule-jantzen"
  | "fahrschule-neptun"
  | "bb-fahrschule"
  | "hansefahrschule-rennhack"
  | "cans-fahrschule"
  | "tek-fahrschule"
  | "fahrschule-fix"
  | "fahrschule-yoendem";

export type ThemeConfig = {
  accent: string;
  bg: string;
  glass: string;
  text: string;
};

export type ContactPerson = {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
};

export type TenantConfig = {
  id: TenantId;

  brandName: string;
  assistantName: string;
  language: "de";

  knowledge: {
    files: string[];
  };

  websiteUrl?: string;
  primaryCta?: {
    label: string;
    url: string;
  };

  fallbackContact?: {
    label: string;
    value: string;
  };

  contacts?: ContactPerson[];

  companyInfo?: {
    address?: string;
    openingHours?: string;
    phone?: string;
    email?: string;
  };

  rules: {
    noMedicalClaims: boolean;
    noInventingPrices: boolean;
    noGuarantees: boolean;
  };

  theme: ThemeConfig;

  assets: {
    launcherIcon: string;
  };
};

export const DEFAULT_THEME: ThemeConfig = {
  accent: "#90adc3",
  bg: "#0b0f14",
  glass: "rgba(255,255,255,0.08)",
  text: "#eaf2ff",
};

export const TENANTS: Record<TenantId, TenantConfig> = {
  demo: {
    id: "demo",
    brandName: "BTDemo",
    assistantName: "LINA",
    language: "de",

    knowledge: {
      files: ["knowledge.md"],
    },

    websiteUrl: "https://example.com",
    primaryCta: { label: "Zum Shop", url: "https://example.com" },

    fallbackContact: {
      label: "Kontakt",
      value: "info@example.com",
    },

    companyInfo: {
      address: "Musterstraße 1, 12345 Musterstadt",
      phone: "+49 123 456789",
      email: "info@example.com",
      openingHours: "Mo–Fr 09:00–17:00",
    },

    contacts: [
      {
        name: "Max Mustermann",
        role: "Support",
        phone: "+49 123 456789",
        email: "support@example.com",
      },
    ],

    rules: {
      noMedicalClaims: true,
      noInventingPrices: true,
      noGuarantees: true,
    },

    theme: DEFAULT_THEME,

    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  zahnputzpulver: {
    id: "zahnputzpulver",
    brandName: "SCHETTLERs",
    assistantName: "Zahnfee",
    language: "de",

    knowledge: {
      files: ["knowledge.md"],
    },

    websiteUrl:
      "https://www.zahnputzpulver.de/?srsltid=AfmBOooeohb0pS2QK6pGBQu15asRHTeelJ-91oJQhvclnOJ2O5EX0O9X",

    fallbackContact: {
      label: "Support",
      value: "post@zahnputzpulver.de",
    },

    companyInfo: {
      address: "Handelsstraße 3, 19061 Schwerin",
      phone: "0385-53998253",
      email: "post@zahnputzpulver.de",
    },

    contacts: [
      {
        name: "Service Team",
        role: "Kundenservice",
        email: "post@zahnputzpulver.de",
      },
    ],

    rules: {
      noMedicalClaims: true,
      noInventingPrices: false,
      noGuarantees: true,
    },

    theme: {
      accent: "#48b86a",
      bg: "#08120c",
      glass: "rgba(72,184,106,0.12)",
      text: "#eaf7ec",
    },

    assets: {
      launcherIcon: "/tenants/zahnputzpulver/brain.png",
    },
  },

  btdesigns: {
    id: "btdesigns",
    brandName: "BTDesigns",
    assistantName: "LINA",
    language: "de",

    knowledge: {
      files: ["knowledge.md"],
    },

    websiteUrl: "https://btdesigns.de",
    primaryCta: {
      label: "Termin buchen",
      url: "https://btdesigns-shop.de",
    },

    fallbackContact: {
      label: "Kontakt",
      value: "info@btdesigns.de",
    },

    companyInfo: {
      address: "Deutschland",
      phone: "+49",
      email: "info@btdesigns.de",
      openingHours: "Nach Vereinbarung",
    },

    contacts: [
      {
        name: "BTDesigns Team",
        role: "Beratung",
        email: "info@btdesigns.de",
      },
    ],

    rules: {
      noMedicalClaims: true,
      noInventingPrices: true,
      noGuarantees: true,
    },

    theme: {
      accent: "#1e6fd9",
      bg: "#050a12",
      glass: "rgba(30,111,217,0.15)",
      text: "#eaf2ff",
    },

    assets: {
      launcherIcon: "/tenants/btdesigns/icon.png",
    },
  },

  bauteam: {
    id: "bauteam",
    brandName: "BauTeam",
    assistantName: "BauBot Praktikus",
    language: "de",

    knowledge: {
      files: ["knowledge.md"],
    },

    websiteUrl: "https://praktikus-bau.de",

    fallbackContact: {
      label: "Kontakt",
      value: "info@praktikus-bau.de",
    },

    companyInfo: {
      address: "Deutschland",
      phone: "+49",
      email: "info@praktikus-bau.de",
      openingHours: "Nach Vereinbarung",
    },

    contacts: [
      {
        name: "BauTeam Praktikus",
        role: "Beratung",
        email: "info@praktikus-bau.de",
      },
    ],

    rules: {
      noMedicalClaims: true,
      noInventingPrices: true,
      noGuarantees: true,
    },

    theme: {
      accent: "#e53935",
      bg: "#120808",
      glass: "rgba(229,57,53,0.15)",
      text: "#fff1f1",
    },

    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  willi: {
    id: "willi",
    brandName: "Willi Official",
    assistantName: "Willi Assistant",
    language: "de",

    knowledge: {
      files: ["knowledge.md"],
    },

    websiteUrl: "https://willi-official.de",
    primaryCta: {
      label: "Anfrage stellen",
      url: "https://willi-official.de",
    },

    fallbackContact: {
      label: "Booking-Anfrage",
      value: "Über das Kontaktformular auf willi-official.de",
    },

    companyInfo: {
      address: "Deutschland",
      email: "Über das Kontaktformular auf willi-official.de",
      openingHours: "Nach Vereinbarung",
    },

    contacts: [
      {
        name: "Willi",
        role: "Musiker / Booking",
        email: "Über das Kontaktformular auf willi-official.de",
      },
    ],

    rules: {
      noMedicalClaims: true,
      noInventingPrices: true,
      noGuarantees: true,
    },

    theme: {
      accent: "#c9a66b",
      bg: "#0f0d0a",
      glass: "rgba(201,166,107,0.14)",
      text: "#fff7e8",
    },

    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  "mm-wartung": {
    id: "mm-wartung",
    brandName: "MM Wartung",
    assistantName: "MM-Doc",
    language: "de",

    knowledge: {
      files: ["knowledge.md"],
    },

    websiteUrl: "https://mm-wartung.de",

    primaryCta: {
      label: "Anfrage stellen",
      url: "https://mm-wartung.de",
    },

    fallbackContact: {
      label: "Kontakt",
      value: "info@mm-wartung.de",
    },

    companyInfo: {
      address: "Deutschland",
      phone: "Auf Anfrage",
      email: "info@mm-wartung.de",
      openingHours: "Nach Vereinbarung",
    },

    contacts: [
      {
        name: "Moritz Manthei",
        role: "Ansprechpartner",
        email: "info@mm-wartung.de",
      },
    ],

    rules: {
      noMedicalClaims: true,
      noInventingPrices: true,
      noGuarantees: true,
    },

    theme: {
      accent: "#ff7a00",
      bg: "#0d0d0d",
      glass: "rgba(255,122,0,0.12)",
      text: "#ffffff",
    },

    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  txbikes: {
    id: "txbikes",
    brandName: "TXBIKES",
    assistantName: "TX Doc",
    language: "de",

    knowledge: {
      files: ["knowledge.md"],
    },

    websiteUrl: "https://txbikes.de",

    primaryCta: {
      label: "Termin buchen",
      url: "https://txbikes.de/pages/kontakt",
    },

    fallbackContact: {
      label: "Kontakt",
      value: "Über das Kontaktformular auf txbikes.de",
    },

    companyInfo: {
      address: "Duisburg Süd & Düsseldorf Nord",
      phone: "Über das Kontaktformular auf txbikes.de",
      email: "Über das Kontaktformular auf txbikes.de",
      openingHours: "Nach Vereinbarung",
    },

    contacts: [
      {
        name: "Tarik",
        role: "Ansprechpartner / Fahrradservice",
        email: "Über das Kontaktformular auf txbikes.de",
      },
    ],

    rules: {
      noMedicalClaims: true,
      noInventingPrices: true,
      noGuarantees: true,
    },

    theme: {
      accent: "#4f8f3a",
      bg: "#07100a",
      glass: "rgba(79,143,58,0.16)",
      text: "#f2f8ef",
    },

    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  profcar: {
    id: "profcar",
    brandName: "ProfCar Köln",
    assistantName: "Digitaler Fahrzeugberater",
    language: "de",

    knowledge: {
      files: ["knowledge.md"],
    },

    websiteUrl: "https://profcar.com/",
    primaryCta: {
      label: "Fahrzeuge ansehen",
      url: "https://home.mobile.de/PROFCAR",
    },

    fallbackContact: {
      label: "ProfCar kontaktieren",
      value: "+49 (0) 173 7953151 · info@profcar.com",
    },

    companyInfo: {
      address: "Neue Eiler Straße 50–52, 51145 Köln",
      phone: "+49 (0) 173 7953151",
      email: "info@profcar.com",
      openingHours: "Mo–Fr 08:00–18:00, Sa 08:00–15:00",
    },

    contacts: [
      {
        name: "ProfCar Team",
        role: "Fahrzeugberatung und Service",
        phone: "+49 (0) 173 7953151",
        email: "info@profcar.com",
      },
    ],

    rules: {
      noMedicalClaims: true,
      noInventingPrices: true,
      noGuarantees: true,
    },

    theme: {
      accent: "#dc1f2b",
      bg: "#0b0e13",
      glass: "rgba(220,31,43,0.14)",
      text: "#f7f8fa",
    },

    assets: {
      launcherIcon: "https://profcar.com/logo-transparent.png",
    },
  },

  "fahrwerk-b": {
    id: "fahrwerk-b",
    brandName: "Fahrwerk B",
    assistantName: "Führerschein-Cockpit",
    language: "de",

    knowledge: {
      files: ["knowledge.md"],
    },

    websiteUrl: "https://www.fahrwerk-b.de",

    primaryCta: {
      label: "Online anmelden",
      url: "https://www.fahrwerk-b.de",
    },

    fallbackContact: {
      label: "Fahrwerk B",
      value: "https://www.fahrwerk-b.de",
    },

    companyInfo: {
      address: "Schwerin",
      openingHours: "Siehe Fahrwerk-B Website",
    },

    rules: {
      noMedicalClaims: true,
      noInventingPrices: false,
      noGuarantees: true,
    },

    theme: {
      accent: "#c8102e",
      bg: "#0b0f16",
      glass: "rgba(200,16,46,0.12)",
      text: "#ffffff",
    },

    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  "fahrschule-hohenbaden": {
    id: "fahrschule-hohenbaden",
    brandName: "Fahrschule Hohenbaden · in7Days",
    assistantName: "Führerschein-Assistent",
    language: "de",
    knowledge: {
      files: ["eKnowledge.md"],
    },
    websiteUrl: "https://fahrschule-hohenbaden.de",
    primaryCta: {
      label: "Website öffnen",
      url: "https://fahrschule-hohenbaden.de",
    },
    fallbackContact: {
      label: "Fahrschule Hohenbaden",
      value: "https://fahrschule-hohenbaden.de",
    },
    companyInfo: {
      address: "Baden-Baden und Bühl",
      openingHours: "Siehe Website der Fahrschule Hohenbaden",
    },
    rules: {
      noMedicalClaims: true,
      noInventingPrices: false,
      noGuarantees: true,
    },
    theme: {
      accent: "#e31e24",
      bg: "#fff8f7",
      glass: "rgba(227,30,36,0.12)",
      text: "#171717",
    },
    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  "fahrschule-hopla": {
    id: "fahrschule-hopla",
    brandName: "Fahrschule Hopla",
    assistantName: "Digitaler Führerscheinbegleiter",
    language: "de",
    knowledge: {
      files: ["eKnowledge.md"],
    },
    websiteUrl: "https://www.fahrschule-hopla.de/",
    primaryCta: {
      label: "Per WhatsApp anfragen",
      url: "https://wa.me/491632695307",
    },
    fallbackContact: {
      label: "Telefon / WhatsApp",
      value: "0163 269 53 07",
    },
    companyInfo: {
      address: "Holländische Str. 27, 34127 Kassel",
      phone: "0163 269 53 07",
      email: "info@fahrschule-hopla.de",
      openingHours: "Büro: Mo 14:30–18:00, Di 11:00–14:30, Mi–Do 12:30–16:00",
    },
    rules: {
      noMedicalClaims: true,
      noInventingPrices: true,
      noGuarantees: true,
    },
    theme: {
      accent: "#e53935",
      bg: "#fff8f6",
      glass: "rgba(229,57,53,0.12)",
      text: "#1f2428",
    },
    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  "fahrschule-alamir": {
    id: "fahrschule-alamir",
    brandName: "Fahrschule Al-Amir",
    assistantName: "Digitaler Führerscheinbegleiter",
    language: "de",
    knowledge: {
      files: ["eKnowledge.md"],
    },
    websiteUrl: "https://www.fahrschulealamir.de/",
    primaryCta: {
      label: "Online anmelden",
      url: "https://api.fahrschulmanager.de/oa/qr/903516285",
    },
    fallbackContact: {
      label: "Telefon / WhatsApp",
      value: "0163 907 8887",
    },
    companyInfo: {
      address: "Leipziger Str. 211, 34123 Kassel",
      phone: "0163 907 8887",
      email: "info@fahrschulealamir.de",
      openingHours: "Mo–Fr 16:00–19:00 Uhr während der Unterrichtszeiten",
    },
    rules: {
      noMedicalClaims: true,
      noInventingPrices: true,
      noGuarantees: true,
    },
    theme: {
      accent: "#e60015",
      bg: "#fff7f8",
      glass: "rgba(230,0,21,0.12)",
      text: "#1f2024",
    },
    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  "fahrschule-abgefahren": {
    id: "fahrschule-abgefahren",
    brandName: "Fahrschule Abgefahren",
    assistantName: "Führerschein-Assistent",
    language: "de",
    knowledge: {
      files: ["eKnowledge.md"],
    },
    websiteUrl: "https://abgefahren-schwerin.de",
    primaryCta: {
      label: "Website öffnen",
      url: "https://abgefahren-schwerin.de",
    },
    fallbackContact: {
      label: "Fahrschule Abgefahren",
      value: "https://abgefahren-schwerin.de",
    },
    companyInfo: {
      address: "Schwerin und Sternberg",
      openingHours: "Siehe Website der Fahrschule Abgefahren",
    },
    rules: {
      noMedicalClaims: true,
      noInventingPrices: false,
      noGuarantees: true,
    },
    theme: {
      accent: "#e11d48",
      bg: "#fff7fb",
      glass: "rgba(225,29,72,0.12)",
      text: "#24141b",
    },
    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  "petermaennchen-fahrschule": {
    id: "petermaennchen-fahrschule",
    brandName: "Petermännchen Fahrschule",
    assistantName: "Führerschein-Assistent",
    language: "de",
    knowledge: {
      files: ["eKnowledge.md"],
    },
    websiteUrl: "https://www.petermaennchen-fahrschule.de/",
    primaryCta: {
      label: "Website öffnen",
      url: "https://www.petermaennchen-fahrschule.de/",
    },
    fallbackContact: {
      label: "Telefon",
      value: "0385 734393",
    },
    companyInfo: {
      address: "Schwerin",
      phone: "0385 734393",
      openingHours: "Siehe Website der Petermännchen Fahrschule",
    },
    rules: {
      noMedicalClaims: true,
      noInventingPrices: false,
      noGuarantees: true,
    },
    theme: {
      accent: "#f9c806",
      bg: "#fefefe",
      glass: "rgba(249,200,6,0.14)",
      text: "#000d1a",
    },
    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  "schelf-fahrschule": {
    id: "schelf-fahrschule",
    brandName: "Schelf-Fahrschule",
    assistantName: "Führerschein-Assistent",
    language: "de",
    knowledge: {
      files: ["eKnowledge.md"],
    },
    websiteUrl: "https://schelf-fahrschule.de/",
    primaryCta: {
      label: "Website öffnen",
      url: "https://schelf-fahrschule.de/",
    },
    fallbackContact: {
      label: "Telefon und WhatsApp",
      value: "0152 22363413",
    },
    companyInfo: {
      address: "Schwerin und Crivitz",
      phone: "0152 22363413",
      email: "info@schelf-fahrschule.de",
      openingHours: "Siehe eKnowledge und Website",
    },
    rules: {
      noMedicalClaims: true,
      noInventingPrices: false,
      noGuarantees: true,
    },
    theme: {
      accent: "#db0010",
      bg: "#fff7f8",
      glass: "rgba(219,0,16,0.12)",
      text: "#18191f",
    },
    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  "fahrschule-jentsch": {
    id: "fahrschule-jentsch",
    brandName: "Fahrschule Jentsch",
    assistantName: "KI-Führerscheinbegleiter",
    language: "de",
    knowledge: {
      files: ["eKnowledge.md"],
    },
    websiteUrl: "https://fahrschule-jentsch-schwerin.de/",
    primaryCta: {
      label: "Website öffnen",
      url: "https://fahrschule-jentsch-schwerin.de/",
    },
    fallbackContact: {
      label: "Telefon",
      value: "0385 / 440 087 80",
    },
    companyInfo: {
      address: "Am Markt 10, 19055 Schwerin",
      phone: "0385 / 440 087 80",
      email: "info@fahrschule-jentsch-schwerin.de",
      openingHours: "Montag und Freitag 14:30–17:30 Uhr",
    },
    rules: {
      noMedicalClaims: true,
      noInventingPrices: false,
      noGuarantees: true,
    },
    theme: {
      accent: "#f28b35",
      bg: "#fffaf2",
      glass: "rgba(242,139,53,0.13)",
      text: "#25230f",
    },
    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  asphaltcrew: {
    id: "asphaltcrew",
    brandName: "AsphaltCrew Fahrschule",
    assistantName: "Flight-Copilot",
    language: "de",
    knowledge: {
      files: ["eKnowledge.md"],
    },
    websiteUrl: "https://www.asphaltcrew.info/",
    primaryCta: {
      label: "Website öffnen",
      url: "https://www.asphaltcrew.info/",
    },
    fallbackContact: {
      label: "WhatsApp",
      value: "+49 177 6067591",
    },
    companyInfo: {
      address: "Josefstraße 44/3, 76437 Rastatt",
      phone: "+49 7222 9209252",
      email: "cockpit@asphaltcrew.info",
      openingHours: "Montag bis Mittwoch 15:30–17:30 Uhr sowie nach Vereinbarung",
    },
    rules: {
      noMedicalClaims: true,
      noInventingPrices: false,
      noGuarantees: true,
    },
    theme: {
      accent: "#6f2c91",
      bg: "#f8f4fb",
      glass: "rgba(111,44,145,0.13)",
      text: "#22172c",
    },
    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  "fahrschule-malik": {
    id: "fahrschule-malik",
    brandName: "Fahrschule Malik",
    assistantName: "Lern- & Praxisbegleiter",
    language: "de",
    knowledge: {
      files: ["eKnowledge.md"],
    },
    websiteUrl: "https://fahrschule-malik.de/",
    primaryCta: {
      label: "Website öffnen",
      url: "https://fahrschule-malik.de/",
    },
    fallbackContact: {
      label: "Telefon",
      value: "0177 2682919",
    },
    companyInfo: {
      address: "Rastatt und Karlsruhe",
      phone: "0177 2682919",
      email: "fahrschulemalik@gmx.de",
      openingHours: "Siehe eKnowledge für beide Standorte",
    },
    rules: {
      noMedicalClaims: true,
      noInventingPrices: false,
      noGuarantees: true,
    },
    theme: {
      accent: "#1f9d70",
      bg: "#f3fbf7",
      glass: "rgba(31,157,112,0.13)",
      text: "#14272a",
    },
    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  fahrschule7: {
    id: "fahrschule7",
    brandName: "Fahrschule7 Buxtehude",
    assistantName: "7-Tage-Führerscheinplaner",
    language: "de",
    knowledge: {
      files: ["eKnowledge.md"],
    },
    websiteUrl: "https://www.fahrschule7.de/",
    primaryCta: {
      label: "Beratung anfragen",
      url: "https://www.fahrschule7.de/beratungstermin/",
    },
    fallbackContact: {
      label: "Telefon",
      value: "04161 / 504 900",
    },
    companyInfo: {
      address: "Konopkastraße 9, 21614 Buxtehude",
      phone: "04161 / 504 900",
      email: "info@fahrschule7.de",
      openingHours: "Persönliche Beratung nach Kontaktaufnahme",
    },
    rules: {
      noMedicalClaims: true,
      noInventingPrices: true,
      noGuarantees: true,
    },
    theme: {
      accent: "#f28c28",
      bg: "#fff8ef",
      glass: "rgba(242,140,40,0.14)",
      text: "#181818",
    },
    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  "fahrschule-niehaus": {
    id: "fahrschule-niehaus",
    brandName: "Fahrschule Niehaus",
    assistantName: "Führerschein-Assistent",
    language: "de",
    knowledge: {
      files: ["eKnowledge.md"],
    },
    websiteUrl: "https://www.fahrschule-niehaus.de/",
    primaryCta: {
      label: "Website öffnen",
      url: "https://www.fahrschule-niehaus.de/",
    },
    fallbackContact: {
      label: "Telefon",
      value: "07221 25257",
    },
    companyInfo: {
      address: "Baden-Baden und Bühl",
      phone: "07221 25257",
      email: "info@fahrschule-niehaus.de",
      openingHours: "Siehe eKnowledge für beide Standorte",
    },
    rules: {
      noMedicalClaims: true,
      noInventingPrices: false,
      noGuarantees: true,
    },
    theme: {
      accent: "#245b84",
      bg: "#f5f9fc",
      glass: "rgba(36,91,132,0.13)",
      text: "#142433",
    },
    assets: {
      launcherIcon: "/favicon.ico",
    },
  },

  "fahrschule-fritz": {
    id: "fahrschule-fritz",
    brandName: "Fahrschule Fritz",
    assistantName: "Ferienkurs- & Führerschein-Assistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://www.fahrschulefritz.de/",
    primaryCta: { label: "Website öffnen", url: "https://www.fahrschulefritz.de/" },
    fallbackContact: { label: "Telefon", value: "0385 / 64 63 70" },
    companyInfo: {
      address: "Goethestraße 68, 19053 Schwerin",
      phone: "0385 / 64 63 70",
      email: "info@fahrschulefritz.de",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#e30613", bg: "#fff7f7", glass: "#e3061320", text: "#1c1c1c" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "cans-fahrschule": {
    id: "cans-fahrschule",
    brandName: "Can's Fahrschule",
    assistantName: "5-Tage-Theorie- & Führerschein-Assistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://www.cansfahrschule.de/",
    primaryCta: { label: "Online voranmelden", url: "https://www.cansfahrschule.de/preise/" },
    fallbackContact: { label: "Telefon", value: "+49 221 60854544" },
    companyInfo: {
      address: "Montanusstraße 1, 51065 Köln",
      phone: "+49 221 60854544",
      email: "kontakt@cansfahrschule.de",
      openingHours: "Mo–Fr 10:00–19:00 Uhr · Sa 10:00–16:00 Uhr",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#fca700", bg: "#fffaf0", glass: "rgba(252,167,0,0.18)", text: "#0a0a0a" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "tek-fahrschule": {
    id: "tek-fahrschule",
    brandName: "TEK Fahrschule",
    assistantName: "LernBoosting- & Führerschein-Assistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://www.tek-fahrschule.koeln/",
    primaryCta: { label: "Kontakt aufnehmen", url: "https://www.tek-fahrschule.koeln/Kontakt.html" },
    fallbackContact: { label: "Telefon", value: "0221-379 038 48" },
    companyInfo: {
      address: "Fuldaer Str. 19, 51103 Köln",
      phone: "0221-379 038 48",
      email: "info@tek-fahrschule.de",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#ff5e14", bg: "#fff7f3", glass: "rgba(255,94,20,0.18)", text: "#212529" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "fahrschule-fix": {
    id: "fahrschule-fix",
    brandName: "Fahrschule FiX",
    assistantName: "Standort- & Führerschein-Assistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://fahrschule-fix.de/",
    primaryCta: { label: "Standort auswählen", url: "https://fahrschule-fix.de/standort/" },
    fallbackContact: { label: "Kontakt", value: "Standort auf der Website auswählen" },
    companyInfo: {
      address: "6 Standorte in Bonn, Köln, Leichlingen und Solingen",
      phone: "Standortabhängig",
      email: "Standortabhängig",
      openingHours: "Je nach Filiale – siehe eKnowledge und Standortseite",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#dc2626", bg: "#fff7f7", glass: "rgba(220,38,38,0.17)", text: "#111827" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "fahrschule-yoendem": {
    id: "fahrschule-yoendem",
    brandName: "Fahrschule Yöndem",
    assistantName: "Mehrsprachiger Führerschein-Assistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://xn--fahrschule-yndem-xwb.de/",
    primaryCta: { label: "Kontakt aufnehmen", url: "https://xn--fahrschule-yndem-xwb.de/contact-us/" },
    fallbackContact: { label: "Telefon Kalk", value: "0221 16813086" },
    companyInfo: {
      address: "Kalk-Mülheimer Str. 99, 51103 Köln · Bonner Str. 233, 50968 Köln",
      phone: "Kalk: 0221 16813086 · Bayenthal: 0221 96260368",
      email: "info@fahrschule-yoendem.de",
      openingHours: "Theorie Mo–Fr 18:30–20:00 Uhr · Sa 10:00–13:00 Uhr",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#b51616", bg: "#fff8f8", glass: "rgba(181,22,22,0.17)", text: "#222222" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "fahrschule-fahrtwind": {
    id: "fahrschule-fahrtwind",
    brandName: "Fahrschule Fahrtwind",
    assistantName: "Dein Führerschein-Begleiter",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://fahrtwind-fahrschule.de/",
    primaryCta: { label: "Website öffnen", url: "https://fahrtwind-fahrschule.de/" },
    fallbackContact: { label: "Telefon", value: "0385 / 480 71 100" },
    companyInfo: {
      address: "Büdnerstraße 9, 19057 Schwerin",
      phone: "0385 / 480 71 100",
      email: "info@fahrtwind-fahrschule.de",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#18a6b8", bg: "#f2fbfc", glass: "#18a6b820", text: "#14272b" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "fahrschule-wiesenberg": {
    id: "fahrschule-wiesenberg",
    brandName: "Fahrschule Wiesenberg",
    assistantName: "Mobilitäts- & Führerschein-Assistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://fs-wiesenberg.de/",
    primaryCta: { label: "Website öffnen", url: "https://fs-wiesenberg.de/" },
    fallbackContact: { label: "Telefon", value: "0385 / 555 7 555" },
    companyInfo: {
      address: "Wismarsche Straße 137, 19053 Schwerin",
      phone: "0385 / 555 7 555",
      email: "info@fs-wiesenberg.de",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#2f7d32", bg: "#f5fbf5", glass: "#2f7d3220", text: "#173019" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "fahrschule-pawlowski": {
    id: "fahrschule-pawlowski",
    brandName: "Fahrschule Pawlowski",
    assistantName: "Ferienkurs-Assistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://www.fahrschule-pawlowski.de/",
    primaryCta: { label: "Website öffnen", url: "https://www.fahrschule-pawlowski.de/" },
    fallbackContact: { label: "Telefon", value: "0177 / 2433181" },
    companyInfo: {
      address: "Schwerin",
      phone: "0177 / 2433181",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#d71920", bg: "#fff7f7", glass: "#d7192020", text: "#211719" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "bootsfahrschule-schwerin": {
    id: "bootsfahrschule-schwerin",
    brandName: "Bootsfahrschule Schwerin",
    assistantName: "Bootsführerschein-Lotse",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://bootsfahrschule-schwerin.net/",
    primaryCta: { label: "Website öffnen", url: "https://bootsfahrschule-schwerin.net/" },
    fallbackContact: { label: "Telefon", value: "0385 / 20 79 683" },
    companyInfo: {
      address: "Schwerin",
      phone: "0385 / 20 79 683",
      email: "kopplin@freenet.de",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#087ca7", bg: "#f0f9fc", glass: "#087ca720", text: "#102d38" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "fahrschule-westedt": {
    id: "fahrschule-westedt",
    brandName: "Verkehrsinstitut Fahrschule Westedt",
    assistantName: "Führerschein- & Lehrgangsassistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://www.fahrschule-westedt.de/",
    primaryCta: { label: "Website öffnen", url: "https://www.fahrschule-westedt.de/" },
    fallbackContact: { label: "Telefon", value: "0173 / 6104348" },
    companyInfo: {
      address: "Ludwigslust",
      phone: "0173 / 6104348",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#d5232a", bg: "#fff6f6", glass: "#d5232a20", text: "#20191a" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "fahrschule-bollow": {
    id: "fahrschule-bollow",
    brandName: "Fahrschule Familie Bollow",
    assistantName: "Führerschein- & Mobilitätsassistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://www.bollow-busreisen.de/",
    primaryCta: { label: "Website öffnen", url: "https://www.bollow-busreisen.de/" },
    fallbackContact: { label: "Telefon", value: "038751 / 211 08" },
    companyInfo: {
      address: "Ludwigsluster Straße 4, 19288 Warlow",
      phone: "038751 / 211 08",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#b62025", bg: "#fff7f5", glass: "#b6202520", text: "#251a18" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "fahrschule-hoenemann": {
    id: "fahrschule-hoenemann",
    brandName: "Fahrschule Hönemann",
    assistantName: "Führerschein-Assistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://www.fahrschule-hoenemann.de/",
    primaryCta: { label: "Website öffnen", url: "https://www.fahrschule-hoenemann.de/" },
    fallbackContact: { label: "Website", value: "https://www.fahrschule-hoenemann.de/" },
    companyInfo: {
      address: "Pampin, Parchim, Lübz und Ludwigslust",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#f28c00", bg: "#fff9ef", glass: "#f28c0020", text: "#231d14" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "fahrschule-jantzen": {
    id: "fahrschule-jantzen",
    brandName: "Fahrschule C. Jantzen",
    assistantName: "FUN-LEARN Führerschein-Assistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://www.fahrschule-in-wismar.de/",
    primaryCta: { label: "Website öffnen", url: "https://www.fahrschule-in-wismar.de/" },
    fallbackContact: { label: "Telefon", value: "03841 212077" },
    companyInfo: {
      address: "Wismar und Neukloster",
      phone: "03841 212077",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#e52329", bg: "#fff7f7", glass: "#e5232920", text: "#201719" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "fahrschule-neptun": {
    id: "fahrschule-neptun",
    brandName: "Fahrschule Neptun",
    assistantName: "Ausbildungs- & Simulator-Assistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://fahrschule-neptun.de/",
    primaryCta: { label: "Website öffnen", url: "https://fahrschule-neptun.de/" },
    fallbackContact: { label: "Telefon", value: "03841 3760808" },
    companyInfo: {
      address: "Lübsche Straße 95, 23966 Wismar",
      phone: "03841 3760808",
      email: "info@fahrschule-neptun.de",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#0a89a8", bg: "#f1fafc", glass: "#0a89a820", text: "#102b32" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "bb-fahrschule": {
    id: "bb-fahrschule",
    brandName: "Fahrschule BB Wismar",
    assistantName: "Führerschein- & Simulator-Assistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://bb-fahrschule.de/",
    primaryCta: { label: "Website öffnen", url: "https://bb-fahrschule.de/" },
    fallbackContact: { label: "Telefon", value: "03841 7387122" },
    companyInfo: {
      address: "Wismar",
      phone: "03841 7387122",
      email: "info@bb-fahrschule.de",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#e31b23", bg: "#fff6f7", glass: "#e31b2320", text: "#251719" },
    assets: { launcherIcon: "/favicon.ico" },
  },

  "hansefahrschule-rennhack": {
    id: "hansefahrschule-rennhack",
    brandName: "Hansefahrschule Rennhack",
    assistantName: "Hanse-Führerschein-Assistent",
    language: "de",
    knowledge: { files: ["eKnowledge.md"] },
    websiteUrl: "https://www.hansefahrschule-rennhack.de/",
    primaryCta: { label: "Website öffnen", url: "https://www.hansefahrschule-rennhack.de/" },
    fallbackContact: { label: "Telefon", value: "03841 / 2272733" },
    companyInfo: {
      address: "Ulmenstraße 2, 23966 Wismar",
      phone: "03841 / 2272733",
      email: "info@hansefahrschule-rennhack.de",
      openingHours: "Aktuelle Zeiten bitte auf der Website prüfen",
    },
    rules: { noMedicalClaims: true, noInventingPrices: true, noGuarantees: true },
    theme: { accent: "#174a7e", bg: "#f3f7fb", glass: "#174a7e20", text: "#142637" },
    assets: { launcherIcon: "/favicon.ico" },
  },

    txbikesV2: {
    id: "txbikesV2",
    brandName: "TXBIKESV2",
    assistantName: "TX Doc",
    language: "de",

    knowledge: {
      files: ["knowledge.md"],
    },

    websiteUrl: "https://txbikesV2.de",

    primaryCta: {
      label: "Termin buchen",
      url: "https://txbikes.de/pages/kontakt",
    },

    fallbackContact: {
      label: "Kontakt",
      value: "Über das Kontaktformular auf txbikes.de",
    },

    companyInfo: {
      address: "Duisburg Süd & Düsseldorf Nord",
      phone: "Über das Kontaktformular auf txbikes.de",
      email: "Über das Kontaktformular auf txbikes.de",
      openingHours: "Nach Vereinbarung",
    },

    contacts: [
      {
        name: "Tarik",
        role: "Ansprechpartner / Fahrradservice",
        email: "Über das Kontaktformular auf txbikes.de",
      },
    ],

    rules: {
      noMedicalClaims: true,
      noInventingPrices: true,
      noGuarantees: true,
    },

    theme: {
      accent: "#4f8f3a",
      bg: "#07100a",
      glass: "rgba(79,143,58,0.16)",
      text: "#f2f8ef",
    },

    assets: {
      launcherIcon: "/favicon.ico",
    },
  },
};

const TENANT_ALIASES: Record<string, TenantId> = {
  lina: "btdesigns",
  btai: "btdesigns",
  "btdesigns-lina": "btdesigns",
  mmwartung: "mm-wartung",
  "mm_wartung": "mm-wartung",
  "mm-wartung.de": "mm-wartung",
  fahrwerkb: "fahrwerk-b",
  "fahrwerk_b": "fahrwerk-b",
  "fahrwerk-b.de": "fahrwerk-b",
  fahrwerk: "fahrwerk-b",
  txbikesv2: "txbikesV2",
  "tx-bikes": "txbikes",
  "tx_bikes": "txbikes",
  profcar: "profcar",
  "prof-car": "profcar",
  "profcar-koeln": "profcar",
  "profcar.com": "profcar",
  "www.profcar.com": "profcar",
  hohenbaden: "fahrschule-hohenbaden",
  "fahrschule-in7days": "fahrschule-hohenbaden",
  in7days: "fahrschule-hohenbaden",
  "in7-days": "fahrschule-hohenbaden",
  "fahrschule-hohenbaden.de": "fahrschule-hohenbaden",
  fahrschulehohenbaden: "fahrschule-hohenbaden",
  hopla: "fahrschule-hopla",
  "fahrschule-hopla.de": "fahrschule-hopla",
  "www.fahrschule-hopla.de": "fahrschule-hopla",
  fahrschulehopla: "fahrschule-hopla",
  alamir: "fahrschule-alamir",
  "al-amir": "fahrschule-alamir",
  "fahrschulealamir.de": "fahrschule-alamir",
  "www.fahrschulealamir.de": "fahrschule-alamir",
  fahrschulealamir: "fahrschule-alamir",
  abgefahren: "fahrschule-abgefahren",
  "abgefahren-schwerin": "fahrschule-abgefahren",
  abgefahrenschwerin: "fahrschule-abgefahren",
  "abgefahren-schwerin.de": "fahrschule-abgefahren",
  petermaennchen: "petermaennchen-fahrschule",
  petermännchen: "petermaennchen-fahrschule",
  "petermaennchen-fahrschule": "petermaennchen-fahrschule",
  "petermaennchen-fahrschule.de": "petermaennchen-fahrschule",
  petermaennchenfahrschule: "petermaennchen-fahrschule",
  schelf: "schelf-fahrschule",
  schelffahrschule: "schelf-fahrschule",
  "schelf-fahrschule.de": "schelf-fahrschule",
  "schelf-schwerin": "schelf-fahrschule",
  "schelf-crivitz": "schelf-fahrschule",
  jentsch: "fahrschule-jentsch",
  "jentsch-schwerin": "fahrschule-jentsch",
  "fahrschule-jentsch-schwerin": "fahrschule-jentsch",
  "fahrschule-jentsch-schwerin.de": "fahrschule-jentsch",
  "asphalt-crew": "asphaltcrew",
  "asphaltcrew-rastatt": "asphaltcrew",
  "asphaltcrew.info": "asphaltcrew",
  "www.asphaltcrew.info": "asphaltcrew",
  malik: "fahrschule-malik",
  "malik-rastatt": "fahrschule-malik",
  "malik-karlsruhe": "fahrschule-malik",
  "fahrschule-malik.de": "fahrschule-malik",
  "fahrschule-7": "fahrschule7",
  "fahrschule7-buxtehude": "fahrschule7",
  "fahrschule7.de": "fahrschule7",
  "www.fahrschule7.de": "fahrschule7",
  niehaus: "fahrschule-niehaus",
  "fahrschule-niehaus.de": "fahrschule-niehaus",
  "www.fahrschule-niehaus.de": "fahrschule-niehaus",
  "niehaus-baden-baden": "fahrschule-niehaus",
  "niehaus-buehl": "fahrschule-niehaus",
  "fritz": "fahrschule-fritz",
  "fahrschulefritz.de": "fahrschule-fritz",
  "fahrtwind": "fahrschule-fahrtwind",
  "fahrtwind-fahrschule.de": "fahrschule-fahrtwind",
  "wiesenberg": "fahrschule-wiesenberg",
  "fs-wiesenberg.de": "fahrschule-wiesenberg",
  "pawlowski": "fahrschule-pawlowski",
  "fahrschule-pawlowski.de": "fahrschule-pawlowski",
  "bootsfahrschule-schwerin": "bootsfahrschule-schwerin",
  "bootsfahrschule-schwerin.net": "bootsfahrschule-schwerin",
  "westedt": "fahrschule-westedt",
  "fahrschule-westedt.de": "fahrschule-westedt",
  "bollow": "fahrschule-bollow",
  "bollow-busreisen.de": "fahrschule-bollow",
  "hoenemann": "fahrschule-hoenemann",
  "fahrschule-hoenemann.de": "fahrschule-hoenemann",
  "jantzen": "fahrschule-jantzen",
  "fahrschule-in-wismar.de": "fahrschule-jantzen",
  "neptun": "fahrschule-neptun",
  "fahrschule-neptun.de": "fahrschule-neptun",
  "bb-fahrschule": "bb-fahrschule",
  "bb-fahrschule.de": "bb-fahrschule",
  "hansefahrschule-rennhack": "hansefahrschule-rennhack",
  "hansefahrschule-rennhack.de": "hansefahrschule-rennhack",
  cans: "cans-fahrschule",
  "can-fahrschule": "cans-fahrschule",
  "cans-fahrschule": "cans-fahrschule",
  "cansfahrschule.de": "cans-fahrschule",
  "www.cansfahrschule.de": "cans-fahrschule",
  tek: "tek-fahrschule",
  "tek-fahrschule": "tek-fahrschule",
  "tek-fahrschule.koeln": "tek-fahrschule",
  "www.tek-fahrschule.koeln": "tek-fahrschule",
  fix: "fahrschule-fix",
  "fahrschule-fix": "fahrschule-fix",
  "fahrschule-fix.de": "fahrschule-fix",
  "www.fahrschule-fix.de": "fahrschule-fix",
  yoendem: "fahrschule-yoendem",
  yöndem: "fahrschule-yoendem",
  "fahrschule-yoendem": "fahrschule-yoendem",
  "fahrschule-yöndem": "fahrschule-yoendem",
  "fahrschule-yoendem.de": "fahrschule-yoendem",
  "xn--fahrschule-yndem-xwb.de": "fahrschule-yoendem",
};

export function getTenant(tenant: string | null): TenantConfig {
  const rawTenant = (tenant || "demo").trim();
  const directTenant = TENANTS[rawTenant as TenantId];

  if (directTenant) return directTenant;

  const aliasTenantId = TENANT_ALIASES[rawTenant.toLowerCase()];
  return aliasTenantId ? TENANTS[aliasTenantId] : TENANTS.demo;
}
