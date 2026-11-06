import "server-only";
import type { DocType, PaymentMethod } from "@/generated/prisma/enums";
import type { CurrentUser } from "./auth";
import type { Db, Tx } from "./prisma";
import { formatMoney } from "./utils";

export class PosError extends Error {}

/** Niveles del Club SPECCHi según puntos acumulados (S/ 1 = 1 punto). */
export const TIERS = [
  { key: "Reflejo", min: 0, perk: "1 punto por cada sol" },
  { key: "Brillo", min: 2000, perk: "Bebida de bienvenida y 5 % en tienda" },
  { key: "Espejo", min: 6000, perk: "10 % en tienda y prioridad en lista de espera" },
  { key: "Ícono", min: 15000, perk: "Un ritual de cortesía al año y atención con Ángel" },
] as const;
export const tierOf = (points: number) => [...TIERS].reverse().find((t) => points >= t.min) ?? TIERS[0];
/** 100 puntos = S/ 5 de descuento. */
export const POINT_VALUE_CENTS = 5;

export interface CartItem {
  kind: "SERVICE" | "PRODUCT" | "GIFT_CARD";
  serviceId?: string;
  productId?: string;
  stylistId?: string;
  /** Solo para gift cards: monto en céntimos. */
  amountCents?: number;
  qty: number;
}

export interface SaleInput {
  branchId: string;
  customerId?: string;
  bookingId?: string;
  items: CartItem[];
  discountCents: number;
  tipCents: number;
  redeemPoints: number;
  method: PaymentMethod;
  docType: DocType;
  giftCardCode?: string;
}

async function nextDocNumber(tx: Tx, docType: DocType) {
  await tx.$queryRaw`SELECT 1 AS ok FROM pg_advisory_xact_lock(hashtext(${`doc:${docType}`}))`;
  const prefix = docType === "FACTURA" ? "F001" : docType === "BOLETA" ? "B001" : "NV01";
  const last = await tx.sale.findFirst({ where: { docType }, orderBy: { docNumber: "desc" }, select: { docNumber: true } });
  const n = last ? Number(last.docNumber.split("-")[1]) + 1 : 1;
  return `${prefix}-${String(n).padStart(6, "0")}`;
}

const giftCode = () => {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `GIFT-${s}`;
};

