"use client";

import { motion } from "motion/react";
import { useTransition } from "react";
import { ArrowRight, Building2, ConciergeBell, Crown, Scissors } from "lucide-react";
import { demoLogin } from "./actions";

const ROLES = [
  { role: "owner", icon: Crown, title: "Dirección", text: "Todas las sedes, métricas, campañas y seguridad.", tone: "from-rose to-coral" },
  { role: "manager", icon: Building2, title: "Gerencia del Spa", text: "Solo Spa Swissôtel: operación y resultados.", tone: "from-violet to-rose" },
  { role: "reception", icon: ConciergeBell, title: "Recepción de Angamos", text: "Agenda, caja, clientes y WhatsApp.", tone: "from-teal to-violet" },
  { role: "stylist", icon: Scissors, title: "Especialista", text: "Su agenda, sus clientes y sus comisiones.", tone: "from-coral to-[#d9a11f]" },
];

export function DemoAccess() {
  const [pending, start] = useTransition();
  return (
    <ul className="grid gap-2">
      {ROLES.map((r, i) => (
        <motion.li key={r.role} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          <button type="button" disabled={pending} onClick={() => start(() => demoLogin(r.role))} className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-paper p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-rose/40 hover:shadow-[0_16px_34px_-22px_rgba(61,22,54,.5)] disabled:opacity-60">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white ${r.tone}`}>
              <r.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{r.title}</span>
              <span className="block text-xs text-muted">{r.text}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-rose" aria-hidden />
          </button>
        </motion.li>
      ))}
    </ul>
  );
}
