import type { Metadata } from "next";
import { CashDesk } from "@/components/dashboard/cash-desk";
import { EmptyState, PageHeader } from "@/components/dashboard/ui";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { getSelectedBranch, visibleBranches } from "@/lib/dashboard";
import { POINT_VALUE_CENTS, expectedCash } from "@/lib/pos";
import { db } from "@/lib/prisma";
import { addDaysKey, formatLocal, localDateKey, wallToUtc } from "@/lib/time";

export const metadata: Metadata = { title: "Caja" };
const TZ = "America/Lima";

export default async function CajaPage({ searchParams }: PageProps<"/dashboard/caja">) {
  const user = await requireUser(["OWNER", "ADMIN", "BRANCH_MANAGER", "RECEPTION"]);
  const sp = await searchParams;
  const selected = await getSelectedBranch(user);
  const branches = await visibleBranches(user);
  const fromQuery = typeof sp.sede === "string" ? sp.sede : undefined;
  const branchId = fromQuery && canAccessBranch(user, fromQuery) ? fromQuery : selected !== "all" ? selected : branches[0]?.id;
  if (!branchId) return <EmptyState title="No tienes sedes asignadas" />;
  const prisma = await db();

  const today = localDateKey(new Date(), TZ);
  const start = wallToUtc(today, 0, TZ);
  const end = wallToUtc(addDaysKey(today, 1), 0, TZ);
  const [session, services, products, stylists, dueBookings, sales] = await Promise.all([
    prisma.cashSession.findFirst({ where: { branchId, closedAt: null }, orderBy: { openedAt: "desc" }, include: { movements: { orderBy: { createdAt: "desc" } } } }),
    prisma.branchService.findMany({ where: { branchId, active: true, service: { active: true } }, include: { service: true }, orderBy: { service: { sortOrder: "asc" } } }),
    prisma.productStock.findMany({ where: { branchId, product: { active: true } }, include: { product: true }, orderBy: { product: { brand: "asc" } } }),
    prisma.stylist.findMany({ where: { active: true, schedules: { some: { branchId } } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.booking.findMany({
      where: { branchId, sale: null, startsAt: { gte: start, lt: end }, status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      include: { customer: { select: { id: true, name: true, phone: true, loyaltyPoints: true, allergies: true } }, items: { include: { service: true, stylist: true }, orderBy: { position: "asc" } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.sale.findMany({ where: { branchId, createdAt: { gte: start, lt: end } }, include: { customer: { select: { name: true } }, items: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  const expected = session ? await expectedCash(prisma, session.id) : 0;
  const paid = sales.filter((s) => s.status === "PAID");
  const byMethod = paid.reduce<Record<string, number>>((acc, s) => ((acc[s.method] = (acc[s.method] ?? 0) + s.totalCents), acc), {});

  return (
    <>
      <PageHeader eyebrow="Hoy" title="Caja" description="Cobra citas y productos, entrega comprobantes y cierra el día con un clic. Cada venta descuenta stock, suma puntos y calcula comisión." />
      <CashDesk
        key={branchId}
        branchId={branchId}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        canSwitch={selected === "all"}
        canVoid={user.role !== "RECEPTION"}
        demo={config.demoMode}
        pointValueCents={POINT_VALUE_CENTS}
        session={session ? { id: session.id, openedBy: session.openedByName, openedAt: formatLocal(session.openedAt, TZ, "HH:mm"), openingCents: session.openingCents, expectedCents: expected, movements: session.movements.map((m) => ({ id: m.id, kind: m.kind, amountCents: m.amountCents, reason: m.reason, at: formatLocal(m.createdAt, TZ, "HH:mm") })) } : null}
        services={services.map((s) => ({ id: s.serviceId, name: s.service.name, priceCents: s.priceCents ?? s.service.priceCents, category: s.service.category }))}
        products={products.map((p) => ({ id: p.productId, name: `${p.product.brand} ${p.product.name}`, priceCents: p.product.priceCents, qty: p.qty }))}
        stylists={stylists}
        due={dueBookings.map((b) => ({
          id: b.id,
          code: b.code,
          at: formatLocal(b.startsAt, TZ, "HH:mm"),
          status: b.status,
          depositCents: b.depositPaidAt ? b.depositCents : 0,
          customer: b.customer,
          items: b.items.map((i) => ({ serviceId: i.serviceId, stylistId: i.stylistId, name: i.service.name, priceCents: i.priceCents, stylistName: i.stylist.name })),
        }))}
        sales={sales.map((s) => ({ id: s.id, docNumber: s.docNumber, status: s.status, method: s.method, totalCents: s.totalCents, at: formatLocal(s.createdAt, TZ, "HH:mm"), who: s.customer?.name ?? "Sin cliente", what: s.items.map((i) => i.name).join(" + ") }))}
        totals={{ count: paid.length, totalCents: paid.reduce((a, s) => a + s.totalCents, 0), tipCents: paid.reduce((a, s) => a + s.tipCents, 0), byMethod }}
      />
    </>
  );
}
