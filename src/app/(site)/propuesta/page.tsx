import type { Metadata } from "next";
import { ProposalPage } from "@/components/site/proposal-page";

export const metadata: Metadata = { title: "La propuesta", description: "Plataforma de reservas, caja y fidelización para SPECCHi.", robots: { index: false } };

export default function Page() {
  return <ProposalPage />;
}
