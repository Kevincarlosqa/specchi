"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { CheckCheck, Rocket, Sparkles } from "lucide-react";
import { launchCampaign } from "@/app/dashboard/business-actions";
import type { SegmentKey, SegmentRow } from "@/lib/segments";
import { cn, formatMoney } from "@/lib/utils";
import { Button, Card, CardTitle, Field, inputClass } from "./ui";

const TEMPLATES: Partial<Record<SegmentKey, { name: string; message: string }>> = {
  AT_RISK: { name: "Te extrañamos", message: "Hola {nombre} 💛 Hace un tiempo que no te vemos en SPECCHi. Esta semana tu próximo masaje o tratamiento tiene 15 % de regalo. ¿Te reservo un espacio?" },
  LOST: { name: "Vuelve a SPECCHi", message: "{nombre}, queremos verte de nuevo. Te regalamos un Circuito Wellness con tu próxima visita. Responde a este mensaje y te buscamos el mejor horario ✨" },
  VIP: { name: "Acceso preferente", message: "{nombre}, por ser de nuestros clientes más especiales, tienes prioridad en los nuevos rituales de temporada. ¿Quieres que te aparte una fecha?" },
  LOYAL: { name: "Agenda libre esta semana", message: "{nombre}, quedan espacios esta semana en tu sede favorita. Si reservas hoy, te invitamos un cepillado de cortesía ✨" },
  NEW: { name: "Bienvenida al Club SPECCHi", message: "¡Gracias por venir, {nombre}! Ya sumaste tus primeros puntos en el Club SPECCHi. En tu segunda visita te regalamos una hidratación con parafina 💛" },
  BIRTHDAY: { name: "Feliz cumpleaños", message: "¡Feliz mes, {nombre}! 🎂 Tu regalo de SPECCHi: 20 % en el servicio que quieras durante tu mes. ¿Lo agendamos?" },
  SALON_ONLY: { name: "Conoce el Spa Swissôtel", message: "{nombre}, ya conoces nuestro salón. ¿Y si esta vez te dejas consentir en el Spa Swissôtel? Masaje SPECCHi Signature con 10 % para ti." },
  SPA_ONLY: { name: "Conoce el salón", message: "{nombre}, después de tu spa, ¿qué tal un cambio de look? Tu primer servicio en el salón tiene 15 % de regalo." },
  ALL: { name: "Novedades SPECCHi", message: "Hola {nombre} ✨ Tenemos novedades en SPECCHi que te van a encantar. ¿Te cuento?" },
};

export function CampaignComposer({ segments, initial, demo }: { segments: SegmentRow[]; initial: SegmentKey; demo: boolean }) {
  const [segment, setSegment] = useState<SegmentKey>(initial);
  const [name, setName] = useState(TEMPLATES[initial]?.name ?? "");
  const [message, setMessage] = useState(TEMPLATES[initial]?.message ?? "");
  const [error, setError] = useState("");
  const [launched, setLaunched] = useState<{ audience: number; simulated: boolean } | null>(null);
  const [pending, start] = useTransition();
  const current = segments.find((s) => s.key === segment)!;
  const preview = message.replaceAll("{nombre}", "Lucía");

  const pick = (key: SegmentKey) => {
    setSegment(key);
    setName(TEMPLATES[key]?.name ?? "");
    setMessage(TEMPLATES[key]?.message ?? "");
    setLaunched(null);
    setError("");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
      <Card>
        <CardTitle hint="Se recalculan solos con cada visita">1 · ¿A quién?</CardTitle>
        <ul className="max-h-[440px] space-y-1.5 overflow-y-auto pr-1" data-lenis-prevent>
          {segments.map((s) => (
            <li key={s.key}>
              <button type="button" aria-pressed={segment === s.key} onClick={() => pick(s.key)} className={cn("relative w-full rounded-2xl border p-3 text-left transition-colors", segment === s.key ? "border-transparent" : "border-line hover:border-ink/25")}>
                {segment === s.key ? <motion.span layoutId="segment" className="absolute inset-0 rounded-2xl border border-rose/50 bg-blush/50" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                <span className="relative flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="text-xs tabular-nums"><strong>{s.reachable.toLocaleString("es-PE")}</strong> <span className="text-muted">de {s.total.toLocaleString("es-PE")}</span></span>
                </span>
                <span className="relative mt-0.5 block text-xs text-muted">{s.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col">
        <CardTitle hint="{nombre} se reemplaza por el nombre de cada cliente">2 · ¿Qué les dices?</CardTitle>
        <Field label="Nombre interno" htmlFor="c-name">
          <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Mensaje" htmlFor="c-msg" className="mt-3 flex-1">
          <textarea id="c-msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={700} rows={7} className={cn(inputClass, "h-auto flex-1 py-2.5 leading-relaxed")} />
        </Field>
        <p className="mt-1 text-right text-[11px] text-muted tabular-nums">{message.length} / 700</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-sand/70 p-3 text-xs">
          <div>
            <dt className="text-muted">Llegará a</dt>
            <dd className="text-lg font-semibold tabular-nums">{current.reachable.toLocaleString("es-PE")}</dd>
          </div>
          <div>
            <dt className="text-muted">Gasto medio del segmento</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatMoney(current.avgSpendCents)}</dd>
          </div>
        </dl>
        {error ? <p role="alert" className="mt-2 text-sm text-danger">{error}</p> : null}
        <Button
          variant="rose"
          className="mt-3 h-11"
          disabled={pending || !current.reachable}
          onClick={() =>
            start(async () => {
              setError("");
              const r = await launchCampaign({ name, segment, message });
              if (r.ok && r.data) setLaunched(r.data);
              else if (!r.ok) setError(r.error);
            })
          }
        >
          <Rocket className="h-4 w-4" aria-hidden /> {pending ? "Lanzando…" : demo ? `Simular envío a ${current.reachable.toLocaleString("es-PE")}` : `Enviar a ${current.reachable.toLocaleString("es-PE")}`}
        </Button>
        <AnimatePresence>
          {launched ? (
            <motion.p role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex items-center gap-1.5 rounded-xl bg-[#d9f2ec] px-3 py-2 text-xs font-semibold text-[#0b5f53]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> {launched.simulated ? "Campaña simulada" : "Campaña enviada"}: {launched.audience.toLocaleString("es-PE")} destinatarios. Mira los resultados abajo.
            </motion.p>
          ) : null}
        </AnimatePresence>
      </Card>

      <div className="mx-auto w-full max-w-[320px]">
        <div className="overflow-hidden rounded-[2.4rem] border-[9px] border-ink bg-[#efe6dd] shadow-[0_30px_60px_-30px_rgba(42,16,37,.55)]">
          <div className="flex items-center gap-2.5 bg-plum px-4 py-3 text-paper">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mauve font-brand text-sm font-light">S</span>
            <span>
              <span className="block text-sm font-semibold">SPECCHi</span>
              <span className="block text-[10px] opacity-75">Cuenta de empresa</span>
            </span>
          </div>
          <div className="flex h-[400px] flex-col justify-end p-3">
            <AnimatePresence mode="popLayout">
              <motion.div key={segment} initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[13px] leading-snug shadow-sm">
                <p className="whitespace-pre-wrap">{preview || "Tu mensaje aparecerá aquí."}</p>
                <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted">
                  ahora <CheckCheck className="h-3 w-3 text-[#34b7f1]" aria-hidden />
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <span className="rounded-xl bg-white py-1.5 text-center text-xs font-semibold text-[#128c7e]">Reservar</span>
              <span className="rounded-xl bg-white py-1.5 text-center text-xs font-semibold text-[#128c7e]">Ahora no</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
