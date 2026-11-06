export const TZ = "America/Argentina/Buenos_Aires";
export function money(cents: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
export function when(date: Date | string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
export const statusLabels: Record<string, string> = {
  CONFIRMED: "Confirmada",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
  CANCELED_CUSTOMER: "Cancelada por cliente",
  CANCELED_BUSINESS: "Cancelada por negocio",
  NO_SHOW: "No asistió",
};
