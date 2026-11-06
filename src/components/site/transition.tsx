"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { LOGO_PIECES, LOGO_VIEWBOX } from "@/components/brand/logo";

const LABELS: Record<string, string> = { "/": "Inicio", "/spa": "Spa", "/salon": "Salón", "/store": "Store", "/sedes": "Sedes", "/reservar": "Reserva", "/propuesta": "Propuesta" };
const COLS = 4;
const ROWS = 3;
const TILES = Array.from({ length: COLS * ROWS }, (_, i) => {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  // Cada baldosa nace desde la esquina que da al centro, como las piezas del isotipo.
  return { i, delay: (Math.abs(c - (COLS - 1) / 2) + Math.abs(r - (ROWS - 1) / 2)) * 0.05, origin: `${c < COLS / 2 ? "100%" : "0%"} ${r < ROWS / 2 ? "100%" : "0%"}`, color: ["#3d1636", "#9c2061", "#a98e94", "#c2337a"][(c + r) % 4]! };
});

const Ctx = createContext<(href: string) => void>(() => {});
export const usePageTransition = () => useContext(Ctx);

/**
 * Transición entre páginas: 12 baldosas de la marca cubren la pantalla, la página cambia detrás
 * y se retiran cuando la nueva ya está lista. Funciona en todos los navegadores.
 */
export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const [phase, setPhase] = useState<"idle" | "cover" | "reveal">("idle");
  const [label, setLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const target = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const navigate = useCallback(
    (href: string) => {
      const path = href.split(/[?#]/)[0]!;
      if (reduced) {
        router.push(href);
        return;
      }
      if (path === pathname && !href.includes("?")) {
        lenis?.scrollTo(0);
        return;
      }
      target.current = path;
      setLabel(LABELS[path] ?? "");
      setPhase("cover");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => startTransition(() => router.push(href)), 620);
    },
    [lenis, pathname, reduced, router],
  );

  // Retira las baldosas cuando la ruta ya cambió y terminó de cargar.
  useEffect(() => {
    if (phase !== "cover" || isPending || target.current !== pathname) return;
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    const t = window.setTimeout(() => setPhase("reveal"), 120);
    return () => window.clearTimeout(t);
  }, [phase, isPending, pathname, lenis]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const t = window.setTimeout(() => setPhase("idle"), 800);
    return () => window.clearTimeout(t);
  }, [phase]);

  const value = useMemo(() => navigate, [navigate]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <AnimatePresence>
        {phase !== "idle" ? (
          <div className="pointer-events-auto fixed inset-0 z-[120] grid grid-cols-4 grid-rows-3" aria-hidden>
            {TILES.map((t) => (
              <motion.span
                key={t.i}
                className="block -m-px"
                style={{ background: t.color, transformOrigin: t.origin }}
                initial={{ scale: 0, borderRadius: "50%" }}
                animate={phase === "cover" ? { scale: 1.02, borderRadius: "0%" } : { scale: 0, borderRadius: "50%" }}
                transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1], delay: phase === "cover" ? t.delay : 0.28 - t.delay * 0.6 }}
              />
            ))}
            <motion.div className="absolute inset-0 flex flex-col items-center justify-center text-paper" initial={{ opacity: 0, y: 14 }} animate={phase === "cover" ? { opacity: 1, y: 0 } : { opacity: 0, y: -14 }} transition={{ duration: 0.35, delay: phase === "cover" ? 0.25 : 0 }}>
              <svg viewBox={LOGO_VIEWBOX} className="mb-3 h-12 w-12 animate-pulse" fill="currentColor">
                {LOGO_PIECES.map((p, i) => (
                  <path key={i} d={p.d} transform={p.transform || undefined} />
                ))}
              </svg>
              <span className="font-display text-5xl italic md:text-7xl">{label}</span>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

/** Enlace interno que dispara la transición. Abre en otra pestaña con Ctrl/⌘ como un enlace normal. */
export function TLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const navigate = usePageTransition();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(href);
  };
  return <Link href={href} onClick={handle} {...props} />;
}
