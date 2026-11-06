"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { ArrowUpRight, Clock, Search } from "lucide-react";
import { CATEGORY_PHOTOS, unsplash } from "@/content/images";
import type { ServiceCategory } from "@/generated/prisma/enums";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { LandingData } from "@/lib/landing";
import { cn, formatMoney } from "@/lib/utils";
import { RevealLines } from "./motion-kit";
import { TLink } from "./transition";

type Service = LandingData["services"][number];
const duration = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}` : `${min} min`);

/** Carta completa: filtros con píldora animada y una foto que acompaña al servicio que miras. */
export function CatalogPage({ eyebrow, title, accent, intro, services, categories, heroClass }: { eyebrow: string; title: string; accent: string; intro: string; services: Service[]; categories: ServiceCategory[]; heroClass: string }) {
  const [active, setActive] = useState<ServiceCategory | "ALL">("ALL");
  const [hovered, setHovered] = useState<ServiceCategory>(categories[0]!);
  const [q, setQ] = useState("");
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const list = useMemo(() => services.filter((s) => (active === "ALL" || s.category === active) && norm(s.name).includes(norm(q))), [services, active, q]);
  const photoKey = active === "ALL" ? hovered : active;
  const photo = CATEGORY_PHOTOS[photoKey];

  return (
    <div>
      <header className={cn("relative overflow-hidden px-5 pt-36 pb-16 md:px-10 md:pt-44 md:pb-24", heroClass)}>
        <div className="mesh" aria-hidden>
          <i style={{ width: "40vw", height: "40vw", right: "-8vw", top: "-14vw", background: "#cdb9f3", opacity: 0.7 }} />
          <i style={{ width: "36vw", height: "36vw", left: "-8vw", bottom: "-18vw", background: "#ffbd99", opacity: 0.7, animationDelay: "-9s" }} />
        </div>
        <div className="relative mx-auto max-w-[1320px]">
          <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-rose uppercase">{eyebrow}</p>
          <RevealLines as="h1" lines={[title, <em key="a" className="text-gradient pr-3">{accent}</em>]} className="font-display text-[clamp(3.4rem,10vw,9.5rem)] leading-[0.9]" />
          <p className="mt-6 max-w-lg text-lg text-ink-soft">{intro}</p>
        </div>
      </header>

      <div className="sticky top-20 z-30 mx-auto max-w-[1320px] px-3 md:top-24 md:px-6">
        <div className="flex flex-wrap items-center gap-2 rounded-[2rem] bg-paper/85 p-2 shadow-[0_16px_40px_-24px_rgba(61,22,54,.5)] backdrop-blur-xl">
          <div className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto" role="tablist" aria-label="Categorías" data-lenis-prevent>
            {(["ALL", ...categories] as const).map((c) => (
              <button key={c} role="tab" aria-selected={active === c} onClick={() => setActive(c)} className={cn("relative shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors", active === c ? "text-paper" : "text-ink-soft hover:text-ink")}>
                {active === c ? <motion.span layoutId={`cat-${title}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} /> : null}
                <span className="relative">{c === "ALL" ? "Todo" : CATEGORY_LABELS[c]}</span>
              </button>
            ))}
          </div>
          <label className="relative hidden md:block">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted" aria-hidden />
            <span className="sr-only">Buscar servicio</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="h-9 w-40 rounded-full bg-sand pr-3 pl-9 text-sm focus:outline-none" />
          </label>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-12 md:px-10 lg:grid-cols-[1fr_0.72fr]">
        <div>
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((s) => (
              <motion.article key={s.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} onPointerEnter={() => setHovered(s.category)} className="border-b border-ink/10">
                <TLink href={`/reservar?servicio=${s.id}`} className="group grid grid-cols-[1fr_auto] items-center gap-4 py-5" data-cursor="Reservar">
                  <div>
                    <p className="mb-1 flex flex-wrap items-center gap-x-3 text-[11px] font-semibold tracking-wider text-muted uppercase">
                      {CATEGORY_LABELS[s.category]}
                      {s.featured ? <span className="rounded-full bg-blush px-2 py-0.5 tracking-normal text-rose-deep normal-case">Favorito</span> : null}
                    </p>
                    <h2 className="font-display text-3xl leading-tight transition-all duration-500 group-hover:translate-x-2 group-hover:text-rose md:text-4xl">{s.name}</h2>
                    <p className="mt-1 max-w-xl text-sm text-muted">{s.description}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-[11px] text-muted">desde</p>
                      <p className="font-semibold tabular-nums">{formatMoney(s.basePriceCents)}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" aria-hidden /> {duration(s.durationMin)}</p>
                    </div>
                    <span className="hidden h-11 w-11 items-center justify-center rounded-full border border-ink/15 transition-all duration-500 group-hover:rotate-45 group-hover:border-transparent group-hover:bg-rose group-hover:text-white sm:flex"><ArrowUpRight className="h-4 w-4" aria-hidden /></span>
                  </div>
                </TLink>
              </motion.article>
            ))}
          </AnimatePresence>
          {!list.length ? <p className="py-16 text-center text-muted">No encontramos ese servicio. Escríbenos y te ayudamos.</p> : null}
          <p className="mt-6 text-xs text-muted">Precios «desde» publicados por SPECCHi. El precio final puede variar según el largo del cabello y el diagnóstico.</p>
        </div>

        <div className="relative hidden lg:block">
          <div className="sticky top-44 h-[calc(100vh-13rem)] overflow-hidden rounded-t-[999px] bg-blush">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={photoKey} className="absolute inset-0" initial={{ clipPath: "inset(100% 0 0 0)", scale: 1.12 }} animate={{ clipPath: "inset(0% 0 0 0)", scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}>
                <Image src={unsplash(photo)} alt={photo.alt} fill sizes="34vw" className="object-cover" />
                <p className="absolute inset-x-0 bottom-0 bg-linear-to-t from-plum/70 to-transparent p-6 pt-20 font-display text-4xl text-paper">{CATEGORY_LABELS[photoKey]}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
