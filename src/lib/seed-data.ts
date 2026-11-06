/**
 * Datos de la demo de SPECCHi. Se usa en modo demo (PGlite) y con `npm run db:seed:demo`.
 *
 * Son REALES (specchi.com.pe, nov. 2026): sedes, direcciones, teléfonos, horarios, carta de spa y salón
 * con duraciones y precios "desde", y las marcas de la tienda.
 * Son FICTICIOS: especialistas, clientes, reservas, ventas, reseñas, stock, costos y precios de productos.
 * No importa "server-only" para poder ejecutarse desde tsx.
 */
import bcrypt from "bcryptjs";
import type { BookingChannel, BookingStatus, DocType, PaymentMethod, PrismaClient, ServiceCategory, StylistLevel } from "@/generated/prisma/client";
import { addDaysKey, localDateKey, wallToUtc, weekdayOf } from "./time";

const TZ = "America/Lima";
const DAY = 86_400_000;
const HISTORY_DAYS = 180;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const pick = <T,>(r: Rand, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
const h = (hh: number, mm = 0) => hh * 60 + mm;

// ─── Sedes (specchi.com.pe/contacto). Coordenadas aproximadas. ──────────────
type Hours = Partial<Record<number, [number, number]>>;
const week = (start: number, end: number): Hours => Object.fromEntries([1, 2, 3, 4, 5, 6].map((d) => [d, [start, end]]));

export const BRANCHES = [
  { slug: "angamos", name: "Angamos", kind: "salon", district: "Miraflores", address: "Av. Angamos Oeste 1450", reference: null, lat: -12.1148, lng: -77.0335, phone: "+51998168688", stations: 12, goal: 92_000, hours: { ...week(h(8), h(21)), 0: [h(9), h(18)] } as Hours },
  { slug: "swissotel", name: "Swissôtel", kind: "salon", district: "San Isidro", address: "Av. Santo Toribio 173", reference: "Swissôtel, Mezzanine", lat: -12.0952, lng: -77.0327, phone: "+51977694339", stations: 8, goal: 66_000, hours: { 1: [h(9), h(19)], 2: [h(9), h(19)], 3: [h(9), h(19)], 4: [h(9), h(19)], 5: [h(9), h(19)], 6: [h(9), h(20)], 0: [h(9), h(14)] } as Hours },
  { slug: "la-molina", name: "La Molina", kind: "salon", district: "La Molina", address: "Calle Los Bambúes 250", reference: null, lat: -12.0795, lng: -76.9425, phone: "+51975376351", stations: 8, goal: 50_000, hours: week(h(9), h(20)) },
  { slug: "chacarilla", name: "Chacarilla", kind: "salon", district: "San Borja", address: "Av. Primavera 641", reference: null, lat: -12.1062, lng: -76.9868, phone: "+51922470208", stations: 9, goal: 84_000, hours: { ...week(h(8), h(20)), 0: [h(9), h(18)] } as Hours },
  { slug: "jockey", name: "Jockey Plaza", kind: "salon", district: "Surco", address: "Av. Javier Prado Este 4200", reference: "C.C. Jockey Plaza, Local 101", lat: -12.0858, lng: -76.9744, phone: "+51981237434", stations: 7, goal: 74_000, hours: { ...week(h(10), h(21)), 0: [h(10), h(21)] } as Hours },
  { slug: "spa-swissotel", name: "Spa Swissôtel", kind: "spa", district: "San Isidro", address: "Av. Santo Toribio 173", reference: "Swissôtel, Mezzanine", lat: -12.0949, lng: -77.0331, phone: "+51977694339", stations: 6, goal: 88_000, hours: { ...week(h(9), h(20)), 0: [h(9), h(14)] } as Hours },
] as const;

// ─── Carta real (specchi.com.pe/spa y /salon) ───────────────────────────────
interface SeedService {
  slug: string;
  name: string;
  category: ServiceCategory;
  description: string;
  durationMin: number;
  price: number;
  featured?: boolean;
  variants?: Array<[string, number, number]>;
  retouchAfterDays?: number;
  requiresEvaluation?: boolean;
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
type Row = [name: string, min: number, price: number, description?: string, extra?: Partial<SeedService>];
const group = (category: ServiceCategory, fallback: string, rows: Row[]): SeedService[] =>
  rows.map(([name, durationMin, price, description, extra]) => ({ slug: slug(name), name, category, durationMin, price, description: description ?? fallback, ...extra }));

export const SERVICES: SeedService[] = [
  ...group("RITUAL", "Un recorrido completo de spa para desconectar de principio a fin.", [
    ["Ritual Antistress", 150, 380, "Dos horas y media para bajar revoluciones: cuerpo, respiración y calma."],
    ["Ritual Detox", 150, 450, "Exfoliación, envoltura y masaje para sentir el cuerpo ligero."],
    ["Ritual Wellness", 180, 590, "Tres horas de bienestar con hidroterapia, masaje y facial.", { featured: true }],
    ["Ritual Full Experience", 240, 830, "La experiencia SPECCHi completa: cuatro horas solo para ti.", { featured: true }],
  ]),
  ...group("COUPLE", "Una experiencia compartida, en la misma cabina y al mismo ritmo.", [
    ["Couple Session I", 50, 520, "Masaje en pareja de 50 minutos."],
    ["Couple Session II", 70, 560, "Masaje en pareja de 70 minutos."],
    ["Couple Relax", 150, 850, "Dos horas y media para desconectar juntos."],
    ["Holistic Couple", 210, 1200, "Ritual holístico para dos, con piedras calientes y aromas."],
    ["Couple Experience", 240, 1500, "El gran ritual para dos: cuatro horas de spa.", { featured: true }],
  ]),
  ...group("MASSAGE", "Masaje a tu medida, con la presión y el ritmo que prefieras.", [
    ["Masaje Piernas Cansadas", 30, 150, "Alivio inmediato para piernas pesadas."],
    ["Masaje Sacro Craneal", 30, 150, "Trabajo suave de cráneo y sacro para soltar tensión."],
    ["Masaje Reflexología Spa", 40, 160, "Puntos reflejos en los pies que relajan todo el cuerpo."],
    ["Masaje Futura Mamá", 50, 220, "Cuidado especial durante el embarazo.", { requiresEvaluation: true }],
    ["Masaje Sueco Relajante", 50, 220, "El clásico relajante, con movimientos largos y envolventes.", { variants: [["50 minutos", 50, 220], ["80 minutos", 80, 330]] }],
    ["Masaje Terapéutico Descontracturante", 50, 220, "Presión profunda para soltar contracturas.", { variants: [["50 minutos", 50, 220], ["80 minutos", 80, 330]] }],
    ["Masaje Holístico con Piedras Calientes", 70, 240, "Calor de piedras volcánicas y aceites esenciales."],
    ["Masaje Tejido Profundo", 50, 240, "Para tensión acumulada en capas profundas.", { variants: [["50 minutos", 50, 240], ["80 minutos", 80, 360]] }],
    ["Masaje SPECCHi Signature", 70, 240, "Nuestro masaje de autor: el favorito de la casa.", { featured: true, variants: [["70 minutos", 70, 240], ["100 minutos", 100, 360]] }],
  ]),
  ...group("BODY", "Tratamiento corporal para renovar y nutrir la piel.", [
    ["Choco Therapy", 60, 220, "Envoltura de cacao, antioxidante y envolvente."],
    ["Detox con Arcilla", 60, 220, "Arcilla purificante que deja la piel ligera."],
    ["Tratamiento Golden con Cúrcuma", 70, 270, "Envoltura dorada que ilumina la piel."],
    ["Tratamiento Piel de Seda Premium", 70, 270, "Nutrición intensa para una piel suave como seda."],
    ["Anticelulítico con Té Verde", 50, 180, "Exfoliación activadora con té verde."],
    ["Exfoliación Reafirmante con Café", 50, 180, "Café molido para tonificar y reafirmar."],
    ["Humectante con Avena, Miel y Aloe", 50, 180, "Exfoliación suave para pieles que piden calma."],
    ["Renovación Profunda Vegana", 50, 180, "Exfoliación con ingredientes 100 % vegetales."],
  ]),
  ...group("FACIAL", "Protocolo facial según lo que tu piel necesita hoy.", [
    ["Facial Spa", 50, 220, "Limpieza, masaje y mascarilla en una sola sesión."],
    ["Facial Hidratante", 60, 260, "Agua y luz para pieles deshidratadas."],
    ["Facial Para Él", 60, 260, "Pensado para la piel masculina y el afeitado."],
    ["Facial Punta de Diamante", 60, 270, "Microexfoliación para una textura uniforme."],
    ["Facial Antiacné", 70, 260, "Controla el brillo y calma la inflamación."],
    ["Facial Calmante Piel Sensible", 70, 260, "Alivia rojeces y fortalece la barrera."],
    ["Facial Dermaplaning", 70, 260, "Retira células muertas y vello fino."],
    ["Limpieza Facial Profunda", 70, 250, "Extracción, peeling y mascarilla a medida."],
    ["Facial Antioxidante con Vitamina C", 70, 280, "Luminosidad y defensa frente al sol de Lima."],
    ["Facial Antiage Glow Up", 70, 350, "Firmeza y brillo: el facial de los eventos.", { featured: true }],
    ["Drenaje Linfático SPECCHi", 40, 200, "Masaje facial que desinflama y define."],
    ["Sculpt Face", 40, 200, "Masaje esculpidor para el óvalo del rostro."],
    ["Workout Facial", 40, 250, "Entrenamiento manual de los músculos del rostro."],
  ]),
  ...group("HYDRO", "Agua, calor y calma para empezar o terminar tu visita.", [
    ["Circuito Wellness", 20, 100, "Circuito de agua para activar el cuerpo."],
    ["Hidroterapia Relax", 30, 180, "Tina de hidromasaje con sales y aromas."],
    ["Hidroterapia Couple Relax", 30, 340, "Hidromasaje para dos."],
  ]),
  ...group("CUT", "Corte con lavado y asesoría de tu estilista.", [
    ["Corte Bob", 30, 170], ["Corte Bob con Flequillo XS", 30, 170], ["Corte Bob Long", 30, 170], ["Corte Bob Midi", 30, 170],
    ["Corte Caballero", 30, 90], ["Corte Caballero con Diseño", 30, 95],
    ["Corte con Ángel – Caballero", 30, 100, "Corte con Ángel, el maestro de la casa."],
    ["Corte con Ángel – Dama", 30, 200, "Corte con Ángel, el maestro de la casa.", { featured: true }],
    ["Corte de Barba", 20, 55, "Perfilado y arreglo de barba."],
    ["Corte de Cabello – Niña", 30, 90],
  ]),
  ...group("COLOR", "Diagnóstico y color a medida con marcas profesionales.", [
    ["Babylights", 240, 450, "Luces finísimas que dan luz sin que se note el trabajo."],
    ["Balayage", 240, 550, "Iluminación a mano alzada, natural y de bajo mantenimiento.", { featured: true }],
    ["Californianas", 180, 550, "Degradado luminoso de medios a puntas."],
    ["Camuflado de Canas", 40, 120, "Disimula las canas sin línea de crecimiento."],
    ["Color", 30, 250, "Color completo con tu tono ideal."],
    ["Color sin Amoniaco", 120, 265, "Color respetuoso con el cabello y el cuero cabelludo."],
    ["Decoloración Total o Parcial", 180, 340],
    ["Decoloración Total o Parcial – Caballero", 90, 340],
    ["Mechas, Platinas o Iluminación", 240, 580],
    ["Sombré", 180, 350, "Un ombré suave, sin cortes de color."],
  ]),
  ...group("STYLING", "Peinado profesional para el día a día o para tu gran evento.", [
    ["Cepillado", 30, 75, "El clásico que siempre funciona."],
    ["Cola", 40, 110], ["Media Cola o Semirrecogido", 40, 130],
    ["Peinado Novia con Tocado", 60, 350, "Moño con tocado para el gran día."],
    ["Recogido o Moño", 60, 200], ["Trenza", 35, 130],
  ]),
  ...group("HAIR_CARE", "Tratamiento profesional para devolverle salud al cabello.", [
    ["Alisado Antifrizz", 90, 350], ["Botox Capilar", 90, 310, "Rellena la fibra y devuelve brillo."],
    ["Ritual Genesis", 40, 250, "Ritual Kérastase para cabello que se debilita."],
    ["Ritual Therapiste", 40, 250, "Ritual Kérastase para cabello muy dañado."],
    ["Tratamiento Anticaída", 30, 120],
  ]),
  ...group("NAILS", "Manos y pies impecables, con esmaltes de larga duración.", [
    ["Hidratación de Manos con Parafina", 20, 60], ["Manicure", 30, 55], ["Manicure Gel Break OPI", 40, 85],
    ["Manicure Gel Color", 40, 90, undefined, { featured: true }], ["Manicure Niñas", 20, 35], ["Manicure Spa", 45, 75], ["Uñas Acrílicas", 120, 190],
    ["Hidratación de Pies con Parafina", 20, 75], ["Pedicure", 40, 85], ["Pedicure Gel Color", 45, 100], ["Pedicure Niñas", 20, 50], ["Pedicure Spa", 50, 95],
  ]),
  ...group("MAKEUP", "Maquillaje profesional que dura toda la noche.", [
    ["Clases de Automaquillaje", 120, 330], ["Maquillaje de Ojos", 25, 220], ["Maquillaje Fantasía", 60, 280],
    ["Maquillaje Novia", 75, 860, "Incluye ampolla de colágeno y pestañas."],
    ["SPECCHi Make Up", 50, 320, "Nuestro maquillaje de autor para cualquier evento.", { featured: true }],
  ]),
  ...group("BROWS_LASHES", "Mirada definida con técnicas de precisión.", [
    ["Laminado de Cejas", 20, 120],
    ["Microblading de Cejas", 120, 850, "Pelo a pelo hiperrealista, con retoque programado.", { retouchAfterDays: 40, featured: true }],
    ["Nanoblading", 120, 890, "Trazo ultrafino para un acabado aún más natural.", { retouchAfterDays: 40 }],
    ["Neutralización de Cejas", 80, 1090, "Corrige tonos no deseados de micropigmentaciones anteriores.", { requiresEvaluation: true }],
    ["Neutralización de Labios", 120, 790, "Unifica el tono de los labios.", { requiresEvaluation: true }],
    ["Power Looks – Extensiones de Pestañas", 90, 350],
    ["Retoque de Microblading", 90, 650], ["Sombreado de Cejas con Henna", 30, 120],
    ["SPECCHi Lifting Clásico", 90, 200], ["SPECCHi Lifting Clásico + Laminado", 90, 250],
  ]),
  ...group("WAX", "Depilación rápida y cuidadosa.", [
    ["Depilación con Cera", 20, 35], ["Depilación con Hilo", 20, 40], ["Depilación con Roll On", 20, 65], ["Depilación Zona Íntima con Cera", 30, 105],
  ]),
];

const SPA_CATS: ServiceCategory[] = ["RITUAL", "COUPLE", "MASSAGE", "BODY", "FACIAL", "HYDRO"];
const SALON_CATS: ServiceCategory[] = ["CUT", "COLOR", "STYLING", "HAIR_CARE", "NAILS", "MAKEUP", "BROWS_LASHES", "WAX"];
const bySlugs = (...cats: ServiceCategory[]) => SERVICES.filter((s) => cats.includes(s.category)).map((s) => s.slug);
const BUFFER: Partial<Record<ServiceCategory, number>> = { RITUAL: 20, COUPLE: 20, MASSAGE: 15, BODY: 15, FACIAL: 15, HYDRO: 15, COLOR: 10, BROWS_LASHES: 10, MAKEUP: 10 };

// ─── Equipo (ficticio) ──────────────────────────────────────────────────────
interface SeedStylist {
  slug: string;
  name: string;
  title: string;
  level: StylistLevel;
  bio: string;
  skills: string[];
  shifts: Array<[string, number[], number, number]>;
}

const ALL_WEEK = [1, 2, 3, 4, 5, 6];
const NO_MON = [2, 3, 4, 5, 6];
const NO_WED = [1, 2, 4, 5, 6];
const MAKE = (slugValue: string, name: string, title: string, level: StylistLevel, bio: string, skills: string[], shifts: SeedStylist["shifts"]): SeedStylist => ({ slug: slugValue, name, title, level, bio, skills, shifts });
const WOMEN_CUTS = bySlugs("CUT");
const HAIR = bySlugs("CUT", "STYLING", "HAIR_CARE");
const COLOR = bySlugs("COLOR", "HAIR_CARE");
const NAIL = [...bySlugs("NAILS"), ...bySlugs("WAX")];
const BROW = bySlugs("BROWS_LASHES");
const MK = [...bySlugs("MAKEUP"), ...bySlugs("STYLING")];
const SPA_FULL = bySlugs("RITUAL", "COUPLE", "MASSAGE", "BODY", "HYDRO");
const SPA_FACE = bySlugs("FACIAL", "HYDRO");

export const STYLISTS: SeedStylist[] = [
  MAKE("valeria-rossi", "Valeria Rossi", "Master colorista", "MASTER", "Balayage y rubios que no se ven teñidos.", COLOR, [["angamos", NO_MON, h(9), h(14)], ["angamos", NO_MON, h(15), h(20)]]),
  MAKE("mateo-salas", "Mateo Salas", "Estilista senior", "SENIOR", "Cortes con movimiento y cero rigidez.", HAIR, [["angamos", ALL_WEEK, h(9), h(14)], ["angamos", ALL_WEEK, h(15), h(20)], ["angamos", [0], h(10), h(17)]]),
  MAKE("camila-nunez", "Camila Núñez", "Nail artist", "SENIOR", "Nail art limpio y gel que dura.", NAIL, [["angamos", ALL_WEEK, h(9), h(14)], ["angamos", ALL_WEEK, h(15), h(20)]]),
  MAKE("andrea-paz", "Andrea Paz", "Brow & lash artist", "MASTER", "Diseño de mirada y microblading.", BROW, [["angamos", [1, 3, 5], h(10), h(19)], ["jockey", [2, 4, 6], h(11), h(20)]]),
  MAKE("lucia-ferrand", "Lucía Ferrand", "Maquilladora", "SENIOR", "Novias y editorial con piel luminosa.", MK, [["angamos", [4, 5, 6], h(10), h(20)], ["chacarilla", [1, 2, 3], h(10), h(19)]]),

  MAKE("fiorella-dean", "Fiorella Dean", "Colorista senior", "SENIOR", "Color sin amoniaco y canas elegantes.", COLOR, [["swissotel", NO_WED, h(9), h(14)], ["swissotel", NO_WED, h(15), h(19)]]),
  MAKE("nicolas-vera", "Nicolás Vera", "Estilista senior", "SENIOR", "Cortes de caballero y bobs precisos.", HAIR, [["swissotel", ALL_WEEK, h(9), h(14)], ["swissotel", ALL_WEEK, h(15), h(19)]]),
  MAKE("paula-gamio", "Paula Gamio", "Nail artist", "JUNIOR", "Manicure express con acabado de salón.", NAIL, [["swissotel", ALL_WEEK, h(9), h(14)], ["swissotel", ALL_WEEK, h(15), h(19)], ["swissotel", [0], h(9), h(14)]]),

  MAKE("sofia-llosa", "Sofía Llosa", "Colorista", "SENIOR", "Californianas y sombré a mano alzada.", COLOR, [["la-molina", ALL_WEEK, h(9), h(14)], ["la-molina", ALL_WEEK, h(15), h(20)]]),
  MAKE("diego-prado", "Diego Prado", "Estilista", "SENIOR", "Tratamientos capilares y peinados.", HAIR, [["la-molina", NO_MON, h(9), h(14)], ["la-molina", NO_MON, h(15), h(20)]]),
  MAKE("kiara-mesa", "Kiara Mesa", "Nail & wax artist", "JUNIOR", "Pedicure spa y depilación.", NAIL, [["la-molina", ALL_WEEK, h(9), h(14)], ["la-molina", ALL_WEEK, h(15), h(20)]]),

  MAKE("alessia-bravo", "Alessia Bravo", "Master colorista", "MASTER", "Iluminaciones y corrección de color.", COLOR, [["chacarilla", ALL_WEEK, h(9), h(14)], ["chacarilla", ALL_WEEK, h(15), h(20)]]),
  MAKE("renzo-cueva", "Renzo Cueva", "Estilista", "SENIOR", "Barbería clásica y corte moderno.", WOMEN_CUTS, [["chacarilla", NO_WED, h(9), h(14)], ["chacarilla", NO_WED, h(15), h(20)], ["chacarilla", [0], h(10), h(17)]]),
  MAKE("milagros-tello", "Milagros Tello", "Brow & lash artist", "SENIOR", "Lifting y laminado de cejas.", BROW, [["chacarilla", [4, 5, 6], h(9), h(19)], ["swissotel", [1, 2, 3], h(9), h(19)]]),
  MAKE("romina-diaz", "Romina Díaz", "Nail artist", "SENIOR", "Acrílicas y diseño.", NAIL, [["chacarilla", ALL_WEEK, h(9), h(14)], ["chacarilla", ALL_WEEK, h(15), h(20)]]),

  MAKE("gabriela-solis", "Gabriela Solís", "Colorista", "SENIOR", "Babylights y luces naturales.", COLOR, [["jockey", ALL_WEEK, h(10), h(15)], ["jockey", ALL_WEEK, h(16), h(21)]]),
  MAKE("bruno-arce", "Bruno Arce", "Estilista", "JUNIOR", "Peinados rápidos para tu día.", HAIR, [["jockey", ALL_WEEK, h(10), h(15)], ["jockey", ALL_WEEK, h(16), h(21)], ["jockey", [0], h(11), h(19)]]),
  MAKE("nicole-chang", "Nicole Chang", "Nail artist", "JUNIOR", "Gel, OPI y parafina.", NAIL, [["jockey", ALL_WEEK, h(10), h(15)], ["jockey", ALL_WEEK, h(16), h(21)], ["jockey", [0], h(11), h(19)]]),

  MAKE("elena-quiroga", "Elena Quiroga", "Terapeuta master", "MASTER", "Masaje de autor y rituales largos.", SPA_FULL, [["spa-swissotel", ALL_WEEK, h(9), h(14)], ["spa-swissotel", ALL_WEEK, h(15), h(20)]]),
  MAKE("thiago-montes", "Thiago Montes", "Terapeuta senior", "SENIOR", "Descontracturante y tejido profundo.", SPA_FULL, [["spa-swissotel", NO_MON, h(9), h(14)], ["spa-swissotel", NO_MON, h(15), h(20)], ["spa-swissotel", [0], h(9), h(14)]]),
  MAKE("natalia-rey", "Natalia Rey", "Terapeuta", "JUNIOR", "Reflexología y piedras calientes.", SPA_FULL, [["spa-swissotel", NO_WED, h(9), h(14)], ["spa-swissotel", NO_WED, h(15), h(20)]]),
  MAKE("isabela-lau", "Isabela Lau", "Cosmiatra senior", "SENIOR", "Protocolos faciales y antiage.", SPA_FACE, [["spa-swissotel", ALL_WEEK, h(9), h(14)], ["spa-swissotel", ALL_WEEK, h(15), h(20)]]),
  MAKE("angel-maestro", "Ángel (maestro de la casa)", "Director de estilo", "MASTER", "Corte con Ángel, con cupos limitados.", ["corte-con-angel-dama", "corte-con-angel-caballero", ...bySlugs("STYLING")], [["angamos", [2, 4], h(10), h(18)], ["swissotel", [6], h(10), h(16)]]),
];

const COMMISSION: Record<StylistLevel, number> = { JUNIOR: 30, SENIOR: 40, MASTER: 50 };

// ─── Tienda: marcas reales de SPECCHi Store; precios, costos y stock de ejemplo ──
const PRODUCTS: Array<[sku: string, name: string, brand: string, category: string, price: number, cost: number, featured?: boolean]> = [
  ["KER-NUT-250", "Bain Satin Nutritive 250 ml", "Kérastase", "Shampoo", 165, 92, true],
  ["KER-ELX-100", "Elixir Ultime L'Huile Originale 100 ml", "Kérastase", "Serum y aceites", 245, 138, true],
  ["KER-GEN-200", "Masque Genesis 200 ml", "Kérastase", "Mascarillas", 230, 128],
  ["KER-THE-250", "Bain Thérapiste 250 ml", "Kérastase", "Shampoo", 175, 98],
  ["OLA-003-100", "No. 3 Hair Perfector 100 ml", "Olaplex", "Tratamientos", 169, 94, true],
  ["OLA-007-30", "No. 7 Bonding Oil 30 ml", "Olaplex", "Serum y aceites", 149, 82],
  ["OLA-004-250", "No. 4 Bond Maintenance Shampoo 250 ml", "Olaplex", "Shampoo", 159, 88],
  ["MOR-TRT-100", "Moroccanoil Treatment 100 ml", "Moroccanoil", "Serum y aceites", 195, 108, true],
  ["MOR-MSK-250", "Hydrating Mask 250 ml", "Moroccanoil", "Mascarillas", 210, 118],
  ["DAV-OI-250", "OI Shampoo 250 ml", "Davines", "Shampoo", 118, 64],
  ["DAV-OIL-135", "OI All in One Milk 135 ml", "Davines", "Tratamientos", 135, 72],
  ["RED-ALS-300", "All Soft Shampoo 300 ml", "Redken", "Shampoo", 95, 50],
  ["RED-EXT-250", "Extreme Mask 250 ml", "Redken", "Mascarillas", 125, 68],
  ["LOR-ABS-300", "Absolut Repair Shampoo 300 ml", "L'Oréal Professionnel", "Shampoo", 89, 46],
  ["LOR-MET-150", "Metal Detox Protector 150 ml", "L'Oréal Professionnel", "Protectores térmicos", 110, 58],
  ["REV-UNQ-150", "Uniq One All in One 150 ml", "Revlon", "Protectores térmicos", 79, 38],
  ["TIG-BED-300", "Bed Head Resurrection 300 ml", "TIGI", "Tratamientos", 85, 44],
  ["AME-FIB-85", "Fiber Molding Cream 85 g", "American Crew", "Ceras", 72, 36],
  ["AME-POM-85", "Pomade Medium Hold 85 g", "American Crew", "Ceras", 69, 34],
  ["AME-SHA-250", "Daily Cleansing Shampoo 250 ml", "American Crew", "Hombre", 75, 37],
  ["BIO-PRO-250", "Professional Reconstruct Shampoo 250 ml", "Biotop", "Shampoo", 65, 30],
  ["BIO-CRM-150", "Curly Cream 150 ml", "Biotop", "Cremas", 68, 32],
];

const FIRST = ["María", "Lucía", "Valentina", "Camila", "Daniela", "Andrea", "Sofía", "Fernanda", "Alejandra", "Gabriela", "Nicole", "Paola", "Carolina", "Mariana", "Claudia", "Rosa", "Patricia", "Jimena", "Isabella", "Natalia", "Ana", "Milagros", "Romina", "Kiara", "Brenda", "Estefanía", "Pamela", "Lorena", "Diana", "Vanessa", "Javier", "Luis", "Carlos", "Rodrigo", "Sebastián", "Gonzalo"];
const LAST = ["García", "Rodríguez", "Flores", "Sánchez", "Ramírez", "Torres", "Díaz", "Vargas", "Castillo", "Mendoza", "Rojas", "Chávez", "Gutiérrez", "Salazar", "Paredes", "Benavides", "Delgado", "Valdivia", "Herrera", "Montoya", "Aguilar", "Bustamante", "Ferreyra", "Salas", "Miró Quesada", "Prado", "Olaechea", "Tudela"];

const REVIEW_GOOD = ["Salí nueva. La atención fue impecable de principio a fin.", "El masaje Signature es otro nivel, ya reservé el siguiente.", "Me encantó el balayage: natural y justo lo que pedí.", "Recordatorio por WhatsApp, puntualidad y un trato cálido. Así da gusto.", "El ambiente es precioso y el equipo te hace sentir en casa.", "Volvería solo por el facial. Mi piel brilla.", "La manicure gel me duró tres semanas perfectas.", "Reservé en dos minutos y todo estuvo listo al llegar."];
const REVIEW_MID = ["Buen servicio, pero esperé 15 minutos más de la hora de mi cita.", "Quedó bien, aunque el precio final fue algo mayor al que esperaba.", "Todo correcto; el estacionamiento fue complicado."];
const REVIEW_BAD = ["Mi cita se retrasó casi 40 minutos y nadie me avisó.", "Esperaba más por el precio. No me explicaron bien el tratamiento."];

function docNumber(type: DocType, seq: number) {
  const prefix = type === "FACTURA" ? "F001" : type === "BOLETA" ? "B001" : "NV01";
  return `${prefix}-${String(seq).padStart(6, "0")}`;
}

function slotsUsed(list: Array<[number, number]>, s: number, e: number) {
  return list.some(([a, b]) => s < b && a < e);
}

async function inChunks<T>(rows: T[], fn: (chunk: T[]) => Promise<unknown>, size = 1000) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

export async function seedDatabase(prisma: PrismaClient, opts: { now?: Date; password?: string } = {}) {
  const r = rng(19870601);
  const now = opts.now ?? new Date();
  const todayKey = localDateKey(now, TZ);

  // Sedes, horarios y cierres
  const branchIds: Record<string, string> = {};
  for (const [i, b] of BRANCHES.entries()) {
    const created = await prisma.branch.create({
      data: {
        id: `br_${b.slug}`,
        slug: b.slug, name: b.name, district: b.district, city: "Lima", address: b.address, reference: b.reference,
        lat: b.lat, lng: b.lng, phone: b.phone, stations: b.stations, timezone: TZ, sortOrder: i,
        monthlyGoalCents: b.goal * 100,
        googleReviewUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`SPECCHi ${b.address} ${b.district}`)}`,
        hours: { create: Object.entries(b.hours).map(([weekday, range]) => ({ weekday: Number(weekday), startMin: range![0], endMin: range![1] })) },
      },
    });
    branchIds[b.slug] = created.id;
  }
  const year = Number(todayKey.slice(0, 4));
  for (const id of Object.values(branchIds)) {
    await prisma.branchClosure.create({
      data: { branchId: id, startsAt: wallToUtc(`${year}-12-25`, 0, TZ), endsAt: wallToUtc(`${year}-12-26`, 0, TZ), reason: "Feriado: Navidad" },
    });
  }

  // Servicios + variantes
  const serviceIds: Record<string, string> = {};
  const serviceMeta: Record<string, SeedService> = {};
  for (const [i, s] of SERVICES.entries()) {
    const created = await prisma.service.create({
      data: {
        id: `svc_${s.slug}`,
        slug: s.slug, name: s.name, category: s.category, description: s.description, durationMin: s.durationMin,
        priceCents: s.price * 100, priceFrom: true, bufferMin: BUFFER[s.category] ?? 5,
        retouchAfterDays: s.retouchAfterDays ?? null, requiresEvaluation: s.requiresEvaluation ?? false,
        featured: s.featured ?? false, sortOrder: i,
        variants: s.variants ? { create: s.variants.map(([name, durationMin, price], j) => ({ name, durationMin, priceCents: price * 100, sortOrder: j })) } : undefined,
      },
    });
    serviceIds[s.slug] = created.id;
    serviceMeta[s.slug] = s;
  }
  for (const b of BRANCHES) {
    const cats = b.kind === "spa" ? SPA_CATS : SALON_CATS;
    await prisma.branchService.createMany({
      data: SERVICES.filter((s) => cats.includes(s.category)).map((s) => ({ branchId: branchIds[b.slug]!, serviceId: serviceIds[s.slug]! })),
    });
  }

  // Equipo
  const stylistIds: Record<string, string> = {};
  for (const st of STYLISTS) {
    const created = await prisma.stylist.create({
      data: {
        id: `sty_${st.slug}`,
        slug: st.slug, name: st.name, title: st.title, level: st.level, bio: st.bio,
        commissionPct: COMMISSION[st.level], retailPct: 10, monthlyGoalCents: (st.level === "MASTER" ? 26_000 : st.level === "SENIOR" ? 19_000 : 12_000) * 100,
        services: { create: [...new Set(st.skills)].map((s) => ({ serviceId: serviceIds[s]! })) },
        schedules: { create: st.shifts.flatMap(([b, days, startMin, endMin]) => days.map((weekday) => ({ branchId: branchIds[b]!, weekday, startMin, endMin }))) },
      },
    });
    stylistIds[st.slug] = created.id;
  }
  await prisma.timeOff.createMany({
    data: [
      { stylistId: stylistIds["fiorella-dean"]!, kind: "VACATION", startsAt: wallToUtc(addDaysKey(todayKey, 5), 0, TZ), endsAt: wallToUtc(addDaysKey(todayKey, 8), 0, TZ), reason: "Vacaciones" },
      { stylistId: stylistIds["mateo-salas"]!, kind: "TRAINING", startsAt: wallToUtc(addDaysKey(todayKey, 3), h(9), TZ), endsAt: wallToUtc(addDaysKey(todayKey, 3), h(13), TZ), reason: "Capacitación Kérastase" },
    ],
  });

  // Clientes (ficticios). El número es un marcador: los envíos reales están bloqueados en modo demo.
  const customers: Array<{ id: string; phone: string; name: string }> = [];
  const usedPhones = new Set<string>();
  for (let i = 0; i < 1400; i++) {
    let phone: string;
    do phone = `+519${String(Math.floor(r() * 1e8)).padStart(8, "0")}`;
    while (usedPhones.has(phone));
    usedPhones.add(phone);
    customers.push({ id: `cus_${i.toString(36).padStart(4, "0")}`, phone, name: `${pick(r, FIRST)} ${pick(r, LAST)}` });
  }
  customers[0] = { ...customers[0]!, phone: "+51999111222", name: "Lucía Benavides" };
  const birthdayIn = (offset: number) => {
    const d = new Date(`${addDaysKey(todayKey, offset)}T12:00:00Z`);
    d.setUTCFullYear(1985 + Math.floor(r() * 20));
    return d;
  };
  await prisma.customer.createMany({
    data: customers.map((c, i) => ({
      id: c.id, phone: c.phone, name: c.name,
      email: i % 3 === 0 ? `${c.name.split(" ")[0]!.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}${i}@correo.demo` : null,
      marketingOptIn: r() < 0.68,
      birthday: i % 60 === 0 ? birthdayIn(Math.floor(r() * 7)) : r() < 0.55 ? birthdayIn(Math.floor(r() * 365)) : null,
      tags: i === 0 ? ["VIP"] : r() < 0.07 ? ["VIP"] : r() < 0.05 ? ["Piel sensible"] : [],
      allergies: r() < 0.05 ? pick(r, ["Látex", "PPD (tintes)", "Frutos secos (aceites)", "Lavanda"]) : null,
      skinType: r() < 0.5 ? pick(r, ["Seca", "Mixta", "Grasa", "Sensible", "Normal"]) : null,
      hairType: r() < 0.5 ? pick(r, ["Liso", "Ondulado", "Rizado", "Teñido", "Fino"]) : null,
      customFields: r() < 0.4 ? { presion: pick(r, ["Suave", "Media", "Fuerte"]), aroma: pick(r, ["Lavanda", "Eucalipto", "Cítrico", "Sin aroma"]), bebida: pick(r, ["Té", "Espumante", "Agua con gas", "Café"]) } : undefined,
      createdAt: new Date(now.getTime() - Math.floor(r() * 500) * DAY),
    })),
  });

  // Reservas: 180 días atrás y 14 adelante, sin solapes por especialista ni por puesto.
  const busy = new Map<string, Array<[number, number]>>();
  const stationLoad = new Map<string, Array<[number, number]>>();
  const bookings: Array<{ id: string; code: string; customerId: string; branchId: string; status: BookingStatus; channel: BookingChannel; startsAt: Date; endsAt: Date; totalCents: number; createdAt: Date; confirmedAt: Date | null; completedAt: Date | null; cancelledAt: Date | null; cancelReason: string | null; reminder24hSentAt: Date | null; reviewRequestedAt: Date | null; depositCents: number; depositPaidAt: Date | null }> = [];
  const items: Array<{ bookingId: string; serviceId: string; variantId: null; stylistId: string; position: number; startsAt: Date; endsAt: Date; busyUntil: Date; durationMin: number; priceCents: number }> = [];
  const usedCodes = new Set<string>();
  const noShows = new Map<string, number>();
  const regulars = customers.slice(0, 460);
  const flakyList = customers.filter((_, i) => i % 11 === 7);
  const flaky = new Set(flakyList.map((c) => c.id));
  const lastSeen = new Map<string, number>();
  let n = 0;

  for (let d = -HISTORY_DAYS; d <= 14; d++) {
    const key = addDaysKey(todayKey, d);
    const wd = weekdayOf(key);
    // Temporada: crecimiento suave y fin de semana más lleno. Sirve para que las gráficas cuenten algo.
    const growth = (d + HISTORY_DAYS) / HISTORY_DAYS;
    const weekend = wd === 6 ? 0.1 : wd === 5 ? 0.05 : wd === 1 ? -0.08 : 0;
    const baseFill = d > 0 ? 0.5 - d * 0.025 : 0.34 + growth * 0.14 + weekend;
    for (const st of STYLISTS) {
      for (const [branchSlug, days, startMin, endMin] of st.shifts) {
        if (!days.includes(wd)) continue;
        const branch = BRANCHES.find((b) => b.slug === branchSlug)!;
        let cursor = startMin + (r() < 0.5 ? 0 : 30);
        while (cursor < endMin - 20) {
          const usable = st.skills.filter((s) => {
            const svc = serviceMeta[s];
            return svc && (branch.kind === "spa" ? SPA_CATS : SALON_CATS).includes(svc.category);
          });
          if (!usable.length) break;
          let svcSlug = pick(r, usable);
          for (let t = 0; t < 4; t++) {
            const c = serviceMeta[svcSlug]!;
            if (c.featured || r() < Math.min(1, 170 / c.price)) break;
            svcSlug = pick(r, usable);
          }
          const svc = serviceMeta[svcSlug]!;
          const buffer = BUFFER[svc.category] ?? 5;
          // Variante más corta como precio base; algunos eligen la larga.
          const longVariant = svc.variants && r() < 0.35 ? svc.variants[svc.variants.length - 1]! : null;
          const dur = longVariant ? longVariant[1] : svc.durationMin;
          if (cursor + dur > endMin) {
            cursor += 15;
            continue;
          }
          if (r() > baseFill) {
            cursor += pick(r, [30, 45, 60]);
            continue;
          }
          const start = wallToUtc(key, cursor, TZ).getTime();
          const end = start + dur * 60_000;
          const until = end + buffer * 60_000;
          const sBusy = busy.get(st.slug) ?? [];
          const bLoad = stationLoad.get(branchSlug) ?? [];
          const concurrent = bLoad.filter(([a, b]) => start < b && a < until).length;
          if (slotsUsed(sBusy, start, until) || concurrent >= branch.stations) {
            cursor += 30;
            continue;
          }
          sBusy.push([start, until]);
          busy.set(st.slug, sBusy);
          bLoad.push([start, until]);
          stationLoad.set(branchSlug, bLoad);

          let customer = r() < 0.72 ? pick(r, regulars) : pick(r, customers);
          const isPast = end < now.getTime();
          const roll = r();
          // El no-show baja con el tiempo: antes de los recordatorios era ~6 %, ahora ~2 %.
          const noShowCut = 0.92 + 0.02 + 0.04 * (1 - growth);
          const status: BookingStatus = isPast
            ? roll < 0.87 ? "COMPLETED" : roll < 0.92 ? "CANCELLED" : roll < noShowCut ? "NO_SHOW" : "COMPLETED"
            : start < now.getTime() ? "IN_PROGRESS" : roll < 0.86 ? "CONFIRMED" : roll < 0.95 ? "PENDING" : "CANCELLED";
          const cr = r();
          // WhatsApp y web ganan peso con el tiempo: la adopción se ve en la analítica.
          const wa = 0.32 + growth * 0.26;
          const channel: BookingChannel = cr < wa ? "WHATSAPP" : cr < wa + 0.16 ? "WEB" : cr < wa + 0.32 ? "PHONE" : cr < wa + 0.4 ? "DASHBOARD" : "WALK_IN";
          const price = (longVariant ? longVariant[2] : svc.price) * 100;
          let code: string;
          do code = `SP-${Math.floor(r() * 36 ** 5).toString(36).toUpperCase().padStart(5, "2").replace(/[01OI]/g, "7")}`;
          while (usedCodes.has(code));
          usedCodes.add(code);
          const id = `bk_${(n++).toString(36).padStart(5, "0")}`;
          const createdAt = new Date(start - (1 + Math.floor(r() * 12)) * DAY);
          if (status === "NO_SHOW") {
            if (!flaky.has(customer.id)) customer = pick(r, flakyList);
            noShows.set(customer.id, (noShows.get(customer.id) ?? 0) + 1);
          }
          if (status === "COMPLETED") lastSeen.set(customer.id, Math.max(lastSeen.get(customer.id) ?? 0, start));
          const hasDeposit = price >= 40_000 && r() < 0.5;
          bookings.push({
            id, code, customerId: customer.id, branchId: branchIds[branchSlug]!, status, channel,
            startsAt: new Date(start), endsAt: new Date(end), totalCents: price, createdAt,
            confirmedAt: status === "PENDING" ? null : createdAt,
            completedAt: status === "COMPLETED" ? new Date(end) : null,
            cancelledAt: status === "CANCELLED" ? new Date(start - DAY) : null,
            cancelReason: status === "CANCELLED" ? pick(r, ["Viaje", "Se sintió mal", "Cambio de planes", "Trabajo"]) : null,
            reminder24hSentAt: isPast ? new Date(start - DAY) : null,
            reviewRequestedAt: status === "COMPLETED" && r() < 0.8 ? new Date(end + 2 * 3_600_000) : null,
            depositCents: hasDeposit ? Math.round(price * 0.3) : 0,
            depositPaidAt: hasDeposit ? createdAt : null,
          });
          items.push({
            bookingId: id, serviceId: serviceIds[svcSlug]!, variantId: null, stylistId: stylistIds[st.slug]!, position: 0,
            startsAt: new Date(start), endsAt: new Date(end), busyUntil: new Date(until), durationMin: dur, priceCents: price,
          });
          if (status === "CANCELLED") {
            sBusy.pop();
            bLoad.pop();
          }
          cursor += dur + buffer + (r() < 0.35 ? 15 : 0);
        }
      }
    }
  }
  await inChunks(bookings, (c) => prisma.booking.createMany({ data: c }));
  await inChunks(items, (c) => prisma.bookingItem.createMany({ data: c }));
  for (const [customerId, count] of noShows) await prisma.customer.update({ where: { id: customerId }, data: { noShowCount: count } });

  // Tienda y stock
  const productRows = PRODUCTS.map(([sku, name, brand, category, price, cost, featured]) => ({ id: `prd_${sku.toLowerCase()}`, sku, name, brand, category, priceCents: price * 100, costCents: cost * 100, featured: featured ?? false }));
  await prisma.product.createMany({ data: productRows });
  const salonBranches = BRANCHES.filter((b) => b.kind === "salon");
  await prisma.productStock.createMany({
    data: BRANCHES.flatMap((b) =>
      productRows
        .filter((_, i) => b.kind === "salon" || i % 3 === 0)
        .map((p) => {
          const min = 3 + Math.floor(r() * 3);
          // Alrededor del 15 % por debajo del mínimo, para que la alerta tenga algo que mostrar.
          return { productId: p.id, branchId: branchIds[b.slug]!, minQty: min, qty: r() < 0.15 ? Math.floor(r() * min) : min + 2 + Math.floor(r() * 16) };
        }),
    ),
  });

  // Caja de hoy abierta en cada sede, con el movimiento típico del día.
  const sessionByBranch = new Map<string, string>();
  for (const b of BRANCHES) {
    const session = await prisma.cashSession.create({
      data: {
        id: `cash_${b.slug}`, branchId: branchIds[b.slug]!, openedByName: "Recepción", openingCents: 30_000,
        openedAt: wallToUtc(todayKey, h(8, 45), TZ),
        movements: { create: [{ kind: "OUT", amountCents: 4_500, reason: "Compra de insumos de limpieza", createdAt: wallToUtc(todayKey, h(10), TZ) }] },
      },
    });
    sessionByBranch.set(branchIds[b.slug]!, session.id);
  }

  // Ventas: cada reserva completada se cobró. Una parte suma producto (venta cruzada).
  const sales: Array<{ id: string; cashSessionId: string | null; docType: DocType; docNumber: string; branchId: string; customerId: string; bookingId: string; method: PaymentMethod; subtotalCents: number; discountCents: number; tipCents: number; totalCents: number; pointsEarned: number; createdAt: Date }> = [];
  const saleItems: Array<{ saleId: string; kind: "SERVICE" | "PRODUCT"; name: string; serviceId?: string; productId?: string; stylistId: string; qty: number; unitCents: number; totalCents: number; commissionCents: number }> = [];
  const pointsByCustomer = new Map<string, number>();
  const seq: Record<DocType, number> = { BOLETA: 0, FACTURA: 0, NOTA_VENTA: 0 };
  const stockMoves: Array<{ productId: string; branchId: string; delta: number; kind: "SALE"; createdAt: Date }> = [];
  const stylistById = new Map(STYLISTS.map((s) => [stylistIds[s.slug]!, s]));
  const serviceNameById = new Map(SERVICES.map((s) => [serviceIds[s.slug]!, s.name]));
  bookings.forEach((b, idx) => {
    if (b.status !== "COMPLETED") return;
    const it = items[idx]!;
    const st = stylistById.get(it.stylistId)!;
    const docRoll = r();
    const docType: DocType = docRoll < 0.84 ? "BOLETA" : docRoll < 0.96 ? "FACTURA" : "NOTA_VENTA";
    seq[docType]++;
    const saleId = `sal_${idx.toString(36)}`;
    const mRoll = r();
    const method: PaymentMethod = mRoll < 0.42 ? "CARD" : mRoll < 0.72 ? "YAPE" : mRoll < 0.8 ? "PLIN" : mRoll < 0.95 ? "CASH" : "TRANSFER";
    const discount = r() < 0.08 ? Math.round(b.totalCents * 0.1) : 0;
    const tip = r() < 0.22 ? pick(r, [500, 1000, 2000, 3000]) : 0;
    let subtotal = b.totalCents;
    saleItems.push({ saleId, kind: "SERVICE", name: serviceNameById.get(it.serviceId) ?? "Servicio", serviceId: it.serviceId, stylistId: it.stylistId, qty: 1, unitCents: it.priceCents, totalCents: it.priceCents, commissionCents: Math.round(((it.priceCents - discount) * COMMISSION[st.level]) / 100) });
    // La venta cruzada crece con el tiempo (11 % → 22 %).
    const age = (now.getTime() - b.startsAt.getTime()) / (HISTORY_DAYS * DAY);
    const isSalon = salonBranches.some((x) => branchIds[x.slug] === b.branchId);
    if (isSalon && r() < 0.22 - 0.11 * age) {
      const p = pick(r, productRows);
      subtotal += p.priceCents;
      saleItems.push({ saleId, kind: "PRODUCT", name: `${p.brand} ${p.name}`, productId: p.id, stylistId: it.stylistId, qty: 1, unitCents: p.priceCents, totalCents: p.priceCents, commissionCents: Math.round(p.priceCents * 0.1) });
      stockMoves.push({ productId: p.id, branchId: b.branchId, delta: -1, kind: "SALE", createdAt: b.endsAt });
    }
    const total = subtotal - discount + tip;
    const points = Math.floor((subtotal - discount) / 100);
    pointsByCustomer.set(b.customerId, (pointsByCustomer.get(b.customerId) ?? 0) + points);
    sales.push({ id: saleId, cashSessionId: localDateKey(b.endsAt, TZ) === todayKey ? (sessionByBranch.get(b.branchId) ?? null) : null, docType, docNumber: docNumber(docType, seq[docType]), branchId: b.branchId, customerId: b.customerId, bookingId: b.id, method, subtotalCents: subtotal, discountCents: discount, tipCents: tip, totalCents: total, pointsEarned: points, createdAt: b.endsAt });
  });
  await inChunks(sales, (c) => prisma.sale.createMany({ data: c }));
  await inChunks(saleItems, (c) => prisma.saleItem.createMany({ data: c }));
  await inChunks(stockMoves, (c) => prisma.stockMovement.createMany({ data: c }));
  await inChunks([...pointsByCustomer.entries()], async (c) => {
    await prisma.loyaltyEntry.createMany({ data: c.map(([customerId, points]) => ({ customerId, points, reason: "Puntos acumulados por visitas", createdAt: now })) });
  });
  for (const [customerId, points] of pointsByCustomer) await prisma.customer.update({ where: { id: customerId }, data: { loyaltyPoints: points } });

  // Asistencia: últimos 14 días (ayer hacia atrás, y hoy solo entrada).
  const attendance: Array<{ stylistId: string; branchId: string; checkIn: Date; checkOut: Date | null }> = [];
  for (let d = -14; d <= 0; d++) {
    const key = addDaysKey(todayKey, d);
    const wd = weekdayOf(key);
    for (const st of STYLISTS) {
      const shifts = st.shifts.filter(([, days]) => days.includes(wd));
      if (!shifts.length) continue;
      const first = Math.min(...shifts.map((s) => s[2]));
      const last = Math.max(...shifts.map((s) => s[3]));
      const late = r() < 0.12 ? 8 + Math.floor(r() * 18) : -Math.floor(r() * 8);
      const checkIn = wallToUtc(key, first + late, TZ);
      if (checkIn.getTime() > now.getTime()) continue;
      const out = wallToUtc(key, last + Math.floor(r() * 15), TZ);
      attendance.push({ stylistId: stylistIds[st.slug]!, branchId: branchIds[shifts[0]![0]]!, checkIn, checkOut: out.getTime() < now.getTime() ? out : null });
    }
  }
  await prisma.attendance.createMany({ data: attendance });

  // Gift cards y paquetes (los paquetes son los reales de la carta)
  const giftRows = Array.from({ length: 34 }, (_, i) => {
    const initial = pick(r, [100, 200, 300, 500, 800]) * 100;
    const used = r();
    const balance = used < 0.45 ? initial : used < 0.75 ? Math.round(initial * 0.4) : 0;
    const created = now.getTime() - Math.floor(r() * 170) * DAY;
    return { code: `GIFT-${(46656 + i * 739).toString(36).toUpperCase()}`, initialCents: initial, balanceCents: balance, buyerName: `${pick(r, FIRST)} ${pick(r, LAST)}`, recipientName: `${pick(r, FIRST)} ${pick(r, LAST)}`, status: balance === 0 ? ("REDEEMED" as const) : ("ACTIVE" as const), createdAt: new Date(created), expiresAt: new Date(created + 365 * DAY) };
  });
  await prisma.giftCard.createMany({ data: giftRows });
  const PACKS: Array<[string, number, number]> = [
    ["Masaje Sueco Relax o Terapéutico × 4", 4, 840], ["Masaje SPECCHi Signature o Holístico × 4", 4, 900],
    ["Facial Antiage Glow Up × 5", 5, 1670], ["Facial Aqua Peeling × 5", 5, 1850], ["Facial Microneedling × 5", 5, 1850], ["Facial SPECCHi Anti Wrinkle × 5", 5, 2280],
  ];
  await prisma.customerPackage.createMany({
    data: Array.from({ length: 56 }, (_, i) => {
      const [name, totalSessions, price] = pick(r, PACKS);
      const created = now.getTime() - Math.floor(r() * 150) * DAY;
      const soon = i % 9 === 0;
      return { customerId: regulars[i * 3]!.id, name, totalSessions, usedSessions: Math.floor(r() * totalSessions), priceCents: price * 100, createdAt: new Date(created), expiresAt: new Date(soon ? now.getTime() + (5 + Math.floor(r() * 20)) * DAY : created + 365 * DAY) };
    }),
  });

  // Reseñas
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  await prisma.review.createMany({
    data: Array.from({ length: 380 }, (_, i) => {
      const b = pick(r, completed);
      const roll = r();
      const rating = roll < 0.74 ? 5 : roll < 0.92 ? 4 : roll < 0.97 ? 3 : roll < 0.99 ? 2 : 1;
      const it = items[bookings.indexOf(b)]!;
      const replied = rating >= 4 ? r() < 0.55 : r() < 0.25 && i > 8;
      return {
        branchId: b.branchId, customerId: b.customerId, stylistId: it.stylistId, bookingId: b.id,
        source: r() < 0.72 ? ("GOOGLE" as const) : ("INTERNAL" as const), rating,
        comment: r() < 0.72 ? (rating >= 4 ? pick(r, REVIEW_GOOD) : rating === 3 ? pick(r, REVIEW_MID) : pick(r, REVIEW_BAD)) : null,
        reply: replied ? "¡Gracias por tu mensaje! Nos encanta tenerte en SPECCHi." : null,
        repliedAt: replied ? new Date(b.endsAt.getTime() + 2 * DAY) : null,
        createdAt: new Date(Math.min(now.getTime() - i * 3_600_000, b.endsAt.getTime() + 5 * 3_600_000)),
      };
    }),
  });

  // Campos configurables de la ficha
  await prisma.customerFieldDef.createMany({
    data: [
      { key: "presion", label: "Presión de masaje preferida", type: "SELECT", options: ["Suave", "Media", "Fuerte"], sortOrder: 0 },
      { key: "aroma", label: "Aroma favorito", type: "SELECT", options: ["Lavanda", "Eucalipto", "Cítrico", "Sin aroma"], sortOrder: 1 },
      { key: "bebida", label: "Bebida de bienvenida", type: "SELECT", options: ["Té", "Espumante", "Agua con gas", "Café"], sortOrder: 2 },
      { key: "embarazo", label: "Embarazo en curso", type: "BOOLEAN", sensitive: true, sortOrder: 3 },
      { key: "hipertension", label: "Hipertensión u otra condición a considerar", type: "TEXT", sensitive: true, sortOrder: 4 },
      { key: "contraindicaciones", label: "Contraindicaciones firmadas", type: "TEXT", sensitive: true, sortOrder: 5 },
    ],
  });

  // Ficha de ejemplo
  await prisma.customer.update({
    where: { id: customers[0]!.id },
    data: {
      preferredBranchId: branchIds["spa-swissotel"], preferredStylistId: stylistIds["elena-quiroga"], skinType: "Mixta", hairType: "Teñido", notes: "Prefiere citas a primera hora. Cabina con luz baja.",
      customFields: { presion: "Media", aroma: "Eucalipto", bebida: "Espumante", embarazo: false },
    },
  });
  await prisma.technicalNote.createMany({
    data: [
      { customerId: customers[0]!.id, stylistId: stylistIds["valeria-rossi"]!, title: "Balayage — fórmula", formula: "Decoloración 20 vol. + matiz 9.1 / 10.2 en partes iguales. Pose 25 min.", body: "Base 6.0 natural. Mantener raíz difuminada.", createdAt: new Date(now.getTime() - 50 * DAY) },
      { customerId: customers[0]!.id, stylistId: stylistIds["elena-quiroga"]!, title: "Masaje Signature", formula: null, body: "Tensión en trapecio izquierdo. Evitar lavanda en cabina; prefiere eucalipto.", createdAt: new Date(now.getTime() - 10 * DAY) },
    ],
  });
  await prisma.customerPackage.create({ data: { customerId: customers[0]!.id, name: "Masaje SPECCHi Signature o Holístico × 4", totalSessions: 4, usedSessions: 1, priceCents: 90_000, expiresAt: new Date(now.getTime() + 200 * DAY) } });
  await prisma.waitlistEntry.create({
    data: { customerId: customers[5]!.id, branchId: branchIds.angamos!, serviceIds: [serviceIds.balayage!], stylistId: stylistIds["valeria-rossi"]!, dateFrom: now, dateTo: new Date(now.getTime() + 10 * DAY), notes: "Solo mañanas" },
  });

  // Conversaciones de ejemplo
  const convo = async (customerIdx: number, branchSlug: string, status: "BOT" | "HUMAN", unread: number, lines: Array<["CUSTOMER" | "BOT" | "STAFF", string, number]>) => {
    const c = customers[customerIdx]!;
    const last = lines[lines.length - 1]!;
    await prisma.conversation.create({
      data: {
        phone: c.phone, customerId: c.id, branchId: branchIds[branchSlug], status, aiPaused: status === "HUMAN", unreadCount: unread,
        lastMessageAt: new Date(now.getTime() - last[2] * 60_000),
        lastInboundAt: new Date(now.getTime() - Math.min(...lines.filter((l) => l[0] === "CUSTOMER").map((l) => l[2])) * 60_000),
        messages: { create: lines.map(([author, body, minsAgo]) => ({ direction: author === "CUSTOMER" ? "IN" : "OUT", author, body, createdAt: new Date(now.getTime() - minsAgo * 60_000) })) },
      },
    });
  };
  await convo(0, "spa-swissotel", "BOT", 0, [
    ["CUSTOMER", "Hola! Quería agendar mi masaje de siempre 💆‍♀️", 95],
    ["BOT", "¡Hola, Lucía! ✨ Qué gusto saludarte. ¿Masaje SPECCHi Signature con Elena en el Spa Swissôtel, como la última vez?", 94],
    ["CUSTOMER", "Sí, con Elena porfa. Jueves en la mañana?", 92],
    ["BOT", "Elena tiene libre el jueves a las 9:30, 10:30 y 11:45. ¿Cuál prefieres?", 91],
    ["CUSTOMER", "10:30 perfecto", 90],
    ["BOT", "Listo ✨ Tu cita quedó confirmada: Masaje SPECCHi Signature con Elena, jueves 10:30. Código SP-7KQ4M. Usaremos una sesión de tu paquete. Te recordaremos un día antes.", 89],
  ]);
  await convo(12, "angamos", "HUMAN", 2, [
    ["CUSTOMER", "Buenas, soy alérgica al PPD, ¿igual puedo hacerme balayage?", 40],
    ["BOT", "Gracias por avisarnos 🙏 Es importante: te comunico con una especialista para evaluarlo contigo.", 39],
    ["STAFF", "Hola, soy Valeria. Trabajamos con opciones sin PPD y hacemos una prueba previa de 15 min. ¿Te queda bien el miércoles?", 30],
    ["CUSTOMER", "Sí! A qué hora?", 12],
    ["CUSTOMER", "Y la prueba tiene costo?", 11],
  ]);
  await convo(27, "jockey", "BOT", 1, [["CUSTOMER", "Hola, precio de manicure gel en Jockey?", 8]]);
  await convo(44, "chacarilla", "BOT", 0, [
    ["CUSTOMER", "Hola, ¿tienen gift cards para regalar un spa?", 300],
    ["BOT", "¡Sí! Tenemos gift cards digitales desde S/ 100 y por experiencias como el Masaje Signature ✨ ¿Te muestro las opciones?", 299],
    ["CUSTOMER", "Sí porfa, para mi mamá", 298],
    ["BOT", "Qué lindo detalle 💛 El favorito para regalar es el Ritual Antistress (S/ 380). Te paso el enlace y una asesora te ayuda con la dedicatoria.", 297],
  ]);

  // Usuarios del panel. Dominio ficticio a propósito: la demo no debe usar correos reales de la empresa.
  const passwordHash = await bcrypt.hash(opts.password ?? "demo1234", 10);
  const users: Array<{ email: string; name: string; role: "OWNER" | "ADMIN" | "BRANCH_MANAGER" | "RECEPTION" | "STYLIST"; branches?: string[]; stylist?: string }> = [
    { email: "direccion@specchi.demo", name: "Dirección general", role: "OWNER" },
    { email: "admin@specchi.demo", name: "Administración", role: "ADMIN" },
    { email: "gerencia.angamos@specchi.demo", name: "Gerencia Angamos", role: "BRANCH_MANAGER", branches: ["angamos", "jockey"] },
    { email: "gerencia.spa@specchi.demo", name: "Gerencia Spa", role: "BRANCH_MANAGER", branches: ["spa-swissotel"] },
    { email: "recepcion.angamos@specchi.demo", name: "Recepción Angamos", role: "RECEPTION", branches: ["angamos"] },
    { email: "valeria@specchi.demo", name: "Valeria Rossi", role: "STYLIST", stylist: "valeria-rossi" },
  ];
  for (const u of users) {
    await prisma.user.create({
      data: {
        id: `usr_${u.email.split("@")[0]!.replace(/[^a-z0-9]/g, "")}`,
        email: u.email, name: u.name, role: u.role, passwordHash,
        stylistId: u.stylist ? stylistIds[u.stylist] : null,
        branches: u.branches ? { create: u.branches.map((b) => ({ branchId: branchIds[b]! })) } : undefined,
      },
    });
  }

  // Campañas pasadas (simuladas)
  const camp = (name: string, segment: string, daysAgo: number, audience: number, read: number, booked: number, revenue: number, message: string) => ({
    name, segment, message, status: "SENT" as const, simulated: true, audience, delivered: Math.round(audience * 0.97), readCount: Math.round(audience * read), booked, revenueCents: revenue * 100,
    createdById: "usr_direccion", sentAt: new Date(now.getTime() - daysAgo * DAY), createdAt: new Date(now.getTime() - daysAgo * DAY),
  });
  await prisma.campaign.createMany({
    data: [
      camp("Te extrañamos: 15 % en tu próximo masaje", "AT_RISK", 12, 148, 0.74, 21, 5920, "Hola {nombre} 💛 Hace un tiempo que no te vemos en SPECCHi. Tu próximo masaje tiene 15 % de regalo esta semana. ¿Te reservo?"),
      camp("Cumpleañeros del mes", "BIRTHDAY", 26, 62, 0.81, 14, 3780, "¡Feliz mes, {nombre}! 🎂 Tu regalo: Hidratación de manos con parafina gratis en tu próxima visita."),
      camp("Primera visita al Spa para clientes de salón", "SALON_ONLY", 41, 310, 0.63, 27, 7240, "{nombre}, ya conoces nuestro salón. ¿Y si esta vez te dejas consentir en el Spa Swissôtel? Masaje Signature con 10 %."),
      camp("Agenda libre del martes", "LOYAL", 55, 96, 0.78, 18, 3260, "{nombre}, quedan espacios este martes en Angamos. Reserva hoy y llévate un cepillado de cortesía ✨"),
    ],
  });

  // Registro de auditoría de ejemplo
  await prisma.auditLog.createMany({
    data: [
      { userId: "usr_direccion", userName: "Dirección general", action: "Inició sesión", entity: "Sesión", createdAt: new Date(now.getTime() - 3_600_000) },
      { userId: "usr_recepcionangamos", userName: "Recepción Angamos", action: "Abrió caja", entity: "Caja", detail: "Angamos · S/ 300.00", createdAt: wallToUtc(todayKey, h(8, 45), TZ) },
      { userId: "usr_gerenciaangamos", userName: "Gerencia Angamos", action: "Ajustó stock", entity: "Inventario", detail: "Olaplex No. 3 · +6 unidades", createdAt: new Date(now.getTime() - 26 * 3_600_000) },
      { userId: "usr_admin", userName: "Administración", action: "Lanzó campaña", entity: "Campañas", detail: "Te extrañamos: 15 % en tu próximo masaje", createdAt: new Date(now.getTime() - 12 * DAY) },
    ],
  });

  return { bookings: bookings.length, customers: customers.length, sales: sales.length };
}
