"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { checkGiftCard, redeemPackageSession } from "@/app/dashboard/business-actions";
import { cn, formatMoney } from "@/lib/utils";
import { Button, inputClass } from "./ui";

export function UsePackageButton({ id, disabled }: { id: string; disabled: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            const r = await redeemPackageSession(id);
            setError(r.ok ? "" : r.error);
          })
        }
      >
        {disabled ? "Completado" : "Usar sesión"}
      </Button>
      {error ? <span role="alert" className="text-xs text-danger">{error}</span> : null}
    </>
  );
}

export function GiftLookup() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const g = await checkGiftCard(code);
          setResult(g ? (g.status === "ACTIVE" ? `Saldo ${formatMoney(g.balanceCents)}` : "Ya fue usada") : "No existe");
        });
      }}
    >
      {result ? <span role="status" className="text-xs font-semibold">{result}</span> : null}
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="GIFT-XXXXXX" aria-label="Código de gift card" className={cn(inputClass, "h-8 w-32 text-xs uppercase")} />
      <Button size="sm" variant="secondary" disabled={pending || !code} aria-label="Consultar saldo"><Search className="h-3.5 w-3.5" /></Button>
    </form>
  );
}
