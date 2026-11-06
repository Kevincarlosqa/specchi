"use client";

import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, useSyncExternalStore } from "react";
import { ArrowDown } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { PHOTOS, unsplash } from "@/content/images";
import { Magnetic } from "./motion-kit";
import { Particles } from "./particles";
import { TLink } from "./transition";

const SILK = [0.22, 1, 0.36, 1] as const;
const noop = () => () => {};
const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;

function BigWord({ className }: { className: string }) {
  return (
    <span className={`font-brand leading-[0.82] font-light tracking-[-0.02em] select-none ${className}`}>
      SPECCH<span className="lowercase">i</span>
    </span>
  );
}

/** Sello giratorio con los años de la marca. */
function Badge() {
  return (
    <TLink href="/reservar" aria-label="Reservar una cita" className="group relative flex h-28 w-28 items-center justify-center rounded-full bg-linear-to-br from-rose via-coral to-violet text-paper md:h-36 md:w-36">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-spin-slow" aria-hidden>
        <defs>
          <path id="badge-circle" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" />
        </defs>
        <text className="fill-current text-[15.5px] tracking-[0.3em] uppercase" fontFamily="var(--font-jost)">
          <textPath href="#badge-circle">39 años · belleza y wellness ·</textPath>
        </text>
      </svg>
      <LogoMark className="h-9 w-9 transition-transform duration-700 group-hover:rotate-90 md:h-11 md:w-11" title="" />
    </TLink>
  );
}

/**
 * Hero "a través del espejo": el arco central es una ventana que deja ver la foto y pinta de blanco
 * la parte del logotipo que queda dentro. Al hacer scroll el espejo se abre hasta llenar la pantalla.
 */
export function Hero() {
  const desktop = useSyncExternalStore(noop, isDesktop, () => true);
  return <HeroScene key={desktop ? "desktop" : "mobile"} desktop={desktop} />;
}

