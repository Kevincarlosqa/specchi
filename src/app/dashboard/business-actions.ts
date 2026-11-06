"use server";

import { refresh } from "next/cache";
import QRCode from "qrcode";
import { z } from "zod";
import { DocType, PaymentMethod } from "@/generated/prisma/enums";
import { ForbiddenError, assertUser, canAccessBranch, customerScope, scopeBranches, type CurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { getSelectedBranch } from "@/lib/dashboard";
import { PosError, createSale, expectedCash } from "@/lib/pos";
import { db } from "@/lib/prisma";
import { computeSegments, isSegment } from "@/lib/segments";
import { generateSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { formatMoney } from "@/lib/utils";
import { sendTemplate } from "@/lib/whatsapp";

export type Result<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

const STAFF = ["OWNER", "ADMIN", "BRANCH_MANAGER", "RECEPTION"] as const;
const MANAGERS = ["OWNER", "ADMIN", "BRANCH_MANAGER"] as const;

async function run<T>(fn: () => Promise<T>, message?: string): Promise<Result<T>> {
  try {
    const data = await fn();
    refresh();
    return { ok: true, data, message };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Datos inválidos" };
    if (e instanceof ForbiddenError || e instanceof PosError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Ocurrió un error inesperado." };
  }
}

async function audit(user: CurrentUser, action: string, entity: string, detail?: string) {
  const prisma = await db();
  await prisma.auditLog.create({ data: { userId: user.id, userName: user.name, action, entity, detail } });
}

const assertBranch = (user: CurrentUser, branchId: string) => {
  if (!canAccessBranch(user, branchId)) throw new ForbiddenError("No tienes acceso a esta sede.");
};
const soles = z.coerce.number().min(0).max(1_000_000).transform((v) => Math.round(v * 100));

// ─── Caja ───────────────────────────────────────────────────────────────────

export async function openCash(branchId: string, amount: number) {
  return run(async () => {
    const user = await assertUser([...STAFF]);
    assertBranch(user, branchId);
    const prisma = await db();
    if (await prisma.cashSession.findFirst({ where: { branchId, closedAt: null } })) throw new PosError("Esta sede ya tiene la caja abierta.");
    const openingCents = soles.parse(amount);
    await prisma.cashSession.create({ data: { branchId, openedByName: user.name, openingCents } });
    await audit(user, "Abrió caja", "Caja", formatMoney(openingCents));
  }, "Caja abierta");
}

export async function addCashMovement(sessionId: string, kind: "IN" | "OUT", amount: number, reason: string) {
  return run(async () => {
    const user = await assertUser([...STAFF]);
    const prisma = await db();
    const session = await prisma.cashSession.findUniqueOrThrow({ where: { id: sessionId } });
    assertBranch(user, session.branchId);
    if (session.closedAt) throw new PosError("La caja ya está cerrada.");
    const amountCents = z.coerce.number().positive("Escribe un monto").max(1_000_000).transform((v) => Math.round(v * 100)).parse(amount);
    const why = z.string().trim().min(3, "Escribe el motivo").max(120).parse(reason);
    await prisma.cashMovement.create({ data: { sessionId, kind, amountCents, reason: why } });
    await audit(user, kind === "IN" ? "Registró ingreso" : "Registró egreso", "Caja", `${formatMoney(amountCents)} · ${why}`);
  }, "Movimiento registrado");
}

export async function closeCash(sessionId: string, counted: number, note: string) {
  return run(async () => {
    const user = await assertUser([...STAFF]);
    const prisma = await db();
    const session = await prisma.cashSession.findUniqueOrThrow({ where: { id: sessionId } });
    assertBranch(user, session.branchId);
    if (session.closedAt) throw new PosError("La caja ya está cerrada.");
    const expected = await expectedCash(prisma, sessionId);
    const countedCents = soles.parse(counted);
    await prisma.cashSession.update({ where: { id: sessionId }, data: { closedAt: new Date(), closedByName: user.name, countedCents, expectedCents: expected, note: note.slice(0, 300) || null } });
    await audit(user, "Cerró caja", "Caja", `Esperado ${formatMoney(expected)} · contado ${formatMoney(countedCents)}`);
    return { expected, counted: countedCents };
  });
}

const saleSchema = z.object({
  branchId: z.string().min(1),
  customerId: z.string().optional(),
  bookingId: z.string().optional(),
  items: z.array(z.object({
    kind: z.enum(["SERVICE", "PRODUCT", "GIFT_CARD"]),
    serviceId: z.string().optional(),
    productId: z.string().optional(),
    stylistId: z.string().optional(),
    amountCents: z.number().int().optional(),
    qty: z.number().int().min(1).max(50),
  })).min(1, "El carrito está vacío."),
  discountCents: z.number().int().min(0),
  tipCents: z.number().int().min(0).max(100_000),
  redeemPoints: z.number().int().min(0),
  method: z.enum(PaymentMethod),
  docType: z.enum(DocType),
  giftCardCode: z.string().optional(),
});

export async function chargeSale(input: unknown) {
  return run(async () => {
    const user = await assertUser([...STAFF]);
    const data = saleSchema.parse(input);
    assertBranch(user, data.branchId);
    const prisma = await db();
    const { sale, issued, points } = await createSale(prisma, user, data);
    return {
      docNumber: sale.docNumber,
      docType: sale.docType,
      totalCents: sale.totalCents,
      discountCents: sale.discountCents,
      tipCents: sale.tipCents,
      subtotalCents: sale.subtotalCents,
      method: sale.method,
      pointsEarned: sale.pointsEarned,
      points,
      customerName: sale.customer?.name ?? null,
      customerPhone: sale.customer?.phone ?? null,
      branchName: sale.branch.name,
      items: sale.items.map((i) => ({ name: i.name, qty: i.qty, totalCents: i.totalCents })),
      issuedGiftCards: issued,
    };
  });
}

/** Búsqueda de clientes para el POS y formularios. */
export async function searchCustomers(q: string) {
  await assertUser([...STAFF]);
  const term = q.trim();
  if (term.length < 2) return [];
  const prisma = await db();
  const rows = await prisma.customer.findMany({
    where: { OR: [{ name: { contains: term, mode: "insensitive" } }, { phone: { contains: term.replace(/\s/g, "") } }] },
    take: 8,
    orderBy: { loyaltyPoints: "desc" },
    select: { id: true, name: true, phone: true, loyaltyPoints: true, allergies: true },
  });
  return rows;
}

export async function voidSale(saleId: string, reason: string) {
  return run(async () => {
    const user = await assertUser([...MANAGERS]);
    const prisma = await db();
    const sale = await prisma.sale.findUniqueOrThrow({ where: { id: saleId }, include: { items: true } });
    assertBranch(user, sale.branchId);
    if (sale.status === "VOIDED") throw new PosError("Esta venta ya está anulada.");
    const why = z.string().trim().min(3, "Escribe el motivo").max(120).parse(reason);
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id: saleId }, data: { status: "VOIDED" } });
      for (const it of sale.items) {
        if (it.productId) {
          await tx.productStock.updateMany({ where: { productId: it.productId, branchId: sale.branchId }, data: { qty: { increment: it.qty } } });
          await tx.stockMovement.create({ data: { productId: it.productId, branchId: sale.branchId, delta: it.qty, kind: "ADJUST", note: `Anulación ${sale.docNumber}`, userName: user.name } });
        }
      }
      if (sale.customerId && (sale.pointsEarned || sale.pointsRedeemed)) {
        const delta = sale.pointsRedeemed - sale.pointsEarned;
        await tx.customer.update({ where: { id: sale.customerId }, data: { loyaltyPoints: { increment: delta } } });
        await tx.loyaltyEntry.create({ data: { customerId: sale.customerId, points: delta, reason: `Anulación ${sale.docNumber}` } });
      }
    });
    await audit(user, "Anuló venta", "Caja", `${sale.docNumber} · ${why}`);
  }, "Venta anulada");
}

