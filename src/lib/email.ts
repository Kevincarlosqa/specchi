import "server-only";
import { config } from "./config";

export interface Email {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

/** Envía un correo con la API HTTP de Mailgun. Sin MAILGUN_API_KEY/MAILGUN_DOMAIN no hace nada. */
export async function sendEmail(email: Email): Promise<boolean> {
  if (!config.emailEnabled || email.to.length === 0) return false;
  const host = config.MAILGUN_REGION === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";
  const form = new FormData();
  form.append("from", config.MAIL_FROM || `SPECCHi <reservas@${config.MAILGUN_DOMAIN}>`);
  for (const to of email.to) form.append("to", to);
  form.append("subject", email.subject);
  form.append("html", email.html);
  form.append("text", email.text);

  const res = await fetch(`https://${host}/v3/${config.MAILGUN_DOMAIN}/messages`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`api:${config.MAILGUN_API_KEY}`).toString("base64")}` },
    body: form,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Mailgun ${res.status}: ${await res.text()}`);
  return true;
}
