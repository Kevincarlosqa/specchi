import "server-only";
import { after } from "next/server";
import type { Branch, Booking, BookingItem, Customer, Service, Stylist } from "@/generated/prisma/client";
import type { Db } from "./prisma";
import { config } from "./config";
import { sendEmail } from "./email";
import { CHANNEL_LABELS, STATUS_LABELS } from "./labels";
import { formatLocal } from "./time";
import { formatMoney } from "./utils";

export type BookingForEmail = Booking & {
  branch: Branch;
  customer: Customer;
  items: Array<BookingItem & { service: Service; stylist: Stylist }>;
};

export interface CustomerHistory {
  visits: number;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const INK = "#2a1025";
const MUTED = "#6b6b6b";
const LINE = "#e7e5e2";
const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif";
const SANS = "Manrope, 'Helvetica Neue', Helvetica, Arial, sans-serif";

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${LINE};font:500 11px/1.4 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${MUTED};width:132px;vertical-align:top">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${LINE};font:400 15px/1.5 ${SANS};color:${INK};vertical-align:top">${value}</td>
  </tr>`;
}

function section(title: string, rows: string) {
  return `<tr><td style="padding:28px 40px 0">
    <p style="margin:0 0 6px;font:400 22px/1.2 ${SERIF};color:${INK}">${title}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>
  </td></tr>`;
}

/** Correo para el equipo con los datos de una reserva nueva. */
export function bookingCreatedEmail(b: BookingForEmail, history: CustomerHistory) {
  const tz = b.branch.timezone;
  const name = b.customer.name?.trim() || "Cliente sin nombre";
  const when = cap(formatLocal(b.startsAt, tz, "EEEE d 'de' MMMM"));
  const hours = `${formatLocal(b.startsAt, tz, "HH:mm")} – ${formatLocal(b.endsAt, tz, "HH:mm")}`;
  const phoneDigits = b.customer.phone.replace(/\D/g, "");
  const panelUrl = `${config.APP_URL}/dashboard/reservas?q=${encodeURIComponent(b.code)}`;
  const pending = b.status === "PENDING";

  const services = b.items
    .map(
      (i) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${LINE};font:400 15px/1.4 ${SANS};color:${INK}">${esc(i.service.name)}<br>
          <span style="font-size:13px;color:${MUTED}">con ${esc(i.stylist.name)} · ${formatLocal(i.startsAt, tz, "HH:mm")} · ${i.durationMin} min</span></td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${LINE};font:500 15px/1.4 ${SANS};color:${INK};white-space:nowrap;vertical-align:top">${formatMoney(i.priceCents, true)}</td>
      </tr>`,
    )
    .join("");

  const customerRows = [
    row("Nombre", esc(name)),
    row("Teléfono", `<a href="https://wa.me/${phoneDigits}" style="color:${INK}">${esc(b.customer.phone)}</a> <span style="color:${MUTED};font-size:13px">· WhatsApp</span>`),
    b.customer.email ? row("Correo", `<a href="mailto:${esc(b.customer.email)}" style="color:${INK}">${esc(b.customer.email)}</a>`) : "",
    row("Historial", history.visits === 0 ? "<strong>Primera visita</strong>" : `${history.visits} ${history.visits === 1 ? "visita completada" : "visitas completadas"}`),
    b.customer.noShowCount > 0 ? row("Inasistencias", `<strong>${b.customer.noShowCount}</strong>`) : "",
    b.customer.allergies ? row("Alergias", `<strong>${esc(b.customer.allergies)}</strong>`) : "",
    b.customer.notes ? row("Notas de ficha", esc(b.customer.notes)) : "",
  ].join("");

  const bookingRows = [
    row("Sede", `${esc(b.branch.name)}<br><span style="font-size:13px;color:${MUTED}">${esc(b.branch.address)}</span>`),
    row("Canal", CHANNEL_LABELS[b.channel]),
    row("Estado", pending ? `<strong>${STATUS_LABELS[b.status]}</strong> — requiere confirmación` : STATUS_LABELS[b.status]),
    b.notes ? row("Notas", esc(b.notes)) : "",
  ].join("");

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Nueva reserva ${esc(b.code)}</title></head>
<body style="margin:0;padding:0;background:#f4f2ef">
<div style="display:none;max-height:0;overflow:hidden">${esc(name)} · ${esc(when)}, ${hours} · ${esc(b.branch.name)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ef"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${LINE}">
    <tr><td align="center" style="padding:36px 40px 28px;border-bottom:1px solid ${LINE}">
      <img src="${config.APP_URL}/email/logo.png" width="56" height="56" alt="SPECCHi" style="display:block;border:0">
      <p style="margin:14px 0 0;font:600 12px/1 ${SANS};letter-spacing:.32em;text-transform:uppercase;color:${INK}">SPECCHi</p>
      <p style="margin:6px 0 0;font:400 11px/1 ${SANS};letter-spacing:.2em;text-transform:uppercase;color:${MUTED}">Spa · Peluquería · Wellness</p>
    </td></tr>

    <tr><td style="padding:36px 40px 0">
      <p style="margin:0;font:500 11px/1 ${SANS};letter-spacing:.2em;text-transform:uppercase;color:${MUTED}">Nueva reserva · ${esc(b.code)}</p>
      <h1 style="margin:12px 0 0;font:400 38px/1.1 ${SERIF};color:${INK}">${esc(name)}</h1>
    </td></tr>

    <tr><td style="padding:24px 40px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK}"><tr><td style="padding:22px 24px">
        <p style="margin:0;font:400 26px/1.2 ${SERIF};color:#ffffff">${esc(when)}</p>
        <p style="margin:6px 0 0;font:500 15px/1.4 ${SANS};color:#d4d4d4">${hours} · ${esc(b.branch.name)}</p>
      </td></tr></table>
    </td></tr>

    ${pending ? `<tr><td style="padding:16px 40px 0"><p style="margin:0;padding:12px 16px;border:1px solid ${INK};font:500 14px/1.5 ${SANS};color:${INK}">Esta reserva quedó <strong>pendiente</strong> por el historial de la cliente. Confírmala desde el panel.</p></td></tr>` : ""}

    ${section("Servicios", `${services}<tr><td style="padding:14px 0 0;font:600 12px/1 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${INK}">Total</td><td align="right" style="padding:14px 0 0;font:400 24px/1 ${SERIF};color:${INK}">${formatMoney(b.totalCents, true)}</td></tr>`)}
    ${section("Cliente", customerRows)}
    ${section("Reserva", bookingRows)}

    <tr><td align="center" style="padding:36px 40px 40px">
      <a href="${panelUrl}" style="display:inline-block;padding:15px 32px;background:${INK};color:#ffffff;text-decoration:none;font:600 12px/1 ${SANS};letter-spacing:.2em;text-transform:uppercase">Ver en el panel</a>
      <p style="margin:16px 0 0;font:400 13px/1.5 ${SANS};color:${MUTED}"><a href="https://wa.me/${phoneDigits}" style="color:${MUTED}">Escribirle por WhatsApp</a></p>
    </td></tr>
  </table>
  <p style="margin:20px 0 0;font:400 12px/1.6 ${SANS};color:${MUTED}">Aviso automático del sistema de reservas de SPECCHi.</p>
</td></tr></table>
</body></html>`;

  const text = [
    `Nueva reserva ${b.code}`,
    "",
    `${name} — ${when}, ${hours}`,
    `Sede: ${b.branch.name} (${b.branch.address})`,
    "",
    ...b.items.map((i) => `· ${i.service.name} con ${i.stylist.name} — ${formatMoney(i.priceCents, true)}`),
    `Total: ${formatMoney(b.totalCents, true)}`,
    "",
    `Teléfono: ${b.customer.phone}`,
    b.customer.email ? `Correo: ${b.customer.email}` : "",
    `Historial: ${history.visits === 0 ? "primera visita" : `${history.visits} visitas completadas`}`,
    b.customer.allergies ? `Alergias: ${b.customer.allergies}` : "",
    `Canal: ${CHANNEL_LABELS[b.channel]} · Estado: ${STATUS_LABELS[b.status]}`,
    b.notes ? `Notas: ${b.notes}` : "",
    "",
    `Ver en el panel: ${panelUrl}`,
  ]
    .filter((l, i, all) => l !== "" || all[i - 1] !== "")
    .join("\n");

  const subject = `Nueva reserva · ${name} · ${formatLocal(b.startsAt, tz, "EEE d MMM, HH:mm")} · ${b.branch.name}`;
  return { subject, html, text };
}

/** Avisa al equipo por correo sin retrasar la respuesta a la cliente. */
export function notifyBookingCreated(prisma: Db, booking: BookingForEmail) {
  if (!config.emailEnabled || config.notifyEmails.length === 0) return;
  const send = async () => {
    try {
      const visits = await prisma.booking.count({ where: { customerId: booking.customerId, status: "COMPLETED" } });
      await sendEmail({ to: config.notifyEmails, ...bookingCreatedEmail(booking, { visits }) });
    } catch (e) {
      console.error("[email] no se pudo enviar el aviso de reserva", booking.code, e);
    }
  };
  try {
    after(send);
  } catch {
    // Fuera de una request (scripts) no hay `after`: se envía igual, sin esperar.
    void send();
  }
}