// ─── Inventario ─────────────────────────────────────────────────────────────

export async function adjustStock(productId: string, branchId: string, delta: number, kind: "RESTOCK" | "ADJUST" | "INTERNAL", note: string) {
  return run(async () => {
    const user = await assertUser([...STAFF]);
    assertBranch(user, branchId);
    const change = z.coerce.number().int().refine((n) => n !== 0, "La cantidad no puede ser cero").parse(delta);
    const prisma = await db();
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    await prisma.$transaction(async (tx) => {
      const current = await tx.productStock.upsert({ where: { productId_branchId: { productId, branchId } }, create: { productId, branchId, qty: 0 }, update: {} });
      if (current.qty + change < 0) throw new PosError(`Solo quedan ${current.qty} unidades.`);
      await tx.productStock.update({ where: { productId_branchId: { productId, branchId } }, data: { qty: { increment: change } } });
      await tx.stockMovement.create({ data: { productId, branchId, delta: change, kind, note: note.slice(0, 120) || null, userName: user.name } });
    });
    await audit(user, "Ajustó stock", "Inventario", `${product.name} · ${change > 0 ? "+" : ""}${change}`);
  }, "Stock actualizado");
}

export async function setMinStock(productId: string, branchId: string, minQty: number) {
  return run(async () => {
    const user = await assertUser([...MANAGERS]);
    assertBranch(user, branchId);
    const prisma = await db();
    await prisma.productStock.update({ where: { productId_branchId: { productId, branchId } }, data: { minQty: z.coerce.number().int().min(0).max(500).parse(minQty) } });
  }, "Mínimo actualizado");
}

