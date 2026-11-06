import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Gift, PackageCheck } from "lucide-react";
import { GiftLookup, UsePackageButton } from "@/components/dashboard/loyalty-actions";
import { Badge, Card, CardTitle, DemoNote, PageHeader } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { TIERS, tierOf } from "@/lib/pos";
import { db } from "@/lib/prisma";
import { formatLocal } from "@/lib/time";
import { cn, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Club y gift cards" };
const TZ = "America/Lima";
const TIER_STYLE = ["from-sand to-paper", "from-butter to-paper", "from-peach/70 to-blush", "from-lilac to-rose/40"];

export default async function FidelizacionPage() {
  await requireUser(["OWNER", "ADMIN", "BRANCH_MANAGER", "RECEPTION"]);
  const prisma = await db();
  const now = new Date();
  const [members, top, gifts, packs] = await Promise.all([
    prisma.customer.findMany({ where: { loyaltyPoints: { gt: 0 } }, select: { loyaltyPoints: true } }),
    prisma.customer.findMany({ where: { loyaltyPoints: { gt: 0 } }, orderBy: { loyaltyPoints: "desc" }, take: 8, select: { id: true, name: true, loyaltyPoints: true } }),
    prisma.giftCard.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.customerPackage.findMany({ where: { expiresAt: { gte: now } }, include: { customer: { select: { id: true, name: true } } }, orderBy: { expiresAt: "asc" }, take: 24 }),
  ]);
  const counts = TIERS.map((t) => members.filter((m) => tierOf(m.loyaltyPoints).key === t.key).length);
  const outstanding = gifts.filter((g) => g.status === "ACTIVE").reduce((a, g) => a + g.balanceCents, 0);
  const sold = gifts.reduce((a, g) => a + g.initialCents, 0);
  const pendingSessions = packs.reduce((a, p) => a + p.totalSessions - p.usedSessions, 0);

  return (
    <>
      <PageHeader eyebrow="Clientes" title="Club SPECCHi" description="Puntos que se suman solos con cada compra, gift cards con saldo y paquetes de sesiones. Lo que hace que un cliente vuelva." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((t, i) => (
          <Card key={t.key} className={cn("bg-linear-to-br", TIER_STYLE[i])}>
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase"><Crown className="h-3.5 w-3.5" aria-hidden /> {t.key}</p>
            <p className="mt-2 font-display text-5xl leading-none tabular-nums">{counts[i]!.toLocaleString("es-PE")}</p>
            <p className="mt-2 text-xs text-ink-soft">Desde {t.min.toLocaleString("es-PE")} puntos. {t.perk}.</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardTitle hint="S/ 1 = 1 punto · 100 puntos = S/ 5">Quienes más puntos tienen</CardTitle>
          <ol className="divide-y divide-line">
            {top.map((c, i) => (
              <li key={c.id}>
                <Link href={`/dashboard/clientes/${c.id}`} className="flex items-center gap-3 py-2 text-sm hover:text-rose">
                  <span className="w-5 font-display text-xl text-rose tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                  <Badge>{tierOf(c.loyaltyPoints).key}</Badge>
                  <span className="w-16 text-right font-semibold tabular-nums">{c.loyaltyPoints.toLocaleString("es-PE")}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardTitle hint={`${pendingSessions} sesiones pagadas por atender`}>
            <span className="inline-flex items-center gap-2"><PackageCheck className="h-4 w-4 text-rose" aria-hidden /> Paquetes activos</span>
          </CardTitle>
          <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1" data-lenis-prevent>
            {packs.map((p) => {
              const soon = p.expiresAt.getTime() - now.getTime() < 30 * 86_400_000;
              return (
                <li key={p.id} className="rounded-2xl border border-line p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <Link href={`/dashboard/clientes/${p.customer.id}`} className="text-xs text-muted hover:text-rose">{p.customer.name}</Link>
                    </span>
                    {soon ? <Badge className="bg-butter text-[#6f4a06]">Vence {formatLocal(p.expiresAt, TZ, "d MMM")}</Badge> : <span className="text-xs text-muted">Vence {formatLocal(p.expiresAt, TZ, "d MMM yyyy")}</span>}
                    <UsePackageButton id={p.id} disabled={p.usedSessions >= p.totalSessions} />
                  </div>
                  <div className="mt-2 flex items-center gap-1" role="img" aria-label={`${p.usedSessions} de ${p.totalSessions} sesiones usadas`}>
                    {Array.from({ length: p.totalSessions }, (_, i) => (
                      <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < p.usedSessions ? "bg-linear-to-r from-rose to-coral" : "bg-sand")} />
                    ))}
                    <span className="ml-1 text-[11px] font-semibold tabular-nums">{p.usedSessions}/{p.totalSessions}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle
          hint="Se venden desde la caja y se pagan con su código"
          action={<GiftLookup />}
        >
          <span className="inline-flex items-center gap-2"><Gift className="h-4 w-4 text-rose" aria-hidden /> Gift cards</span>
        </CardTitle>
        <dl className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-sand/70 p-3">
            <dt className="text-xs text-muted">Vendido</dt>
            <dd className="font-display text-3xl tabular-nums">{formatMoney(sold)}</dd>
          </div>
          <div className="rounded-2xl bg-blush/50 p-3">
            <dt className="text-xs text-muted">Saldo por usar (obligación pendiente)</dt>
            <dd className="font-display text-3xl tabular-nums">{formatMoney(outstanding)}</dd>
          </div>
        </dl>
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 font-medium">Código</th>
                <th className="py-2 font-medium">Para</th>
                <th className="py-2 font-medium">Compró</th>
                <th className="py-2 text-right font-medium">Valor</th>
                <th className="py-2 text-right font-medium">Saldo</th>
                <th className="py-2 text-right font-medium">Vence</th>
              </tr>
            </thead>
            <tbody>
              {gifts.slice(0, 12).map((g) => (
                <tr key={g.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2 font-mono text-xs">{g.code}</td>
                  <td className="py-2">{g.recipientName ?? "—"}</td>
                  <td className="py-2 text-muted">{g.buyerName ?? "—"}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(g.initialCents)}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{g.status === "ACTIVE" ? formatMoney(g.balanceCents) : <Badge>Usada</Badge>}</td>
                  <td className="py-2 text-right text-xs tabular-nums">{formatLocal(g.expiresAt, TZ, "d MMM yyyy")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {config.demoMode ? <DemoNote className="mt-4">Niveles y equivalencia de puntos propuestos para la demo: la empresa define los suyos. Los paquetes son los de la carta real de SPECCHi.</DemoNote> : null}
    </>
  );
}
