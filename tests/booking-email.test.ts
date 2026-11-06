import { describe, expect, it } from "vitest";
import { bookingCreatedEmail, type BookingForEmail } from "@/lib/booking-email";

const start = new Date("2026-11-12T15:30:00Z");
const booking = {
  code: "SP-7K2Q",
  status: "PENDING",
  channel: "WHATSAPP",
  startsAt: start,
  endsAt: new Date(+start + 90 * 60_000),
  totalCents: 45000,
  notes: "Prefiere tono <natural>",
  customerId: "c1",
  branch: { name: "Angamos", address: "Av. Angamos Oeste 1450, Miraflores", timezone: "America/Lima" },
  customer: { name: "María López", phone: "+51987654321", email: null, allergies: "Látex", notes: null, noShowCount: 1 },
  items: [{ startsAt: start, durationMin: 90, priceCents: 45000, service: { name: "Balayage" }, stylist: { name: "Valeria Rossi" } }],
} as unknown as BookingForEmail;

describe("correo de reserva nueva", () => {
  it("incluye los datos clave y escapa el HTML", () => {
    const { subject, html, text } = bookingCreatedEmail(booking, { visits: 0 });
    expect(subject).toContain("María López");
    expect(subject).toContain("Angamos");
    expect(html).toContain("10:30 – 12:00");
    expect(html).toContain("Balayage");
    expect(html).toContain("Látex");
    expect(html).toContain("Primera visita");
    expect(html).toContain("https://wa.me/51987654321");
    expect(html).toContain("Prefiere tono &lt;natural&gt;");
    expect(html).not.toContain("<natural>");
    expect(text).toContain("SP-7K2Q");
  });
});
