import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingWidget } from "@/components/site/booking-widget";
import { RevealLines } from "@/components/site/motion-kit";
import { getLandingData } from "@/lib/landing";

export const metadata: Metadata = { title: "Reserva tu cita", description: "Elige sede, servicio y hora con la agenda real de SPECCHi." };

export default async function ReservarPage() {
  const { branches } = await getLandingData();
  return (
    <section aria-labelledby="reservar-title" className="relative overflow-hidden bg-linear-to-br from-ivory via-blush/30 to-lilac/25">
      <div className="mesh" aria-hidden>
        <i style={{ width: "38vw", height: "38vw", left: "-10vw", top: "-6vw", background: "#ffbd99", opacity: 0.6 }} />
      </div>
      <div className="relative mx-auto grid max-w-[1320px] grid-cols-1 gap-10 px-4 pt-32 pb-24 md:px-10 md:pt-40 lg:grid-cols-[1fr_1.3fr] lg:gap-14 [&>*]:min-w-0">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-rose uppercase">Reserva</p>
          <h1 id="reservar-title" className="sr-only">Reserva tu cita</h1>
          <RevealLines as="p" lines={["Tu hora,", <em key="e" className="text-gradient pr-2">en tiempo real</em>]} className="font-display text-[clamp(3rem,6.4vw,6.5rem)] leading-[0.92]" />
          <p className="mt-6 max-w-md text-ink-soft">Los horarios que ves son los reales de cada especialista. Si prefieres, escríbenos por WhatsApp y Vera te ayuda al instante, a cualquier hora.</p>
        </div>
        <Suspense fallback={<div className="shimmer h-[520px] rounded-[2rem]" />}>
          <BookingWidget branches={branches} />
        </Suspense>
      </div>
    </section>
  );
}
