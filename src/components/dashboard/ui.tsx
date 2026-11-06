import type { ComponentProps, ReactNode } from "react";
import type { BookingStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="mb-1.5 text-[11px] font-semibold tracking-[0.22em] text-rose uppercase">{eyebrow}</p> : null}
        <h1 className="font-display text-[2.5rem] leading-[1.02] md:text-5xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("dash-card rounded-3xl border border-line/90 bg-paper p-4 md:p-6", className)} {...props} />;
}

export function CardTitle({ children, hint, className, action }: { children: ReactNode; hint?: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-1", className)}>
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{children}</h2>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

const buttonVariants = {
  primary: "bg-ink text-paper hover:bg-plum",
  secondary: "border border-line bg-paper text-ink hover:border-ink/30 hover:bg-sand",
  ghost: "text-ink hover:bg-sand",
  danger: "bg-danger text-white hover:bg-danger/90",
  rose: "bg-rose text-white hover:bg-rose-deep",
};

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: keyof typeof buttonVariants; size?: "sm" | "md" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all duration-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export const inputClass =
  "h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-rose focus:outline-none focus-visible:outline-2 focus-visible:outline-rose/40";

export function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

const STATUS_STYLE: Record<BookingStatus, string> = {
  PENDING: "bg-butter text-[#6f4a06]",
  CONFIRMED: "bg-[#d9f2ec] text-[#0b5f53]",
  IN_PROGRESS: "bg-[#e7e0fb] text-[#452a9e]",
  COMPLETED: "bg-sand text-ink-soft",
  CANCELLED: "bg-[#fbdfe2] text-[#96202f]",
  NO_SHOW: "bg-blush text-rose-deep",
};

export const STATUS_BLOCK: Record<BookingStatus, string> = {
  PENDING: "bg-butter border-[#e3bb5e] text-[#5e3d05]",
  CONFIRMED: "bg-blush border-rose/40 text-ink",
  IN_PROGRESS: "bg-[#e7e0fb] border-violet/50 text-[#35207e]",
  COMPLETED: "bg-sand border-linen text-ink-soft",
  CANCELLED: "bg-[#fbdfe2] border-[#e7a0a9] text-[#96202f] line-through",
  NO_SHOW: "bg-[#f6d6e6] border-rose/40 text-rose-deep",
};

export function StatusBadge({ status, label }: { status: BookingStatus; label: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLE[status])}>{label}</span>;
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-ink-soft", className)}>{children}</span>;
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line px-6 py-14 text-center">
      {icon ? <div className="text-nude">{icon}</div> : null}
      <p className="font-display text-2xl">{title}</p>
      {children ? <div className="max-w-sm text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-2xl", className)} />;
}

export function Delta({ current, previous, invert = false, format = "pct" }: { current: number; previous: number; invert?: boolean; format?: "pct" | "pts" }) {
  if (!previous && !current) return <span className="text-xs text-muted">—</span>;
  const diff = format === "pts" ? (current - previous) * 100 : previous ? ((current - previous) / previous) * 100 : 100;
  const good = invert ? diff < 0 : diff > 0;
  const flat = Math.abs(diff) < 0.5;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", flat ? "text-muted" : good ? "text-success" : "text-danger")}>
      {flat ? "≈" : diff > 0 ? "↑" : "↓"} {Math.abs(diff).toFixed(format === "pts" ? 1 : 0)}
      {format === "pts" ? " pts" : "%"}
      <span className="sr-only">{flat ? "sin cambio" : good ? "mejor" : "peor"} que el periodo anterior</span>
    </span>
  );
}

/** Aviso de que algo está simulado en la demo y qué falta para que sea real. */
export function DemoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("rounded-2xl border border-lilac/70 bg-lilac/15 px-3 py-2 text-xs text-ink-soft", className)}>
      <strong className="font-semibold">Demo · </strong>
      {children}
    </p>
  );
}

export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)} %`;
