import type { Metadata } from "next";
import { CampaignComposer } from "@/components/dashboard/campaign-composer";
import { Badge, Card, CardTitle, DemoNote, PageHeader } from "@/components/dashboard/ui";
import { requireUser, scopeBranches } from "@/lib/auth";
import { config } from "@/lib/config";
import { getSelectedBranch } from "@/lib/dashboard";
import { db } from "@/lib/prisma";
import { SEGMENTS, computeSegments, isSegment } from "@/lib/segments";
import { formatLocal } from "@/lib/time";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Campañas" };

export default async function CampanasPage({ searchParams }: PageProps<"/dashboard/campanas">) {
  const user = await requireUser(["OWNER", "ADMIN", "BRANCH_MANAGER"]);
  const sp = await searchParams;
  const selected = await getSelectedBranch(user);
  const prisma = await db();
  const [seg, campaigns] = await Promise.all([computeSegments(prisma, scopeBranches(user, selected)), prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 20 })]);
  const initial = isSegment(sp.segment) ? sp.segment : "AT_RISK";
  const totals = campaigns.reduce((a, c) => ({ audience: a.audience + c.audience, booked: a.booked + c.booked, revenue: a.revenue + c.revenueCents }), { audience: 0, booked: 0, revenue: 0 });

  return (
    <>
      <PageHeader eyebrow="Clientes" title="Campañas de WhatsApp" description="Elige a quién, escribe el mensaje y mira cuánto vuelve. Solo llega a quienes aceptaron recibir novedades." />
      <CampaignComposer key={initial} segments={seg.rows} initial={initial} demo={config.demoMode} />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { l: "Mensajes enviados", v: totals.audience.toLocaleString("es-PE") },
          { l: "Citas generadas", v: totals.booked.toLocaleString("es-PE") },
          { l: "Ingresos atribuidos", v: formatMoney(totals.revenue) },
        ].map((k) => (
          <Card key={k.l}>
            <p className="text-xs text-muted">{k.l}</p>
            <p className="mt-1 font-display text-4xl leading-none tabular-nums">{k.v}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardTitle hint="Citas e ingresos reservados después de recibir el mensaje">Resultados</CardTitle>
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 font-medium">Campaña</th>
                <th className="py-2 font-medium">Segmento</th>
                <th className="py-2 text-right font-medium">Enviados</th>
                <th className="py-2 text-right font-medium">Leídos</th>
                <th className="py-2 text-right font-medium">Citas</th>
                <th className="py-2 text-right font-medium">Conversión</th>
                <th className="py-2 text-right font-medium">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted">{c.sentAt ? formatLocal(c.sentAt, "America/Lima", "d MMM yyyy") : "Borrador"}{c.simulated ? " · simulada" : ""}</p>
                  </td>
                  <td className="py-2.5"><Badge>{SEGMENTS[c.segment as keyof typeof SEGMENTS]?.label ?? c.segment}</Badge></td>
                  <td className="py-2.5 text-right tabular-nums">{c.audience}</td>
                  <td className="py-2.5 text-right tabular-nums">{c.audience ? Math.round((c.readCount / c.audience) * 100) : 0} %</td>
                  <td className="py-2.5 text-right tabular-nums">{c.booked}</td>
                  <td className="py-2.5 text-right tabular-nums">{c.audience ? ((c.booked / c.audience) * 100).toFixed(1) : 0} %</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{formatMoney(c.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {config.demoMode ? <DemoNote className="mt-4">En esta demo no se envía ningún mensaje: los resultados son simulados. En producción se envían con plantillas aprobadas por Meta.</DemoNote> : null}
    </>
  );
}
