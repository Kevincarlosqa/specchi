import type { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar, type IconKey } from "@/components/dashboard/sidebar";
import { Skeleton } from "@/components/dashboard/ui";
import { ROLE_LABELS, requireUser } from "@/lib/auth";
import { NAV, getSelectedBranch, visibleBranches } from "@/lib/dashboard";
import { db } from "@/lib/prisma";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel SPECCHi" }, robots: { index: false } };
// El panel depende de la sesión en cada request: no se valida como navegación instantánea.
export const instant = false;

async function Shell() {
  const user = await requireUser();
  const [branches, selected, prisma] = await Promise.all([visibleBranches(user), getSelectedBranch(user), db()]);
  const unread = user.role === "STYLIST" ? 0 : (
    await prisma.conversation.aggregate({
      _sum: { unreadCount: true },
      where: { isSimulator: false, ...(user.branchIds ? { OR: [{ branchId: { in: user.branchIds } }, { branchId: null }] } : {}) },
    })
  )._sum.unreadCount ?? 0;
  return (
    <Sidebar
      nav={NAV.filter((n) => n.roles.includes(user.role)).map(({ href, label, icon, group }) => ({ href, label, icon: icon as IconKey, group }))}
      user={{ name: user.name, roleLabel: ROLE_LABELS[user.role] }}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
      selected={selected}
      canPickAll={user.branchIds === null}
      unread={unread}
    />
  );
}

function ShellFallback() {
  return (
    <aside className="hidden h-dvh w-[17rem] shrink-0 flex-col gap-4 bg-plum p-4 lg:flex">
      <Skeleton className="h-8 w-40 opacity-20" />
      <Skeleton className="h-10 opacity-20" />
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-9 opacity-20" />
      ))}
    </aside>
  );
}

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="min-h-dvh bg-ivory lg:flex">
      <Suspense fallback={<ShellFallback />}>
        <Shell />
      </Suspense>
      <main className="relative min-w-0 flex-1 overflow-x-clip px-4 py-6 md:px-8 md:py-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_85%_0%,rgba(251,223,233,.8),transparent),radial-gradient(40%_80%_at_40%_0%,rgba(205,185,243,.28),transparent)]" aria-hidden />
        <div className="relative">{children}</div>
      </main>
    </div>
  );
}
