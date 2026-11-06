import Link from "next/link";
import { AlertTriangle, ArrowRight, CircleAlert, TrendingUp } from "lucide-react";
import type { Insight } from "@/lib/insights";
import { formatMoney } from "@/lib/utils";

const TONE = {
  critical: { Icon: CircleAlert, label: "Urgente", cls: "bg-[#ffd8df] text-[#8a1730]" },
  warning: { Icon: AlertTriangle, label: "Atención", cls: "bg-butter text-[#6f4a06]" },
  opportunity: { Icon: TrendingUp, label: "Oportunidad", cls: "bg-[#c9efe7] text-[#0b5f53]" },
};

export function RadarList({ insights }: { insights: Insight[] }) {
  if (!insights.length) return <p className="text-sm text-paper/80">Todo en orden por ahora. Sin alertas.</p>;
  return (
    <ul className="space-y-2">
      {insights.map((i) => {
        const t = TONE[i.tone];
        return (
          <li key={i.id}>
            <Link href={i.href} className="group flex items-start gap-3 rounded-2xl bg-paper/[0.08] p-3 transition-colors hover:bg-paper/[0.16]">
              <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${t.cls}`}>
                <t.Icon className="h-3 w-3" aria-hidden /> {t.label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-snug font-semibold">{i.title}</span>
                <span className="mt-0.5 block text-xs text-paper/70">{i.detail}</span>
                {i.impactCents ? (
                  <span className="mt-1 block text-xs font-semibold text-peach">
                    ≈ {formatMoney(i.impactCents)} <span className="font-normal text-paper/60">· {i.impactNote}</span>
                  </span>
                ) : null}
              </span>
              <span className="hidden items-center gap-1 self-center text-xs font-semibold whitespace-nowrap sm:inline-flex">
                {i.cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
