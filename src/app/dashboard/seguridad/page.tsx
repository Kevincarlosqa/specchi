import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { CustomFieldForm } from "@/components/dashboard/custom-fields";
import { TotpSetup } from "@/components/dashboard/totp-setup";
import { Badge, Card, CardTitle, PageHeader } from "@/components/dashboard/ui";
import { isAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { formatLocal } from "@/lib/time";

export const metadata: Metadata = { title: "Seguridad" };

export default async function SeguridadPage() {
  const user = await requireUser();
  const prisma = await db();
  const admin = isAdmin(user);
  const [me, logs, withTotp, totalUsers, fields] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { totpEnabledAt: true } }),
    admin ? prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 }) : prisma.auditLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.user.count({ where: { totpEnabledAt: { not: null }, active: true } }),
    prisma.user.count({ where: { active: true } }),
    admin ? prisma.customerFieldDef.findMany({ orderBy: { sortOrder: "asc" } }) : [],
  ]);

  return (
    <>
      <PageHeader eyebrow="Sistema" title="Seguridad" description="Verificación en dos pasos por usuario y un registro de quién hizo qué. Los datos de salud de tus clientes merecen este cuidado." />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <Card>
            <CardTitle hint="Compatible con Google Authenticator">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-rose" aria-hidden /> Verificación en dos pasos</span>
            </CardTitle>
            <TotpSetup enabled={Boolean(me.totpEnabledAt)} />
            {admin ? <p className="mt-4 border-t border-line pt-3 text-xs text-muted">{withTotp} de {totalUsers} usuarios la tienen activa.</p> : null}
          </Card>
          {admin ? (
            <Card>
              <CardTitle hint="Sin límite: aparecen en la ficha de cada cliente">Campos de la ficha</CardTitle>
              <ul className="mb-4 flex flex-wrap gap-1.5">
                {fields.map((f) => (
                  <li key={f.id}><Badge className={f.sensitive ? "bg-blush text-rose-deep" : ""}>{f.label}{f.sensitive ? " · salud" : ""}</Badge></li>
                ))}
              </ul>
              <CustomFieldForm />
            </Card>
          ) : null}
        </div>
        <Card>
          <CardTitle hint={admin ? "Toda la empresa" : "Solo tu actividad"}>Registro de actividad</CardTitle>
          <ol className="relative max-h-[640px] space-y-3 overflow-y-auto pl-4" data-lenis-prevent>
            <span className="absolute top-1 bottom-1 left-[3px] w-px bg-line" aria-hidden />
            {logs.map((l) => (
              <li key={l.id} className="relative text-sm">
                <span className="absolute top-1.5 -left-[15px] h-2 w-2 rounded-full bg-rose ring-2 ring-paper" aria-hidden />
                <p className="font-medium">{l.action} <span className="font-normal text-muted">· {l.entity}</span></p>
                <p className="text-xs text-muted">{l.userName} · {formatLocal(l.createdAt, "America/Lima", "d MMM yyyy, HH:mm")}{l.detail ? ` · ${l.detail}` : ""}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
