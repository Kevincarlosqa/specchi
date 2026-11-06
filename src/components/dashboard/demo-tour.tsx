"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ArrowUpRight, ChevronDown, Compass } from "lucide-react";

const STEPS = [
  { href: "/dashboard/caja", title: "Cobra una venta", text: "Agrega un servicio y un producto, canjea puntos, cobra con Yape y mira el comprobante." },
  { href: "/dashboard/campanas?segment=AT_RISK", title: "Recupera clientes", text: "Lanza una campaña a los clientes en riesgo y ve la vista previa de WhatsApp." },
  { href: "/dashboard/agenda", title: "Mueve una cita", text: "Arrastra un bloque en la agenda y comprueba que no deja cruzar horarios." },
  { href: "/dashboard/simulador", title: "Habla con Vera", text: "Reserva como si fueras cliente, sin tocar WhatsApp." },
  { href: "/dashboard/analitica", title: "Lee el negocio", text: "Retención por cohortes, embudo, comparativa de sedes y venta cruzada." },
  { href: "/dashboard/equipo", title: "Paga comisiones", text: "Comisiones del mes por especialista y asistencia con entrada y salida." },
];

export function DemoTour() {
  const [open, setOpen] = useState(true);
  return (
    <section aria-label="Guía de la demostración" className="mb-4 overflow-hidden rounded-3xl border border-lilac/60 bg-linear-to-r from-lilac/25 via-blush/40 to-peach/25">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-semibold">
        <Compass className="h-4 w-4 text-violet" aria-hidden /> Pruébalo tú: seis cosas para hacer en esta demo
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="grid gap-2 overflow-hidden px-3 pb-3 sm:grid-cols-2 xl:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.href}>
                <Link href={s.href} className="group flex h-full gap-3 rounded-2xl bg-paper/80 p-3 transition-colors hover:bg-paper">
                  <span className="font-display text-2xl leading-none text-rose">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      {s.title} <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    </span>
                    <span className="block text-xs text-muted">{s.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </motion.ol>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
