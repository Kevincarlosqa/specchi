import { cn } from "@/lib/utils";

/**
 * Isotipo SPECCHi trazado desde el logo original: 3 columnas × 4 filas de piezas con una esquina curva
 * que, en espejo, forman flores y una estrella de cuatro puntas en el centro.
 * Solo se dibuja el cuadrante superior izquierdo; el resto es su reflejo (specchi = espejos).
 */
const QUARTER = [
  "M0 0H160V133H92C40 133 0 82 0 0Z",
  "M175 0H200C248 0 292 46 292 96V133H175Z",
  "M160 148V281H0V238C0 190 40 148 92 148Z",
  "M175 148H292V190C292 238 248 281 200 281H175Z",
];

/** Las 16 piezas del isotipo, con el reflejo de cada cuadrante (útil para animar pieza por pieza). */
export const LOGO_PIECES = (["", "matrix(-1 0 0 1 587 0)", "matrix(1 0 0 -1 0 573)", "matrix(-1 0 0 -1 587 573)"] as const).flatMap((transform) =>
  QUARTER.map((d) => ({ d, transform })),
);
export const LOGO_VIEWBOX = "0 0 587 573";

export function LogoMark({ className, title = "SPECCHi" }: { className?: string; title?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={cn("h-8 w-8", className)} role={title ? "img" : undefined} aria-label={title || undefined} aria-hidden={title ? undefined : true} fill="currentColor">
      {LOGO_PIECES.map((p, i) => (
        <path key={i} d={p.d} transform={p.transform || undefined} />
      ))}
    </svg>
  );
}

/** Logotipo: palo seco fino, en mayúsculas con la "i" final en minúscula, como el original. */
export function Wordmark({ className, withMark = false }: { className?: string; withMark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {withMark ? <LogoMark className="h-[1.4em] w-[1.4em]" title="" /> : null}
      <span className="font-brand text-[1.5em] leading-none font-light tracking-[0.04em]">
        SPECCH<span className="lowercase">i</span>
      </span>
    </span>
  );
}