// ─── Equipo ─────────────────────────────────────────────────────────────────

export async function checkIn(stylistId: string, branchId: string) {
  return run(async () => {
    const user = await assertUser();
    if (user.role === "STYLIST" && user.stylistId !== stylistId) throw new ForbiddenError();
    assertBranch(user, branchId);
    const prisma = await db();
    if (await prisma.attendance.findFirst({ where: { stylistId, checkOut: null, checkIn: { gte: new Date(Date.now() - 18 * 3_600_000) } } })) throw new PosError("Ya tiene una entrada abierta.");
    await prisma.attendance.create({ data: { stylistId, branchId, checkIn: new Date() } });
  }, "Entrada registrada");
}

export async function checkOut(stylistId: string) {
  return run(async () => {
    const user = await assertUser();
    if (user.role === "STYLIST" && user.stylistId !== stylistId) throw new ForbiddenError();
    const prisma = await db();
    const open = await prisma.attendance.findFirst({ where: { stylistId, checkOut: null }, orderBy: { checkIn: "desc" } });
    if (!open) throw new PosError("No hay una entrada abierta.");
    assertBranch(user, open.branchId);
    await prisma.attendance.update({ where: { id: open.id }, data: { checkOut: new Date() } });
  }, "Salida registrada");
}

export async function updateCommission(stylistId: string, commissionPct: number, retailPct: number) {
  return run(async () => {
    const user = await assertUser(["OWNER", "ADMIN"]);
    const prisma = await db();
    const pct = z.coerce.number().int().min(0).max(100);
    const stylist = await prisma.stylist.update({ where: { id: stylistId }, data: { commissionPct: pct.parse(commissionPct), retailPct: pct.parse(retailPct) } });
    await audit(user, "Cambió comisión", "Equipo", `${stylist.name}: ${stylist.commissionPct} % servicios, ${stylist.retailPct} % tienda`);
  }, "Comisión actualizada");
}

// ─── Campañas ───────────────────────────────────────────────────────────────

const campaignSchema = z.object({
  name: z.string().trim().min(3, "Ponle un nombre a la campaña").max(80),
  segment: z.string().refine(isSegment, "Segmento inválido"),
  message: z.string().trim().min(10, "El mensaje es muy corto").max(700, "Máximo 700 caracteres"),
});

