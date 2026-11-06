import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@/generated/prisma/client";
import { applyMigrations } from "@/lib/migrations";
import { seedDatabase } from "@/lib/seed-data";
import { getAvailability } from "@/lib/availability";
import { BookingError, createBooking } from "@/lib/booking";
import type { Slot } from "@/lib/availability-engine";
import { addDaysKey, localDateKey } from "@/lib/time";

let prisma: PrismaClient;

beforeAll(async () => {
  const pg = new PGlite();
  await applyMigrations(pg);
  prisma = new PrismaClient({ adapter: new PrismaPGlite(pg) });
  await seedDatabase(prisma);
});

async function firstSlot(branchId: string, items: Array<{ serviceId: string; stylistId?: string }>) {
  const branch = await prisma.branch.findUniqueOrThrow({ where: { id: branchId } });
  const today = localDateKey(new Date(), branch.timezone);
  for (let d = 2; d < 14; d++) {
    const { days } = await getAvailability(prisma, { branchId, items, fromKey: addDaysKey(today, d) });
    if (days[0]!.slots[0]) return days[0]!.slots[0] as Slot;
  }
  throw new Error("sin huecos");
}

describe("reservas", () => {
  it("dos clientes no pueden quedarse el mismo hueco", async () => {
    const branch = await prisma.branch.findUniqueOrThrow({ where: { slug: "angamos" } });
    const stylist = await prisma.stylist.findUniqueOrThrow({ where: { slug: "andrea-paz" } });
    const service = await prisma.service.findUniqueOrThrow({ where: { slug: "laminado-de-cejas" } });
    const items = [{ serviceId: service.id, stylistId: stylist.id }];
    const start = new Date((await firstSlot(branch.id, items)).start);

    const results = await Promise.allSettled([
      createBooking(prisma, { branchId: branch.id, phone: "+51911000001", customerName: "Cliente A", items, start, channel: "WEB" }),
      createBooking(prisma, { branchId: branch.id, phone: "+51911000002", customerName: "Cliente B", items, start, channel: "WHATSAPP" }),
    ]);
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(failed).toHaveLength(1);
    const err = failed[0]!.reason as BookingError;
    expect(err).toBeInstanceOf(BookingError);
    expect(err.code).toBe("SLOT_TAKEN");
    expect(err.alternatives.length).toBeGreaterThan(0);
  });

  it("una especialista en dos sedes no puede tener dos citas a la vez", async () => {
    // Andrea trabaja en Angamos (L-M-V) y Jockey Plaza (Ma-J-S): se reserva en Angamos y se comprueba que el bloque no se ofrezca en ninguna sede.
    const andrea = await prisma.stylist.findUniqueOrThrow({ where: { slug: "andrea-paz" }, include: { schedules: { include: { branch: true } } } });
    const service = await prisma.service.findUniqueOrThrow({ where: { slug: "sombreado-de-cejas-con-henna" } });
    const angamos = andrea.schedules.find((s) => s.branch.slug === "angamos")!.branch;
    const items = [{ serviceId: service.id, stylistId: andrea.id }];
    const slot = await firstSlot(angamos.id, items);
    await createBooking(prisma, { branchId: angamos.id, phone: "+51911000010", items, start: new Date(slot.start), channel: "WEB" });
    const key = localDateKey(slot.start, angamos.timezone);
    for (const b of new Set(andrea.schedules.map((s) => s.branchId))) {
      const { days } = await getAvailability(prisma, { branchId: b, items, fromKey: key });
      expect(days[0]!.slots.some((s) => s.start < slot.end && slot.start < s.end)).toBe(false);
    }
  });

  it("aplica el límite de reservas activas por cliente", async () => {
    const branch = await prisma.branch.findUniqueOrThrow({ where: { slug: "angamos" } });
    const service = await prisma.service.findUniqueOrThrow({ where: { slug: "manicure" } });
    const items = [{ serviceId: service.id }];
    const today = localDateKey(new Date(), branch.timezone);
    let created = 0;
    let policyError: BookingError | null = null;
    for (let d = 2; d < 14 && !policyError; d++) {
      const { days } = await getAvailability(prisma, { branchId: branch.id, items, fromKey: addDaysKey(today, d) });
      const s = days[0]!.slots[0];
      if (!s) continue;
      try {
        await createBooking(prisma, { branchId: branch.id, phone: "+51911000099", items, start: new Date(s.start), channel: "WEB" });
        created++;
      } catch (e) {
        policyError = e as BookingError;
      }
    }
    expect(created).toBe(branch.maxActiveBookings);
    expect(policyError?.code).toBe("POLICY");
  });
});
