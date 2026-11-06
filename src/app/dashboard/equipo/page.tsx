import type { Metadata } from "next";
import { AttendanceButton, CommissionEditor } from "@/components/dashboard/team-actions";
import { Badge, Card, CardTitle, DemoNote, PageHeader } from "@/components/dashboard/ui";
import { isAdmin, requireUser, scopeBranches } from "@/lib/auth";
import { config } from "@/lib/config";
import { getSelectedBranch } from "@/lib/dashboard";
import { LEVEL_LABELS } from "@/lib/labels";
import { db } from "@/lib/prisma";
import { formatLocal, localDateKey, wallToUtc, weekdayOf } from "@/lib/time";
import { cn, formatMoney, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Equipo y comisiones" };
const TZ = "America/Lima";

export default async function EquipoPage() {
  const user = await requireUser();
  const selected = await getSelectedBranch(user);
  const branchIds = scopeBranches(user, selected);
  const prisma = await db();
  const now = new Date();
  const todayKey = localDateKey(now, TZ);
  const monthStart = wallToUtc(`${todayKey.slice(0, 7)}-01`, 0, TZ);
  const stylistScope = user.role === "STYLIST" && user.stylistId ? { id: user.stylistId } : branchIds ? { schedules: { some: { branchId: { in: branchIds } } } } : {};

  const [stylists, items, attendance] = await Promise.all([
    prisma.stylist.findMany({ where: { active: true, ...stylistScope }, include: { schedules: { include: { branch: { select: { name: true } } } } }, orderBy: { name: "asc" } }),
    prisma.saleItem.findMany({
      where: { stylistId: { not: null }, sale: { status: "PAID", createdAt: { gte: monthStart }, ...(branchIds ? { branchId: { in: branchIds } } : {}) } },
      select: { stylistId: true, kind: true, totalCents: true, commissionCents: true },
    }),
    prisma.attendance.findMany({ where: { checkIn: { gte: wallToUtc(todayKey, 0, TZ) } }, orderBy: { checkIn: "desc" } }),
  ]);

  const wd = weekdayOf(todayKey);
  const rows = stylists
    .map((s) => {
      const own = items.filter((i) => i.stylistId === s.id);
      const services = own.filter((i) => i.kind === "SERVICE");
      const retail = own.filter((i) => i.kind === "PRODUCT");
      const serviceCents = services.reduce((a, i) => a + i.totalCents, 0);
      const retailCents = retail.reduce((a, i) => a + i.totalCents, 0);
      const today = s.schedules.filter((x) => x.weekday === wd);
      const att = attendance.find((a) => a.stylistId === s.id);
      const scheduledStart = today.length ? Math.min(...today.map((t) => t.startMin)) : null;
      const late = att && scheduledStart !== null ? new Date(att.checkIn).getTime() - wallToUtc(todayKey, scheduledStart, TZ).getTime() > 5 * 60_000 : false;
      return {
        s,
        serviceCents,
        retailCents,
        commission: own.reduce((a, i) => a + i.commissionCents, 0),
        tickets: services.length,
        branchToday: today[0]?.branchId ?? s.schedules[0]?.branchId ?? "",
        branchTodayName: today[0]?.branch.name ?? null,
        att,
        late,
        goalPct: s.monthlyGoalCents ? (serviceCents + retailCents) / s.monthlyGoalCents : 0,
      };
    })
    .sort((a, b) => b.commission - a.commission);
  const total = rows.reduce((a, r) => a + r.commission, 0);
  const present = rows.filter((r) => r.att && !r.att.checkOut).length;
  const scheduled = rows.filter((r) => r.branchTodayName).length;
  const late = rows.filter((r) => r.late).length;
  const monthName = formatLocal(now, TZ, "MMMM");

  return (
    <>
      <PageHeader eyebrow="Negocio" title={user.role === "STYLIST" ? "Mis comisiones" : "Equipo y comisiones"} description={`Comisiones de ${monthName}, calculadas con cada venta de la caja. Asistencia del día en tiempo real.`} />
      {user.role !== "STYLIST" ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { l: `Comisiones de ${monthName}`, v: formatMoney(total) },
            { l: "En sede ahora", v: `${present} de ${scheduled}` },
            { l: "Llegaron tarde hoy", v: String(late) },
            { l: "Personas en el equipo", v: String(rows.length) },
          ].map((k) => (
            <Card key={k.l}>
              <p className="text-xs text-muted">{k.l}</p>
              <p className="mt-1 font-display text-4xl leading-none tabular-nums">{k.v}</p>
            </Card>
          ))}
        </div>
      ) : null}

      <Card>
        <CardTitle hint="La barra muestra el avance contra la meta mensual de cada persona">Liquidación del mes</CardTitle>
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 font-medium">Especialista</th>
                <th className="py-2 font-medium">Hoy</th>
                <th className="py-2 text-right font-medium">Servicios</th>
                <th className="py-2 text-right font-medium">Tienda</th>
                <th className="py-2 pl-5 font-medium">Meta</th>
                <th className="py-2 text-right font-medium">Comisión</th>
                <th className="py-2 text-right font-medium">Tarifa</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, serviceCents, retailCents, commission, tickets, att, late: isLate, branchToday, branchTodayName, goalPct }) => (
                <tr key={s.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blush to-lilac/60 text-xs font-bold">{initials(s.name)}</span>
                      <span>
                        <span className="block leading-tight font-semibold">{s.name}</span>
                        <span className="text-xs text-muted">{s.title} · {LEVEL_LABELS[s.level]}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    {branchTodayName ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <AttendanceButton stylistId={s.id} branchId={branchToday} open={Boolean(att && !att.checkOut)} done={Boolean(att?.checkOut)} checkInLabel={att ? formatLocal(att.checkIn, TZ, "HH:mm") : null} />
                        {isLate ? <Badge className="bg-butter text-[#6f4a06]">Tarde</Badge> : null}
                        <span className="text-[11px] text-muted">{branchTodayName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">Descanso</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{formatMoney(serviceCents)} <span className="block text-[11px] text-muted">{tickets} atenciones</span></td>
                  <td className="py-2.5 text-right tabular-nums">{formatMoney(retailCents)}</td>
                  <td className="py-2.5 pl-5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-sand" aria-hidden>
                        <div className={cn("grow-x h-full rounded-full", goalPct >= 1 ? "bg-teal" : "bg-linear-to-r from-rose to-coral")} style={{ width: `${Math.min(100, goalPct * 100)}%` }} />
                      </div>
                      <span className="text-xs tabular-nums">{Math.round(goalPct * 100)} %</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-base font-semibold tabular-nums">{formatMoney(commission)}</td>
                  <td className="py-2.5 text-right">
                    {isAdmin(user) ? <CommissionEditor stylistId={s.id} commissionPct={s.commissionPct} retailPct={s.retailPct} /> : <span className="text-xs text-muted tabular-nums">{s.commissionPct} % / {s.retailPct} %</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {config.demoMode ? <DemoNote className="mt-4">Equipo ficticio. La tarifa es por servicios / tienda y se calcula sobre lo cobrado después de descuentos: cada empresa define sus porcentajes.</DemoNote> : null}
    </>
  );
}
