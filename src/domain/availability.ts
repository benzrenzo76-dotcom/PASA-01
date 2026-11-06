import { Prisma } from "@prisma/client";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { db } from "@/lib/db";
import { DomainError } from "./errors";

export const overlaps = (a: Date, b: Date, c: Date, d: Date) => a < d && b > c;
const plus = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60000);
export async function availabilityContext(
  businessId: string,
  serviceId: string,
  client: Prisma.TransactionClient = db,
) {
  const business = await client.business.findUnique({
    where: { id: businessId },
    include: { hours: true },
  });
  if (
    !business ||
    !business.published ||
    business.suspended ||
    (process.env.NODE_ENV === "production" && business.isDemo)
  )
    throw new DomainError("NOT_FOUND", "Este negocio no está disponible.", 404);
  const service = await client.service.findUnique({
    where: { businessId_id: { businessId, id: serviceId } },
    include: { assets: { include: { asset: { include: { hours: true } } } } },
  });
  if (!service?.active)
    throw new DomainError("NOT_FOUND", "Este servicio no está disponible.", 404);
  return { business, service };
}
export async function selectAssets(
  ctx: Awaited<ReturnType<typeof availabilityContext>>,
  startsAt: Date,
  staffId?: string,
  client: Prisma.TransactionClient = db,
  now = new Date(),
) {
  const { business, service } = ctx;
  const endsAt = plus(startsAt, service.duration);
  const occupiedStart = plus(startsAt, -service.bufferBefore);
  const occupiedEnd = plus(endsAt, service.bufferAfter);
  if (
    startsAt.getTime() < now.getTime() + service.minNoticeMinutes * 60000 ||
    startsAt.getTime() > now.getTime() + service.maxAdvanceDays * 86400000
  )
    return null;
  const day = formatInTimeZone(startsAt, business.timezone, "yyyy-MM-dd");
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const hour = business.hours.find((h) => h.weekday === weekday);
  if (!hour) return null;
  const atMinute = (minute: number) =>
    fromZonedTime(
      `${day}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00`,
      business.timezone,
    );
  const within = (h: { openMinute: number; closeMinute: number }) =>
    occupiedStart >= atMinute(h.openMinute) &&
    occupiedEnd <= (h.closeMinute === 1440 ? plus(atMinute(0), 1440) : atMinute(h.closeMinute));
  if (!within(hour)) return null;
  const blocks = await client.bookingBlock.findMany({
    where: {
      businessId: business.id,
      startsAt: { lt: occupiedEnd },
      endsAt: { gt: occupiedStart },
    },
  });
  if (blocks.some((b) => !b.assetId)) return null;
  const busy = await client.bookingAllocation.findMany({
    where: {
      businessId: business.id,
      active: true,
      startsAt: { lt: occupiedEnd },
      endsAt: { gt: occupiedStart },
    },
    select: { assetId: true },
  });
  const unavailable = new Set([...busy.map((b) => b.assetId), ...blocks.map((b) => b.assetId)]);
  const assigned = service.assets.map((a) => a.asset);
  if (!assigned.length) return null;
  const free = (asset: (typeof assigned)[number]) =>
    asset.active &&
    !unavailable.has(asset.id) &&
    (!asset.hours.length || asset.hours.some((h) => h.weekday === weekday && within(h)));
  const resources = assigned.filter((a) => a.kind === "RESOURCE");
  if (!resources.every(free)) return null;
  const staff = assigned.filter((a) => a.kind === "STAFF");
  if (staffId && !staff.some((a) => a.id === staffId)) return null;
  const selected = staffId ? staff.find((a) => a.id === staffId && free(a)) : staff.find(free);
  if (staff.length && !selected) return null;
  return {
    assetIds: [...resources.map((r) => r.id), ...(selected ? [selected.id] : [])],
    endsAt,
    occupiedStart,
    occupiedEnd,
  };
}
export async function listSlots(
  businessId: string,
  serviceId: string,
  day: string,
  staffId?: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)))
    throw new DomainError("INVALID_DATE", "Elegí una fecha válida.");
  const ctx = await availabilityContext(businessId, serviceId);
  const now = new Date();
  const start = fromZonedTime(`${day}T00:00:00`, ctx.business.timezone);
  if (
    start.getTime() < now.getTime() - 86400000 ||
    start.getTime() > now.getTime() + 366 * 86400000
  )
    return [];
  const hour = ctx.business.hours.find(
    (h) => h.weekday === new Date(`${day}T12:00:00Z`).getUTCDay(),
  );
  if (!hour) return [];
  const slots: { startsAt: string; label: string }[] = [];
  for (let m = hour.openMinute; m + ctx.service.duration <= hour.closeMinute; m += 15) {
    const date = plus(start, m);
    if (await selectAssets(ctx, date, staffId, db, now))
      slots.push({
        startsAt: date.toISOString(),
        label: formatInTimeZone(date, ctx.business.timezone, "HH:mm"),
      });
  }
  return slots;
}
