import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai.btdesigns.de"),

  title: "BTAI – KI-Assistent",
  description:
    "Der intelligente digitale Assistent von BTDesigns – für schnelle Antworten, Beratung und digitale Kundenkommunikation.",

  openGraph: {
    title: "BTAI – KI-Assistent",
    description:
      "Der intelligente digitale Assistent von BTDesigns – für schnelle Antworten, Beratung und digitale Kundenkommunikation.",
    siteName: "BTAI",
    type: "website",
    locale: "de_DE",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BTAI – KI-Assistent",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "BTAI – KI-Assistent",
    description:
      "Der intelligente digitale Assistent von BTDesigns – für schnelle Antworten, Beratung und digitale Kundenkommunikation.",
    images: ["/og-image.png"],
  },

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}