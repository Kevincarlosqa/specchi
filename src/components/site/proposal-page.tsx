"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { ArrowUpRight, Banknote, Bot, CalendarDays, Check, Crown, LineChart, Megaphone, Package, ShieldCheck, Star, UsersRound } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { FadeUp, RevealLines } from "./motion-kit";
import { TLink } from "./transition";

const MODULES = [
  { icon: CalendarDays, title: "Agenda y reservas", text: "Agenda por especialista con arrastrar y soltar, reservas web y lista de espera en seis sedes. Sin cruces de horario.", state: "Lista para usar" },
  { icon: Bot, title: "Vera, asistente de WhatsApp", text: "Reserva, reprograma y cancela a cualquier hora con horarios y precios reales. Pasa a una persona ante temas de salud.", state: "Falta conectar el número" },
  { icon: Banknote, title: "Caja", text: "Cobra citas y productos, propinas y descuentos. Yape, Plin, tarjeta, efectivo y gift card. Cierre con diferencia calculada.", state: "Falta facturación SUNAT" },
  { icon: Package, title: "Inventario", text: "Stock por sede, mínimos, días de cobertura y margen. Se descuenta solo con cada venta.", state: "Lista para usar" },
  { icon: UsersRound, title: "Equipo y comisiones", text: "Liquidación mensual automática, metas personales y marcación de entrada y salida.", state: "Lista para usar" },
  { icon: Megaphone, title: "Campañas segmentadas", text: "Clientes en riesgo, VIP, cumpleaños o solo salón, con vista previa y resultado por campaña.", state: "Faltan plantillas de Meta" },
  { icon: Crown, title: "Club, gift cards y paquetes", text: "Puntos y niveles, gift cards con saldo y paquetes de sesiones como los de su carta.", state: "Lista para usar" },
  { icon: Star, title: "Reseñas", text: "Calificación por sede y especialista, y respuesta con sugerencia. Pedido automático al terminar la visita.", state: "Falta API de Google" },
  { icon: LineChart, title: "Radar y analítica", text: "Acciones priorizadas por impacto, retención por cohortes, embudo, meta del mes y comparativa de sedes.", state: "Lista para usar" },
  { icon: ShieldCheck, title: "Ficha y seguridad", text: "Campos a medida, historia de salud, verificación en dos pasos por usuario y registro de actividad.", state: "Lista para usar" },
];

const NEXT = [
  { title: "Conectar WhatsApp", text: "Número de empresa en la API de Meta y plantillas aprobadas para recordatorios y campañas." },
  { title: "Facturación electrónica", text: "Integración con un proveedor autorizado por SUNAT. En la demo, los comprobantes son simulados." },
  { title: "Cobros en línea", text: "Pasarela para adelantos y gift cards digitales. Hoy los pagos se registran, no se procesan." },
  { title: "Migración de datos", text: "Clientes, historial y productos desde su sistema actual. Fotos propias en la web." },
];

function Slider({ label, value, set, min, max, step, format }: { label: string; value: number; set: (v: number) => void; min: number; max: number; step: number; format: (v: number) => string }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-paper/85">{label}</span>
        <strong className="font-semibold tabular-nums">{format(value)}</strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="mt-2 w-full accent-peach" />
    </label>
  );
}

