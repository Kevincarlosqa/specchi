import "server-only";
import type { Db } from "./prisma";
import { computeSegments } from "./segments";
import { addDaysKey, localDateKey, wallToUtc, weekdayOf } from "./time";

const TZ = "America/Lima";
const DAY = 86_400_000;

export interface Insight {
  id: string;
  tone: "opportunity" | "warning" | "critical";
  title: string;
  detail: string;
  /** Impacto estimado en céntimos; se explica cómo se calculó en `impactNote`. */
  impactCents?: number;
  impactNote?: string;
  href: string;
  cta: string;
}

/**
 * Radar SPECCHi: reglas sobre datos reales que convierten métricas en acciones concretas.
 * Es determinista a propósito: cada número se puede auditar contra el panel.
 */
export async function getInsights(prisma: Db, branchIds: string[] | undefined, now = new Date()): Promise<Insight[]> {
  const out: Insight[] = [];
  const branchWhere = branchIds ? { branchId: { in: branchIds } } : {};
  const todayKey = localDateKey(now, TZ);

  const seg = await computeSegments(prisma, branchIds, now);
  const row = (k: string) => seg.rows.find((r) => r.key === k)!;

  // Ticket medio reciente: base de todas las estimaciones de impacto.
  const recent = await prisma.booking.aggregate({ where: { status: "COMPLETED", startsAt: { gte: new Date(now.getTime() - 60 * DAY) }, ...branchWhere }, _avg: { totalCents: true } });
  const ticket = Math.round(recent._avg.totalCents ?? 0);

  const atRisk = row("AT_RISK");
  if (atRisk.reachable > 0) {
    const winback = Math.round(atRisk.reachable * 0.15);
    out.push({
      id: "at-risk",
      tone: "opportunity",
      title: `${atRisk.reachable} clientes dejaron de venir y puedes recuperarlos`,
      detail: `Venían seguido y llevan 60 a 120 días sin volver. Aceptaron recibir mensajes.`,
      impactCents: winback * ticket,
      impactNote: `Si vuelve el 15 % (${winback}) con el ticket medio`,
      href: "/dashboard/campanas?segment=AT_RISK",
      cta: "Crear campaña",
    });
  }

  // Huecos de mañana
  const tomorrow = addDaysKey(todayKey, 1);
  const wd = weekdayOf(tomorrow);
  const [schedules, booked] = await Promise.all([
    prisma.stylistSchedule.findMany({ where: { weekday: wd, ...(branchIds ? { branchId: { in: branchIds } } : {}), stylist: { active: true } } }),
    prisma.booking.findMany({
      where: { startsAt: { gte: wallToUtc(tomorrow, 0, TZ), lt: wallToUtc(addDaysKey(tomorrow, 1), 0, TZ) }, status: { in: ["PENDING", "CONFIRMED"] }, ...branchWhere },
      select: { items: { select: { durationMin: true } } },
    }),
  ]);
  const scheduled = schedules.reduce((a, s) => a + s.endMin - s.startMin, 0);
  const bookedMin = booked.reduce((a, b) => a + b.items.reduce((x, i) => x + i.durationMin, 0), 0);
  const free = Math.max(0, scheduled - bookedMin);
  if (scheduled > 0 && free / scheduled > 0.3) {
    const avgDur = 75;
    const seats = Math.round(free / avgDur);
    out.push({
      id: "gaps",
      tone: "opportunity",
      title: `Mañana hay ${Math.round(free / 60)} horas sin reservar`,
      detail: `La agenda está al ${Math.round((1 - free / scheduled) * 100)} %. Una oferta a tus clientes fieles puede llenarla hoy.`,
      impactCents: Math.round(seats * 0.25) * ticket,
      impactNote: `Si se llena el 25 % de unos ${seats} espacios`,
      href: "/dashboard/campanas?segment=LOYAL",
      cta: "Llenar agenda",
    });
  }

  // Sin confirmar en 48 h
  const unconfirmed = await prisma.booking.count({ where: { status: "PENDING", startsAt: { gte: now, lte: new Date(now.getTime() + 2 * DAY) }, ...branchWhere } });
  if (unconfirmed > 0) {
    out.push({
      id: "pending",
      tone: "warning",
      title: `${unconfirmed} citas de las próximas 48 h siguen sin confirmar`,
      detail: "Confírmalas antes de que el horario se pierda.",
      href: "/dashboard/reservas?estado=PENDING",
      cta: "Revisar reservas",
    });
  }

  // Stock bajo
  const lowStock = await prisma.productStock.findMany({ where: { ...(branchIds ? { branchId: { in: branchIds } } : {}), product: { active: true } }, select: { qty: true, minQty: true, product: { select: { priceCents: true } } } });
  const low = lowStock.filter((s) => s.qty < s.minQty);
  if (low.length) {
    const out_ = low.filter((s) => s.qty === 0).length;
    out.push({
      id: "stock",
      tone: out_ ? "critical" : "warning",
      title: `${low.length} productos por debajo del mínimo${out_ ? `, ${out_} agotados` : ""}`,
      detail: "Sin stock no hay venta cruzada: repón antes de que el cliente lo pida.",
      href: "/dashboard/inventario?filter=low",
      cta: "Ver inventario",
    });
  }

  // Reseñas negativas sin responder
  const badReviews = await prisma.review.count({ where: { rating: { lte: 3 }, reply: null, ...branchWhere } });
  if (badReviews) {
    out.push({
      id: "reviews",
      tone: "critical",
      title: `${badReviews} reseñas de 3 estrellas o menos sin responder`,
      detail: "Responder rápido cambia la lectura de quien las ve en Google.",
      href: "/dashboard/resenas?filter=pending",
      cta: "Responder",
    });
  }

  // Cumpleaños de la semana
  const birthdays = await prisma.customer.findMany({ where: { birthday: { not: null }, marketingOptIn: true }, select: { birthday: true } });
  const nextWeek = new Set(Array.from({ length: 7 }, (_, i) => addDaysKey(todayKey, i).slice(5)));
  const inWeek = birthdays.filter((c) => nextWeek.has(c.birthday!.toISOString().slice(5, 10))).length;
  if (inWeek) {
    out.push({
      id: "birthdays",
      tone: "opportunity",
      title: `${inWeek} clientes cumplen años esta semana`,
      detail: "Un detalle a tiempo vale más que cualquier descuento.",
      href: "/dashboard/campanas?segment=BIRTHDAY",
      cta: "Enviar saludo",
    });
  }

  // Paquetes por vencer con sesiones pendientes
  const packs = await prisma.customerPackage.findMany({ where: { expiresAt: { gte: now, lte: new Date(now.getTime() + 30 * DAY) } }, select: { usedSessions: true, totalSessions: true } });
  const openPacks = packs.filter((p) => p.usedSessions < p.totalSessions);
  if (openPacks.length) {
    const sessions = openPacks.reduce((a, p) => a + p.totalSessions - p.usedSessions, 0);
    out.push({
      id: "packs",
      tone: "warning",
      title: `${openPacks.length} paquetes vencen en 30 días con ${sessions} sesiones sin usar`,
      detail: "Avísales antes: evita reclamos y trae al cliente de vuelta.",
      href: "/dashboard/fidelizacion",
      cta: "Ver paquetes",
    });
  }

  const rank = { critical: 0, warning: 1, opportunity: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone] || (b.impactCents ?? 0) - (a.impactCents ?? 0));
}
