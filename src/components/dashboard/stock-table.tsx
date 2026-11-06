"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Minus, Plus, Search } from "lucide-react";
import { adjustStock } from "@/app/dashboard/business-actions";
import { cn, formatMoney } from "@/lib/utils";
import { Badge, Button, Card, inputClass } from "./ui";

interface Row {
  productId: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  priceCents: number;
  costCents: number;
  qty: number;
  minQty: number;
  sold30: number;
  daysLeft: number | null;
}

export function StockTable({ rows, branchId, initialLow }: { rows: Row[]; branchId: string; initialLow: boolean }) {
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(initialLow);
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState("6");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const term = q.toLowerCase();
  const list = rows.filter((r) => (!onlyLow || r.qty < r.minQty) && `${r.brand} ${r.name} ${r.sku}`.toLowerCase().includes(term));

  const apply = (productId: string, delta: number, kind: "RESTOCK" | "ADJUST") =>
    start(async () => {
      const r = await adjustStock(productId, branchId, delta, kind, kind === "RESTOCK" ? "Reposición" : "Ajuste manual");
      if (r.ok) {
        setEditing(null);
        setError("");
      } else setError(r.error);
    });

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute top-3 left-3 h-4 w-4 text-muted" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Producto, marca o SKU" aria-label="Buscar producto" className={cn(inputClass, "pl-9")} />
        </div>
        <Button variant={onlyLow ? "primary" : "secondary"} size="sm" aria-pressed={onlyLow} onClick={() => setOnlyLow((v) => !v)}>
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Stock bajo
        </Button>
      </div>
      {error ? <p role="alert" className="mb-2 text-sm text-danger">{error}</p> : null}
      <div className="overflow-x-auto" data-lenis-prevent>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2 font-medium">Producto</th>
              <th className="py-2 text-right font-medium">Precio</th>
              <th className="py-2 text-right font-medium">Margen</th>
              <th className="py-2 font-medium pl-5">Stock</th>
              <th className="py-2 text-right font-medium">Vendidos 30 d</th>
              <th className="py-2 text-right font-medium">Alcanza para</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const low = r.qty < r.minQty;
              const fill = Math.min(100, (r.qty / Math.max(r.minQty * 3, 1)) * 100);
              return (
                <tr key={r.productId} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 pr-3">
                    <p className="leading-tight font-medium">{r.name}</p>
                    <p className="text-xs text-muted">{r.brand} · {r.category}</p>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{formatMoney(r.priceCents)}</td>
                  <td className="py-2.5 text-right tabular-nums">{Math.round(((r.priceCents - r.costCents) / r.priceCents) * 100)} %</td>
                  <td className="py-2.5 pl-5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-sand" aria-hidden>
                        <div className={cn("h-full rounded-full", r.qty === 0 ? "bg-danger" : low ? "bg-coral" : "bg-teal")} style={{ width: `${fill}%` }} />
                      </div>
                      <span className="w-6 text-right font-semibold tabular-nums">{r.qty}</span>
                      {r.qty === 0 ? <Badge className="bg-[#fbdfe2] text-[#96202f]">Agotado</Badge> : low ? <Badge className="bg-butter text-[#6f4a06]">Bajo (mín. {r.minQty})</Badge> : null}
                    </div>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{r.sold30}</td>
                  <td className="py-2.5 text-right text-xs tabular-nums">{r.daysLeft === null ? "—" : `${r.daysLeft} días`}</td>
                  <td className="py-2.5 text-right">
                    {editing === r.productId ? (
                      <span className="inline-flex items-center gap-1">
                        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" aria-label={`Unidades de ${r.name}`} className={cn(inputClass, "h-8 w-14 px-2 text-center")} />
                        <button aria-label="Reponer" disabled={pending} onClick={() => apply(r.productId, Math.abs(Number(amount) || 0), "RESTOCK")} className="rounded-full bg-success p-1.5 text-white"><Plus className="h-3.5 w-3.5" /></button>
                        <button aria-label="Restar" disabled={pending} onClick={() => apply(r.productId, -Math.abs(Number(amount) || 0), "ADJUST")} className="rounded-full bg-sand p-1.5"><Minus className="h-3.5 w-3.5" /></button>
                      </span>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setEditing(r.productId)}>Ajustar</Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!list.length ? <p className="py-8 text-center text-sm text-muted">Nada por aquí con ese filtro.</p> : null}
    </Card>
  );
}
