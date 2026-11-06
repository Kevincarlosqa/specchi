"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Banknote, CalendarCheck, Check, CreditCard, Gift, Minus, Package, Plus, QrCode, Receipt, Search, Send, Smartphone, Sparkles, Trash2, X } from "lucide-react";
import { addCashMovement, chargeSale, closeCash, openCash, searchCustomers, voidSale } from "@/app/dashboard/business-actions";
import type { DocType, PaymentMethod } from "@/generated/prisma/enums";
import { CATEGORY_LABELS, DOC_LABELS, PAYMENT_LABELS } from "@/lib/labels";
import { cn, formatMoney } from "@/lib/utils";
import { Badge, Button, Card, CardTitle, DemoNote, EmptyState, Field, inputClass } from "./ui";

type Customer = { id: string; name: string | null; phone: string; loyaltyPoints: number; allergies: string | null };
interface Line {
  key: string;
  kind: "SERVICE" | "PRODUCT" | "GIFT_CARD";
  serviceId?: string;
  productId?: string;
  stylistId?: string;
  amountCents?: number;
  name: string;
  unitCents: number;
  qty: number;
  max?: number;
}
interface Props {
  branchId: string;
  branches: Array<{ id: string; name: string }>;
  canSwitch: boolean;
  canVoid: boolean;
  demo: boolean;
  pointValueCents: number;
  session: { id: string; openedBy: string; openedAt: string; openingCents: number; expectedCents: number; movements: Array<{ id: string; kind: "IN" | "OUT"; amountCents: number; reason: string; at: string }> } | null;
  services: Array<{ id: string; name: string; priceCents: number; category: keyof typeof CATEGORY_LABELS }>;
  products: Array<{ id: string; name: string; priceCents: number; qty: number }>;
  stylists: Array<{ id: string; name: string }>;
  due: Array<{ id: string; code: string; at: string; status: string; depositCents: number; customer: Customer; items: Array<{ serviceId: string; stylistId: string; name: string; priceCents: number; stylistName: string }> }>;
  sales: Array<{ id: string; docNumber: string; status: string; method: PaymentMethod; totalCents: number; at: string; who: string; what: string }>;
  totals: { count: number; totalCents: number; tipCents: number; byMethod: Record<string, number> };
}

const METHODS: Array<{ key: PaymentMethod; icon: typeof CreditCard }> = [
  { key: "CARD", icon: CreditCard },
  { key: "YAPE", icon: QrCode },
  { key: "PLIN", icon: Smartphone },
  { key: "CASH", icon: Banknote },
  { key: "TRANSFER", icon: Send },
  { key: "GIFT_CARD", icon: Gift },
];
type Receipt = { docNumber: string; docType: DocType; totalCents: number; discountCents: number; tipCents: number; subtotalCents: number; method: PaymentMethod; pointsEarned: number; points: number; customerName: string | null; customerPhone: string | null; branchName: string; items: Array<{ name: string; qty: number; totalCents: number }>; issuedGiftCards: string[] };

function CashOpen({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [amount, setAmount] = useState("300");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card className="mx-auto max-w-md text-center">
      <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blush text-rose">
        <Banknote className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="font-display text-3xl">Abre la caja de {branchName}</h2>
      <p className="mt-1 mb-4 text-sm text-muted">Indica con cuánto efectivo empieza el día.</p>
      <div className="flex gap-2">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label="Efectivo inicial en soles" className={inputClass} />
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await openCash(branchId, Number(amount));
              if (!r.ok) setError(r.error);
            })
          }
        >
          Abrir caja
        </Button>
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-danger">{error}</p> : null}
    </Card>
  );
}

