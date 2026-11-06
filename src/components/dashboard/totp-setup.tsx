"use client";

/* eslint-disable @next/next/no-img-element -- el QR es un data URL generado al momento */
import { useState, useTransition } from "react";
import { confirmTotp, disableTotp, startTotp } from "@/app/dashboard/business-actions";
import { cn } from "@/lib/utils";
import { Badge, Button, inputClass } from "./ui";

export function TotpSetup({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (enabled) {
    return (
      <div className="space-y-3">
        <Badge className="bg-[#d9f2ec] text-[#0b5f53]">Activa en tu cuenta</Badge>
        <p className="text-sm text-muted">Para desactivarla, escribe un código de tu app.</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="000 000" aria-label="Código de 6 dígitos" className={cn(inputClass, "tabular-nums")} />
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await disableTotp(code);
                setError(r.ok ? "" : r.error);
                setCode("");
              })
            }
          >
            Desactivar
          </Button>
        </div>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      </div>
    );
  }
  if (!setup) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Además de tu contraseña, te pedirá un código de tu celular al entrar.</p>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await startTotp();
              if (r.ok && r.data) setSetup(r.data);
              else if (!r.ok) setError(r.error);
            })
          }
        >
          Activar
        </Button>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm">Escanea este código con tu app y escribe los 6 dígitos que aparecen.</p>
      <img src={setup.qr} alt="Código QR para la app de autenticación" width={180} height={180} className="rounded-2xl border border-line" />
      <p className="text-xs break-all text-muted">Clave manual: <code className="font-mono">{setup.secret}</code></p>
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="000 000" aria-label="Código de 6 dígitos" className={cn(inputClass, "tabular-nums")} />
        <Button
          disabled={pending || code.length < 6}
          onClick={() =>
            start(async () => {
              const r = await confirmTotp(code);
              if (r.ok) setSetup(null);
              else setError(r.error);
              setCode("");
            })
          }
        >
          Confirmar
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
