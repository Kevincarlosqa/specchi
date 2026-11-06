import "server-only";
import type { Db } from "./prisma";
import { addDaysKey, localDateKey } from "./time";

const TZ = "America/Lima";
const DAY = 86_400_000;

export const SEGMENTS = {
  ALL: { label: "Toda la base", description: "Todos los clientes que aceptaron recibir novedades." },
  VIP: { label: "VIP", description: "Etiquetados VIP o en el 10 % que más gasta." },
  LOYAL: { label: "Fieles", description: "3 visitas o más, y vinieron en los últimos 45 días." },
  NEW: { label: "Nuevos", description: "Primera visita en los últimos 30 días: momento de fidelizar." },
  AT_RISK: { label: "En riesgo", description: "Venían seguido y llevan 60 a 120 días sin volver." },
  LOST: { label: "Perdidos", description: "Más de 120 días sin venir." },
  BIRTHDAY: { label: "Cumpleaños", description: "Cumplen años en los próximos 30 días." },
  SALON_ONLY: { label: "Solo salón", description: "Van al salón y nunca probaron el Spa." },
  SPA_ONLY: { label: "Solo spa", description: "Van al Spa y nunca probaron el salón." },
} as const;

export type SegmentKey = keyof typeof SEGMENTS;
export const isSegment = (v: unknown): v is SegmentKey => typeof v === "string" && v in SEGMENTS;

export interface SegmentRow {
  key: SegmentKey;
  label: string;
  description: string;
  total: number;
  reachable: number;
  revenueCents: number;
  avgSpendCents: number;
}

/** Calcula la pertenencia de cada cliente a los segmentos (un cliente puede estar en varios). */
export async function computeSegments(prisma: Db, branchIds?: string[], now = new Date()) {
  const branchFilter = branchIds ? { branchId: { in: branchIds } } : {};
  const [customers, visits, spa] = await Promise.all([
    prisma.customer.findMany({ select: { id: true, name: true, phone: true, tags: true, birthday: true, marketingOptIn: true } }),
    prisma.booking.groupBy({ by: ["customerId"], where: { status: "COMPLETED", ...branchFilter }, _count: { _all: true }, _sum: { totalCents: true }, _max: { startsAt: true }, _min: { startsAt: true } }),
    prisma.booking.groupBy({ by: ["customerId"], where: { status: "COMPLETED", branch: { slug: { startsWith: "spa" } } }, _count: { _all: true } }),
  ]);
  const spaCount = new Map(spa.map((s) => [s.customerId, s._count._all]));
  const allVisits = await prisma.booking.groupBy({ by: ["customerId"], where: { status: "COMPLETED" }, _count: { _all: true } });
  const totalVisits = new Map(allVisits.map((s) => [s.customerId, s._count._all]));
  const spendSorted = visits.map((v) => v._sum.totalCents ?? 0).sort((a, b) => b - a);
  const vipCut = spendSorted[Math.floor(spendSorted.length * 0.1)] ?? Infinity;
  const stats = new Map(visits.map((v) => [v.customerId, v]));
  const todayKey = localDateKey(now, TZ);
  const upcomingBirthdays = new Set(Array.from({ length: 30 }, (_, i) => addDaysKey(todayKey, i).slice(5)));

  const members = Object.fromEntries((Object.keys(SEGMENTS) as SegmentKey[]).map((k) => [k, new Set<string>()])) as Record<SegmentKey, Set<string>>;
  for (const c of customers) {
    const s = stats.get(c.id);
    const inScope = Boolean(s) || !branchIds;
    if (inScope) members.ALL.add(c.id);
    if (c.birthday && inScope && upcomingBirthdays.has(c.birthday.toISOString().slice(5, 10))) members.BIRTHDAY.add(c.id);
    if (!s) continue;
    const count = s._count._all;
    const spend = s._sum.totalCents ?? 0;
    const sinceLast = (now.getTime() - (s._max.startsAt?.getTime() ?? 0)) / DAY;
    const sinceFirst = (now.getTime() - (s._min.startsAt?.getTime() ?? 0)) / DAY;
    if (c.tags.includes("VIP") || spend >= vipCut) members.VIP.add(c.id);
    if (count >= 3 && sinceLast <= 45) members.LOYAL.add(c.id);
    if (sinceFirst <= 30 && count === 1) members.NEW.add(c.id);
    if (count >= 2 && sinceLast > 60 && sinceLast <= 120) members.AT_RISK.add(c.id);
    if (sinceLast > 120) members.LOST.add(c.id);
    const spaVisits = spaCount.get(c.id) ?? 0;
    const all = totalVisits.get(c.id) ?? 0;
    if (spaVisits === 0) members.SALON_ONLY.add(c.id);
    if (spaVisits > 0 && spaVisits === all) members.SPA_ONLY.add(c.id);
  }

  const byId = new Map(customers.map((c) => [c.id, c]));
  const rows: SegmentRow[] = (Object.keys(SEGMENTS) as SegmentKey[]).map((key) => {
    const ids = [...members[key]];
    const revenue = ids.reduce((a, id) => a + (stats.get(id)?._sum.totalCents ?? 0), 0);
    return {
      key,
      ...SEGMENTS[key],
      total: ids.length,
      reachable: ids.filter((id) => byId.get(id)?.marketingOptIn).length,
      revenueCents: revenue,
      avgSpendCents: ids.length ? Math.round(revenue / ids.length) : 0,
    };
  });
  return { rows, members, customers: byId };
}
