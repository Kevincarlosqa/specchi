import type { BookingChannel, BookingStatus, DocType, PaymentMethod, Role, ServiceCategory, StylistLevel } from "@/generated/prisma/enums";

export const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

export const CHANNEL_LABELS: Record<BookingChannel, string> = {
  WHATSAPP: "WhatsApp",
  WEB: "Web",
  DASHBOARD: "Dashboard",
  PHONE: "Teléfono",
  WALK_IN: "Walk-in",
};

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  RITUAL: "Rituales",
  COUPLE: "En pareja",
  MASSAGE: "Masajes",
  BODY: "Corporales",
  FACIAL: "Faciales",
  HYDRO: "Hidroterapia",
  CUT: "Corte",
  COLOR: "Color",
  STYLING: "Peinado",
  HAIR_CARE: "Tratamientos",
  NAILS: "Manos y pies",
  MAKEUP: "Maquillaje",
  BROWS_LASHES: "Cejas y pestañas",
  WAX: "Depilación",
};

export const SPA_CATEGORIES: ServiceCategory[] = ["RITUAL", "COUPLE", "MASSAGE", "BODY", "FACIAL", "HYDRO"];
export const SALON_CATEGORIES: ServiceCategory[] = ["CUT", "COLOR", "STYLING", "HAIR_CARE", "NAILS", "MAKEUP", "BROWS_LASHES", "WAX"];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  YAPE: "Yape",
  PLIN: "Plin",
  TRANSFER: "Transferencia",
  GIFT_CARD: "Gift card",
};

export const DOC_LABELS: Record<DocType, string> = { BOLETA: "Boleta", FACTURA: "Factura", NOTA_VENTA: "Nota de venta" };

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Dirección",
  ADMIN: "Administración",
  BRANCH_MANAGER: "Gerencia de sede",
  RECEPTION: "Recepción",
  STYLIST: "Especialista",
};

export const LEVEL_LABELS: Record<StylistLevel, string> = { JUNIOR: "Junior", SENIOR: "Senior", MASTER: "Master" };
