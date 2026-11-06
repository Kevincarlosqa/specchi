"use client";

import { useId, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

/**
 * Paleta categórica validada (validate_palette.js, modo claro sobre #fffdf8): orquídea, violeta, coral, teal, ocre.
 * Coral y ocre quedan bajo 3:1 de contraste: por eso toda gráfica con varias series lleva leyenda y vista de tabla.
 * El color sigue a la entidad, nunca a su posición.
 */
export const SERIES = { orchid: "#c2337a", violet: "#6d4bd1", coral: "#f0824f", teal: "#149a8b", ochre: "#d9a11f" };
const MUTED = "#7d6577";
const INK = "#2a1025";
const GRID = "#f1e7e1";
const SURFACE = "#fffdf8";
const QUIET = "#cdb8b9";
const ANIM = { isAnimationActive: true, animationDuration: 900, animationEasing: "ease-out" as const };

export const money = (v: number) => `S/ ${Math.round(v).toLocaleString("es-PE")}`;
const moneyShort = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v)));
export const shortDate = (k: string) => {
  const [, m, d] = k.split("-");
  return `${Number(d)}/${Number(m)}`;
};

function TipBox({ title, rows }: { title: string; rows: Array<{ label: string; value: string; color?: string }> }) {
  return (
    <div className="rounded-2xl border border-line bg-paper/95 px-3 py-2 text-xs shadow-[0_16px_40px_-20px_rgba(61,22,54,.45)] backdrop-blur">
      <p className="mb-1 font-semibold text-ink">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-5 text-muted">
          <span className="flex items-center gap-1.5">
            {r.color ? <span className="h-2 w-2 rounded-full" style={{ background: r.color }} /> : null}
            {r.label}
          </span>
          <span className="font-semibold text-ink tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Marco de gráfica: alterna con una tabla de los mismos datos (accesibilidad y precisión). */
export function ChartFrame({ label, table, legend, children }: { label: string; table: { head: string[]; rows: Array<Array<string | number>> }; legend?: ReactNode; children: ReactNode }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <div>
      <div className="mb-3 flex min-h-5 items-center justify-between gap-3">
        <div>{legend}</div>
        <button type="button" onClick={() => setShowTable((s) => !s)} aria-pressed={showTable} className="shrink-0 text-[11px] font-semibold text-muted underline-offset-2 hover:text-ink hover:underline">
          {showTable ? "Ver gráfica" : "Ver tabla"}
        </button>
      </div>
      {showTable ? (
        <div className="max-h-72 overflow-auto rounded-2xl border border-line" data-lenis-prevent>
          <table className="w-full text-xs">
            <caption className="sr-only">{label}</caption>
            <thead className="sticky top-0 bg-sand text-left">
              <tr>
                {table.head.map((h) => (
                  <th key={h} className="px-3 py-1.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} className="border-t border-line/70">
                  {row.map((c, j) => (
                    <td key={j} className="px-3 py-1.5 tabular-nums">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-label={label}>
          {children}
        </div>
      )}
    </div>
  );
}

const axis = { tick: { fill: MUTED, fontSize: 11 }, axisLine: false, tickLine: false };

/** Ingresos diarios frente al periodo anterior (una sola escala). */
export function RevenueChart({ data }: { data: Array<{ date: string; revenue: number; bookings: number; previous: number }> }) {
  const id = useId();
  return (
    <ChartFrame
      label="Ingresos diarios del periodo comparados con el periodo anterior"
      legend={<Legend items={[{ label: "Este periodo", color: SERIES.orchid }, { label: "Periodo anterior", color: QUIET }]} />}
      table={{ head: ["Fecha", "Ingresos", "Periodo anterior", "Reservas"], rows: data.map((d) => [shortDate(d.date), money(d.revenue), money(d.previous), d.bookings]) }}
    >
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES.orchid} stopOpacity={0.24} />
                <stop offset="100%" stopColor={SERIES.orchid} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} {...axis} minTickGap={28} />
            <YAxis tickFormatter={moneyShort} {...axis} width={38} />
            <Tooltip
              cursor={{ stroke: INK, strokeOpacity: 0.2 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as { date: string; revenue: number; bookings: number; previous: number } | undefined;
                return active && p ? (
                  <TipBox title={shortDate(p.date)} rows={[{ label: "Ingresos", value: money(p.revenue), color: SERIES.orchid }, { label: "Periodo anterior", value: money(p.previous), color: QUIET }, { label: "Reservas", value: String(p.bookings) }]} />
                ) : null;
              }}
            />
            <Area type="monotone" dataKey="previous" stroke={QUIET} strokeWidth={2} fill="none" dot={false} activeDot={false} {...ANIM} />
            <Area type="monotone" dataKey="revenue" stroke={SERIES.orchid} strokeWidth={2} fill={`url(#${id})`} activeDot={{ r: 5, strokeWidth: 2, stroke: SURFACE }} {...ANIM} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

/** Barras horizontales con valor directo. Un solo color: el título dice qué se mide. */
export function HBarChart({ data, valueLabel, format = "money", color = SERIES.orchid }: { data: Array<{ name: string; value: number; extra?: string }>; valueLabel: string; format?: "money" | "count"; color?: string }) {
  const fmt = format === "money" ? money : (v: number) => v.toLocaleString("es-PE");
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2.5" aria-label={valueLabel}>
      {data.map((d, i) => (
        <li key={d.name} className="grid grid-cols-[minmax(6rem,9.5rem)_1fr_auto] items-center gap-3 text-xs" title={d.extra ? `${d.name}: ${fmt(d.value)} · ${d.extra}` : undefined}>
          <span className="truncate font-medium text-ink-soft">{d.name}</span>
          <span className="h-4 overflow-hidden rounded-r-[4px] bg-sand/60">
            <span className="grow-x block h-full rounded-r-[4px]" style={{ width: `${(d.value / max) * 100}%`, background: color, animationDelay: `${i * 60}ms` }} />
          </span>
          <span className="w-16 text-right font-semibold tabular-nums">{fmt(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Ingresos por semana apilados por línea de negocio. */
export function StackedWeeks({ data }: { data: Array<{ week: string; salon: number; spa: number; retail: number }> }) {
  return (
    <ChartFrame
      label="Ingresos semanales por línea de negocio"
      legend={<Legend items={[{ label: "Salón", color: SERIES.orchid }, { label: "Spa", color: SERIES.violet }, { label: "Tienda", color: SERIES.coral }]} />}
      table={{ head: ["Semana", "Salón", "Spa", "Tienda"], rows: data.map((d) => [shortDate(d.week), money(d.salon), money(d.spa), money(d.retail)]) }}
    >
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="week" tickFormatter={shortDate} {...axis} minTickGap={18} />
            <YAxis tickFormatter={moneyShort} {...axis} width={38} />
            <Tooltip
              cursor={{ fill: "#f8efe7", opacity: 0.7 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as { week: string; salon: number; spa: number; retail: number } | undefined;
                return active && p ? (
                  <TipBox title={`Semana del ${shortDate(p.week)}`} rows={[{ label: "Salón", value: money(p.salon), color: SERIES.orchid }, { label: "Spa", value: money(p.spa), color: SERIES.violet }, { label: "Tienda", value: money(p.retail), color: SERIES.coral }, { label: "Total", value: money(p.salon + p.spa + p.retail) }]} />
                ) : null;
              }}
            />
            <Bar dataKey="salon" stackId="a" fill={SERIES.orchid} stroke={SURFACE} strokeWidth={2} maxBarSize={24} {...ANIM} />
            <Bar dataKey="spa" stackId="a" fill={SERIES.violet} stroke={SURFACE} strokeWidth={2} maxBarSize={24} {...ANIM} />
            <Bar dataKey="retail" stackId="a" fill={SERIES.coral} stroke={SURFACE} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={24} {...ANIM} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

/** Una tasa en el tiempo (no-show, WhatsApp, venta cruzada…). Valor grande y línea. */
export function RateLine({ data, label, color = SERIES.orchid, goodDirection }: { data: Array<{ week: string; value: number }>; label: string; color?: string; goodDirection?: "up" | "down" }) {
  // La última semana está incompleta: el titular usa la penúltima.
  const last = data.at(-2) ?? data.at(-1);
  const first = data[0];
  const change = last && first ? (last.value - first.value) * 100 : 0;
  const good = goodDirection === "up" ? change > 0 : change < 0;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="font-display text-4xl leading-none tabular-nums">{((last?.value ?? 0) * 100).toFixed(1)} %</p>
        {goodDirection ? (
          <p className={cn("text-xs font-semibold", Math.abs(change) < 0.2 ? "text-muted" : good ? "text-success" : "text-danger")}>
            {change > 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)} pts en {data.length} sem.
          </p>
        ) : null}
      </div>
      <div className="h-24 w-full" role="img" aria-label={label}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
            <YAxis hide domain={[0, "auto"]} />
            <XAxis dataKey="week" hide />
            <Tooltip
              cursor={{ stroke: INK, strokeOpacity: 0.15 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as { week: string; value: number } | undefined;
                return active && p ? <TipBox title={`Semana del ${shortDate(p.week)}`} rows={[{ label, value: `${(p.value * 100).toFixed(1)} %` }]} /> : null;
              }}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: SURFACE }} {...ANIM} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Mini línea para tablas y KPIs. */
export function Spark({ data, color = SERIES.orchid, label }: { data: number[]; color?: string; label: string }) {
  const id = useId();
  const rows = data.map((value, i) => ({ i, value }));
  return (
    <div className="h-9 w-24" role="img" aria-label={label}>
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ top: 3, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} {...ANIM} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Embudo: cada paso con el porcentaje que sobrevive respecto al anterior. */
export function Funnel({ steps }: { steps: Array<{ step: string; value: number; restart?: boolean }> }) {
  const max = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1]!.value : s.value;
        return (
          <li key={s.step} className="relative overflow-hidden rounded-xl bg-sand/50">
            <span className="grow-x absolute inset-y-0 left-0 rounded-xl bg-blush" style={{ width: `${(s.value / max) * 100}%`, animationDelay: `${i * 90}ms` }} aria-hidden />
            <div className="relative flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
              <span className="font-medium">{s.step}</span>
              <span className="flex items-baseline gap-2 tabular-nums">
                <strong className="text-sm font-semibold">{s.value.toLocaleString("es-PE")}</strong>
                {i && !s.restart ? <span className="text-ink-soft">{prev ? Math.round((s.value / prev) * 100) : 0} %</span> : null}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const ORCHID_RAMP = ["#fdeef4", "#f9d3e3", "#f0a9c8", "#de6fa2", "#c2337a", "#8d1c58"];
const rampIndex = (ratio: number) => Math.min(ORCHID_RAMP.length - 1, Math.floor(ratio * ORCHID_RAMP.length));

/** Retención por cohorte: secuencial en un solo tono, con el valor en cada celda. */
export function CohortTable({ cohorts }: { cohorts: Array<{ cohort: string; label: string; size: number; retention: Array<number | null> }> }) {
  const months = cohorts[0]?.retention.length ?? 0;
  const max = Math.max(0.01, ...cohorts.flatMap((c) => c.retention.slice(1).filter((v): v is number => v !== null)));
  return (
    <div className="overflow-x-auto" data-lenis-prevent>
      <table className="w-full min-w-[520px] border-separate border-spacing-[3px] text-xs">
        <caption className="sr-only">Porcentaje de clientes de cada mes que volvieron en los meses siguientes</caption>
        <thead>
          <tr className="text-muted">
            <th scope="col" className="px-1 text-left font-medium">Primera visita</th>
            <th scope="col" className="px-1 text-right font-medium">Clientes</th>
            {Array.from({ length: months - 1 }, (_, i) => (
              <th key={i} scope="col" className="font-medium">
                Mes +{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.cohort}>
              <th scope="row" className="px-1 text-left font-semibold capitalize">{c.label}</th>
              <td className="px-1 text-right tabular-nums">{c.size}</td>
              {c.retention.slice(1).map((v, i) =>
                v === null ? (
                  <td key={i} className="h-9 rounded-md bg-sand/40" />
                ) : (
                  <td key={i} className={cn("h-9 rounded-md text-center font-semibold tabular-nums", rampIndex(v / max) >= 3 ? "text-white" : "text-ink")} style={{ background: ORCHID_RAMP[rampIndex(v / max)] }}>
                    {Math.round(v * 100)} %
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Mapa de calor secuencial (un solo tono, de claro a oscuro). */
export function Heatmap({ data }: { data: number[][] }) {
  const max = Math.max(1, ...data.flat());
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div className="overflow-x-auto" data-lenis-prevent>
      <table className="w-full min-w-[520px] border-separate border-spacing-[3px] text-[11px]">
        <caption className="sr-only">Reservas por día de la semana y hora de inicio</caption>
        <thead>
          <tr>
            <th className="w-10" />
            {data[0]!.map((_, i) => (
              <th key={i} scope="col" className="font-normal text-muted">
                {i + 8}h
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.map((wd) => (
            <tr key={wd}>
              <th scope="row" className="pr-1 text-left font-medium text-ink-soft">
                {DAYS[wd]}
              </th>
              {data[wd]!.map((v, h) => {
                const idx = v === 0 ? -1 : rampIndex(v / max);
                return (
                  <td key={h} title={`${DAYS[wd]} ${h + 8}:00 — ${v} reservas`} className={cn("h-7 rounded-[6px] text-center tabular-nums transition-transform hover:scale-110", idx >= 3 ? "text-white" : "text-ink-soft")} style={{ background: idx < 0 ? "#fbf5f0" : ORCHID_RAMP[idx] }}>
                    {v > 0 && v / max > 0.6 ? v : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted">
        Menos
        {ORCHID_RAMP.map((s) => (
          <span key={s} className="h-2.5 w-4 rounded-sm" style={{ background: s }} />
        ))}
        Más
      </div>
    </div>
  );
}

/** Avance contra la meta del mes, con la marca de proyección. */
export function GoalMeter({ mtd, projected, goal, booked, day, days }: { mtd: number; projected: number; goal: number; booked: number; day: number; days: number }) {
  const scale = Math.max(goal, projected, 1);
  const hit = projected >= goal;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-5xl leading-none tabular-nums">{money(mtd / 100)}</p>
        <p className="text-xs text-muted">de {money(goal / 100)} · día {day} de {days}</p>
      </div>
      <div className="relative mt-5 h-3 rounded-full bg-sand" role="img" aria-label={`Vendido ${money(mtd / 100)} de una meta de ${money(goal / 100)}. Proyección ${money(projected / 100)}.`}>
        <span className="absolute inset-y-0 left-0 rounded-full bg-blush" style={{ width: `${(projected / scale) * 100}%` }} />
        <span className="grow-x absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-rose to-coral" style={{ width: `${(mtd / scale) * 100}%` }} />
        <span className="absolute -top-1 h-5 w-0.5 rounded bg-ink" style={{ left: `${(goal / scale) * 100}%` }} title="Meta" />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-muted">Proyección a fin de mes</dt>
          <dd className={cn("text-sm font-semibold tabular-nums", hit ? "text-success" : "text-warning")}>{money(projected / 100)} · {hit ? "llega a la meta" : `faltarían ${money((goal - projected) / 100)}`}</dd>
        </div>
        <div>
          <dt className="text-muted">Ya reservado para este mes</dt>
          <dd className="text-sm font-semibold tabular-nums">{money(booked / 100)}</dd>
        </div>
      </dl>
    </div>
  );
}
