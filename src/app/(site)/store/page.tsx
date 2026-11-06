import type { Metadata } from "next";
import { StorePage } from "@/components/site/store-page";
import { config } from "@/lib/config";
import { getLandingData } from "@/lib/landing";

export const metadata: Metadata = { title: "Store y gift cards", description: "Kérastase, Olaplex, Moroccanoil, Davines, Redken y más. Gift cards de spa y salón." };

export default async function Page() {
  const { products } = await getLandingData();
  return <StorePage products={products} whatsapp={config.WHATSAPP_PUBLIC_NUMBER} demo={config.demoMode} />;
}
