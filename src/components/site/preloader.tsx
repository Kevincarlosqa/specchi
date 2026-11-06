"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { LOGO_PIECES, LOGO_VIEWBOX } from "@/components/brand/logo";

const KEY = "specchi-intro";
const noop = () => () => {};
const seen = () => {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** Intro: las 16 piezas del logo se arman una a una y la pantalla se abre. Una vez por sesión. */
export function Preloader() {
  const reduced = useReducedMotion();
  const skip = useSyncExternalStore(noop, seen, () => false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (skip || reduced) return;
    const t = window.setTimeout(() => {
      setDone(true);
      try {
        window.sessionStorage.setItem(KEY, "1");
      } catch {
        // Modo privado sin almacenamiento: se repetirá la intro, sin problema.
      }
    }, 1900);
    return () => window.clearTimeout(t);
  }, [skip, reduced]);

  if (skip || reduced) return null;
  return (
    <AnimatePresence>
      {!done ? (
        <motion.div
          className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-plum text-paper"
          style={{ animation: "sp-pre-hide 0.01s linear 6s forwards" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          aria-hidden
        >
          <svg viewBox={LOGO_VIEWBOX} className="h-28 w-28 md:h-36 md:w-36" fill="currentColor">
            {LOGO_PIECES.map((p, i) => (
              <motion.path
                key={i}
                d={p.d}
                transform={p.transform || undefined}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.055 }}
              />
            ))}
          </svg>
          <motion.p initial={{ opacity: 0, letterSpacing: "0.5em" }} animate={{ opacity: 1, letterSpacing: "0.08em" }} transition={{ duration: 1, delay: 0.75, ease: [0.22, 1, 0.36, 1] }} className="mt-6 font-brand text-4xl font-light">
            SPECCH<span className="lowercase">i</span>
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