/** Calculadora con supuestos a la vista: cada persona pone sus propios números. */
function Calculator() {
  const [bookings, setBookings] = useState(3500);
  const [ticket, setTicket] = useState(230);
  const [noShow, setNoShow] = useState(6);
  const [saved, setSaved] = useState(40);
  const [retail, setRetail] = useState(3);
  const [hours, setHours] = useState(80);
  const recovered = bookings * (noShow / 100) * (saved / 100) * ticket;
  const cross = bookings * (retail / 100) * 130;
  const total = recovered + cross;
  return (
    <div className="grid gap-8 rounded-[2.5rem] bg-plum p-6 text-paper md:p-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <Slider label="Citas al mes (todas las sedes)" value={bookings} set={setBookings} min={500} max={10000} step={100} format={(v) => v.toLocaleString("es-PE")} />
        <Slider label="Ticket medio" value={ticket} set={setTicket} min={80} max={600} step={10} format={(v) => `S/ ${v}`} />
        <Slider label="Citas que hoy se pierden sin aviso" value={noShow} set={setNoShow} min={0} max={20} step={1} format={(v) => `${v} %`} />
        <Slider label="De esas, cuántas se salvan con recordatorios" value={saved} set={setSaved} min={0} max={100} step={5} format={(v) => `${v} %`} />
        <Slider label="Tickets extra que suman un producto (S/ 130)" value={retail} set={setRetail} min={0} max={15} step={1} format={(v) => `+${v} pts`} />
        <Slider label="Horas de recepción al mes en confirmar y agendar" value={hours} set={setHours} min={0} max={400} step={10} format={(v) => `${v} h`} />
      </div>
      <div className="flex flex-col justify-between rounded-[2rem] bg-paper/[0.08] p-6">
        <div>
          <p className="text-sm text-paper/75">Ingresos adicionales al mes, con estos supuestos</p>
          <motion.p key={Math.round(total)} initial={{ opacity: 0.4, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-1 font-display text-6xl leading-none text-peach tabular-nums md:text-7xl">
            {formatMoney(total * 100)}
          </motion.p>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-paper/75">Citas recuperadas</dt><dd className="font-semibold tabular-nums">{formatMoney(recovered * 100)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-paper/75">Venta cruzada de tienda</dt><dd className="font-semibold tabular-nums">{formatMoney(cross * 100)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-paper/75">Horas de recepción liberables</dt><dd className="font-semibold tabular-nums">{hours} h</dd></div>
          </dl>
        </div>
        <p className="mt-6 text-xs text-paper/65">Es una simulación, no una promesa: los valores iniciales son supuestos de ejemplo. Reemplácenlos con sus datos reales.</p>
      </div>
    </div>
  );
}

export function ProposalPage() {
  return (
    <div>
      <header className="relative overflow-hidden px-5 pt-36 pb-16 md:px-10 md:pt-44 md:pb-24">
        <div className="mesh" aria-hidden>
          <i style={{ width: "44vw", height: "44vw", right: "-10vw", top: "-16vw", background: "#cdb9f3", opacity: 0.8 }} />
          <i style={{ width: "40vw", height: "40vw", left: "-8vw", bottom: "-20vw", background: "#f7a8c9", opacity: 0.7, animationDelay: "-8s" }} />
        </div>
        <div className="relative mx-auto max-w-[1320px]">
          <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-rose uppercase">Propuesta para SPECCHi</p>
          <RevealLines as="h1" lines={["Todo SPECCHi,", <em key="a" className="text-gradient pr-3">en un solo espejo</em>]} className="font-display text-[clamp(3.2rem,9vw,8.5rem)] leading-[0.9]" />
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">Web, reservas, WhatsApp, caja, inventario, comisiones y fidelización, conectados entre sí y hechos a la medida de un grupo de spa y peluquería con seis sedes. No hay que imaginarlo: esta demo funciona.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <TLink href="/login" className="inline-flex h-13 items-center gap-1 rounded-full bg-ink px-8 text-sm font-semibold text-paper transition-colors hover:bg-plum">Probar el panel <ArrowUpRight className="h-4 w-4" aria-hidden /></TLink>
            <TLink href="/reservar" className="inline-flex h-13 items-center rounded-full border border-ink/25 px-8 text-sm font-semibold transition-colors hover:bg-paper">Reservar como cliente</TLink>
          </div>
        </div>
      </header>

      <section aria-labelledby="modulos" className="mx-auto max-w-[1320px] px-5 py-16 md:px-10">
        <h2 id="modulos" className="mb-10 font-display text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.95]">Diez módulos, <em className="text-rose">una sola fuente de verdad</em></h2>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((m, i) => {
            const ready = m.state === "Lista para usar";
            return (
              <li key={m.title}>
                <FadeUp delay={(i % 3) * 0.07} className="h-full">
                  <div className="dash-card flex h-full flex-col rounded-[2rem] border border-line bg-paper p-6">
                    <m.icon className="h-6 w-6 text-rose" aria-hidden />
                    <h3 className="mt-4 font-display text-3xl leading-tight">{m.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-ink-soft">{m.text}</p>
                    <p className={`mt-4 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${ready ? "bg-[#d9f2ec] text-[#0b5f53]" : "bg-butter text-[#6f4a06]"}`}>
                      {ready ? <Check className="h-3 w-3" aria-hidden /> : null} {m.state}
                    </p>
                  </div>
                </FadeUp>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="calc" className="mx-auto max-w-[1320px] px-3 py-16 md:px-6">
        <div className="mb-8 px-2">
          <h2 id="calc" className="font-display text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.95]">Pongan sus <em className="text-gradient pr-2">propios números</em></h2>
          <p className="mt-3 max-w-xl text-ink-soft">Muevan los controles con los datos reales de SPECCHi para estimar cuánto puede rendir.</p>
        </div>
        <Calculator />
      </section>

      <section aria-labelledby="next" className="mx-auto max-w-[1320px] px-5 py-16 md:px-10">
        <h2 id="next" className="mb-8 font-display text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.95]">Lo que falta para <em className="text-rose">salir en vivo</em></h2>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {NEXT.map((n, i) => (
            <li key={n.title} className="rounded-[2rem] bg-sand/70 p-6">
              <p className="font-display text-5xl text-rose">{i + 1}</p>
              <h3 className="mt-3 text-lg font-semibold">{n.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{n.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-muted">Sedes, horarios y carta de servicios provienen de specchi.com.pe. Especialistas, clientes, ventas y reseñas de la demo son ficticios.</p>
      </section>
    </div>
  );
}