/**
 * Lanza una campaña. Solo llega a quienes aceptaron recibir marketing.
 * En modo demo NUNCA envía: los teléfonos sembrados son ficticios y podrían ser de alguien.
 * Los resultados se simulan y quedan marcados como tal.
 */
export async function launchCampaign(input: unknown) {
  return run(async () => {
    const user = await assertUser([...MANAGERS]);
    const data = campaignSchema.parse(input);
    const scope = scopeBranches(user, await getSelectedBranch(user));
    const prisma = await db();
    const { members, customers } = await computeSegments(prisma, scope);
    const recipients = [...members[data.segment as keyof typeof members]].map((id) => customers.get(id)!).filter((c) => c.marketingOptIn);
    if (!recipients.length) throw new PosError("Este segmento no tiene clientes que hayan aceptado mensajes.");

    let simulated = true;
    let delivered = 0;
    let readCount = 0;
    let booked = 0;
    let revenueCents = 0;
    if (config.demoMode) {
      delivered = Math.round(recipients.length * 0.97);
      readCount = Math.round(delivered * 0.72);
      booked = Math.max(1, Math.round(readCount * 0.14));
      revenueCents = booked * 26_500;
    } else {
      if (!config.whatsappEnabled) throw new PosError("WhatsApp no está configurado: no se puede enviar la campaña.");
      simulated = false;
      for (const c of recipients.slice(0, 1000)) {
        try {
          // Fuera de la ventana de 24 h Meta exige una plantilla aprobada: el texto va como parámetro.
          await sendTemplate(c.phone, config.WHATSAPP_TEMPLATE_CAMPAIGN, [data.message.replaceAll("{nombre}", (c.name ?? "").split(" ")[0] ?? "")]);
          delivered++;
        } catch (e) {
          console.error("[campaña] envío fallido", e);
        }
      }
    }
    await prisma.campaign.create({ data: { ...data, status: "SENT", simulated, audience: recipients.length, delivered, readCount, booked, revenueCents, createdById: user.id, sentAt: new Date() } });
    await audit(user, "Lanzó campaña", "Campañas", `${data.name} · ${recipients.length} destinatarios`);
    return { audience: recipients.length, simulated };
  });
}

// ─── Fidelización ───────────────────────────────────────────────────────────

export async function redeemPackageSession(packageId: string) {
  return run(async () => {
    const user = await assertUser([...STAFF]);
    const prisma = await db();
    const pack = await prisma.customerPackage.findUniqueOrThrow({ where: { id: packageId } });
    if (pack.usedSessions >= pack.totalSessions) throw new PosError("Este paquete ya no tiene sesiones.");
    if (pack.expiresAt < new Date()) throw new PosError("Este paquete venció.");
    await prisma.customerPackage.update({ where: { id: packageId }, data: { usedSessions: { increment: 1 } } });
    await audit(user, "Usó sesión de paquete", "Fidelización", pack.name);
  }, "Sesión descontada");
}

export async function checkGiftCard(code: string) {
  await assertUser([...STAFF]);
  const prisma = await db();
  const gift = await prisma.giftCard.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!gift) return null;
  return { code: gift.code, balanceCents: gift.balanceCents, status: gift.status, expiresAt: gift.expiresAt.toISOString(), recipientName: gift.recipientName };
}

export async function adjustPoints(customerId: string, points: number, reason: string) {
  return run(async () => {
    const user = await assertUser(["OWNER", "ADMIN", "BRANCH_MANAGER"]);
    const delta = z.coerce.number().int().refine((n) => n !== 0, "Escribe los puntos").parse(points);
    const why = z.string().trim().min(3, "Escribe el motivo").max(120).parse(reason);
    const prisma = await db();
    const c = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    if (c.loyaltyPoints + delta < 0) throw new PosError("El cliente no tiene tantos puntos.");
    await prisma.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { increment: delta } } });
    await prisma.loyaltyEntry.create({ data: { customerId, points: delta, reason: why } });
    await audit(user, "Ajustó puntos", "Fidelización", `${c.name}: ${delta > 0 ? "+" : ""}${delta}`);
  }, "Puntos actualizados");
}

