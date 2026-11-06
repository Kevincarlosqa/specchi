/**
 * Fotografía de referencia de Unsplash (licencia Unsplash: uso comercial libre, sin atribución obligatoria).
 * Es provisional: no son fotos de SPECCHi. Reemplázalas por sesiones propias antes de publicar
 * (cambia el id, o adapta `unsplash()` para leer de /public).
 */
export interface Photo {
  id: string;
  alt: string;
}

const u = (id: string, alt: string): Photo => ({ id: `photo-${id}`, alt });

export const PHOTOS = {
  heroCenter: u("1531746020798-e6953c6e8e04", "Retrato de una mujer joven sobre fondo rosa"),
  heroLeft: u("1522337360788-8b13dee7a37e", "Mujer de espaldas con el cabello largo y ondulado sobre fondo malva"),
  heroRight: u("1519699047748-de8e457a634e", "Mujer con cabello rizado y luz suave sobre fondo rosa"),
  massageOil: u("1544161515-4ab6ce6db874", "Terapeuta vertiendo aceite para un masaje"),
  hotStones: u("1600334129128-685c5582fd35", "Masaje con piedras calientes y orquídeas"),
  spaStill: u("1540555700478-4be289fbecef", "Bodegón de spa con tulipanes rosados y vela"),
  oilDrop: u("1515377905703-c4788e51af15", "Manos con un gotero de aceite esencial"),
  salon: u("1560066984-138dadb4c035", "Interior de un salón de belleza luminoso"),
  stylist: u("1562322140-8baeececf3df", "Estilista secando el cabello de una clienta"),
  palette: u("1487412912498-0447578fcca8", "Paleta de sombras en tonos rosados frente a un espejo"),
  facialMask: u("1570172619644-dfd03ed5d881", "Aplicación de una mascarilla facial"),
  nailsDark: u("1604654894610-df63bc536371", "Manicure con diseño en tonos oscuros"),
  nailsSoft: u("1610992015732-2449b76344bc", "Manos con uñas en tono natural"),
  brushes: u("1516975080664-ed2fc6a32937", "Brochas de maquillaje"),
  facial: u("1552693673-1bf958298935", "Tratamiento facial con la clienta relajada"),
  blowDry: u("1580618672591-eb180b1a973f", "Estilista secando cabello con cepillo redondo"),
  citrus: u("1505944270255-72b8c68c6a70", "Rostro entre rodajas de naranja dentro del agua"),
  mask: u("1616394584738-fc6e612e71b9", "Clienta con mascarilla y turbante"),
  makeupFlat: u("1596462502278-27bfdc403348", "Brochas y maquillaje sobre fondo crema"),
  hairMask: u("1608248543803-ba4f8c70ae0b", "Tubo y caja de una mascarilla capilar"),
  headMassage: u("1512290923902-8a9f81dc236c", "Masaje de cabeza con los ojos cerrados"),
  backMassage: u("1519823551278-64ac92734fb1", "Masaje de espalda en cabina"),
  hairWash: u("1634449571010-02389ed0f9b0", "Lavado de cabello en el salón"),
  curls: u("1629397685944-7073f5589754", "Estilista ondulando cabello con iluminación"),
  makeup: u("1487412947147-5cebf100ffc2", "Maquillaje de ojos delineado y labios rosados"),
  faceMassage: u("1741934023052-26baf5535088", "Masaje facial con los ojos cerrados"),
  nailsMinimal: u("1630843599725-32ead7671867", "Manicure minimalista en tono nude"),
} as const;

export const CATEGORY_PHOTOS = {
  RITUAL: PHOTOS.massageOil,
  COUPLE: PHOTOS.hotStones,
  MASSAGE: PHOTOS.backMassage,
  BODY: PHOTOS.spaStill,
  FACIAL: PHOTOS.facial,
  HYDRO: PHOTOS.citrus,
  CUT: PHOTOS.stylist,
  COLOR: PHOTOS.curls,
  STYLING: PHOTOS.blowDry,
  HAIR_CARE: PHOTOS.hairWash,
  NAILS: PHOTOS.nailsDark,
  MAKEUP: PHOTOS.makeup,
  BROWS_LASHES: PHOTOS.palette,
  WAX: PHOTOS.nailsSoft,
} as const;

export function unsplash(photo: Photo) {
  return `https://images.unsplash.com/${photo.id}?auto=format&fit=crop&w=2000&q=80`;
}
