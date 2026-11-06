"use client";

import { useState, useTransition } from "react";
import { addCustomField, saveCustomFields } from "@/app/dashboard/business-actions";
import { cn } from "@/lib/utils";
import { Button, Field, inputClass } from "./ui";

interface Def {
  key: string;
  label: string;
  type: "TEXT" | "BOOLEAN" | "SELECT";
  options: string[];
  sensitive: boolean;
}

/** Ficha configurable: preferencias e historia de salud del cliente. */
export function CustomFieldsEditor({ customerId, defs, values }: { customerId: string; defs: Def[]; values: Record<string, string | boolean> }) {
  const [state, setState] = useState(values);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  const set = (k: string, v: string | boolean) => setState((s) => ({ ...s, [k]: v }));
  const render = (d: Def) => {
    const id = `cf-${d.key}`;
    if (d.type === "BOOLEAN") {
      return (
        <label key={d.key} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={state[d.key] === true} onChange={(e) => set(d.key, e.target.checked)} className="h-4 w-4 accent-rose" /> {d.label}
        </label>
      );
    }
    return (
      <Field key={d.key} label={d.label} htmlFor={id}>
        {d.type === "SELECT" ? (
          <select id={id} value={String(state[d.key] ?? "")} onChange={(e) => set(d.key, e.target.value)} className={inputClass}>
            <option value="">Sin definir</option>
            {d.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : (
          <input id={id} value={String(state[d.key] ?? "")} onChange={(e) => set(d.key, e.target.value)} className={inputClass} />
        )}
      </Field>
    );
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">{defs.filter((d) => !d.sensitive).map(render)}</div>
      <div className="rounded-2xl border border-rose/25 bg-blush/30 p-3">
        <p className="mb-2 text-xs font-semibold text-rose-deep">Historia de salud · uso interno</p>
        <div className="grid gap-3 sm:grid-cols-2">{defs.filter((d) => d.sensitive).map(render)}</div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveCustomFields(customerId, state);
              setStatus(r.ok ? (r.message ?? "") : r.error);
            })
          }
        >
          Guardar ficha
        </Button>
        {status ? <p role="status" className="text-sm text-ink-soft">{status}</p> : null}
      </div>
    </div>
  );
}

export function CustomFieldForm() {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<Def["type"]>("TEXT");
  const [options, setOptions] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nuevo campo (ej. Talla de bata)" aria-label="Nombre del campo" className={cn(inputClass, "min-w-40 flex-1")} />
        <select value={type} onChange={(e) => setType(e.target.value as Def["type"])} aria-label="Tipo de campo" className={cn(inputClass, "w-32")}>
          <option value="TEXT">Texto</option>
          <option value="SELECT">Opciones</option>
          <option value="BOOLEAN">Sí / No</option>
        </select>
      </div>
      {type === "SELECT" ? <input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Opciones separadas por comas" aria-label="Opciones" className={inputClass} /> : null}
      <label className="flex items-center gap-2 text-xs text-ink-soft">
        <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} className="accent-rose" /> Es un dato de salud
      </label>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending || !label.trim()}
          onClick={() =>
            start(async () => {
              const r = await addCustomField(label, type, options, sensitive);
              setStatus(r.ok ? (r.message ?? "") : r.error);
              if (r.ok) {
                setLabel("");
                setOptions("");
              }
            })
          }
        >
          Agregar campo
        </Button>
        {status ? <p role="status" className="text-xs text-ink-soft">{status}</p> : null}
      </div>
    </div>
  );
}
