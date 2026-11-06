"use client";

import Image from "next/image";
import { AnimatePresence, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { ArrowUpRight, Check, MapPin } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { CATEGORY_PHOTOS, PHOTOS, unsplash } from "@/content/images";
import type { LandingData } from "@/lib/landing";
import { cn, formatMoney } from "@/lib/utils";
import { waLink } from "./icons";
import { Counter, FadeUp, RevealLines, ScrollFillText, VelocityMarquee } from "./motion-kit";
import { RevealPhoto } from "./photo";
import { TLink } from "./transition";

type Service = LandingData["services"][number];
const hours = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60}` : ""}` : `${min} min`);

export function Marquee() {
  const WORDS = ["Rituales", "Balayage", "Masaje Signature", "Glow Up", "Microblading", "Hidroterapia", "Gel Color", "Novias"];
  return (
    <div className="overflow-hidden bg-plum py-5 text-paper md:py-7" aria-hidden>
      <VelocityMarquee baseVelocity={-2.4}>
        {WORDS.map((w, i) => (
          <span key={w} className="flex items-center gap-8 pr-8 font-display text-5xl md:text-7xl">
            <span className={i % 2 ? "text-peach italic" : ""}>{w}</span>
            <LogoMark className="h-8 w-8 text-mauve md:h-11 md:w-11" title="" />
          </span>
        ))}
      </VelocityMarquee>
    </div>
  );
}

/** Spa y salón: dos paneles que se expanden al pasar el cursor. */
export function Worlds({ spaCount, salonCount }: { spaCount: number; salonCount: number }) {
  const [hover, setHover] = useState<"spa" | "salon" | null>(null);
  const worlds = [
    { key: "spa" as const, href: "/spa", title: "Spa", tag: "Baja las revoluciones", text: "Rituales, masajes, faciales e hidroterapia en el Swissôtel.", photo: PHOTOS.massageOil, count: spaCount, tone: "from-plum/80" },
    { key: "salon" as const, href: "/salon", title: "Salón", tag: "Cambia de aire", text: "Corte, color, peinado, uñas, cejas y maquillaje en cinco sedes.", photo: PHOTOS.curls, count: salonCount, tone: "from-rose-deep/80" },
  ];
  return (
    <section aria-label="Spa y salón" className="mx-auto max-w-[1320px] px-3 py-20 md:px-6 md:py-28">
      <div className="mb-10 px-2 md:mb-14">
        <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-rose uppercase">Dos mundos, un mismo cuidado</p>
        <RevealLines lines={["¿Hoy qué te", <em key="e" className="text-gradient pr-2">pide el cuerpo?</em>]} className="font-display text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.95]" />
      </div>
      <div className="flex h-[78vh] min-h-[560px] flex-col gap-3 md:h-[74vh] md:flex-row">
        {worlds.map((w) => (
          <TLink
            key={w.key}
            href={w.href}
            onPointerEnter={() => setHover(w.key)}
            onPointerLeave={() => setHover(null)}
            data-cursor={w.title}
            className={cn("group relative block min-h-0 overflow-hidden rounded-[2.5rem] transition-[flex-grow] duration-700 ease-[cubic-bezier(.22,1,.36,1)]", hover === w.key ? "grow-[1.7]" : "grow")}
            style={{ flexBasis: 0 }}
          >
            <Image src={unsplash(w.photo)} alt={w.photo.alt} fill sizes="(min-width: 768px) 70vw, 100vw" className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105" />
            <span className={cn("absolute inset-0 bg-linear-to-t via-transparent to-transparent", w.tone)} />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-paper md:p-9">
              <span>
                <span className="mb-1 block text-xs font-semibold tracking-[0.25em] uppercase">{w.tag}</span>
                <span className="block font-display text-7xl leading-none md:text-8xl">{w.title}</span>
                <span className="mt-3 block max-w-sm text-sm opacity-90">{w.text}</span>
                <span className="mt-2 block text-xs font-semibold opacity-80">{w.count} servicios en carta</span>
              </span>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-paper text-ink transition-transform duration-500 group-hover:rotate-45"><ArrowUpRight className="h-6 w-6" aria-hidden /></span>
            </span>
          </TLink>
        ))}
      </div>
    </section>
  );
}

