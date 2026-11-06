import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Jost, Manrope } from "next/font/google";
import "./globals.css";

const display = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap" });
const sans = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const brand = Jost({ variable: "--font-jost", subsets: ["latin"], weight: ["300", "400"], display: "swap" });

const isDemo = process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL;

export const metadata: Metadata = {
  ...(isDemo ? { robots: { index: false, follow: false } } : {}),
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "SPECCHi — Peluquería & Spa en Lima", template: "%s · SPECCHi" },
  description: "39 años de experiencia en belleza y wellness. Spa, peluquería y tienda en Miraflores, San Isidro, La Molina, San Borja y Surco. Agenda tu cita online o por WhatsApp.",
  openGraph: { title: "SPECCHi — Peluquería & Spa", description: "39 años de experiencia en belleza y wellness. Agenda tu cita.", locale: "es_PE", type: "website" },
};

export const viewport: Viewport = { themeColor: "#fff9f1" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-PE" className={`${display.variable} ${sans.variable} ${brand.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
