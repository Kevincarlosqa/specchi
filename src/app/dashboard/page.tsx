import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Card, CardTitle, Delta, DemoNote, EmptyState, PageHeader, pct } from "@/components/dashboard/ui";
import { GoalMeter, HBarChart, Heatmap, RevenueChart, Spark } from "@/components/dashboard/charts";
import { DemoTour } from "@/components/dashboard/demo-tour";
import { RadarList } from "@/components/dashboard/radar";
import { getAnalytics } from "@/lib/analytics";
import { requireUser, scopeBranches } from "@/lib/auth";
import { config } from "@/lib/config";
import { getSelectedBranch } from "@/lib/dashboard";
import { getInsights } from "@/lib/insights";
import { CHANNEL_LABELS } from "@/lib/labels";
import { getDashboardMetrics, PERIOD_DAYS, type Period } from "@/lib/metrics";
import { db } from "@/lib/prisma";
import { cn, formatMoney } from "@/lib/utils";

export default async function DashboardHome({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  if (user.role === "RECEPTION") redirect("/dashboard/agenda");
  const sp = await searchParams;
  const period: Period = typeof sp.p === "string" && sp.p in PERIOD_DAYS ? (sp.p as Period) : "30d";
  const selected = await getSelectedBranch(user);
  const prisma = await db();
  const branchIds = scopeBranches(user, selected);
  const stylist = user.role === "STYLIST";
  const [m, a, insights] = await Promise.all([
    getDashboardMetrics(prisma, { branchIds, stylistId: stylist ? user.stylistId : null }, period),
    stylist ? null : getAnalytics(prisma, branchIds),
    stylist ? [] : getInsights(prisma, branchIds),
  ]);
  const branchName = selected === "all" ? (user.branchIds ? "tus sedes" : "todas las sedes") : ((await prisma.branch.findUnique({ where: { id: selected } }))?.name ?? "");
  const k = m.kpis;
  const p = m.prevKpis;
  const sparkRevenue = m.daily.map((d) => d.revenue);
  const sparkBookings = m.daily.map((d) => d.bookings);

  const kpis = [
    { label: "Ingresos", value: formatMoney(k.revenueCents), delta: <Delta current={k.revenueCents} previous={p.revenueCents} />, spark: sparkRevenue, tone: "from-blush to-paper" },
    { label: "Reservas", value: k.bookings.toLocaleString("es-PE"), delta: <Delta current={k.bookings} previous={p.bookings} />, spark: sparkBookings, tone: "from-lilac/40 to-paper" },
    { label: "Ticket medio", value: formatMoney(k.avgTicketCents), delta: <Delta current={k.avgTicketCents} previous={p.avgTicketCents} />, tone: "from-peach/40 to-paper" },
    { label: "Ocupación", value: pct(k.occupancy), delta: <Delta current={k.occupancy} previous={p.occupancy} format="pts" />, tone: "from-butter/70 to-paper" },
    { label: "No-show", value: pct(k.noShowRate), delta: <Delta current={k.noShowRate} previous={p.noShowRate} format="pts" invert />, tone: "from-[#d9f2ec] to-paper" },
    { label: "Nuevos / recurrentes", value: `${k.newCustomers} / ${k.returningCustomers}`, delta: <Delta current={k.newCustomers} previous={p.newCustomers} />, tone: "from-sand to-paper" },
  ];

  return (
    <>
      <PageHeader
        eyebrow={stylist ? "Tu espejo" : "Centro de mando"}
        title={stylist ? `Hola, ${user.name.split(" ")[0]}` : "Así va SPECCHi hoy"}
        description={`${stylist ? "Tus números" : `Mostrando ${branchName}`} · ${m.range.from.split("-").reverse().join("/")} – ${m.range.to.split("-").reverse().join("/")} · comparado con el periodo anterior`}
        actions={
          <nav aria-label="Periodo" className="flex rounded-full border border-line bg-paper p-1">
            {(Object.keys(PERIOD_DAYS) as Period[]).map((key) => (
              <Link key={key} href={`/dashboard?p=${key}`} aria-current={period === key ? "true" : undefined} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors", period === key ? "bg-ink text-paper" : "text-ink-soft hover:bg-sand")}>
                {PERIOD_DAYS[key]} días
              </Link>
            ))}
          </nav>
        }
      />

      {config.demoMode && !stylist ? <DemoTour /> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={cn("flex flex-col gap-2 bg-linear-to-b", kpi.tone)}>
            <p className="text-xs font-medium text-ink-soft">{kpi.label}</p>
            <p className="font-display text-[2rem] leading-none tabular-nums">{kpi.value}</p>
            <div className="flex min-h-9 items-end justify-between gap-2">
              {kpi.delta}
              {kpi.spark ? <Spark data={kpi.spark} label={`Tendencia de ${kpi.label}`} /> : null}
            </div>
          </Card>
        ))}
      </div>

      {a ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <Card className="relative overflow-hidden border-0 bg-plum text-paper">
            <div className="mesh opacity-50" aria-hidden>
              <i style={{ width: 280, height: 280, right: -60, top: -80, color: "#c2337a" }} />
              <i style={{ width: 220, height: 220, left: -40, bottom: -90, color: "#6d4bd1", animationDelay: "-8s" }} />
            </div>
            <div className="relative">
              <CardTitle className="[&_p]:text-paper/75" hint="Las acciones con más impacto, calculadas con tus datos de hoy">
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-peach" aria-hidden /> Radar SPECCHi
                </span>
              </CardTitle>
              <RadarList insights={insights.slice(0, 5)} />
            </div>
          </Card>
          <Card>
            <CardTitle hint="Ventas cobradas sin propinas, contra la meta de las sedes elegidas" action={<Link href="/dashboard/analitica" className="inline-flex items-center gap-1 text-xs font-semibold text-rose hover:underline">Analítica <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
              Meta del mes
            </CardTitle>
            <GoalMeter mtd={a.goal.mtdCents} projected={a.goal.projectedCents} goal={a.goal.goalCents} booked={a.goal.bookedCents} day={a.goal.dayOfMonth} days={a.goal.daysInMonth} />
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
              <div>
                <dt className="text-muted">Propinas (16 semanas)</dt>
                <dd className="text-sm font-semibold tabular-nums">{formatMoney(a.tipsCents)}</dd>
              </div>
              <div>
                <dt className="text-muted">Gasto por cliente (16 semanas)</dt>
                <dd className="text-sm font-semibold tabular-nums">{formatMoney(a.revenuePerCustomerCents)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle hint="Reservas completadas, por fecha de la cita">Ingresos diarios</CardTitle>
          <RevenueChart data={m.daily} />
        </Card>
        <Card>
          <CardTitle hint="Reservas no canceladas">Reservas por canal</CardTitle>
          {m.byChannel.length ? <HBarChart data={m.byChannel.map((c) => ({ name: CHANNEL_LABELS[c.channel], value: c.count }))} valueLabel="Reservas" format="count" color="#6d4bd1" /> : <EmptyState title="Sin reservas" />}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {!stylist && m.byBranch.length > 1 ? (
          <Card>
            <CardTitle hint="Ingresos del periodo">Ingresos por sede</CardTitle>
            <HBarChart data={[...m.byBranch].sort((x, y) => y.revenue - x.revenue).map((b) => ({ name: b.name, value: b.revenue, extra: `${b.bookings} reservas` }))} valueLabel="Ingresos" />
          </Card>
        ) : null}
        <Card>
          <CardTitle hint="Por ingresos">Servicios top</CardTitle>
          {m.topServices.length ? <HBarChart data={m.topServices.map((s) => ({ name: s.name, value: s.revenue, extra: `${s.count} citas` }))} valueLabel="Ingresos" color="#149a8b" /> : <EmptyState title="Aún no hay servicios en este periodo" />}
        </Card>
        <Card className={stylist || m.byBranch.length <= 1 ? "" : "xl:col-span-2"}>
          <CardTitle hint="Inicio de la cita, hora local: úsalo para repartir turnos y ofertas">Horas pico</CardTitle>
          <Heatmap data={m.heat} />
        </Card>
      </div>

      {!stylist ? (
        <Card className="mt-4">
          <CardTitle hint="Rebooking = vuelve a reservar dentro de 60 días">Ranking de especialistas</CardTitle>
          {m.stylistRanking.length ? (
            <div className="overflow-x-auto" data-lenis-prevent>
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2 font-medium">#</th>
                    <th className="py-2 font-medium">Especialista</th>
                    <th className="py-2 text-right font-medium">Ingresos</th>
                    <th className="py-2 pl-6 font-medium">Ocupación</th>
                    <th className="py-2 text-right font-medium">Rebooking</th>
                  </tr>
                </thead>
                <tbody>
                  {m.stylistRanking.slice(0, 12).map((s, i) => (
                    <tr key={s.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 text-muted tabular-nums">{i + 1}</td>
                      <td className="py-2.5 font-medium">{s.name}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatMoney(s.revenue * 100)}</td>
                      <td className="py-2.5 pl-6">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-sand" aria-hidden>
                            <div className="h-full rounded-full bg-linear-to-r from-rose to-coral" style={{ width: `${Math.round(s.occupancy * 100)}%` }} />
                          </div>
                          <span className="text-xs tabular-nums">{pct(s.occupancy)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{pct(s.rebooking)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Sin datos de especialistas" />
          )}
        </Card>
      ) : null}

      {config.demoMode ? <DemoNote className="mt-4">Todas las cifras son datos de ejemplo generados para esta demostración, no resultados reales de SPECCHi.</DemoNote> : null}
    </>
  );
}
