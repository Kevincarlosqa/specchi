"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const SPRITE = 64;
const FRAME_MS = 1000 / 30; // Deriva lenta: a 30 fps se ve igual y cuesta la mitad.

interface Particle {
  x: number;
  y: number;
  size: number;
  rise: number;
  sway: number;
  phase: number;
  twinkle: number;
  alpha: number;
  kind: "dot" | "glint" | "glow";
  spin: number;
  sprite: HTMLCanvasElement;
}

/** Punto suave o destello de cuatro puntas, ya rasterizado: dibujarlo luego es solo copiar píxeles. */
function makeSprite(hex: string, glint: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SPRITE;
  const g = canvas.getContext("2d")!;
  const m = SPRITE / 2;
  const halo = g.createRadialGradient(m, m, 0, m, m, m);
  halo.addColorStop(0, glint ? `${hex}aa` : hex);
  halo.addColorStop(glint ? 0.3 : 0.4, `${hex}${glint ? "33" : "aa"}`);
  halo.addColorStop(1, `${hex}00`);
  g.fillStyle = halo;
  g.fillRect(0, 0, SPRITE, SPRITE);
  if (glint) {
    g.fillStyle = hex;
    g.beginPath();
    g.moveTo(m, 0);
    g.quadraticCurveTo(m, m, SPRITE, m);
    g.quadraticCurveTo(m, m, m, SPRITE);
    g.quadraticCurveTo(m, m, 0, m);
    g.quadraticCurveTo(m, m, m, 0);
    g.fill();
  }
  return canvas;
}

/**
 * Polvo de espejo: motas y destellos que suben despacio sobre su sección.
 * Pensado para no notarse en el rendimiento: un solo canvas, sprites ya dibujados, 30 fps,
 * y el bucle se detiene si la sección no está en pantalla o la pestaña está oculta.
 */
export function Particles({ colors, count = 50, glints = 0.3, opacity = 0.8, className }: { colors: string[]; count?: number; glints?: number; opacity?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const palette = colors.join(",");

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const hexes = palette.split(",");
    const dots = hexes.map((h) => makeSprite(h, false));
    const stars = hexes.map((h) => makeSprite(h, true));
    const particles: Particle[] = [];
    let width = 0;
    let height = 0;

    const spawn = (): Particle => {
      // Tres planos: destellos, motas y luces grandes y tenues que dan profundidad.
      const roll = Math.random();
      const kind = roll < glints ? "glint" : roll < glints + 0.08 ? "glow" : "dot";
      const set = kind === "glint" ? stars : dots;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: kind === "glint" ? 14 + Math.random() * 16 : kind === "glow" ? 40 + Math.random() * 50 : 4 + Math.random() * 6,
        rise: 6 + Math.random() * 14,
        sway: 8 + Math.random() * 22,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.5 + Math.random() * 1.3,
        alpha: (kind === "glow" ? 0.14 + Math.random() * 0.14 : 0.65 + Math.random() * 0.35) * opacity,
        kind,
        spin: (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.35),
        sprite: set[Math.floor(Math.random() * set.length)]!,
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Menos partículas en pantallas pequeñas; las existentes se conservan para no dar saltos.
      const target = Math.round(count * Math.min(1, Math.max(0.4, width / 1280)));
      while (particles.length < target) particles.push(spawn());
      particles.length = target;
    };

    let raf = 0;
    let last = 0;
    let visible = false;
    let dpr = 1;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const elapsed = now - last;
      if (elapsed < FRAME_MS) return;
      last = now;
      const dt = Math.min(elapsed, 100) / 1000;
      const t = now / 1000;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y -= p.rise * dt;
        if (p.y < -p.size) {
          p.y = height + p.size;
          p.x = Math.random() * width;
        }
        const pulse = Math.sin(p.phase + t * p.twinkle) * 0.5 + 0.5;
        // Los destellos laten y giran despacio; las motas y las luces solo respiran.
        ctx.globalAlpha = p.alpha * (p.kind === "glint" ? 0.08 + 0.92 * pulse * pulse : 0.45 + 0.55 * pulse);
        const x = p.x + Math.sin(p.phase + t * 0.25) * p.sway;
        const half = p.size / 2;
        if (p.kind === "glint") {
          const a = p.phase + t * p.spin;
          const cos = Math.cos(a) * dpr;
          const sin = Math.sin(a) * dpr;
          ctx.setTransform(cos, sin, -sin, cos, x * dpr, p.y * dpr);
          ctx.drawImage(p.sprite, -half, -half, p.size, p.size);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        } else {
          ctx.drawImage(p.sprite, x - half, p.y - half, p.size, p.size);
        }
      }
    };

    const sync = () => {
      cancelAnimationFrame(raf);
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    resize();
    const resizer = new ResizeObserver(resize);
    resizer.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", sync);

    return () => {
      cancelAnimationFrame(raf);
      resizer.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [palette, count, glints, opacity]);

  return <canvas ref={ref} className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden />;
}