export function CashDesk(p: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"citas" | "servicios" | "productos" | "gift">(p.due.length ? "citas" : "servicios");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cq, setCq] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [discount, setDiscount] = useState("");
  const [tip, setTip] = useState("");
  const [points, setPoints] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("YAPE");
  const [docType, setDocType] = useState<DocType>("BOLETA");
  const [giftCode, setGiftCode] = useState("");
  const [giftAmount, setGiftAmount] = useState("200");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [closing, setClosing] = useState(false);
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [closed, setClosed] = useState<{ expected: number; counted: number } | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveKind, setMoveKind] = useState<"IN" | "OUT">("OUT");
  const [moveAmount, setMoveAmount] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [pending, start] = useTransition();
  const branchName = p.branches.find((b) => b.id === p.branchId)?.name ?? "";

  useEffect(() => {
    if (cq.trim().length < 2) return;
    const t = setTimeout(() => {
      searchCustomers(cq).then(setResults).catch(() => setResults([]));
    }, 220);
    return () => clearTimeout(t);
  }, [cq]);

  const subtotal = cart.reduce((a, l) => a + l.unitCents * l.qty, 0);
  const manualDiscount = Math.round((Number(discount) || 0) * 100);
  const tipCents = Math.round((Number(tip) || 0) * 100);
  const pointsDiscount = points * p.pointValueCents;
  const total = Math.max(0, subtotal - manualDiscount - pointsDiscount) + tipCents;
  const dep = bookingId ? (p.due.find((d) => d.id === bookingId)?.depositCents ?? 0) : 0;

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const list = useMemo(() => {
    const term = norm(q);
    if (tab === "servicios") return p.services.filter((s) => norm(s.name).includes(term));
    if (tab === "productos") return p.products.filter((s) => norm(s.name).includes(term));
    return [];
  }, [p.services, p.products, q, tab]);

  const add = (line: Omit<Line, "key" | "qty">) =>
    setCart((c) => {
      const key = `${line.kind}:${line.serviceId ?? line.productId ?? line.amountCents}`;
      const found = c.find((l) => l.key === key);
      if (found) return c.map((l) => (l.key === key ? { ...l, qty: l.max ? Math.min(l.max, l.qty + 1) : l.qty + 1 } : l));
      return [...c, { ...line, key, qty: 1 }];
    });

  const loadBooking = (b: Props["due"][number]) => {
    setBookingId(b.id);
    setCustomer(b.customer);
    setCart(b.items.map((i) => ({ key: `SERVICE:${i.serviceId}`, kind: "SERVICE", serviceId: i.serviceId, stylistId: i.stylistId, name: i.name, unitCents: i.priceCents, qty: 1 })));
    setDiscount("");
  };

  const reset = () => {
    setCart([]);
    setBookingId(null);
    setCustomer(null);
    setCq("");
    setResults([]);
    setDiscount("");
    setTip("");
    setPoints(0);
    setGiftCode("");
    setError("");
  };

  const charge = () =>
    start(async () => {
      setError("");
      const r = await chargeSale({
        branchId: p.branchId,
        customerId: customer?.id,
        bookingId: bookingId ?? undefined,
        items: cart.map((l) => ({ kind: l.kind, serviceId: l.serviceId, productId: l.productId, stylistId: l.stylistId, amountCents: l.amountCents, qty: l.qty })),
        discountCents: manualDiscount,
        tipCents,
        redeemPoints: points,
        method,
        docType,
        giftCardCode: giftCode || undefined,
      });
      if (r.ok && r.data) {
        setReceipt(r.data as Receipt);
        reset();
      } else if (!r.ok) setError(r.error);
    });

  if (!p.session && !closed) {
    return <CashOpen key={p.branchId} branchId={p.branchId} branchName={branchName} />;
  }

  const waText = receipt
    ? `Hola ${receipt.customerName?.split(" ")[0] ?? ""} 💛 Gracias por tu visita a SPECCHi ${receipt.branchName}.\n\n${DOC_LABELS[receipt.docType]} ${receipt.docNumber}\n${receipt.items.map((i) => `• ${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}: ${formatMoney(i.totalCents)}`).join("\n")}\nTotal: ${formatMoney(receipt.totalCents)} (${PAYMENT_LABELS[receipt.method]})\n\n✨ Sumaste ${receipt.pointsEarned} puntos. Ahora tienes ${receipt.points}.`
    : "";

  return (
    <>
      {p.session ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-line bg-paper px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            <p className="text-sm font-semibold">Caja abierta · {branchName}</p>
          </div>
          <p className="text-xs text-muted">Desde las {p.session.openedAt} · {p.session.openedBy}</p>
          <dl className="ml-auto flex flex-wrap gap-6 text-right text-xs">
            <div>
              <dt className="text-muted">Ventas de hoy</dt>
              <dd className="text-sm font-semibold tabular-nums">{formatMoney(p.totals.totalCents)} <span className="font-normal text-muted">({p.totals.count})</span></dd>
            </div>
            <div>
              <dt className="text-muted">Efectivo esperado</dt>
              <dd className="text-sm font-semibold tabular-nums">{formatMoney(p.session.expectedCents)}</dd>
            </div>
          </dl>
          <div className="flex gap-2">
            {p.canSwitch ? (
              <select value={p.branchId} onChange={(e) => router.push(`/dashboard/caja?sede=${e.target.value}`)} aria-label="Sede de la caja" className={cn(inputClass, "h-8 w-40 text-xs")}>
                {p.branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => setMoveOpen(true)}>Ingreso / egreso</Button>
            <Button variant="secondary" size="sm" onClick={() => setClosing(true)}>Cerrar caja</Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex flex-wrap gap-1 rounded-full bg-sand p-1" role="tablist" aria-label="Qué vender">
              {([["citas", `Citas de hoy (${p.due.length})`, CalendarCheck], ["servicios", "Servicios", Sparkles], ["productos", "Tienda", Package], ["gift", "Gift card", Gift]] as const).map(([k, label, Icon]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors", tab === k ? "text-paper" : "text-ink-soft hover:text-ink")}>
                  {tab === k ? <motion.span layoutId="pos-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                  <Icon className="relative h-3.5 w-3.5" aria-hidden />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>

            {tab === "servicios" || tab === "productos" ? (
              <div className="relative mb-3">
                <Search className="absolute top-3 left-3 h-4 w-4 text-muted" aria-hidden />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "servicios" ? "Buscar servicio" : "Buscar producto o marca"} aria-label="Buscar" className={cn(inputClass, "pl-9")} />
              </div>
            ) : null}

            <div className="max-h-[420px] overflow-y-auto" data-lenis-prevent>
              {tab === "citas" ? (
                p.due.length ? (
                  <ul className="space-y-2">
                    {p.due.map((b) => (
                      <li key={b.id}>
                        <button onClick={() => loadBooking(b)} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors", bookingId === b.id ? "border-rose bg-blush/40" : "border-line hover:border-ink/30")}>
                          <span className="font-display text-2xl tabular-nums">{b.at}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{b.customer.name ?? b.customer.phone}</span>
                            <span className="block truncate text-xs text-muted">{b.items.map((i) => `${i.name} · ${i.stylistName}`).join(" + ")}</span>
                          </span>
                          {b.depositCents ? <Badge className="bg-[#d9f2ec] text-[#0b5f53]">Adelanto {formatMoney(b.depositCents)}</Badge> : null}
                          <span className="text-sm font-semibold tabular-nums">{formatMoney(b.items.reduce((a, i) => a + i.priceCents, 0))}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No quedan citas por cobrar hoy" />
                )
              ) : tab === "gift" ? (
                <div className="rounded-2xl border border-line p-4">
                  <Field label="Monto de la gift card (S/)" htmlFor="gift-amount">
                    <input id="gift-amount" value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} inputMode="decimal" className={inputClass} />
                  </Field>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[100, 200, 300, 500, 800].map((v) => (
                      <Button key={v} variant="secondary" size="sm" onClick={() => setGiftAmount(String(v))}>S/ {v}</Button>
                    ))}
                  </div>
                  <Button
                    className="mt-3"
                    onClick={() => {
                      const cents = Math.round((Number(giftAmount) || 0) * 100);
                      if (cents >= 1000) add({ kind: "GIFT_CARD", name: `Gift card ${formatMoney(cents)}`, unitCents: cents, amountCents: cents });
                    }}
                  >
                    <Plus className="h-4 w-4" aria-hidden /> Agregar al carrito
                  </Button>
                </div>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {tab === "servicios"
                    ? (list as Props["services"]).map((s) => (
                        <li key={s.id}>
                          <button onClick={() => add({ kind: "SERVICE", serviceId: s.id, stylistId: p.stylists[0]?.id, name: s.name, unitCents: s.priceCents })} className="flex h-full w-full items-center justify-between gap-2 rounded-2xl border border-line p-3 text-left transition-all hover:-translate-y-0.5 hover:border-rose/50">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{s.name}</span>
                              <span className="text-[11px] text-muted">{CATEGORY_LABELS[s.category]}</span>
                            </span>
                            <span className="text-sm font-semibold tabular-nums">{formatMoney(s.priceCents)}</span>
                          </button>
                        </li>
                      ))
                    : (list as Props["products"]).map((s) => (
                        <li key={s.id}>
                          <button disabled={s.qty === 0} onClick={() => add({ kind: "PRODUCT", productId: s.id, name: s.name, unitCents: s.priceCents, max: s.qty })} className="flex h-full w-full items-center justify-between gap-2 rounded-2xl border border-line p-3 text-left transition-all hover:-translate-y-0.5 hover:border-rose/50 disabled:opacity-50 disabled:hover:translate-y-0">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{s.name}</span>
                              <span className={cn("text-[11px]", s.qty === 0 ? "font-semibold text-danger" : s.qty < 4 ? "font-semibold text-warning" : "text-muted")}>{s.qty === 0 ? "Agotado" : `${s.qty} en stock`}</span>
                            </span>
                            <span className="text-sm font-semibold tabular-nums">{formatMoney(s.priceCents)}</span>
                          </button>
                        </li>
                      ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle hint={`${Object.entries(p.totals.byMethod).map(([k, v]) => `${PAYMENT_LABELS[k as PaymentMethod]} ${formatMoney(v)}`).join(" · ") || "Sin ventas todavía"}`}>Ventas de hoy</CardTitle>
            {p.sales.length ? (
              <ul className="max-h-72 divide-y divide-line overflow-y-auto" data-lenis-prevent>
                {p.sales.map((s) => (
                  <li key={s.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2 text-sm", s.status === "VOIDED" && "opacity-50 line-through")}>
                    <span className="w-12 text-xs text-muted tabular-nums">{s.at}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{s.who}</span>
                      <span className="block truncate text-xs text-muted">{s.docNumber} · {s.what}</span>
                    </span>
                    <Badge>{PAYMENT_LABELS[s.method]}</Badge>
                    <span className="w-20 text-right font-semibold tabular-nums">{formatMoney(s.totalCents)}</span>
                    {p.canVoid && s.status === "PAID" ? (
                      <button
                        className="rounded-full p-1 text-muted hover:bg-sand hover:text-danger"
                        aria-label={`Anular ${s.docNumber}`}
                        onClick={() => {
                          const reason = prompt("Motivo de la anulación");
                          if (reason) start(async () => void (await voidSale(s.id, reason)));
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Aún no hay ventas hoy en esta sede.</p>
            )}
          </Card>
        </div>

        {/* Carrito */}
        <Card className="self-start xl:sticky xl:top-6">
          <CardTitle action={cart.length ? <button onClick={reset} className="text-xs font-semibold text-muted hover:text-danger">Vaciar</button> : null}>Venta</CardTitle>

          {customer ? (
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-blush/50 p-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{customer.name ?? customer.phone}</span>
                <span className="text-xs text-ink-soft">{customer.loyaltyPoints.toLocaleString("es-PE")} puntos</span>
                {customer.allergies ? <span className="block text-xs font-semibold text-danger">Alergia: {customer.allergies}</span> : null}
              </span>
              <button onClick={() => { setCustomer(null); setPoints(0); }} aria-label="Quitar cliente" className="rounded-full p-1 hover:bg-paper"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="relative mb-3">
              <input value={cq} onChange={(e) => { setCq(e.target.value); if (e.target.value.trim().length < 2) setResults([]); }} placeholder="Buscar cliente (nombre o celular)" aria-label="Buscar cliente" className={inputClass} />
              {results.length ? (
                <ul className="absolute inset-x-0 top-11 z-20 overflow-hidden rounded-2xl border border-line bg-paper shadow-xl">
                  {results.map((c) => (
                    <li key={c.id}>
                      <button className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-sand" onClick={() => { setCustomer(c); setResults([]); setCq(""); }}>
                        <span className="truncate">{c.name ?? "Sin nombre"}</span>
                        <span className="text-xs text-muted tabular-nums">{c.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          {cart.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">Elige una cita, un servicio o un producto.</p>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {cart.map((l) => (
                  <motion.li key={l.key} layout initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18, height: 0 }} className="rounded-2xl border border-line p-2.5">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 text-sm leading-tight font-medium">{l.name}</p>
                      <p className="text-sm font-semibold tabular-nums">{formatMoney(l.unitCents * l.qty)}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-full border border-line">
                        <button aria-label="Quitar uno" className="p-1.5" onClick={() => setCart((c) => c.flatMap((x) => (x.key !== l.key ? [x] : x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : [])))}>
                          {l.qty > 1 ? <Minus className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                        </button>
                        <span className="w-5 text-center text-xs font-semibold tabular-nums">{l.qty}</span>
                        <button aria-label="Agregar uno" className="p-1.5 disabled:opacity-30" disabled={l.max !== undefined && l.qty >= l.max} onClick={() => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, qty: x.qty + 1 } : x)))}>
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      {l.kind !== "GIFT_CARD" ? (
                        <select value={l.stylistId ?? ""} onChange={(e) => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, stylistId: e.target.value || undefined } : x)))} aria-label={`Quién atendió ${l.name}`} className="h-7 min-w-0 flex-1 rounded-full border border-line bg-paper px-2 text-[11px]">
                          <option value="">Sin comisión</option>
                          {p.stylists.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Descuento (S/)" htmlFor="pos-discount">
              <input id="pos-discount" value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" placeholder="0.00" className={inputClass} />
            </Field>
            <Field label="Propina (S/)" htmlFor="pos-tip">
              <input id="pos-tip" value={tip} onChange={(e) => setTip(e.target.value)} inputMode="decimal" placeholder="0.00" className={inputClass} />
            </Field>
          </div>

          {customer && customer.loyaltyPoints >= 100 ? (
            <label className="mt-3 block rounded-2xl bg-butter/50 p-3 text-xs">
              <span className="flex justify-between font-semibold">
                <span>Canjear puntos</span>
                <span className="tabular-nums">{points} pts = {formatMoney(pointsDiscount)}</span>
              </span>
              <input type="range" min={0} max={Math.min(customer.loyaltyPoints, Math.floor(subtotal / p.pointValueCents))} step={100} value={points} onChange={(e) => setPoints(Number(e.target.value))} className="mt-2 w-full accent-rose" />
            </label>
          ) : null}

          <fieldset className="mt-3">
            <legend className="mb-1.5 text-xs font-medium text-ink-soft">Medio de pago</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {METHODS.map(({ key, icon: Icon }) => (
                <button key={key} type="button" aria-pressed={method === key} onClick={() => setMethod(key)} className={cn("flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-semibold transition-all", method === key ? "border-ink bg-ink text-paper" : "border-line hover:border-ink/40")}>
                  <Icon className="h-4 w-4" aria-hidden /> {PAYMENT_LABELS[key]}
                </button>
              ))}
            </div>
          </fieldset>
          {method === "GIFT_CARD" ? <input value={giftCode} onChange={(e) => setGiftCode(e.target.value)} placeholder="Código GIFT-XXXXXX" aria-label="Código de gift card" className={cn(inputClass, "mt-2 uppercase")} /> : null}

          <div className="mt-3 flex gap-1 rounded-full bg-sand p-1">
            {(Object.keys(DOC_LABELS) as DocType[]).map((d) => (
              <button key={d} aria-pressed={docType === d} onClick={() => setDocType(d)} className={cn("flex-1 rounded-full py-1.5 text-[11px] font-semibold transition-colors", docType === d ? "bg-paper shadow-sm" : "text-ink-soft")}>
                {DOC_LABELS[d]}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
            <span className="text-sm text-muted">Total</span>
            <motion.span key={total} initial={{ scale: 1.08 }} animate={{ scale: 1 }} className="font-display text-5xl leading-none tabular-nums">
              {formatMoney(total)}
            </motion.span>
          </div>
          {dep ? (
            <p className="mt-2 flex justify-between rounded-xl bg-[#d9f2ec] px-3 py-2 text-xs font-semibold text-[#0b5f53]">
              <span>Adelanto ya pagado</span>
              <span className="tabular-nums">−{formatMoney(Math.min(dep, total))}</span>
            </p>
          ) : null}
          {error ? <p role="alert" className="mt-2 rounded-xl bg-[#fbdfe2] px-3 py-2 text-sm text-[#96202f]">{error}</p> : null}
          <Button variant="rose" className="mt-3 h-12 w-full text-base" disabled={!cart.length || pending || !p.session} onClick={charge}>
            {pending ? "Cobrando…" : `Cobrar ${formatMoney(Math.max(0, total - dep))}`}
          </Button>
          {p.demo ? <DemoNote className="mt-3">El comprobante y el cobro son simulados. En producción se conectan a un proveedor autorizado por SUNAT y a la pasarela que elijan.</DemoNote> : null}
        </Card>
      </div>

      {/* Comprobante */}
      <AnimatePresence>
        {receipt ? (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-plum/40 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Comprobante">
            <motion.div initial={{ y: 60, rotate: -2, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-paper shadow-2xl">
              <div className="bg-linear-to-br from-rose via-coral to-violet px-6 py-6 text-center text-white">
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.15, stiffness: 320, damping: 16 }} className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white text-rose">
                  <Check className="h-6 w-6" aria-hidden />
                </motion.span>
                <p className="font-display text-4xl leading-none tabular-nums">{formatMoney(receipt.totalCents)}</p>
                <p className="mt-1 text-sm opacity-90">Pagado con {PAYMENT_LABELS[receipt.method]}</p>
              </div>
              <div className="space-y-3 p-6 text-sm">
                <p className="flex items-center justify-between font-semibold"><span className="inline-flex items-center gap-1.5"><Receipt className="h-4 w-4 text-rose" aria-hidden /> {DOC_LABELS[receipt.docType]}</span><span className="tabular-nums">{receipt.docNumber}</span></p>
                <ul className="space-y-1 border-y border-dashed border-line py-3 text-xs">
                  {receipt.items.map((i, n) => (
                    <li key={n} className="flex justify-between gap-2"><span>{i.name}{i.qty > 1 ? ` ×${i.qty}` : ""}</span><span className="tabular-nums">{formatMoney(i.totalCents)}</span></li>
                  ))}
                  {receipt.discountCents ? <li className="flex justify-between text-success"><span>Descuento</span><span className="tabular-nums">−{formatMoney(receipt.discountCents)}</span></li> : null}
                  {receipt.tipCents ? <li className="flex justify-between"><span>Propina</span><span className="tabular-nums">{formatMoney(receipt.tipCents)}</span></li> : null}
                </ul>
                {receipt.pointsEarned ? <p className="rounded-2xl bg-butter/50 px-3 py-2 text-xs"><strong>+{receipt.pointsEarned} puntos</strong> para {receipt.customerName?.split(" ")[0]}. Saldo: {receipt.points.toLocaleString("es-PE")}.</p> : null}
                {receipt.issuedGiftCards.length ? <p className="rounded-2xl bg-lilac/30 px-3 py-2 text-xs">Gift card emitida: <strong className="font-mono">{receipt.issuedGiftCards.join(", ")}</strong></p> : null}
                <div className="flex gap-2">
                  {receipt.customerPhone ? (
                    <a href={`https://wa.me/${receipt.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-success text-sm font-semibold text-white">
                      <Send className="h-4 w-4" aria-hidden /> Enviar por WhatsApp
                    </a>
                  ) : null}
                  <Button variant="secondary" className="flex-1" onClick={() => setReceipt(null)}>Listo</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Movimiento de caja */}
      <AnimatePresence>
        {moveOpen && p.session ? (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-plum/40 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Ingreso o egreso">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-[2rem] bg-paper p-6">
              <h2 className="mb-3 font-display text-3xl">Movimiento de caja</h2>
              <div className="mb-3 flex gap-1 rounded-full bg-sand p-1">
                {(["OUT", "IN"] as const).map((k) => (
                  <button key={k} onClick={() => setMoveKind(k)} aria-pressed={moveKind === k} className={cn("flex-1 rounded-full py-1.5 text-xs font-semibold", moveKind === k ? "bg-paper shadow-sm" : "text-ink-soft")}>{k === "OUT" ? "Egreso" : "Ingreso"}</button>
                ))}
              </div>
              <div className="space-y-3">
                <input value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} placeholder="Monto en soles" inputMode="decimal" aria-label="Monto" className={inputClass} />
                <input value={moveReason} onChange={(e) => setMoveReason(e.target.value)} placeholder="Motivo" aria-label="Motivo" className={inputClass} />
              </div>
              {p.session.movements.length ? (
                <ul className="mt-3 max-h-28 space-y-1 overflow-y-auto text-xs text-muted" data-lenis-prevent>
                  {p.session.movements.map((m) => (
                    <li key={m.id} className="flex justify-between gap-2"><span>{m.at} · {m.reason}</span><span className="tabular-nums">{m.kind === "IN" ? "+" : "−"}{formatMoney(m.amountCents)}</span></li>
                  ))}
                </ul>
              ) : null}
              {error ? <p role="alert" className="mt-2 text-sm text-danger">{error}</p> : null}
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setMoveOpen(false)}>Cancelar</Button>
                <Button
                  className="flex-1"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await addCashMovement(p.session!.id, moveKind, Number(moveAmount), moveReason);
                      if (r.ok) {
                        setMoveOpen(false);
                        setMoveAmount("");
                        setMoveReason("");
                        setError("");
                      } else setError(r.error);
                    })
                  }
                >
                  Registrar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Cierre */}
      <AnimatePresence>
        {closing ? (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-plum/40 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Cerrar caja">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-[2rem] bg-paper p-6">
              {closed ? (
                <>
                  <h2 className="font-display text-3xl">Caja cerrada</h2>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-muted">Esperado</dt><dd className="font-semibold tabular-nums">{formatMoney(closed.expected)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Contado</dt><dd className="font-semibold tabular-nums">{formatMoney(closed.counted)}</dd></div>
                    <div className={cn("flex justify-between rounded-xl px-3 py-2 font-semibold", closed.counted === closed.expected ? "bg-[#d9f2ec] text-[#0b5f53]" : "bg-[#fbdfe2] text-[#96202f]")}><dt>Diferencia</dt><dd className="tabular-nums">{formatMoney(closed.counted - closed.expected)}</dd></div>
                  </dl>
                  <Button className="mt-4 w-full" onClick={() => { setClosing(false); setClosed(null); }}>Listo</Button>
                </>
              ) : (
                <>
                  <h2 className="font-display text-3xl">Cerrar caja</h2>
                  <p className="mt-1 mb-4 text-sm text-muted">Cuenta el efectivo. El sistema calcula la diferencia contra lo esperado.</p>
                  <div className="space-y-3">
                    <input value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="Efectivo contado (S/)" inputMode="decimal" aria-label="Efectivo contado" className={inputClass} />
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" aria-label="Nota" className={inputClass} />
                  </div>
                  {error ? <p role="alert" className="mt-2 text-sm text-danger">{error}</p> : null}
                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => setClosing(false)}>Cancelar</Button>
                    <Button
                      className="flex-1"
                      disabled={pending || counted === ""}
                      onClick={() =>
                        start(async () => {
                          const r = await closeCash(p.session!.id, Number(counted), note);
                          if (r.ok && r.data) setClosed(r.data);
                          else if (!r.ok) setError(r.error);
                        })
                      }
                    >
                      Cerrar
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
