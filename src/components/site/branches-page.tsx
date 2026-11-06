"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { ArrowUpRight, Phone } from "lucide-react";
import type { LandingData } from "@/lib/landing";
import { cn } from "@/lib/utils";
import { WhatsAppIcon, waLink } from "./icons";
import { RevealLines } from "./motion-kit";
import { TLink } from "./transition";

function project(points: Array<{ lat: number; lng: number }>, w: number, h: number, pad = 50) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const s = Math.min((w - pad * 2) / Math.max(0.001, maxLng - minLng), (h - pad * 2) / Math.max(0.001, maxLat - minLat));
  return (p: { lat: number; lng: number }) => ({ x: pad + (p.lng - minLng) * s + (w - pad * 2 - (maxLng - minLng) * s) / 2, y: pad + (maxLat - p.lat) * s + (h - pad * 2 - (maxLat - minLat) * s) / 2 });
}

export function BranchesPage({ branches }: Pick<LandingData, "branches">) {
  const [active, setActive] = useState(branches[0]?.id ?? "");
  const current = branches.find((b) => b.id === active) ?? branches[0];
  const proj = useMemo(() => project(branches, 640, 440, 70), [branches]);
  return (
    <div>
      <header className="relative overflow-hidden px-5 pt-36 pb-12 md:px-10 md:pt-44">
        <div className="mesh" aria-hidden>
          <i style={{ width: "42vw", height: "42vw", right: "-8vw", top: "-16vw", color: "#ffbd99", opacity: 0.7 }} />
          <i style={{ width: "36vw", height: "36vw", left: "-6vw", top: "-6vw", color: "#cdb9f3", opacity: 0.7, animationDelay: "-8s" }} />
        </div>
        <div className="relative mx-auto max-w-[1320px]">
          <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-rose uppercase">Sedes</p>
          <RevealLines as="h1" lines={[`${branches.length} espejos`, <em key="a" className="text-gradient pr-3">en Lima</em>]} className="font-display text-[clamp(3.4rem,10vw,9.5rem)] leading-[0.9]" />
        </div>
      </header>
      <div className="mx-auto grid max-w-[1320px] gap-8 px-5 pb-24 md:px-10 lg:grid-cols-[1fr_1.15fr]">
        <ul className="border-t border-ink/15">
          {branches.map((b, i) => (
            <li key={b.id} className="border-b border-ink/15">
              <button type="button" aria-pressed={b.id === active} onClick={() => setActive(b.id)} onPointerEnter={() => setActive(b.id)} onFocus={() => setActive(b.id)} className="flex w-full items-baseline gap-4 py-5 text-left">
                <span className="w-7 text-xs text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className={cn("font-display text-4xl transition-all duration-500 md:text-5xl", b.id === active && "translate-x-2 text-rose italic")}>{b.name}</span>
                <span className="ml-auto text-right text-xs text-muted">{b.district}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-[2rem] bg-paper">
            <svg viewBox="0 0 640 440" className="h-auto w-full" role="img" aria-label="Mapa esquemático de las sedes en Lima">
              <defs>
                <pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M30 0H0V30" fill="none" stroke="#f1e7e1" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="640" height="440" fill="url(#map-grid)" />
              {branches.map((b) => {
                const p = proj(b);
                const on = b.id === active;
                return (
                  <g key={b.id} transform={`translate(${p.x} ${p.y})`} onPointerEnter={() => setActive(b.id)} className="cursor-pointer">
                    {on ? <motion.circle r={28} fill="#c2337a" initial={{ scale: 0.4, opacity: 0.5 }} animate={{ scale: [0.6, 1.5], opacity: [0.4, 0] }} transition={{ duration: 1.6, repeat: Infinity }} /> : null}
                    <circle r={on ? 9 : 6} fill={on ? "#c2337a" : "#2a1025"} stroke="#fffdf8" strokeWidth="2" />
                    <text y={b.slug.startsWith("spa") ? 26 : -16} textAnchor="middle" className={cn("text-[13px] font-semibold", on ? "fill-rose" : "fill-ink")} fontFamily="var(--font-manrope)">{b.name}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div key={current.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }} className="rounded-[2rem] bg-linear-to-br from-plum to-[#5a1f4f] p-7 text-paper" aria-live="polite">
                <p className="font-display text-4xl leading-none">{current.name}</p>
                <p className="mt-2 text-sm text-paper/80">{current.address}{current.reference ? ` · ${current.reference}` : ""}, {current.district}</p>
                <dl className="mt-5 grid grid-cols-3 gap-2 text-xs">
                  {current.hours.map((hr) => (
                    <div key={hr.label}>
                      <dt className="text-paper/60">{hr.label}</dt>
                      <dd className="font-semibold">{hr.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 flex flex-wrap gap-2">
                  <TLink href={`/reservar?sede=${current.id}`} className="inline-flex h-11 items-center justify-center rounded-full bg-paper px-5 text-sm font-semibold text-ink transition-colors hover:bg-peach">Reservar aquí</TLink>
                  <a href={waLink(current.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-paper/40 px-5 text-sm font-semibold transition-colors hover:bg-paper/10"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>
                  <a href={`tel:${current.phone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-paper/40 px-5 text-sm font-semibold transition-colors hover:bg-paper/10"><Phone className="h-4 w-4" aria-hidden /> Llamar</a>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${current.address}, ${current.district}, Lima, Perú`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-paper/40 px-5 text-sm font-semibold transition-colors hover:bg-paper/10">Cómo llegar <ArrowUpRight className="h-4 w-4" aria-hidden /></a>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