// ─── Reseñas ────────────────────────────────────────────────────────────────

export async function replyReview(reviewId: string, reply: string) {
  return run(async () => {
    const user = await assertUser([...MANAGERS]);
    const prisma = await db();
    const review = await prisma.review.findUniqueOrThrow({ where: { id: reviewId } });
    assertBranch(user, review.branchId);
    const text = z.string().trim().min(5, "Escribe una respuesta").max(600).parse(reply);
    await prisma.review.update({ where: { id: reviewId }, data: { reply: text, repliedAt: new Date() } });
    await audit(user, "Respondió reseña", "Reseñas", `${review.rating} ${review.rating === 1 ? "estrella" : "estrellas"}`);
  }, "Respuesta guardada");
}

// ─── Ficha configurable ─────────────────────────────────────────────────────

export async function saveCustomFields(customerId: string, values: Record<string, string | boolean>) {
  return run(async () => {
    const user = await assertUser();
    const prisma = await db();
    if (!(await prisma.customer.findFirst({ where: { id: customerId, ...customerScope(user) }, select: { id: true } }))) throw new ForbiddenError("No tienes acceso a este cliente.");
    const defs = await prisma.customerFieldDef.findMany({ where: { active: true } });
    const clean: Record<string, string | boolean> = {};
    for (const d of defs) {
      const v = values[d.key];
      if (d.type === "BOOLEAN") clean[d.key] = v === true || v === "on";
      else if (typeof v === "string" && v.trim()) {
        if (d.type === "SELECT" && !d.options.includes(v)) continue;
        clean[d.key] = v.trim().slice(0, 500);
      }
    }
    await prisma.customer.update({ where: { id: customerId }, data: { customFields: clean } });
    await audit(user, "Editó ficha", "Clientes", customerId);
  }, "Ficha actualizada");
}

export async function addCustomField(label: string, type: "TEXT" | "BOOLEAN" | "SELECT", options: string, sensitive: boolean) {
  return run(async () => {
    const user = await assertUser(["OWNER", "ADMIN"]);
    const name = z.string().trim().min(2, "Escribe el nombre del campo").max(60).parse(label);
    const key = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").slice(0, 40);
    const prisma = await db();
    const count = await prisma.customerFieldDef.count();
    await prisma.customerFieldDef.create({ data: { key, label: name, type, sensitive, sortOrder: count, options: type === "SELECT" ? options.split(",").map((o) => o.trim()).filter(Boolean) : [] } });
    await audit(user, "Creó campo", "Clientes", name);
  }, "Campo agregado a la ficha");
}

// ─── Seguridad: 2FA ─────────────────────────────────────────────────────────

export async function startTotp() {
  return run(async () => {
    const user = await assertUser();
    const prisma = await db();
    const current = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (current.totpEnabledAt) throw new PosError("Ya tienes la verificación en dos pasos activa.");
    const secret = generateSecret();
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
    const qr = await QRCode.toDataURL(otpauthUrl(secret, user.email), { margin: 1, width: 240, color: { dark: "#2a1025", light: "#fffbf1" } });
    return { secret, qr };
  });
}

export async function confirmTotp(code: string) {
  return run(async () => {
    const user = await assertUser();
    const prisma = await db();
    const current = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!current.totpSecret || !verifyTotp(current.totpSecret, code)) throw new PosError("El código no coincide. Prueba con el más reciente.");
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabledAt: new Date() } });
    await audit(user, "Activó 2FA", "Seguridad");
  }, "Verificación en dos pasos activada");
}

export async function disableTotp(code: string) {
  return run(async () => {
    const user = await assertUser();
    const prisma = await db();
    const current = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!current.totpSecret || !verifyTotp(current.totpSecret, code)) throw new PosError("El código no coincide.");
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: null, totpEnabledAt: null } });
    await audit(user, "Desactivó 2FA", "Seguridad");
  }, "Verificación en dos pasos desactivada");
}

