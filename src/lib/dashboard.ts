import "server-only";
import { cookies } from "next/headers";
import type { Role } from "@/generated/prisma/client";
import type { CurrentUser } from "./auth";
import { db } from "./prisma";

export const BRANCH_COOKIE = "sp_branch";

export async function getSelectedBranch(user: CurrentUser): Promise<string> {
  const value = (await cookies()).get(BRANCH_COOKIE)?.value ?? "all";
  if (value === "all") return user.branchIds?.length === 1 ? user.branchIds[0]! : "all";
  if (user.branchIds && !user.branchIds.includes(value)) return "all";
  return value;
}

export async function visibleBranches(user: CurrentUser) {
  const prisma = await db();
  return prisma.branch.findMany({
    where: user.branchIds ? { id: { in: user.branchIds } } : {},
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, district: true, timezone: true, active: true },
  });
}

const ALL: Role[] = ["OWNER", "ADMIN", "BRANCH_MANAGER", "RECEPTION", "STYLIST"];
const STAFF: Role[] = ["OWNER", "ADMIN", "BRANCH_MANAGER", "RECEPTION"];
const MANAGERS: Role[] = ["OWNER", "ADMIN", "BRANCH_MANAGER"];

export const NAV: Array<{ href: string; label: string; icon: string; roles: Role[]; group: string }> = [
  { href: "/dashboard", label: "Centro de mando", icon: "gauge", roles: ["OWNER", "ADMIN", "BRANCH_MANAGER", "STYLIST"], group: "Hoy" },
  { href: "/dashboard/agenda", label: "Agenda", icon: "calendar", roles: ALL, group: "Hoy" },
  { href: "/dashboard/reservas", label: "Reservas", icon: "list", roles: STAFF, group: "Hoy" },
  { href: "/dashboard/caja", label: "Caja", icon: "cash", roles: STAFF, group: "Hoy" },
  { href: "/dashboard/conversaciones", label: "WhatsApp", icon: "chat", roles: STAFF, group: "Hoy" },
  { href: "/dashboard/clientes", label: "Clientes", icon: "users", roles: ALL, group: "Clientes" },
  { href: "/dashboard/campanas", label: "Campañas", icon: "megaphone", roles: MANAGERS, group: "Clientes" },
  { href: "/dashboard/fidelizacion", label: "Club y gift cards", icon: "crown", roles: STAFF, group: "Clientes" },
  { href: "/dashboard/resenas", label: "Reseñas", icon: "star", roles: MANAGERS, group: "Clientes" },
  { href: "/dashboard/analitica", label: "Analítica", icon: "line", roles: MANAGERS, group: "Negocio" },
  { href: "/dashboard/inventario", label: "Inventario", icon: "box", roles: STAFF, group: "Negocio" },
  { href: "/dashboard/equipo", label: "Equipo y comisiones", icon: "team", roles: ALL, group: "Negocio" },
  { href: "/dashboard/simulador", label: "Simulador del bot", icon: "bot", roles: MANAGERS, group: "Sistema" },
  { href: "/dashboard/seguridad", label: "Seguridad", icon: "shield", roles: ALL, group: "Sistema" },
  { href: "/dashboard/configuracion", label: "Configuración", icon: "settings", roles: ALL, group: "Sistema" },
];

export const canSee = (role: Role, href: string) => NAV.find((n) => n.href === href)?.roles.includes(role) ?? false;

/** Datos para el formulario de reserva del staff (solo sedes visibles). */
export async function formCatalog(user: CurrentUser) {
  const prisma = await db();
  const branchFilter = user.branchIds ? { in: user.branchIds } : undefined;
  const [branches, services, stylists] = await Promise.all([
    prisma.branch.findMany({ where: { active: true, ...(branchFilter ? { id: branchFilter } : {}) }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { branches: { where: { active: true, ...(branchFilter ? { branchId: branchFilter } : {}) } } },
    }),
    prisma.stylist.findMany({ where: { active: true }, include: { schedules: { select: { branchId: true } }, services: { select: { serviceId: true } } }, orderBy: { name: "asc" } }),
  ]);
  return {
    branches,
    services: services
      .filter((s) => s.branches.length)
      .map((s) => ({ id: s.id, name: s.name, category: s.category, durationMin: s.durationMin, priceCents: s.priceCents, branchIds: s.branches.map((b) => b.branchId) })),
    stylists: stylists.map((s) => ({ id: s.id, name: s.name, branchIds: [...new Set(s.schedules.map((x) => x.branchId))], serviceIds: s.services.map((x) => x.serviceId) })),
  };
}
