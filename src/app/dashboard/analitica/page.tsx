import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardTitle, DemoNote, PageHeader, pct } from "@/components/dashboard/ui";
import { CohortTable, Funnel, HBarChart, RateLine, SERIES, Spark, StackedWeeks } from "@/components/dashboard/charts";
import { getAnalytics } from "@/lib/analytics";
import { requireUser, scopeBranches } from "@/lib/auth";
import { config } from "@/lib/config";
import { getSelectedBranch } from "@/lib/dashboard";
import { PAYMENT_LABELS } from "@/lib/labels";
import { db } from "@/lib/prisma";
import { computeSegments } from "@/lib/segments";
import { formatMoney } from "@/lib/utils";
import type { PaymentMethod } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Analítica" };

export default async function AnaliticaPage() {
  const user = await requireUser(["OWNER", "ADMIN", "BRANCH_MANAGER"]);
  const selected = await getSelectedBranch(user);
  const branchIds = scopeBranches(user, selected);
  const prisma = await db();
  const [a, seg] = await Promise.all([getAnalytics(prisma, branchIds), computeSegments(prisma, branchIds)]);
  const rate = (key: "noShowRate" | "whatsappShare" | "attachRate" | "onlineShare") => a.weeks.map((w) => ({ week: w.week, value: w[key] }));
  const segments = seg.rows.filter((r) => ["VIP", "LOYAL", "NEW", "AT_RISK", "LOST"].includes(r.key));
  const best = [...a.branchTable].sort((x, y) => y.perHour - x.perHour)[0];

  return (
    <>
      <PageHeader eyebrow="Negocio" title="Analítica" description="Últimas 16 semanas. Pensada para responder cuatro preguntas: de dónde viene el dinero, quién vuelve, qué sede rinde más y qué está mejorando." />

      <Card>
        <CardTitle hint="Sin propinas. La última semana está en curso.">¿De dónde viene el dinero?</CardTitle>
        <StackedWeeks data={a.weeks} />
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <Card>
          <CardTitle hint="Citas perdidas sobre citas atendidas">No-show</CardTitle>
          <RateLine data={rate("noShowRate")} label="No-show" color={SERIES.orchid} goodDirection="down" />
        </Card>
        <Card>
          <CardTitle hint="Reservas que llegan por WhatsApp">Adopción de WhatsApp</CardTitle>
          <RateLine data={rate("whatsappShare")} label="Reservas por WhatsApp" color={SERIES.violet} goodDirection="up" />
        </Card>
        <Card>
          <CardTitle hint="Reservas que entran solas: WhatsApp + web">Reservas sin recepción</CardTitle>
          <RateLine data={rate("onlineShare")} label="Reservas online" color={SERIES.teal} goodDirection="up" />
        </Card>
        <Card>
          <CardTitle hint="Tickets que incluyen un producto">Venta cruzada de tienda</CardTitle>
          <RateLine data={rate("attachRate")} label="Venta cruzada" color={SERIES.coral} goodDirection="up" />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardTitle hint="De cada mes de primera visita, qué parte volvió después. El mes en curso aún está incompleto.">¿Quién vuelve?</CardTitle>
          <CohortTable cohorts={a.cohorts} />
        </Card>
        <Card>
          <CardTitle hint="Citas ya ocurridas de las últimas 16 semanas. El % es sobre el paso anterior.">Embudo de la reserva al regreso</CardTitle>
          <Funnel steps={a.funnel} />
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle hint={best ? `Lo que más importa en un negocio de espacio y tiempo: ${best.name} es la que más factura por hora de agenda.` : undefined}>¿Qué sede rinde más?</CardTitle>
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 font-medium">Sede</th>
                <th className="py-2 text-right font-medium">Ingresos</th>
                <th className="py-2 font-medium pl-5">Tendencia</th>
                <th className="py-2 text-right font-medium">Por hora de agenda</th>
                <th className="py-2 text-right font-medium">Ticket medio</th>
                <th className="py-2 text-right font-medium">Ocupación</th>
                <th className="py-2 text-right font-medium">No-show</th>
                <th className="py-2 text-right font-medium">Venta cruzada</th>
                <th className="py-2 text-right font-medium">Reseñas</th>
              </tr>
            </thead>
            <tbody>
              {a.branchTable.map((b) => (
                <tr key={b.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2 font-semibold">{b.name}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(b.revenue * 100)}</td>
                  <td className="py-2 pl-5"><Spark data={b.spark.slice(0, -1)} label={`Tendencia de ${b.name}`} /></td>
                  <td className="py-2 text-right font-semibold tabular-nums">{formatMoney(b.perHour * 100)}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(b.avgTicket * 100)}</td>
                  <td className="py-2 text-right tabular-nums">{pct(b.occupancy, 0)}</td>
                  <td className="py-2 text-right tabular-nums">{pct(b.noShow)}</td>
                  <td className="py-2 text-right tabular-nums">{pct(b.attach, 0)}</td>
                  <td className="py-2 text-right tabular-nums">{b.rating ? `★ ${b.rating.toFixed(1)}` : "—"} <span className="text-xs text-muted">({b.reviews})</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle hint="Toca un segmento para crear una campaña" >Tu base de clientes</CardTitle>
          <ul className="divide-y divide-line">
            {segments.map((s) => (
              <li key={s.key}>
                <Link href={`/dashboard/campanas?segment=${s.key}`} className="flex flex-wrap items-center gap-x-4 gap-y-0.5 py-2.5 text-sm transition-colors hover:text-rose">
                  <span className="w-24 font-semibold">{s.label}</span>
                  <span className="min-w-40 flex-1 text-xs text-muted">{s.description}</span>
                  <span className="tabular-nums">{s.total.toLocaleString("es-PE")} <span className="text-xs text-muted">clientes</span></span>
                  <span className="w-24 text-right font-semibold tabular-nums">{formatMoney(s.avgSpendCents)} <span className="block text-[10px] font-normal text-muted">gasto medio</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle hint="16 semanas, en todas las sedes elegidas">Cómo te pagan</CardTitle>
          <HBarChart data={a.paymentMix.map((m) => ({ name: PAYMENT_LABELS[m.method as PaymentMethod], value: m.value }))} valueLabel="Cobrado por medio de pago" color={SERIES.teal} />
        </Card>
      </div>

      {config.demoMode ? <DemoNote className="mt-4">Datos de ejemplo. Con la operación real, estas gráficas se calculan solas desde la caja y la agenda.</DemoNote> : null}
    </>
  );
}
