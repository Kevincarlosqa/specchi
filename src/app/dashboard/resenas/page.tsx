import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { ReviewReply } from "@/components/dashboard/review-reply";
import { Badge, Card, CardTitle, DemoNote, EmptyState, PageHeader, pct } from "@/components/dashboard/ui";
import { requireUser, scopeBranches } from "@/lib/auth";
import { config } from "@/lib/config";
import { getSelectedBranch } from "@/lib/dashboard";
import { db } from "@/lib/prisma";
import { formatLocal } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reseñas" };

function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`${n} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i < n ? "fill-ochre text-ochre" : "text-linen")} style={i < n ? { fill: "#d9a11f", color: "#d9a11f" } : undefined} aria-hidden />
      ))}
    </span>
  );
}

export default async function ResenasPage({ searchParams }: PageProps<"/dashboard/resenas">) {
  const user = await requireUser(["OWNER", "ADMIN", "BRANCH_MANAGER"]);
  const sp = await searchParams;
  const filter = sp.filter === "pending" ? "pending" : "all";
  const selected = await getSelectedBranch(user);
  const branchIds = scopeBranches(user, selected);
  const prisma = await db();
  const where = branchIds ? { branchId: { in: branchIds } } : {};
  const [all, list, branches, requested, completed] = await Promise.all([
    prisma.review.findMany({ where, select: { rating: true, branchId: true, source: true, reply: true } }),
    prisma.review.findMany({
      where: { ...where, ...(filter === "pending" ? { reply: null, rating: { lte: 3 } } : { comment: { not: null } }) },
      include: { branch: { select: { name: true, googleReviewUrl: true } }, customer: { select: { name: true } }, stylist: { select: { name: true } } },
      orderBy: filter === "pending" ? [{ rating: "asc" }, { createdAt: "desc" }] : { createdAt: "desc" },
      take: 25,
    }),
    prisma.branch.findMany({ where: branchIds ? { id: { in: branchIds } } : {}, orderBy: { sortOrder: "asc" } }),
    prisma.booking.count({ where: { reviewRequestedAt: { not: null }, ...where } }),
    prisma.booking.count({ where: { status: "COMPLETED", ...where } }),
  ]);
  const avg = all.length ? all.reduce((a, r) => a + r.rating, 0) / all.length : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: all.filter((r) => r.rating === n).length }));
  const google = all.filter((r) => r.source === "GOOGLE").length;
  const replied = all.filter((r) => r.reply).length;

  return (
    <>
      <PageHeader
        eyebrow="Clientes"
        title="Reseñas"
        description="Pide la reseña sola después de cada visita, mide la reputación de cada sede y responde a tiempo."
        actions={
          <nav aria-label="Filtro" className="flex rounded-full border border-line bg-paper p-1">
            {([["all", "Todas"], ["pending", "Por responder"]] as const).map(([k, l]) => (
              <Link key={k} href={k === "all" ? "/dashboard/resenas" : "/dashboard/resenas?filter=pending"} aria-current={filter === k ? "true" : undefined} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", filter === k ? "bg-ink text-paper" : "text-ink-soft hover:bg-sand")}>
                {l}
              </Link>
            ))}
          </nav>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
        <Card className="bg-linear-to-br from-butter/70 to-paper">
          <p className="text-xs text-ink-soft">Calificación media</p>
          <p className="mt-1 font-display text-7xl leading-none tabular-nums">{avg.toFixed(2)}</p>
          <Stars n={Math.round(avg)} className="mt-2" />
          <p className="mt-3 text-xs text-ink-soft">{all.length.toLocaleString("es-PE")} reseñas · {google.toLocaleString("es-PE")} en Google</p>
        </Card>
        <Card>
          <CardTitle>Distribución</CardTitle>
          <ul className="space-y-2">
            {dist.map((d) => (
              <li key={d.n} className="grid grid-cols-[1.5rem_1fr_2.5rem] items-center gap-2 text-xs">
                <span className="font-semibold tabular-nums">{d.n}★</span>
                <span className="h-2 overflow-hidden rounded-full bg-sand"><span className="grow-x block h-full rounded-full bg-linear-to-r from-rose to-coral" style={{ width: `${all.length ? (d.c / all.length) * 100 : 0}%` }} /></span>
                <span className="text-right tabular-nums">{d.c}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
            <div>
              <dt className="text-muted">Solicitudes automáticas</dt>
              <dd className="text-sm font-semibold tabular-nums">{completed ? pct(requested / completed, 0) : "—"} de las visitas</dd>
            </div>
            <div>
              <dt className="text-muted">Tasa de respuesta</dt>
              <dd className="text-sm font-semibold tabular-nums">{all.length ? pct(replied / all.length, 0) : "—"}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <CardTitle hint="Consolidado por sede">Reputación por sede</CardTitle>
          <ul className="divide-y divide-line">
            {branches.map((b) => {
              const own = all.filter((r) => r.branchId === b.id);
              const a = own.length ? own.reduce((x, r) => x + r.rating, 0) / own.length : 0;
              return (
                <li key={b.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="flex-1 font-medium">{b.name}</span>
                  <Stars n={Math.round(a)} />
                  <span className="w-10 text-right font-semibold tabular-nums">{a.toFixed(1)}</span>
                  <span className="w-8 text-right text-xs text-muted tabular-nums">{own.length}</span>
                  {b.googleReviewUrl ? <a href={b.googleReviewUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${b.name} en Google`} className="text-muted hover:text-rose"><ExternalLink className="h-3.5 w-3.5" /></a> : null}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-4 space-y-3">
        {list.length ? (
          list.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars n={r.rating} />
                <p className="text-sm font-semibold">{r.customer?.name ?? "Cliente"}</p>
                <Badge className={r.source === "GOOGLE" ? "bg-lilac/40" : ""}>{r.source === "GOOGLE" ? "Google" : "Encuesta interna"}</Badge>
                <p className="ml-auto text-xs text-muted">{r.branch.name}{r.stylist ? ` · ${r.stylist.name}` : ""} · {formatLocal(r.createdAt, "America/Lima", "d MMM")}</p>
              </div>
              {r.comment ? <p className="mt-2 text-sm leading-relaxed">{r.comment}</p> : <p className="mt-2 text-sm text-muted italic">Sin comentario</p>}
              <ReviewReply id={r.id} rating={r.rating} name={r.customer?.name?.split(" ")[0] ?? ""} reply={r.reply} />
            </Card>
          ))
        ) : (
          <EmptyState title="Todo respondido" icon={<Star className="h-8 w-8" />}>No hay reseñas pendientes en estas sedes.</EmptyState>
        )}
      </div>
      {config.demoMode ? <DemoNote className="mt-4">Reseñas de ejemplo. En producción, la solicitud sale por WhatsApp al terminar la cita y la lectura de Google usa su API de perfiles de negocio.</DemoNote> : null}
    </>
  );
}