/** Rituales: carril horizontal fijado al scroll en escritorio; deslizable en móvil. */
export function Rituals({ services }: { services: Service[] }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0.02, 0.98], ["0vw", "-47vw"]);
  const photos = [PHOTOS.backMassage, PHOTOS.spaStill, PHOTOS.massageOil, PHOTOS.faceMassage, PHOTOS.hotStones];
  return (
    <section ref={ref} aria-labelledby="rituales" className={cn("relative bg-sand/60", !reduced && "lg:h-[320vh]")}>
      <div className={cn("overflow-hidden py-20", !reduced && "lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-center lg:py-0")}>
        <div className="mx-auto mb-8 flex w-full max-w-[1320px] flex-wrap items-end justify-between gap-4 px-5 md:px-10">
          <h2 id="rituales" className="font-display text-[clamp(2.6rem,5.6vw,5.4rem)] leading-[0.95]">Rituales para <em className="text-rose">perder la noción del tiempo</em></h2>
          <TLink href="/spa" className="inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline">Toda la carta <ArrowUpRight className="h-4 w-4" aria-hidden /></TLink>
        </div>
        <motion.ul style={reduced ? undefined : { x }} className="scrollbar-none flex gap-4 overflow-x-auto px-5 max-lg:!transform-none md:px-10 lg:w-max lg:overflow-visible" data-lenis-prevent>
          {services.map((s, i) => (
            <li key={s.id} className="w-[78vw] shrink-0 sm:w-[46vw] lg:w-[27vw]">
              <TLink href={`/reservar?servicio=${s.id}`} className="group block" data-cursor="Reservar">
                <div className="relative h-[52vh] overflow-hidden rounded-t-[999px] lg:h-[56vh]">
                  <Image src={unsplash(photos[i % photos.length]!)} alt={photos[i % photos.length]!.alt} fill sizes="(min-width: 1024px) 28vw, 78vw" className="object-cover transition-transform duration-[1300ms] ease-out group-hover:scale-110" />
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-3xl leading-tight">{s.name}</h3>
                    <p className="mt-1 max-w-xs text-sm text-muted">{s.description}</p>
                  </div>
                  <p className="shrink-0 text-right text-sm font-semibold tabular-nums">{formatMoney(s.basePriceCents)}<span className="block text-xs font-normal text-muted">{hours(s.durationMin)}</span></p>
                </div>
              </TLink>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

/** Manifiesto + cifras reales. */
export function Manifesto({ branches, services, brands }: { branches: number; services: number; brands: number }) {
  return (
    <section aria-label="Nuestra historia" className="relative overflow-hidden bg-plum text-paper">
      <div className="mesh opacity-60" aria-hidden>
        <i style={{ width: 620, height: 620, left: "-10%", top: "-20%", background: "#9c2061" }} />
        <i style={{ width: 520, height: 520, right: "-8%", bottom: "-20%", background: "#6d4bd1", animationDelay: "-10s" }} />
      </div>
      <div className="relative mx-auto max-w-[1320px] px-5 py-28 md:px-10 md:py-40">
        <p className="mb-8 text-xs font-semibold tracking-[0.3em] text-peach uppercase">Specchi: «espejos», en italiano</p>
        <ScrollFillText
          text="En 1987 abrimos un salón con diez personas y una idea simple: que salieras mirándote _distinto. Hoy somos _spa, _salón y _tienda, y esa idea sigue igual."
          className="max-w-5xl font-display text-[clamp(2.2rem,5.4vw,5.2rem)] leading-[1.03]"
        />
        <dl className="mt-20 grid grid-cols-2 gap-8 border-t border-paper/20 pt-10 md:grid-cols-4">
          {[
            { v: 39, s: "", l: "años de experiencia" },
            { v: branches, s: "", l: "sedes en Lima" },
            { v: services, s: "", l: "servicios en carta" },
            { v: brands, s: "", l: "marcas profesionales" },
          ].map((k) => (
            <div key={k.l}>
              <dd className="font-display text-7xl leading-none md:text-8xl"><Counter to={k.v} suffix={k.s} /></dd>
              <dt className="mt-2 text-sm text-paper/75">{k.l}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** Gift card que se inclina con el cursor. */
function GiftCard() {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 16 });
  const sry = useSpring(ry, { stiffness: 160, damping: 16 });
  const gloss = useTransform(sry, [-18, 18], ["0%", "100%"]);
  const glossBg = useTransform(gloss, (g) => `radial-gradient(60% 80% at ${g} 30%, rgba(255,255,255,.45), transparent)`);
  return (
    <div className="[perspective:1200px]">
      <motion.div
        ref={ref}
        style={{ rotateX: srx, rotateY: sry }}
        onPointerMove={(e) => {
          const r = ref.current!.getBoundingClientRect();
          rx.set(-((e.clientY - r.top) / r.height - 0.5) * 22);
          ry.set(((e.clientX - r.left) / r.width - 0.5) * 22);
        }}
        onPointerLeave={() => {
          rx.set(0);
          ry.set(0);
        }}
        className="relative aspect-[1.6] w-full overflow-hidden rounded-[2rem] bg-linear-to-br from-rose via-coral to-violet p-7 text-paper shadow-[0_40px_80px_-30px_rgba(156,32,97,.7)] md:p-9"
      >
        <LogoMark className="absolute -right-10 -bottom-12 h-64 w-64 text-paper/15" title="" />
        <motion.span className="pointer-events-none absolute inset-0" style={{ background: glossBg }} />
        <div className="relative flex h-full flex-col justify-between">
          <p className="font-brand text-3xl font-light">SPECCH<span className="lowercase">i</span></p>
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase">Gift card</p>
            <p className="font-display text-5xl leading-none md:text-6xl">Un regalo que se nota</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function StoreTeaser({ products }: { products: LandingData["products"] }) {
  return (
    <section aria-labelledby="store" className="mx-auto grid max-w-[1320px] gap-12 px-5 py-24 md:px-10 md:py-36 lg:grid-cols-[1.05fr_1fr] lg:items-center">
      <div>
        <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-rose uppercase">SPECCHi Store · @specchistore_</p>
        <h2 id="store" className="font-display text-[clamp(2.6rem,5.4vw,5.2rem)] leading-[0.95]">Llévate el salón <em className="text-gradient pr-2">a casa</em></h2>
        <p className="mt-5 max-w-md text-ink-soft">Kérastase, Olaplex, Moroccanoil, Davines, Redken y más, recomendados por quien conoce tu cabello.</p>
        <ul className="mt-8 flex flex-wrap gap-2">
          {[...new Set(products.map((p) => p.brand))].map((b) => (
            <li key={b} className="rounded-full border border-ink/15 px-4 py-2 text-sm">{b}</li>
          ))}
        </ul>
        <TLink href="/store" className="mt-8 inline-flex h-12 items-center gap-1 rounded-full bg-ink px-7 text-sm font-semibold text-paper transition-colors hover:bg-plum">Entrar a la tienda <ArrowUpRight className="h-4 w-4" aria-hidden /></TLink>
      </div>
      <FadeUp><GiftCard /></FadeUp>
    </section>
  );
}

const SCRIPT: Array<{ from: "me" | "bot"; text: string; buttons?: string[] }> = [
  { from: "me", text: "Hola! Quiero mi masaje de siempre 💆‍♀️" },
  { from: "bot", text: "¡Hola, Lucía! ✨ Soy Vera. ¿Masaje Signature con Elena en el Spa Swissôtel?", buttons: ["Sí, con Elena", "Otra sede"] },
  { from: "me", text: "Sí, con Elena" },
  { from: "bot", text: "Elena tiene libre el jueves:", buttons: ["9:30", "10:30", "11:45"] },
  { from: "me", text: "10:30" },
  { from: "bot", text: "Masaje SPECCHi Signature · Elena · jueves 10:30 · S/ 240. ¿Confirmo?", buttons: ["Confirmar", "Cambiar"] },
  { from: "me", text: "Confirmar" },
  { from: "bot", text: "¡Listo! Código SP-7KQ4M. Te recuerdo un día antes ✨" },
];

export function ChatDemo({ whatsappHref }: { whatsappHref: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [count, setCount] = useState(1);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 80%"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => setCount(Math.max(1, Math.min(SCRIPT.length, Math.ceil(p * (SCRIPT.length + 0.5))))));
  const shown = reduced ? SCRIPT.length : count;
  return (
    <section ref={ref} aria-labelledby="chat" className="relative overflow-hidden bg-linear-to-b from-ivory via-blush/40 to-ivory">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-24 md:px-10 md:py-36 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-rose uppercase">Reserva por WhatsApp, a cualquier hora</p>
          <h2 id="chat" className="font-display text-[clamp(2.6rem,5.6vw,5.4rem)] leading-[0.95]">Tu cita en <em className="text-gradient pr-2">menos de un minuto</em></h2>
          <ul className="mt-8 max-w-md space-y-3">
            {["Te reconoce: sabe tu sede, tu especialista y tu último servicio.", "Consulta la agenda real de las seis sedes; nunca inventa precios.", "Alergias o dudas de salud pasan directo a una asesora."].map((t) => (
              <li key={t} className="flex gap-3 text-ink-soft"><Check className="mt-0.5 h-5 w-5 shrink-0 text-rose" aria-hidden /> {t}</li>
            ))}
          </ul>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex h-12 items-center rounded-full bg-ink px-7 text-sm font-semibold text-paper transition-colors hover:bg-plum">Escribir por WhatsApp</a>
        </div>
        <div className="mx-auto w-full max-w-[330px]">
          <div className="overflow-hidden rounded-[2.6rem] border-[10px] border-ink bg-[#efe6dd] shadow-[0_40px_80px_-30px_rgba(42,16,37,.55)]" role="img" aria-label="Ejemplo de conversación con Vera, la asistente de reservas">
            <div className="flex items-center gap-3 bg-plum px-4 py-3 text-paper">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mauve"><LogoMark className="h-5 w-5" title="" /></span>
              <div>
                <p className="text-sm font-semibold">SPECCHi</p>
                <p className="text-[10px] opacity-80">{shown < SCRIPT.length && SCRIPT[shown]?.from === "bot" ? "escribiendo…" : "en línea"}</p>
              </div>
            </div>
            <div className="flex h-[440px] flex-col justify-end gap-2 overflow-hidden p-3" aria-hidden>
              <AnimatePresence initial={false}>
                {SCRIPT.slice(0, shown).map((m, i) => (
                  <motion.div key={i} layout initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 26 }} className={cn("flex shrink-0 flex-col", m.from === "me" ? "items-end" : "items-start")}>
                    <p className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug", m.from === "me" ? "rounded-br-md bg-[#f6d6e6]" : "rounded-bl-md bg-white")}>{m.text}</p>
                    {m.buttons ? (
                      <div className="mt-1 flex max-w-[85%] flex-wrap gap-1">
                        {m.buttons.map((b) => (
                          <span key={b} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-rose-deep">{b}</span>
                        ))}
                      </div>
                    ) : null}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BranchStrip({ branches }: { branches: LandingData["branches"] }) {
  const [active, setActive] = useState(branches[0]?.id);
  const current = branches.find((b) => b.id === active) ?? branches[0];
  return (
    <section aria-labelledby="sedes" className="mx-auto max-w-[1320px] px-5 py-24 md:px-10 md:py-32">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <h2 id="sedes" className="font-display text-[clamp(2.6rem,5.6vw,5.4rem)] leading-[0.95]">Cerca de <em className="text-rose">donde estés</em></h2>
        <TLink href="/sedes" className="inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline">Todas las sedes <ArrowUpRight className="h-4 w-4" aria-hidden /></TLink>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <ul className="border-t border-ink/15">
          {branches.map((b) => (
            <li key={b.id} className="border-b border-ink/15">
              <button type="button" aria-pressed={b.id === active} onClick={() => setActive(b.id)} onPointerEnter={() => setActive(b.id)} onFocus={() => setActive(b.id)} className="flex w-full items-baseline gap-4 py-4 text-left">
                <span className={cn("font-display text-4xl transition-all duration-500 md:text-6xl", b.id === active ? "translate-x-3 text-rose italic" : "")}>{b.name}</span>
                <span className="ml-auto text-right text-xs text-muted">{b.district}</span>
              </button>
            </li>
          ))}
        </ul>
        <AnimatePresence mode="wait">
          {current ? (
            <motion.div key={current.id} initial={{ opacity: 0, y: 20, rotate: 1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col justify-between gap-6 rounded-[2rem] bg-linear-to-br from-plum to-[#5a1f4f] p-7 text-paper" aria-live="polite">
              <div>
                <MapPin className="mb-3 h-5 w-5 text-peach" aria-hidden />
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
              </div>
              <div className="flex flex-wrap gap-2">
                <TLink href={`/reservar?sede=${current.id}`} className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-paper px-5 text-sm font-semibold text-ink transition-colors hover:bg-peach">Reservar aquí</TLink>
                <a href={waLink(current.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-paper/40 px-5 text-sm font-semibold transition-colors hover:bg-paper/10">WhatsApp</a>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}

/** Mosaico final que invita a reservar. */
export function FinalCta() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const photos = [CATEGORY_PHOTOS.NAILS, CATEGORY_PHOTOS.MAKEUP, CATEGORY_PHOTOS.FACIAL, CATEGORY_PHOTOS.COLOR];
  return (
    <section aria-label="Reserva" className="mx-auto max-w-[1320px] px-3 pb-20 md:px-6">
      <div ref={ref} className="relative overflow-hidden rounded-[3rem] bg-linear-to-br from-peach via-blush to-lilac px-5 py-20 text-center md:py-28">
        <div className="absolute inset-0 hidden grid-cols-4 gap-3 p-3 opacity-90 md:grid" aria-hidden>
          {photos.map((p, i) => (
            <motion.div key={p.id} className="relative overflow-hidden rounded-t-[999px]" style={{ alignSelf: i % 2 ? "start" : "end", height: "42%" }} initial={{ y: i % 2 ? "-110%" : "110%" }} animate={inView ? { y: "0%" } : undefined} transition={{ duration: 1.2, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}>
              <Image src={unsplash(p)} alt="" fill sizes="25vw" className="object-cover" />
            </motion.div>
          ))}
        </div>
        <div className="relative">
          <h2 className="font-display text-[clamp(3rem,9vw,8.5rem)] leading-[0.9]">Te toca a <em>ti</em></h2>
          <p className="mx-auto mt-4 max-w-sm text-ink-soft">Elige sede, servicio y hora con la agenda real. Es cuestión de un minuto.</p>
          <TLink href="/reservar" className="mt-7 inline-flex h-14 items-center rounded-full bg-ink px-9 text-sm font-semibold text-paper transition-transform duration-300 hover:scale-105">Agenda tu cita</TLink>
        </div>
      </div>
    </section>
  );
}

export function SiteRevealPhoto() {
  return <RevealPhoto photo={PHOTOS.salon} sizes="100vw" className="h-[60vh]" />;
}
