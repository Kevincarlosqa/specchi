"use client";

import { useState, useTransition } from "react";
import { LogIn, LogOut, Pencil } from "lucide-react";
import { checkIn, checkOut, updateCommission } from "@/app/dashboard/business-actions";
import { cn } from "@/lib/utils";
import { inputClass } from "./ui";

export function AttendanceButton({ stylistId, branchId, open, done, checkInLabel }: { stylistId: string; branchId: string; open: boolean; done: boolean; checkInLabel: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  if (done) return <span className="rounded-full bg-sand px-2 py-1 text-[11px] font-semibold text-ink-soft">Salió · entró {checkInLabel}</span>;
  return (
    <>
      <button
        disabled={pending}
        title={error || undefined}
        onClick={() =>
          start(async () => {
            const r = open ? await checkOut(stylistId) : await checkIn(stylistId, branchId);
            setError(r.ok ? "" : r.error);
          })
        }
        className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50", open ? "bg-[#d9f2ec] text-[#0b5f53] hover:bg-[#c3e9e0]" : "border border-line hover:bg-sand")}
      >
        {open ? <LogOut className="h-3 w-3" aria-hidden /> : <LogIn className="h-3 w-3" aria-hidden />}
        {open ? `En sede desde ${checkInLabel}` : "Marcar entrada"}
      </button>
      {error ? <span role="alert" className="text-[11px] text-danger">{error}</span> : null}
    </>
  );
}

export function CommissionEditor({ stylistId, commissionPct, retailPct }: { stylistId: string; commissionPct: number; retailPct: number }) {
  const [editing, setEditing] = useState(false);
  const [a, setA] = useState(String(commissionPct));
  const [b, setB] = useState(String(retailPct));
  const [pending, start] = useTransition();
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs text-muted tabular-nums hover:text-ink" aria-label="Editar tarifa de comisión">
        {commissionPct} % / {retailPct} % <Pencil className="h-3 w-3" aria-hidden />
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input value={a} onChange={(e) => setA(e.target.value)} aria-label="Comisión por servicios (%)" className={cn(inputClass, "h-7 w-12 px-1 text-center text-xs")} />
      <input value={b} onChange={(e) => setB(e.target.value)} aria-label="Comisión por tienda (%)" className={cn(inputClass, "h-7 w-12 px-1 text-center text-xs")} />
      <button
        disabled={pending}
        className="rounded-full bg-ink px-2 py-1 text-[11px] font-semibold text-paper"
        onClick={() =>
          start(async () => {
            const r = await updateCommission(stylistId, Number(a), Number(b));
            if (r.ok) setEditing(false);
          })
        }
      >
        OK
      </button>
    </span>
  );
}
