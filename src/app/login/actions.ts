"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth";
import { config } from "@/lib/config";
import { db } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";
import { verifyTotp } from "@/lib/totp";

const schema = z.object({
  email: z.email("Escribe un correo válido").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Escribe tu contraseña").max(200),
  next: z.string().optional(),
  code: z.string().optional(),
});

export interface LoginState {
  error?: string;
  /** La contraseña fue correcta y falta el código de la app de autenticación. */
  needsCode?: boolean;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const prisma = await db();
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Comparar siempre para no filtrar qué correos existen por el tiempo de respuesta.
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!user || !ok || !user.active) return { error: "Correo o contraseña incorrectos." };
  if (user.totpEnabledAt && user.totpSecret) {
    if (!parsed.data.code) return { needsCode: true };
    if (!verifyTotp(user.totpSecret, parsed.data.code)) return { needsCode: true, error: "El código no coincide. Prueba con el más reciente." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await prisma.auditLog.create({ data: { userId: user.id, userName: user.name, action: "Inició sesión", entity: "Sesión" } });
  await createSession(user.id, user.role);
  const next = parsed.data.next?.startsWith("/dashboard") ? parsed.data.next : user.role === "RECEPTION" ? "/dashboard/agenda" : "/dashboard";
  redirect(next);
}

/** Acceso de un clic para quien prueba la demo. Solo existe en modo demo. */
const DEMO_ROLES: Record<string, string> = { owner: "direccion@specchi.demo", manager: "gerencia.spa@specchi.demo", reception: "recepcion.angamos@specchi.demo", stylist: "valeria@specchi.demo" };

export async function demoLogin(role: string) {
  if (!config.demoMode) return;
  const email = DEMO_ROLES[role];
  if (!email) return;
  const prisma = await db();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await createSession(user.id, user.role);
  redirect(user.role === "RECEPTION" ? "/dashboard/agenda" : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
