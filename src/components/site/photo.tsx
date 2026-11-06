"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { unsplash, type Photo as PhotoData } from "@/content/images";
import { cn } from "@/lib/utils";

const EASE = [0.76, 0, 0.24, 1] as const;

export function Photo({ photo, sizes, priority = false, className, imgClassName }: { photo: PhotoData; sizes: string; priority?: boolean; className?: string; imgClassName?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-blush", className)}>
      <Image src={unsplash(photo)} alt={photo.alt} fill sizes={sizes} priority={priority} quality={75} className={cn("object-cover", imgClassName)} />
    </div>
  );
}

/** Se revela como un espejo que se abre, con parallax suave al hacer scroll. */
export function RevealPhoto({ photo, sizes, className, parallax = 10, delay = 0, arch = false }: { photo: PhotoData; sizes: string; className?: string; parallax?: number; delay?: number; arch?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${parallax}%`, `${parallax}%`]);
  return (
    <motion.div
      ref={ref}
      className={cn("relative overflow-hidden bg-blush", arch && "rounded-t-[999px]", className)}
      initial={reduced ? false : { clipPath: "inset(100% 0 0 0)" }}
      whileInView={{ clipPath: "inset(0% 0 0 0)" }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 1.3, ease: EASE, delay }}
    >
      <motion.div className="absolute inset-[-12%_0] will-change-transform" style={reduced ? undefined : { y }} initial={reduced ? false : { scale: 1.25 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.7, ease: [0.22, 1, 0.36, 1], delay }}>
        <Image src={unsplash(photo)} alt={photo.alt} fill sizes={sizes} quality={75} className="object-cover" />
      </motion.div>
    </motion.div>
  );
}
