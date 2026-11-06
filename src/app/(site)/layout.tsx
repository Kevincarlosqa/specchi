import { Footer } from "@/components/site/footer";
import { waLink } from "@/components/site/icons";
import { SmoothScroll } from "@/components/site/motion-kit";
import { Nav } from "@/components/site/nav";
import { PageTransitionProvider } from "@/components/site/transition";
import { config } from "@/lib/config";
import { getLandingData } from "@/lib/landing";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const data = await getLandingData();
  return (
    <SmoothScroll>
      <PageTransitionProvider>
        <Nav whatsappHref={waLink(config.WHATSAPP_PUBLIC_NUMBER)} />
        <main id="contenido">{children}</main>
        <Footer branches={data.branches} year={data.year} demo={config.demoMode} />
      </PageTransitionProvider>
    </SmoothScroll>
  );
}
