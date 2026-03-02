export type TenantId = "demo" | "zahnputzpulver" | "btdesigns";

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
    brandName: "Zahnputzpulver-Shop",
    assistantName: "Zahni",
    language: "de",

    knowledge: {
      files: ["knowledge.md"],
    },

    websiteUrl: "https://DEIN-SHOP.de",
    // primaryCta entfernt, damit der Button "Zum Produkt" im Widget nicht mehr erscheint

    fallbackContact: {
      label: "Support",
      value: "support@DEIN-SHOP.de",
    },

    companyInfo: {
      address: "Shopstraße 5, 54321 Handelsstadt",
      phone: "+49 987 654321",
      email: "support@DEIN-SHOP.de",
    },

    contacts: [
      {
        name: "Service Team",
        role: "Kundenservice",
        email: "support@DEIN-SHOP.de",
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
};

export function getTenant(tenant: string | null): TenantConfig {
  const key = (tenant || "demo") as TenantId;
  return TENANTS[key] ?? TENANTS.demo;
}