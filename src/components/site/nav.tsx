"use client";

import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { Magnetic } from "./motion-kit";
import { TLink } from "./transition";

const LINKS = [
  { href: "/spa", label: "Spa" },
  { href: "/salon", label: "Salón" },
  { href: "/store", label: "Store" },
  { href: "/sedes", label: "Sedes" },
];

export function Nav({ whatsappHref }: { whatsappHref: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 40);
    setHidden(y > 500 && y > prev && !open);
  });
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <a href="#contenido" className="sr-only z-[90] rounded-full bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Saltar al contenido
      </a>
      <motion.header animate={{ y: hidden && !reduced ? "-120%" : "0%" }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-x-0 top-3 z-50 px-3 md:top-4 md:px-6">
        <nav aria-label="Principal" className={cn("mx-auto flex h-14 max-w-[1320px] items-center justify-between rounded-full pr-2 pl-5 transition-all duration-500 md:h-16 md:pl-7", scrolled || open ? "bg-paper/95 shadow-[0_12px_40px_-20px_rgba(61,22,54,.45)]" : "bg-transparent")}>
          <TLink href="/" aria-label="SPECCHi, inicio" className="text-[15px] md:text-base" onClick={() => setOpen(false)}>
            <Wordmark withMark />
          </TLink>
          <ul className="hidden items-center gap-1 text-sm font-medium lg:flex">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <li key={l.href}>
                  <TLink href={l.href} aria-current={active ? "page" : undefined} className="relative block rounded-full px-4 py-2 transition-colors hover:text-rose">
                    {active ? <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-blush" transition={{ type: "spring", stiffness: 400, damping: 32 }} /> : null}
                    <span className="relative">{l.label}</span>
                  </TLink>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-2">
            <TLink href="/login" className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink xl:block">
              Panel
            </TLink>
            <Magnetic className="hidden sm:block">
              <TLink href="/reservar" className="group relative inline-flex h-11 items-center overflow-hidden rounded-full bg-ink px-6 text-sm font-semibold text-paper">
                <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-rose via-coral to-violet transition-transform duration-500 ease-out group-hover:translate-x-0" />
                <span className="relative">Reservar</span>
              </TLink>
            </Magnetic>
            <button onClick={() => setOpen(!open)} className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full bg-ink/5 lg:hidden" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open}>
              <span className={cn("h-px w-5 bg-ink transition-transform", open && "translate-y-[3.5px] rotate-45")} />
              <span className={cn("h-px w-5 bg-ink transition-transform", open && "-translate-y-[3.5px] -rotate-45")} />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ clipPath: "circle(0% at 92% 5%)" }}
            animate={{ clipPath: "circle(150% at 92% 5%)" }}
            exit={{ clipPath: "circle(0% at 92% 5%)" }}
            transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-40 flex flex-col justify-between bg-plum px-6 pt-28 pb-10 text-paper lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
          >
            <div className="mesh opacity-60" aria-hidden>
              <i style={{ width: 360, height: 360, right: -80, top: 60, color: "#c2337a" }} />
              <i style={{ width: 300, height: 300, left: -60, bottom: 40, color: "#6d4bd1", animationDelay: "-9s" }} />
            </div>
            <ul className="relative space-y-1">
              {[...LINKS, { href: "/reservar", label: "Reservar" }, { href: "/login", label: "Panel" }].map((l, i) => (
                <motion.li key={l.href} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.06, duration: 0.6 }}>
                  <TLink href={l.href} onClick={() => setOpen(false)} className="font-display text-6xl">
                    {l.label}
                  </TLink>
                </motion.li>
              ))}
            </ul>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="relative inline-flex h-14 items-center justify-center rounded-full bg-paper text-sm font-semibold text-ink">
              Escríbenos por WhatsApp
            </a>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
