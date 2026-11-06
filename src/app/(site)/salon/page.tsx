import type { Metadata } from "next";
import { CatalogPage } from "@/components/site/catalog-page";
import { SALON_CATEGORIES } from "@/lib/labels";
import { getLandingData } from "@/lib/landing";

export const metadata: Metadata = { title: "Salón", description: "Corte, color, peinado, uñas, cejas y maquillaje en Angamos, Swissôtel, La Molina, Chacarilla y Jockey Plaza." };

export default async function SalonPage() {
  const { services } = await getLandingData();
  return (
    <CatalogPage
      eyebrow="Salón · Cinco sedes en Lima"
      title="Cambia de"
      accent="reflejo"
      intro="Corte, color, peinado, uñas, cejas y maquillaje. Desde un cepillado rápido hasta el look completo para tu boda."
      services={services.filter((s) => SALON_CATEGORIES.includes(s.category))}
      categories={SALON_CATEGORIES}
      heroClass="bg-blush/40"
    />
  );
}
