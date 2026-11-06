import type { Metadata } from "next";
import { BranchesPage } from "@/components/site/branches-page";
import { getLandingData } from "@/lib/landing";

export const metadata: Metadata = { title: "Sedes", description: "Angamos, Swissôtel, La Molina, Chacarilla, Jockey Plaza y Spa Swissôtel. Direcciones, horarios y contacto." };

export default async function Page() {
  const { branches } = await getLandingData();
  return <BranchesPage branches={branches} />;
}
