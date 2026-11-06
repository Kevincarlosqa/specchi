import type { Metadata } from "next";
import { CatalogPage } from "@/components/site/catalog-page";
import { SPA_CATEGORIES } from "@/lib/labels";
import { getLandingData } from "@/lib/landing";

export const metadata: Metadata = { title: "Carta de spa", description: "Rituales, masajes, faciales, corporales e hidroterapia en SPECCHi Spa Swissôtel." };

export default async function SpaPage() {
  const { services } = await getLandingData();
  return (
    <CatalogPage
      eyebrow="Carta de spa · Swissôtel, San Isidro"
      title="El mundo"
      accent="puede esperar"
      intro="Nuestros especialistas en bienestar están listos para atenderte: rituales de hasta cuatro horas, masajes de autor y faciales a medida."
      services={services.filter((s) => SPA_CATEGORIES.includes(s.category))}
      categories={SPA_CATEGORIES}
      heroClass="bg-lilac/20"
    />
  );
}
