import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { PHOTOS, unsplash } from "@/content/images";
import { config } from "@/lib/config";
import { DemoAccess } from "./demo-access";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return <LoginForm next={next} demo={config.demoMode} />;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="grid min-h-dvh bg-ivory lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-plum text-paper lg:block">
        <Image src={unsplash(PHOTOS.heroLeft)} alt="" fill priority sizes="55vw" className="object-cover opacity-55" />
        <div className="absolute inset-0 bg-linear-to-t from-plum via-plum/30 to-plum/40" />
        <LogoMark className="absolute -right-32 -bottom-32 h-[40rem] w-[40rem] animate-spin-slow text-paper/10" title="" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="text-lg" aria-label="Ir a la web"><Wordmark withMark /></Link>
          <div>
            <p className="font-display text-7xl leading-[0.92]">
              Tu negocio,
              <br />
              <em className="text-peach">en un solo espejo.</em>
            </p>
            <p className="mt-6 max-w-sm text-sm text-paper/85">Agenda, caja, clientes, WhatsApp y métricas de las seis sedes, en tiempo real.</p>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-14">
        <div className="w-full max-w-md">
          <LogoMark className="mb-6 h-10 w-10 text-rose lg:hidden" />
          {config.demoMode ? (
            <>
              <h1 className="font-display text-5xl leading-none">Prueba el panel</h1>
              <p className="mt-2 mb-6 text-sm text-muted">Entra con un clic según el rol que quieras ver. Los datos son de ejemplo y puedes tocar todo.</p>
              <DemoAccess />
              <details className="mt-6 rounded-2xl border border-line bg-paper p-4">
                <summary className="cursor-pointer text-sm font-semibold">O entra con correo y contraseña</summary>
                <div className="mt-4">
                  <Suspense fallback={<div className="h-48" />}>
                    <Form searchParams={props.searchParams} />
                  </Suspense>
                </div>
              </details>
            </>
          ) : (
            <>
              <h1 className="font-display text-5xl leading-none">Hola de nuevo</h1>
              <p className="mt-2 mb-8 text-sm text-muted">Ingresa con la cuenta que te dio administración. No hay registro público.</p>
              <Suspense fallback={<div className="h-64" />}>
                <Form searchParams={props.searchParams} />
              </Suspense>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
