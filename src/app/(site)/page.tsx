import { Hero } from "@/components/site/hero";
import { BranchStrip, ChatDemo, FinalCta, Manifesto, Marquee, Rituals, StoreTeaser, Worlds } from "@/components/site/home-sections";
import { waLink } from "@/components/site/icons";
import { Preloader } from "@/components/site/preloader";
import { config } from "@/lib/config";
import { SALON_CATEGORIES, SPA_CATEGORIES } from "@/lib/labels";
import { getLandingData } from "@/lib/landing";

export default async function Home() {
  const data = await getLandingData();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: "SPECCHi",
    description: "39 años de experiencia en belleza y wellness. Spa, peluquería y tienda en Lima.",
    foundingDate: "1987",
    url: config.APP_URL,
    department: data.branches.map((b) => ({
      "@type": "BeautySalon",
      name: `SPECCHi ${b.name}`,
      telephone: b.phone,
      address: { "@type": "PostalAddress", streetAddress: b.address, addressLocality: b.district, addressRegion: b.city, addressCountry: "PE" },
      geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng },
    })),
  };
  const spa = data.services.filter((s) => SPA_CATEGORIES.includes(s.category));
  const salon = data.services.filter((s) => SALON_CATEGORIES.includes(s.category));

  return (
    <>
      <Preloader />
      <Hero />
      <Marquee />
      <Worlds spaCount={spa.length} salonCount={salon.length} />
      <Rituals services={spa.filter((s) => s.category === "RITUAL" || s.slug === "couple-experience")} />
      <Manifesto branches={data.branches.length} services={data.services.length} brands={new Set(data.products.map((p) => p.brand)).size} />
      <StoreTeaser products={data.products} />
      <ChatDemo whatsappHref={waLink(config.WHATSAPP_PUBLIC_NUMBER)} />
      <BranchStrip branches={data.branches} />
      <FinalCta />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
