import type { Metadata } from "next";
import Link from "next/link";
import { StockTable } from "@/components/dashboard/stock-table";
import { Card, CardTitle, EmptyState, PageHeader } from "@/components/dashboard/ui";
import { HBarChart, SERIES } from "@/components/dashboard/charts";
import { canAccessBranch, requireUser } from "@/lib/auth";
import { getSelectedBranch, visibleBranches } from "@/lib/dashboard";
import { db } from "@/lib/prisma";
import { formatLocal } from "@/lib/time";
import { cn, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Inventario" };
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

export default async function InventarioPage({ searchParams }: PageProps<"/dashboard/inventario">) {
  const user = await requireUser(["OWNER", "ADMIN", "BRANCH_MANAGER", "RECEPTION"]);
  const sp = await searchParams;
  const low = sp.filter === "low";
  const selected = await getSelectedBranch(user);
  const branches = await visibleBranches(user);
  const fromQuery = typeof sp.sede === "string" && canAccessBranch(user, sp.sede) ? sp.sede : undefined;
  const branchId = fromQuery ?? (selected !== "all" ? selected : branches.find((b) => b.id.includes("angamos"))?.id ?? branches[0]?.id);
  if (!branchId) return <EmptyState title="No tienes sedes asignadas" />;
  const prisma = await db();

  const since = daysAgo(30);
  const [stock, moves, sold] = await Promise.all([
    prisma.productStock.findMany({ where: { branchId, product: { active: true } }, include: { product: true }, orderBy: [{ product: { brand: "asc" } }, { product: { name: "asc" } }] }),
    prisma.stockMovement.findMany({ where: { branchId, kind: { not: "SALE" } }, include: { product: { select: { name: true, brand: true } } }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.stockMovement.groupBy({ by: ["productId"], where: { branchId, kind: "SALE", createdAt: { gte: since } }, _sum: { delta: true } }),
  ]);
  const soldBy = new Map(sold.map((s) => [s.productId, -(s._sum.delta ?? 0)]));
  const rows = stock.map((s) => {
    const monthly = soldBy.get(s.productId) ?? 0;
    return {
      productId: s.productId,
      sku: s.product.sku,
      name: s.product.name,
      brand: s.product.brand,
      category: s.product.category,
      priceCents: s.product.priceCents,
      costCents: s.product.costCents,
      qty: s.qty,
      minQty: s.minQty,
      sold30: monthly,
      // A este ritmo, cuántos días dura el stock. null = no se está vendiendo.
      daysLeft: monthly ? Math.round(s.qty / (monthly / 30)) : null,
    };
  });
  const valueCost = rows.reduce((a, r) => a + r.qty * r.costCents, 0);
  const valueRetail = rows.reduce((a, r) => a + r.qty * r.priceCents, 0);
  const lowCount = rows.filter((r) => r.qty < r.minQty).length;
  const top = [...rows].sort((a, b) => b.sold30 * b.priceCents - a.sold30 * a.priceCents).slice(0, 6);
  const hrefFor = (extra: Record<string, string>) => `/dashboard/inventario?${new URLSearchParams({ ...(selected === "all" ? { sede: branchId } : {}), ...extra })}`;

  return (
    <>
      <PageHeader
        eyebrow="SPECCHi Store"
        title="Inventario"
        description="Stock por sede, alertas de reposición y margen. Cada venta en caja lo descuenta sola."
        actions={
          selected === "all" ? (
            <nav aria-label="Sede" className="flex flex-wrap gap-1 rounded-full border border-line bg-paper p-1">
              {branches.map((b) => (
                <Link key={b.id} href={`/dashboard/inventario?${new URLSearchParams({ sede: b.id, ...(low ? { filter: "low" } : {}) })}`} aria-current={b.id === branchId ? "true" : undefined} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap", b.id === branchId ? "bg-ink text-paper" : "text-ink-soft hover:bg-sand")}>
                  {b.name}
                </Link>
              ))}
            </nav>
          ) : null
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { l: "Valor a costo", v: formatMoney(valueCost) },
          { l: "Valor a precio de venta", v: formatMoney(valueRetail) },
          { l: "Margen potencial", v: valueRetail ? `${Math.round(((valueRetail - valueCost) / valueRetail) * 100)} %` : "—" },
          { l: "Por debajo del mínimo", v: String(lowCount), href: hrefFor({ filter: "low" }) },
        ].map((k) => (
          <Card key={k.l}>
            <p className="text-xs text-muted">{k.l}</p>
            <p className="mt-1 font-display text-4xl leading-none tabular-nums">{k.v}</p>
            {k.href ? <Link href={k.href} className="mt-2 inline-block text-xs font-semibold text-rose hover:underline">Ver cuáles</Link> : null}
          </Card>
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <StockTable rows={rows} branchId={branchId} initialLow={low} />
        <div className="space-y-4">
          <Card>
            <CardTitle hint="Ventas de los últimos 30 días">Lo que más vende</CardTitle>
            {top.some((t) => t.sold30) ? <HBarChart data={top.filter((t) => t.sold30).map((t) => ({ name: t.name, value: (t.sold30 * t.priceCents) / 100, extra: `${t.sold30} unidades` }))} valueLabel="Ventas de producto" color={SERIES.coral} /> : <p className="text-sm text-muted">Sin ventas de producto en esta sede.</p>}
          </Card>
          <Card>
            <CardTitle>Últimos movimientos</CardTitle>
            {moves.length ? (
              <ul className="space-y-2 text-xs">
                {moves.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{m.product.brand} {m.product.name}</span>
                      <span className="text-muted">{formatLocal(m.createdAt, "America/Lima", "d MMM, HH:mm")} · {m.userName ?? "Sistema"}{m.note ? ` · ${m.note}` : ""}</span>
                    </span>
                    <span className={cn("font-semibold tabular-nums", m.delta > 0 ? "text-success" : "text-danger")}>{m.delta > 0 ? "+" : ""}{m.delta}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Las reposiciones y ajustes aparecerán aquí.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
