"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Banknote, BarChart3, Bot, CalendarDays, Crown, Gauge, LineChart, ListChecks, LogOut, Megaphone, Menu, MessageCircle, Package, Search, Settings, ShieldCheck, Star, Users, UsersRound, X,
} from "lucide-react";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { logout } from "@/app/login/actions";
import { setBranch } from "@/app/dashboard/actions";

const ICONS = { gauge: Gauge, chart: BarChart3, line: LineChart, calendar: CalendarDays, list: ListChecks, users: Users, chat: MessageCircle, bot: Bot, settings: Settings, cash: Banknote, box: Package, team: UsersRound, megaphone: Megaphone, crown: Crown, star: Star, shield: ShieldCheck };

export type IconKey = keyof typeof ICONS;

interface NavItem {
  href: string;
  label: string;
  icon: IconKey;
  group: string;
}

interface Props {
  nav: NavItem[];
  user: { name: string; roleLabel: string };
  branches: Array<{ id: string; name: string }>;
  selected: string;
  canPickAll: boolean;
  unread: number;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Paleta de comandos (Ctrl/⌘ + K): ir a cualquier módulo sin usar el ratón. */
function CommandPalette({ nav, open, onClose }: { nav: NavItem[]; open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const actions = useMemo(
    () =>
      [
        ...nav.map((n) => ({ label: n.label, hint: n.group, href: n.href, icon: n.icon })),
        { label: "Cobrar una venta", hint: "Acción", href: "/dashboard/caja?nueva=1", icon: "cash" as IconKey },
        { label: "Nueva campaña de WhatsApp", hint: "Acción", href: "/dashboard/campanas?segment=ALL", icon: "megaphone" as IconKey },
        { label: "Clientes en riesgo", hint: "Acción", href: "/dashboard/campanas?segment=AT_RISK", icon: "users" as IconKey },
        { label: "Productos con stock bajo", hint: "Acción", href: "/dashboard/inventario?filter=low", icon: "box" as IconKey },
      ].filter((a) => nav.some((n) => a.href.split("?")[0] === n.href)),
    [nav],
  );
  const results = actions.filter((a) => norm(a.label + a.hint).includes(norm(q)));

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const go = (href: string) => {
    onClose();
    setQ("");
    setCursor(0);
    router.push(href);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[70] flex items-start justify-center bg-plum/35 p-4 pt-[14vh] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label="Buscar en el panel">
          <motion.div initial={{ y: 18, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 10, scale: 0.98, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 32 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_40px_90px_-30px_rgba(61,22,54,.6)]">
            <div className="flex items-center gap-2 border-b border-line px-4">
              <Search className="h-4 w-4 text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(results.length - 1, c + 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(0, c - 1));
                  }
                  if (e.key === "Enter" && results[cursor]) go(results[cursor]!.href);
                  if (e.key === "Escape") onClose();
                }}
                placeholder="¿A dónde quieres ir?"
                aria-label="Buscar módulo o acción"
                className="h-14 w-full bg-transparent text-sm focus:outline-none"
              />
              <kbd className="rounded-md border border-line px-1.5 text-[10px] text-muted">Esc</kbd>
            </div>
            <ul className="max-h-80 overflow-y-auto p-2" data-lenis-prevent>
              {results.map((a, i) => {
                const Icon = ICONS[a.icon];
                return (
                  <li key={a.href}>
                    <button type="button" onClick={() => go(a.href)} onMouseEnter={() => setCursor(i)} className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm", i === cursor && "bg-blush/60")}>
                      <Icon className="h-4 w-4 text-rose" aria-hidden />
                      <span className="flex-1 font-medium">{a.label}</span>
                      <span className="text-[11px] text-muted">{a.hint}</span>
                    </button>
                  </li>
                );
              })}
              {!results.length ? <li className="px-3 py-6 text-center text-sm text-muted">Nada con ese nombre.</li> : null}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function Sidebar({ nav, user, branches, selected, canPickAll, unread }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [pending, start] = useTransition();
  const reduced = useReducedMotion();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = [...new Set(nav.map((n) => n.group))];

  const content = (idPrefix: string) => (
    <div className="flex h-full flex-col gap-3 p-3.5">
      <Link href="/" className="flex items-center gap-2 px-2 pt-1 text-[13px] text-paper" aria-label="Ir a la web de SPECCHi">
        <Wordmark withMark />
      </Link>

      <div className="px-1">
        <label htmlFor={`${idPrefix}-branch`} className="mb-1 block text-[10px] font-semibold tracking-[0.2em] text-paper/60 uppercase">
          Sede
        </label>
        <select
          id={`${idPrefix}-branch`}
          value={selected}
          disabled={pending || (!canPickAll && branches.length <= 1)}
          onChange={(e) => start(() => setBranch(e.target.value))}
          className="h-10 w-full rounded-xl border border-paper/15 bg-paper/10 px-3 text-sm font-medium text-paper focus:border-peach focus:outline-none disabled:opacity-70 [&>option]:text-ink"
        >
          {canPickAll || branches.length > 1 ? <option value="all">{canPickAll ? "Todas las sedes" : "Mis sedes"}</option> : null}
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setPalette(true);
        }}
        className="mx-1 flex h-9 items-center gap-2 rounded-xl border border-paper/15 px-3 text-xs text-paper/75 transition-colors hover:bg-paper/10"
      >
        <Search className="h-3.5 w-3.5" /> Buscar
        <kbd className="ml-auto rounded border border-paper/20 px-1 text-[10px]">Ctrl K</kbd>
      </button>

      <nav aria-label="Secciones" className="-mr-2 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-2" data-lenis-prevent style={{ scrollbarWidth: "none" }}>
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-0.5 px-3 text-[10px] font-semibold tracking-[0.2em] text-paper/55 uppercase">{g}</p>
            <div className="flex flex-col gap-0.5">
              {nav
                .filter((n) => n.group === g)
                .map((item) => {
                  const Icon = ICONS[item.icon];
                  const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn("relative flex items-center gap-3 rounded-xl px-3 py-[0.3rem] text-[13.5px] transition-colors", active ? "font-semibold text-ink" : "text-paper/85 hover:bg-paper/10 hover:text-paper")}
                    >
                      {active ? <motion.span layoutId={`${idPrefix}-active`} className="absolute inset-0 rounded-xl bg-linear-to-r from-peach via-[#ffd3c2] to-blush" transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }} /> : null}
                      <Icon className="relative h-4 w-4" aria-hidden />
                      <span className="relative flex-1">{item.label}</span>
                      {item.icon === "chat" && unread > 0 ? <span className={cn("relative rounded-full px-1.5 text-[11px] font-semibold", active ? "bg-ink text-paper" : "bg-rose text-white")}>{unread}</span> : null}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 rounded-2xl bg-paper/10 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-paper">{user.name}</p>
          <p className="text-xs text-paper/65">{user.roleLabel}</p>
        </div>
        <form action={logout}>
          <button type="submit" className="rounded-lg p-2 text-paper/75 hover:bg-paper/15 hover:text-paper" aria-label="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );

  const shell = "bg-plum bg-[radial-gradient(120%_60%_at_0%_0%,#6b2559_0%,transparent_60%),radial-gradient(90%_40%_at_100%_100%,#7a2e6b_0%,transparent_65%)]";

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ivory/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-[13px]" aria-label="Inicio del panel">
          <LogoMark className="h-6 w-6 text-rose" title="" />
          <Wordmark />
        </Link>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-sand" aria-label="Abrir menú" aria-expanded={open}>
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <aside className={cn("sticky top-0 hidden h-dvh w-[17rem] shrink-0 lg:block", shell)}>{content("desk")}</aside>
      <AnimatePresence>
        {open ? (
          <motion.div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-plum/40" onClick={() => setOpen(false)} aria-label="Cerrar menú" />
            <motion.aside className={cn("absolute inset-y-0 left-0 w-72 shadow-xl", shell)} initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 340, damping: 34 }}>
              <button onClick={() => setOpen(false)} className="absolute top-4 right-3 rounded-lg p-2 text-paper hover:bg-paper/15" aria-label="Cerrar menú">
                <X className="h-5 w-5" />
              </button>
              {content("mob")}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <CommandPalette nav={nav} open={palette} onClose={() => setPalette(false)} />
    </>
  );
}
