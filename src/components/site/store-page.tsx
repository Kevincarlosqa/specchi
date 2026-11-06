"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Gift, ShoppingBag } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import type { LandingData } from "@/lib/landing";
import { cn, formatMoney } from "@/lib/utils";
import { waLink } from "./icons";
import { FadeUp, RevealLines } from "./motion-kit";

const BRAND_TONES = ["from-blush to-peach/60", "from-lilac/60 to-blush", "from-butter to-peach/50", "from-[#d9f2ec] to-lilac/40", "from-peach/50 to-lilac/50", "from-sand to-blush"];
const GIFTS = [
  { name: "Gift Card Digital", range: "S/ 100 a S/ 800", text: "Tú eliges el monto, quien la recibe elige la experiencia.", tone: "from-rose to-coral" },
  { name: "Masaje SPECCHi Signature", range: "S/ 240 a S/ 360", text: "Nuestro masaje de autor, de 70 o 100 minutos.", tone: "from-violet to-rose" },
  { name: "Masaje Sueco Relajante", range: "S/ 220 a S/ 330", text: "El clásico para desconectar, de 50 u 80 minutos.", tone: "from-coral to-[#d9a11f]" },
  { name: "Corte, cepillado y manicure", range: "S/ 280", text: "Un cambio de aire completo en el salón.", tone: "from-teal to-violet" },
];

export function StorePage({ products, whatsapp, demo }: { products: LandingData["products"]; whatsapp: string; demo: boolean }) {
  const brands = [...new Set(products.map((p) => p.brand))];
  const [brand, setBrand] = useState<string | null>(null);
  const list = brand ? products.filter((p) => p.brand === brand) : products;
  return (
    <div>
      <header className="relative overflow-hidden bg-linear-to-br from-butter via-peach/60 to-blush px-5 pt-36 pb-16 md:px-10 md:pt-44 md:pb-24">
        <LogoMark className="absolute -top-10 -right-16 h-[32rem] w-[32rem] animate-spin-slow text-paper/30" title="" />
        <div className="relative mx-auto max-w-[1320px]">
          <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-rose-deep uppercase">SPECCHi Store</p>
          <RevealLines as="h1" lines={["Tu rutina,", <em key="a">nivel salón</em>]} className="font-display text-[clamp(3.4rem,10vw,9.5rem)] leading-[0.9]" />
          <p className="mt-6 max-w-lg text-lg text-ink-soft">Las marcas que usamos en cabina, para el cuidado de tu cabello y tu piel.</p>
        </div>
      </header>

      <section aria-label="Productos" className="mx-auto max-w-[1320px] px-5 py-12 md:px-10">
        <div className="mb-8 flex flex-wrap gap-2">
          {[null, ...brands].map((b) => (
            <button key={b ?? "all"} aria-pressed={brand === b} onClick={() => setBrand(b)} className={cn("relative rounded-full border px-4 py-2 text-sm font-medium transition-colors", brand === b ? "border-transparent text-paper" : "border-ink/15 hover:border-ink/40")}>
              {brand === b ? <motion.span layoutId="brand-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} /> : null}
              <span className="relative">{b ?? "Todas"}</span>
            </button>
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((p) => {
              const tone = BRAND_TONES[brands.indexOf(p.brand) % BRAND_TONES.length];
              return (
                <motion.li key={p.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                  <a href={waLink(whatsapp, `Hola, me interesa ${p.brand} ${p.name}. ¿Lo tienen disponible?`)} target="_blank" rel="noopener noreferrer" className="group block">
                    <div className={cn("relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[2rem] bg-linear-to-br p-5 transition-transform duration-700 ease-out group-hover:-translate-y-1", tone)}>
                      <span className="text-[11px] font-semibold tracking-[0.2em] text-ink-soft uppercase">{p.category}</span>
                      <LogoMark className="absolute -right-8 -bottom-8 h-44 w-44 text-paper/50 transition-transform duration-[1200ms] ease-out group-hover:rotate-90" title="" />
                      <span className="relative font-display text-4xl leading-none md:text-5xl">{p.brand}</span>
                      <span className="absolute right-3 bottom-3 flex h-11 w-11 translate-y-3 items-center justify-center rounded-full bg-ink text-paper opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"><ShoppingBag className="h-4 w-4" aria-hidden /></span>
                    </div>
                    <p className="mt-3 text-sm leading-snug font-medium">{p.name}</p>
                    <p className="mt-0.5 text-sm text-ink-soft tabular-nums">{formatMoney(p.priceCents)}</p>
                  </a>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        {demo ? <p className="mt-8 text-xs text-muted">Selección de ejemplo con las marcas de SPECCHi Store: productos y precios son referenciales.</p> : null}
      </section>

      <section id="gift-cards" aria-labelledby="gift-title" className="relative overflow-hidden bg-plum text-paper">
        <div className="mesh opacity-60" aria-hidden>
          <i style={{ width: 560, height: 560, right: "-8%", top: "-30%", color: "#c2337a" }} />
        </div>
        <div className="relative mx-auto max-w-[1320px] px-5 py-24 md:px-10 md:py-32">
          <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-peach uppercase"><Gift className="h-4 w-4" aria-hidden /> Gift cards</p>
          <h2 id="gift-title" className="max-w-3xl font-display text-[clamp(2.8rem,6vw,5.8rem)] leading-[0.95]">Vive la experiencia SPECCHi, <em className="text-peach">o regálala</em></h2>
          <ul className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {GIFTS.map((g, i) => (
              <li key={g.name}>
                <FadeUp delay={i * 0.08}>
                  <a href={waLink(whatsapp, `Hola, quiero regalar una gift card: ${g.name}.`)} target="_blank" rel="noopener noreferrer" className={cn("flex aspect-[1.2] flex-col justify-between rounded-[2rem] bg-linear-to-br p-6 transition-transform duration-500 hover:-translate-y-2 hover:-rotate-1", g.tone)}>
                    <LogoMark className="h-7 w-7" title="" />
                    <span>
                      <span className="block font-display text-3xl leading-tight">{g.name}</span>
                      <span className="mt-1 block text-sm font-semibold">{g.range}</span>
                      <span className="mt-1 block text-xs opacity-90">{g.text}</span>
                    </span>
                  </a>
                </FadeUp>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
