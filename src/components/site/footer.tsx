import { LogoMark } from "@/components/brand/logo";
import type { LandingData } from "@/lib/landing";
import { waLink } from "./icons";
import { TLink } from "./transition";

export function Footer({ branches, year, demo }: Pick<LandingData, "branches" | "year"> & { demo: boolean }) {
  return (
    <footer className="relative overflow-hidden bg-plum text-paper">
      <div className="mesh opacity-50" aria-hidden>
        <i style={{ width: 520, height: 520, right: -140, top: -160, color: "#c2337a" }} />
        <i style={{ width: 460, height: 460, left: -120, bottom: -200, color: "#6d4bd1", animationDelay: "-11s" }} />
      </div>
      <div className="relative mx-auto max-w-[1320px] px-5 pt-24 pb-8 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_0.7fr]">
          <div>
            <p className="font-display text-5xl leading-[0.95] md:text-6xl">
              Mírate.
              <br />
              <em className="text-peach">Siéntete.</em>
              <br />
              Vuelve.
            </p>
            <p className="mt-6 max-w-sm text-sm text-paper/75">39 años de experiencia en belleza y wellness. Spa, peluquería y tienda en Lima.</p>
          </div>
          <nav aria-label="Sedes">
            <p className="mb-4 text-xs font-semibold tracking-[0.25em] text-paper/60 uppercase">Sedes · WhatsApp</p>
            <ul className="space-y-1.5 text-sm">
              {branches.map((b) => (
                <li key={b.id}>
                  <a href={waLink(b.phone)} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-peach">
                    {b.name} <span className="text-paper/60">· {b.district}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Secciones">
            <p className="mb-4 text-xs font-semibold tracking-[0.25em] text-paper/60 uppercase">Explora</p>
            <ul className="space-y-1.5 text-sm">
              {[["/spa", "Carta de spa"], ["/salon", "Salón"], ["/store", "Store y gift cards"], ["/reservar", "Reservar"], ["/login", "Panel"], ["/propuesta", "La propuesta"]].map(([href, label]) => (
                <li key={href}>
                  <TLink href={href!} className="transition-colors hover:text-peach">{label}</TLink>
                </li>
              ))}
              <li className="pt-2">
                <a href="https://www.instagram.com/specchi__spa/" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-peach">@specchi__spa</a>
              </li>
              <li>
                <a href="https://www.instagram.com/specchistore_/" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-peach">@specchistore_</a>
              </li>
            </ul>
          </nav>
        </div>
        <p className="mt-20 flex items-end justify-center gap-[0.04em] font-brand text-[22vw] leading-[0.8] font-light tracking-tight text-paper/95 select-none md:text-[19vw] xl:text-[17rem]" aria-hidden>
          SPECCH<span className="lowercase">i</span>
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-paper/15 pt-5 text-xs text-paper/65">
          <p className="flex items-center gap-2"><LogoMark className="h-4 w-4" title="" /> © {year} SPECCHi</p>
          {demo ? <p>Sitio de demostración preparado como propuesta. Fotos de referencia; precios tomados de specchi.com.pe.</p> : null}
        </div>
      </div>
    </footer>
  );
}
