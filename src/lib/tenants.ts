export type TenantId =
  | "demo"
  | "zahnputzpulver"
  | "btdesigns"
  | "bauteam"
  | "willi"
  | "mm-wartung"
  | "txbikes"
  | "txbikesV2"
  | "fahrwerk-b"
  | "fahrschule-hohenbaden"
  | "fahrschule-abgefahren"
  | "petermaennchen-fahrschule"
  | "schelf-fahrschule"
  | "fahrschule-jentsch"
  | "asphaltcrew"
  | "fahrschule-malik"
  | "fahrschule7"
  | "fahrschule-niehaus";

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
  hohenbaden: "fahrschule-hohenbaden",
  "fahrschule-in7days": "fahrschule-hohenbaden",
  in7days: "fahrschule-hohenbaden",
  "in7-days": "fahrschule-hohenbaden",
  "fahrschule-hohenbaden.de": "fahrschule-hohenbaden",
  fahrschulehohenbaden: "fahrschule-hohenbaden",
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
};

export function getTenant(tenant: string | null): TenantConfig {
  const rawTenant = (tenant || "demo").trim();
  const directTenant = TENANTS[rawTenant as TenantId];

  if (directTenant) return directTenant;

  const aliasTenantId = TENANT_ALIASES[rawTenant.toLowerCase()];
  return aliasTenantId ? TENANTS[aliasTenantId] : TENANTS.demo;
}
