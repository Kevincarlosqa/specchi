"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Se vuelve a montar en cada cambio de página del panel: el contenido entra subiendo con suavidad. */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  // Sin `filter`: dejaría un contexto que rompe los modales con position: fixed.
  return (
    <motion.div initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