function HeroScene({ desktop }: { desktop: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Parallax con el cursor
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const leftX = useTransform(sx, (v) => v * -26);
  const leftY = useTransform(sy, (v) => v * -18);
  const rightX = useTransform(sx, (v) => v * 26);
  const rightY = useTransform(sy, (v) => v * 18);
  const centerX = useTransform(sx, (v) => v * 10);

  const arch = desktop ? "inset(17% 34.5% 0% 34.5% round 40vw 40vw 0vw 0vw)" : "inset(26% 12% 0% 12% round 60vw 60vw 0vw 0vw)";
  const clipPath = useTransform(p, [0, 0.62], [arch, "inset(0% 0% 0% 0% round 0vw 0vw 0vw 0vw)"]);
  const imgScale = useTransform(p, [0, 0.8], [1.06, 1]);
  const wordY = useTransform(p, [0, 0.45], ["0%", "-30%"]);
  const wordOpacity = useTransform(p, [0, 0.42], [1, 0]);
  const sideLeft = useTransform(p, [0, 0.5], ["0%", "-46%"]);
  const sideRight = useTransform(p, [0, 0.5], ["0%", "46%"]);
  const sideOpacity = useTransform(p, [0.1, 0.45], [1, 0]);
  const introOpacity = useTransform(p, [0, 0.14], [1, 0]);
  const shade = useTransform(p, [0.3, 0.75], [0, 0.72]);
  const textOpacity = useTransform(p, [0.58, 0.8], [0, 1]);
  const textY = useTransform(p, [0.58, 0.85], [50, 0]);

  if (reduced) {
    return (
      <section id="inicio" aria-label="SPECCHi" className="relative flex min-h-dvh flex-col justify-end overflow-hidden bg-plum text-paper">
        <Image src={unsplash(PHOTOS.heroCenter)} alt={PHOTOS.heroCenter.alt} fill priority sizes="100vw" className="object-cover opacity-60" />
        <div className="relative px-5 pb-16 md:px-10">
          <h1 className="font-display text-6xl leading-none">39 años haciendo que te mires distinto.</h1>
          <TLink href="/reservar" className="mt-6 inline-flex h-12 items-center rounded-full bg-paper px-7 text-sm font-semibold text-ink">Reservar</TLink>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      id="inicio"
      aria-label="SPECCHi"
      className="relative h-[260vh] bg-ivory"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        mx.set(e.clientX / window.innerWidth - 0.5);
        my.set(e.clientY / window.innerHeight - 0.5);
      }}
    >
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* Malla de color */}
        <div className="mesh" aria-hidden>
          <i style={{ width: "46vw", height: "46vw", left: "-8vw", top: "-14vw", color: "#ffbd99", opacity: 0.75 }} />
          <i style={{ width: "42vw", height: "42vw", right: "-6vw", top: "-8vw", color: "#cdb9f3", opacity: 0.8, animationDelay: "-7s" }} />
          <i style={{ width: "38vw", height: "38vw", left: "30vw", bottom: "-16vw", color: "#f7a8c9", opacity: 0.7, animationDelay: "-14s" }} />
        </div>

        {/* Espejos laterales */}
        {desktop ? (
          <>
            <motion.div style={{ x: sideLeft, opacity: sideOpacity }} className="absolute bottom-0 left-[6%] w-[23vw]">
              <motion.div initial={{ y: "100%" }} animate={{ y: "0%" }} transition={{ duration: 1.5, ease: SILK, delay: 0.25 }} style={{ x: leftX, y: leftY }}>
                <div className="mirror-sheen relative h-[58vh] overflow-hidden rounded-t-[999px] border-[6px] border-b-0 border-paper/70 shadow-[0_30px_80px_-30px_rgba(61,22,54,.5)]">
                  <Image src={unsplash(PHOTOS.heroLeft)} alt={PHOTOS.heroLeft.alt} fill sizes="24vw" priority className="object-cover" />
                </div>
              </motion.div>
            </motion.div>
            <motion.div style={{ x: sideRight, opacity: sideOpacity }} className="absolute right-[6%] bottom-0 w-[23vw]">
              <motion.div initial={{ y: "100%" }} animate={{ y: "0%" }} transition={{ duration: 1.5, ease: SILK, delay: 0.4 }} style={{ x: rightX, y: rightY }}>
                <div className="mirror-sheen relative h-[66vh] overflow-hidden rounded-t-[999px] border-[6px] border-b-0 border-paper/70 shadow-[0_30px_80px_-30px_rgba(61,22,54,.5)]">
                  <Image src={unsplash(PHOTOS.heroRight)} alt={PHOTOS.heroRight.alt} fill sizes="24vw" priority className="object-cover" />
                </div>
              </motion.div>
            </motion.div>
          </>
        ) : null}

        {/* Logotipo en tinta (fuera del espejo) */}
        <motion.div style={{ y: wordY, opacity: wordOpacity }} className="absolute inset-x-0 top-[17%] flex justify-center md:top-[15%]">
          <motion.h1 aria-label="SPECCHi" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.3, ease: SILK, delay: 0.1 }}>
            <BigWord className="text-[21vw] text-ink md:text-[19vw]" />
          </motion.h1>
        </motion.div>

        {/* El espejo central */}
        <motion.div style={{ clipPath, x: centerX }} className="absolute inset-0">
          <motion.div style={{ scale: imgScale }} className="absolute inset-0">
            <Image src={unsplash(PHOTOS.heroCenter)} alt={PHOTOS.heroCenter.alt} fill priority sizes="100vw" className="object-cover object-[50%_32%]" />
          </motion.div>
          <motion.div style={{ opacity: shade }} className="absolute inset-0 bg-linear-to-t from-plum via-plum/70 to-plum/20" />
          {/* Mismo logotipo, en blanco: solo se ve dentro del espejo */}
          <motion.div style={{ y: wordY, opacity: wordOpacity }} className="absolute inset-x-0 top-[17%] flex justify-center md:top-[15%]" aria-hidden>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.3, ease: SILK, delay: 0.1 }}>
              <BigWord className="text-[21vw] text-paper md:text-[19vw]" />
            </motion.div>
          </motion.div>

          {/* Texto al abrirse */}
          <motion.div style={{ opacity: textOpacity, y: textY }} className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-8 px-5 pb-12 text-paper md:px-10 md:pb-16">
            <div>
              <p className="mb-3 text-xs font-semibold tracking-[0.3em] uppercase">Desde 1987 · Lima</p>
              <p className="max-w-3xl font-display text-[clamp(3rem,7.4vw,7.5rem)] leading-[0.92]">
                39 años haciendo que te <em className="text-peach">mires distinto.</em>
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Magnetic>
                  <TLink href="/reservar" className="btn-shine inline-flex h-13 items-center rounded-full bg-paper px-8 text-sm font-semibold text-ink transition-colors hover:bg-peach">Agenda tu cita</TLink>
                </Magnetic>
                <TLink href="/spa" className="inline-flex h-13 items-center rounded-full border border-paper/50 px-8 text-sm font-semibold transition-colors hover:bg-paper/10">Ver la carta de spa</TLink>
              </div>
            </div>
            <div className="hidden md:block"><Badge /></div>
          </motion.div>
        </motion.div>

        <Particles colors={["#c2337a", "#f0824f", "#6d4bd1"]} count={38} glints={0.35} opacity={0.8} />

        {/* Pie inicial */}
        <motion.div style={{ opacity: introOpacity }} className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto flex max-w-[1320px] items-end justify-between px-5 md:px-10">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="hidden max-w-[12rem] rounded-2xl bg-paper/85 p-3 text-xs leading-snug md:block">
            Peluquería, spa y wellness. Seis sedes en Lima.
          </motion.p>
          <motion.p animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="mx-auto flex items-center gap-1.5 rounded-full bg-paper/90 px-3 py-1.5 text-xs font-semibold md:mx-0">
            Desliza para abrir el espejo <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