/** Crea una venta completa de forma atómica: stock, comisiones, puntos, gift cards y cierre de la cita. */
export async function createSale(prisma: Db, user: CurrentUser, input: SaleInput) {
  if (!input.items.length) throw new PosError("El carrito está vacío.");
  return prisma.$transaction(async (tx) => {
    const session = await tx.cashSession.findFirst({ where: { branchId: input.branchId, closedAt: null }, orderBy: { openedAt: "desc" } });
    if (!session) throw new PosError("Abre la caja de la sede antes de cobrar.");

    const lines: Array<{ kind: "SERVICE" | "PRODUCT" | "GIFT_CARD"; name: string; serviceId?: string; productId?: string; stylistId?: string; qty: number; unitCents: number; totalCents: number; retailPct?: number; commissionPct?: number }> = [];
    const stylistIds = input.items.map((i) => i.stylistId).filter((x): x is string => Boolean(x));
    const stylists = new Map((await tx.stylist.findMany({ where: { id: { in: stylistIds } } })).map((s) => [s.id, s]));
    for (const it of input.items) {
      const stylist = it.stylistId ? stylists.get(it.stylistId) : undefined;
      if (it.kind === "SERVICE") {
        const s = await tx.service.findUniqueOrThrow({ where: { id: it.serviceId! }, include: { branches: { where: { branchId: input.branchId } } } });
        const unit = s.branches[0]?.priceCents ?? s.priceCents;
        lines.push({ kind: "SERVICE", name: s.name, serviceId: s.id, stylistId: it.stylistId, qty: it.qty, unitCents: unit, totalCents: unit * it.qty, commissionPct: stylist?.commissionPct ?? 0 });
      } else if (it.kind === "PRODUCT") {
        const p = await tx.product.findUniqueOrThrow({ where: { id: it.productId! } });
        const stock = await tx.productStock.findUnique({ where: { productId_branchId: { productId: p.id, branchId: input.branchId } } });
        if (!stock || stock.qty < it.qty) throw new PosError(`No hay stock suficiente de ${p.name} en esta sede.`);
        await tx.productStock.update({ where: { productId_branchId: { productId: p.id, branchId: input.branchId } }, data: { qty: { decrement: it.qty } } });
        await tx.stockMovement.create({ data: { productId: p.id, branchId: input.branchId, delta: -it.qty, kind: "SALE", userName: user.name } });
        lines.push({ kind: "PRODUCT", name: `${p.brand} ${p.name}`, productId: p.id, stylistId: it.stylistId, qty: it.qty, unitCents: p.priceCents, totalCents: p.priceCents * it.qty, retailPct: stylist?.retailPct ?? 0 });
      } else {
        if (!it.amountCents || it.amountCents < 1000) throw new PosError("El monto de la gift card no es válido.");
        lines.push({ kind: "GIFT_CARD", name: "Gift card", qty: it.qty, unitCents: it.amountCents, totalCents: it.amountCents * it.qty });
      }
    }

    const subtotal = lines.reduce((a, l) => a + l.totalCents, 0);
    if (input.discountCents > subtotal) throw new PosError("El descuento supera el total.");

    // Puntos
    let pointsDiscount = 0;
    let customer = input.customerId ? await tx.customer.findUnique({ where: { id: input.customerId } }) : null;
    if (input.redeemPoints > 0) {
      if (!customer) throw new PosError("Elige un cliente para canjear puntos.");
      if (customer.loyaltyPoints < input.redeemPoints) throw new PosError("El cliente no tiene esos puntos.");
      pointsDiscount = input.redeemPoints * POINT_VALUE_CENTS;
    }
    const discount = Math.min(subtotal, input.discountCents + pointsDiscount);
    const net = subtotal - discount;
    const total = net + input.tipCents;

    // Pago con gift card
    let giftCardId: string | undefined;
    if (input.method === "GIFT_CARD") {
      const code = input.giftCardCode?.trim().toUpperCase();
      const gift = code ? await tx.giftCard.findUnique({ where: { code } }) : null;
      if (!gift || gift.status !== "ACTIVE" || gift.expiresAt < new Date()) throw new PosError("Gift card inválida o vencida.");
      if (gift.balanceCents < total) throw new PosError(`La gift card solo tiene ${formatMoney(gift.balanceCents)} de saldo.`);
      const balance = gift.balanceCents - total;
      await tx.giftCard.update({ where: { id: gift.id }, data: { balanceCents: balance, status: balance === 0 ? "REDEEMED" : "ACTIVE" } });
      giftCardId = gift.id;
    }

    // El adelanto ya se cobró al reservar: no vuelve a entrar en caja, pero sí cuenta para ingresos y comisión.
    const booking = input.bookingId ? await tx.booking.findUnique({ where: { id: input.bookingId } }) : null;
    const deposit = booking?.depositPaidAt ? Math.min(booking.depositCents, total) : 0;

    const pointsEarned = customer ? Math.floor(net / 100) : 0;
    const docNumber = await nextDocNumber(tx, input.docType);
    const factor = subtotal ? net / subtotal : 1;
    const sale = await tx.sale.create({
      data: {
        docType: input.docType, docNumber, branchId: input.branchId, customerId: input.customerId, bookingId: input.bookingId, userId: user.id, cashSessionId: session.id, giftCardId,
        method: input.method, subtotalCents: subtotal, discountCents: discount, tipCents: input.tipCents, totalCents: total, depositCents: deposit, pointsEarned, pointsRedeemed: input.redeemPoints,
        items: {
          create: lines.map((l) => ({
            kind: l.kind, name: l.name, serviceId: l.serviceId, productId: l.productId, stylistId: l.stylistId, qty: l.qty, unitCents: l.unitCents, totalCents: l.totalCents,
            // La comisión se calcula sobre lo cobrado después del descuento.
            commissionCents: Math.round((l.totalCents * factor * (l.commissionPct ?? l.retailPct ?? 0)) / 100),
          })),
        },
      },
      include: { items: true, branch: true, customer: true },
    });

    // Gift cards vendidas
    const giftLines = lines.filter((l) => l.kind === "GIFT_CARD");
    const issued: string[] = [];
    for (const g of giftLines) {
      for (let i = 0; i < g.qty; i++) {
        const code = giftCode();
        issued.push(code);
        await tx.giftCard.create({ data: { code, initialCents: g.unitCents, balanceCents: g.unitCents, buyerName: customer?.name ?? null, expiresAt: new Date(Date.now() + 365 * 86_400_000) } });
      }
    }

    if (customer && (pointsEarned || input.redeemPoints)) {
      customer = await tx.customer.update({ where: { id: customer.id }, data: { loyaltyPoints: { increment: pointsEarned - input.redeemPoints } } });
      if (input.redeemPoints) await tx.loyaltyEntry.create({ data: { customerId: customer.id, points: -input.redeemPoints, reason: `Canje en ${docNumber}` } });
      if (pointsEarned) await tx.loyaltyEntry.create({ data: { customerId: customer.id, points: pointsEarned, reason: `Compra ${docNumber}` } });
    }
    if (input.bookingId) {
      await tx.booking.update({ where: { id: input.bookingId }, data: { status: "COMPLETED", completedAt: new Date() } });
    }
    await tx.auditLog.create({ data: { userId: user.id, userName: user.name, action: "Registró venta", entity: "Caja", detail: `${docNumber} · ${formatMoney(total)}` } });
    return { sale, issued, points: customer?.loyaltyPoints ?? 0 };
  });
}

/** Efectivo que debería haber en caja: apertura + ventas en efectivo + ingresos − egresos. */
export async function expectedCash(prisma: Db | Tx, sessionId: string) {
  const session = await prisma.cashSession.findUniqueOrThrow({ where: { id: sessionId }, include: { movements: true } });
  const sales = await prisma.sale.aggregate({ where: { cashSessionId: sessionId, method: "CASH", status: "PAID" }, _sum: { totalCents: true, depositCents: true } });
  const moves = session.movements.reduce((a, m) => a + (m.kind === "IN" ? m.amountCents : -m.amountCents), 0);
  return session.openingCents + (sales._sum.totalCents ?? 0) - (sales._sum.depositCents ?? 0) + moves;
}
