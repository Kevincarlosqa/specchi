import "server-only";
import type { Db } from "./prisma";
import { addDaysKey, localDateKey, wallToUtc, weekdayOf } from "./time";

const TZ = "America/Lima";
const DAY = 86_400_000;

const mondayOf = (key: string) => addDaysKey(key, -((weekdayOf(key) + 6) % 7));
const monthLabel = (key: string) => new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`)).replace(".", "");

/** Ventas de las últimas `weeks` semanas, ya agregadas por semana y por línea de negocio. */
export async function getAnalytics(prisma: Db, branchIds: string[] | undefined, weeks = 16, now = new Date()) {
  const todayKey = localDateKey(now, TZ);
  const firstWeek = addDaysKey(mondayOf(todayKey), -(weeks - 1) * 7);
  const from = wallToUtc(firstWeek, 0, TZ);
  const branchWhere = branchIds ? { branchId: { in: branchIds } } : {};

  const [branches, sales, bookings, schedules, reviews] = await Promise.all([
    prisma.branch.findMany({ where: branchIds ? { id: { in: branchIds } } : {}, orderBy: { sortOrder: "asc" } }),
    prisma.sale.findMany({
      where: { status: "PAID", createdAt: { gte: from }, ...branchWhere },
      select: { createdAt: true, branchId: true, totalCents: true, tipCents: true, method: true, customerId: true, items: { select: { kind: true, totalCents: true } } },
    }),
    prisma.booking.findMany({
      where: { startsAt: { gte: from }, ...branchWhere },
      select: { startsAt: true, status: true, channel: true, customerId: true, branchId: true, totalCents: true, items: { select: { durationMin: true } } },
    }),
    prisma.stylistSchedule.findMany({ where: { ...(branchIds ? { branchId: { in: branchIds } } : {}), stylist: { active: true } } }),
    prisma.review.findMany({ where: { createdAt: { gte: from }, ...branchWhere }, select: { branchId: true, rating: true } }),
  ]);
  const spaIds = new Set(branches.filter((b) => b.slug.startsWith("spa")).map((b) => b.id));

  // Semanas (índice común a todas las series)
  const weekKeys = Array.from({ length: weeks }, (_, i) => addDaysKey(firstWeek, i * 7));
  const idx = new Map(weekKeys.map((k, i) => [k, i]));
  const week = (d: Date) => idx.get(mondayOf(localDateKey(d, TZ)));
  const series = weekKeys.map((k) => ({ week: k, spa: 0, salon: 0, retail: 0, total: 0, completed: 0, noShow: 0, whatsapp: 0, online: 0, active: 0, retailTickets: 0, tickets: 0 }));

  const paymentMix = new Map<string, number>();
  const branchStats = new Map(branches.map((b) => [b.id, { revenue: 0, retail: 0, tickets: 0, retailTickets: 0, spark: weekKeys.map(() => 0), minutes: 0, completed: 0, noShow: 0 }]));
  let tips = 0;
  for (const s of sales) {
    const i = week(s.createdAt);
    if (i === undefined) continue;
    const row = series[i]!;
    const bs = branchStats.get(s.branchId);
    const retail = s.items.filter((x) => x.kind === "PRODUCT").reduce((a, x) => a + x.totalCents, 0);
    const service = s.totalCents - s.tipCents - retail;
    row.retail += retail / 100;
    if (spaIds.has(s.branchId)) row.spa += service / 100;
    else row.salon += service / 100;
    row.total += (s.totalCents - s.tipCents) / 100;
    row.tickets++;
    if (retail > 0) row.retailTickets++;
    tips += s.tipCents;
    paymentMix.set(s.method, (paymentMix.get(s.method) ?? 0) + s.totalCents / 100);
    if (bs) {
      bs.revenue += s.totalCents - s.tipCents;
      bs.retail += retail;
      bs.tickets++;
      if (retail) bs.retailTickets++;
      bs.spark[i]! += (s.totalCents - s.tipCents) / 100;
    }
  }

  // Embudo y tendencias de asistencia (solo citas ya pasadas)
  const nowMs = now.getTime();
  let total = 0,
    cancelled = 0,
    attended = 0,
    noShow = 0;
  const customerDates = new Map<string, number[]>();
  for (const b of bookings) {
    const i = week(b.startsAt);
    if (i === undefined) continue;
    const past = b.startsAt.getTime() < nowMs;
    const row = series[i]!;
    if (past) {
      total++;
      if (b.status === "CANCELLED") cancelled++;
      if (b.status === "COMPLETED") {
        attended++;
        row.completed++;
        customerDates.set(b.customerId, [...(customerDates.get(b.customerId) ?? []), b.startsAt.getTime()]);
      }
      if (b.status === "NO_SHOW") {
        noShow++;
        row.noShow++;
      }
    }
    if (b.status !== "CANCELLED") {
      row.active++;
      if (b.channel === "WHATSAPP") row.whatsapp++;
      if (b.channel === "WHATSAPP" || b.channel === "WEB") row.online++;
      const bs = branchStats.get(b.branchId);
      if (bs && past) {
        bs.minutes += b.items.reduce((a, x) => a + x.durationMin, 0);
        if (b.status === "COMPLETED") bs.completed++;
        if (b.status === "NO_SHOW") bs.noShow++;
      }
    }
  }
  const rebooked = [...customerDates.values()].filter((dates) => {
    const sorted = dates.sort((a, b) => a - b);
    return sorted.some((d, i) => i > 0 && d - sorted[i - 1]! <= 60 * DAY);
  }).length;
  const funnel = [
    { step: "Reservas hechas", value: total },
    { step: "No canceladas", value: total - cancelled },
    { step: "Asistieron", value: attended },
    { step: "Clientes únicos que asistieron", value: customerDates.size, restart: true },
    { step: "Volvieron en 60 días", value: rebooked },
  ];

  // Cohortes por mes de primera visita (retención real, no estimada)
  const firsts = await prisma.booking.groupBy({ by: ["customerId"], where: { status: "COMPLETED", ...branchWhere }, _min: { startsAt: true } });
  const visitsAll = await prisma.booking.findMany({ where: { status: "COMPLETED", ...branchWhere }, select: { customerId: true, startsAt: true } });
  const cohortKey = (d: Date) => localDateKey(d, TZ).slice(0, 7);
  const months: string[] = [];
  const [y, m] = todayKey.split("-").map(Number) as [number, number];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const cohortOf = new Map(firsts.map((f) => [f.customerId, cohortKey(f._min.startsAt!)]));
  const cohortSize = new Map<string, number>();
  for (const c of cohortOf.values()) cohortSize.set(c, (cohortSize.get(c) ?? 0) + 1);
  const seen = new Map<string, Set<string>>();
  for (const v of visitsAll) {
    const c = cohortOf.get(v.customerId);
    if (!c || !months.includes(c)) continue;
    const a = months.indexOf(c);
    const b = months.indexOf(cohortKey(v.startsAt));
    if (b < 0 || b === a) continue;
    const key = `${c}:${b - a}`;
    const set = seen.get(key) ?? new Set();
    set.add(v.customerId);
    seen.set(key, set);
  }
  const cohorts = months.map((c, a) => ({
    cohort: c,
    label: monthLabel(`${c}-15`),
    size: cohortSize.get(c) ?? 0,
    // null = el mes todavía no ocurre para esta cohorte.
    retention: months.map((_, k) => (k === 0 ? 1 : a + k >= months.length ? null : cohortSize.get(c) ? (seen.get(`${c}:${k}`)?.size ?? 0) / cohortSize.get(c)! : 0)),
  }));

  // Meta y proyección del mes
  const monthStart = `${todayKey.slice(0, 7)}-01`;
  const monthStartAt = wallToUtc(monthStart, 0, TZ);
  const mtdRows = await prisma.sale.aggregate({ where: { status: "PAID", createdAt: { gte: monthStartAt }, ...branchWhere }, _sum: { totalCents: true, tipCents: true } });
  const mtd = (mtdRows._sum.totalCents ?? 0) - (mtdRows._sum.tipCents ?? 0);
  const goal = branches.reduce((a, b) => a + b.monthlyGoalCents, 0);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dayOfMonth = Number(todayKey.slice(8, 10));
  const upcoming = await prisma.booking.aggregate({ where: { startsAt: { gte: now, lt: wallToUtc(addDaysKey(monthStart, daysInMonth), 0, TZ) }, status: { in: ["PENDING", "CONFIRMED"] }, ...branchWhere }, _sum: { totalCents: true } });
  const projected = dayOfMonth ? Math.round((mtd / dayOfMonth) * daysInMonth) : 0;

  // Comparativa de sedes
  const scheduledByBranch = new Map<string, number>();
  const pastDays = weeks * 7 - (6 - ((weekdayOf(todayKey) + 6) % 7));
  for (const s of schedules) {
    scheduledByBranch.set(s.branchId, (scheduledByBranch.get(s.branchId) ?? 0) + (s.endMin - s.startMin) * (pastDays / 7));
  }
  const ratings = new Map<string, { sum: number; n: number }>();
  for (const r of reviews) {
    const x = ratings.get(r.branchId) ?? { sum: 0, n: 0 };
    x.sum += r.rating;
    x.n++;
    ratings.set(r.branchId, x);
  }
  const branchTable = branches.map((b) => {
    const s = branchStats.get(b.id)!;
    const minutes = scheduledByBranch.get(b.id) ?? 0;
    const rating = ratings.get(b.id);
    return {
      id: b.id,
      name: b.name,
      revenue: s.revenue / 100,
      avgTicket: s.tickets ? s.revenue / s.tickets / 100 : 0,
      occupancy: minutes ? Math.min(1, s.minutes / minutes) : 0,
      noShow: s.completed + s.noShow ? s.noShow / (s.completed + s.noShow) : 0,
      retailShare: s.revenue ? s.retail / s.revenue : 0,
      attach: s.tickets ? s.retailTickets / s.tickets : 0,
      perHour: minutes ? s.revenue / 100 / (minutes / 60) : 0,
      rating: rating ? rating.sum / rating.n : null,
      reviews: rating?.n ?? 0,
      spark: s.spark,
    };
  });

  const currentWeekPartial = (weekdayOf(todayKey) + 6) % 7 < 6;
  const withRates = series.map((r) => ({
    ...r,
    noShowRate: r.completed + r.noShow ? r.noShow / (r.completed + r.noShow) : 0,
    whatsappShare: r.active ? r.whatsapp / r.active : 0,
    onlineShare: r.active ? r.online / r.active : 0,
    attachRate: r.tickets ? r.retailTickets / r.tickets : 0,
    avgTicket: r.tickets ? r.total / r.tickets : 0,
  }));

  const uniqueBuyers = new Set(sales.map((s) => s.customerId).filter(Boolean)).size;
  const netRevenue = sales.reduce((a, s) => a + s.totalCents - s.tipCents, 0);

  return {
    weeks: withRates,
    currentWeekPartial,
    funnel,
    cohorts,
    monthsAhead: months.length,
    paymentMix: [...paymentMix.entries()].map(([method, value]) => ({ method, value })).sort((a, b) => b.value - a.value),
    tipsCents: tips,
    goal: { goalCents: goal, mtdCents: mtd, projectedCents: projected, bookedCents: upcoming._sum.totalCents ?? 0, dayOfMonth, daysInMonth },
    branchTable,
    revenuePerCustomerCents: uniqueBuyers ? Math.round(netRevenue / uniqueBuyers) : 0,
    noShowCount: noShow,
    attended,
  };
}

export type Analytics = Awaited<ReturnType<typeof getAnalytics>>;
