"use client";

import { useState, useTransition } from "react";
import { MessageSquareReply } from "lucide-react";
import { replyReview } from "@/app/dashboard/business-actions";
import { cn } from "@/lib/utils";
import { Button, inputClass } from "./ui";

export function ReviewReply({ id, rating, name, reply }: { id: string; rating: number; name: string; reply: string | null }) {
  const suggestion = rating >= 4 ? `¡Gracias${name ? `, ${name}` : ""}! Nos alegra mucho que lo hayas disfrutado. Te esperamos pronto en SPECCHi 💛` : `Hola${name ? ` ${name}` : ""}, lamentamos que tu visita no haya sido como esperabas. Queremos hacerlo bien: ¿nos escribes por WhatsApp para resolverlo contigo?`;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(suggestion);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (reply) return <p className="mt-3 rounded-2xl bg-sand/70 px-3 py-2 text-xs text-ink-soft"><strong>Respuesta de SPECCHi:</strong> {reply}</p>;
  if (!open) {
    return (
      <Button variant={rating <= 3 ? "rose" : "secondary"} size="sm" className="mt-3" onClick={() => setOpen(true)}>
        <MessageSquareReply className="h-3.5 w-3.5" aria-hidden /> Responder
      </Button>
    );
  }
  return (
    <div className="mt-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} aria-label="Respuesta" className={cn(inputClass, "h-auto py-2")} />
      {error ? <p role="alert" className="mt-1 text-xs text-danger">{error}</p> : null}
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await replyReview(id, text);
              if (!r.ok) setError(r.error);
            })
          }
        >
          Publicar respuesta
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}
