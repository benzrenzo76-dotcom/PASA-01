import { BookingStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { when } from "@/lib/format";
import { bookingInput } from "./validation";
import { DomainError } from "./errors";
import { availabilityContext, selectAssets } from "./availability";
import { lockBusiness } from "./business";
import { requireMember } from "./permissions";

export const transitions: Record<BookingStatus, BookingStatus[]> = {
  CONFIRMED: ["IN_PROGRESS", "CANCELED_BUSINESS", "CANCELED_CUSTOMER", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELED_BUSINESS"],
  COMPLETED: [],
  CANCELED_BUSINESS: [],
  CANCELED_CUSTOMER: [],
  NO_SHOW: [],
};
export function mayCancel(startsAt: Date, hours: number, now = new Date()) {
  return startsAt.getTime() - now.getTime() >= hours * 3600000;
}
export async function createBooking(userId: string, input: unknown) {
  const data = bookingInput.parse(input);
  try {
    return await db.$transaction(
      async (tx) => {
        await lockBusiness(tx, data.businessId);
        const previous = await tx.booking.findUnique({
          where: {
            customerId_idempotencyKey: { customerId: userId, idempotencyKey: data.idempotencyKey },
          },
        });
        if (previous) {
          if (
            previous.businessId !== data.businessId ||
            previous.serviceId !== data.serviceId ||
            previous.startsAt.toISOString() !== new Date(data.startsAt).toISOString()
          )
            throw new DomainError(
              "IDEMPOTENCY_CONFLICT",
              "La solicitud ya fue utilizada para otra reserva.",
              409,
            );
          return previous;
        }
        const ctx = await availabilityContext(data.businessId, data.serviceId, tx);
        const startsAt = new Date(data.startsAt);
        const slot = await selectAssets(ctx, startsAt, data.staffId, tx);
        if (!slot)
          throw new DomainError(
            "SLOT_TAKEN",
            "Ese horario ya no está disponible. Elegí otro.",
            409,
          );
        const futureCount = await tx.booking.count({
          where: {
            customerId: userId,
            businessId: data.businessId,
            status: "CONFIRMED",
            startsAt: { gte: new Date() },
          },
        });
        if (futureCount >= 10)
          throw new DomainError(
            "LIMIT",
            "Alcanzaste el límite de reservas futuras en este negocio.",
            429,
          );
        const booking = await tx.booking.create({
          data: {
            businessId: data.businessId,
            serviceId: data.serviceId,
            customerId: userId,
            startsAt,
            endsAt: slot.endsAt,
            serviceName: ctx.service.name,
            priceCents: ctx.service.priceCents,
            currency: ctx.service.currency,
            priceType: ctx.service.priceType,
            cancellationHours: ctx.business.cancellationHours,
            idempotencyKey: data.idempotencyKey,
            history: { create: { status: "CONFIRMED", actorId: userId } },
          },
        });
        await tx.bookingAllocation.createMany({
          data: slot.assetIds.map((assetId) => ({
            businessId: data.businessId,
            bookingId: booking.id,
            assetId,
            startsAt: slot.occupiedStart,
            endsAt: slot.occupiedEnd,
          })),
        });
        await queueNotification(tx, booking.id, "Reserva confirmada");
        await tx.auditLog.create({
          data: {
            actorId: userId,
            businessId: data.businessId,
            action: "booking.created",
            entityId: booking.id,
          },
        });
        return booking;
      },
      { maxWait: 10000, timeout: 15000 },
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2004", "P2010", "P2034"].includes(e.code)
    )
      throw new DomainError(
        "CONFLICT",
        "El horario cambió mientras reservabas. Volvé a consultar disponibilidad.",
        409,
      );
    throw e;
  }
}
async function queueNotification(tx: Prisma.TransactionClient, bookingId: string, subject: string) {
  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      customer: true,
      business: { include: { memberships: { where: { role: "OWNER" }, include: { user: true } } } },
    },
  });
  const recipients = new Set([
    booking.customer.email,
    ...booking.business.memberships.map((m) => m.user.email),
  ]);
  await tx.notification.createMany({
    data: [...recipients].map((recipient) => ({
      bookingId,
      recipient,
      subject,
      body: `${subject}\n${booking.business.name} · ${booking.serviceName}\n${when(booking.startsAt)}\nCódigo: ${booking.id}\nConsultá los detalles en tu cuenta. Esta reserva no acredita un pago.`,
    })),
  });
}
export async function transitionBooking(
  userId: string,
  bookingId: string,
  target: BookingStatus,
  asCustomer = false,
) {
  return db.$transaction(async (tx) => {
    const initial = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!initial) throw new DomainError("NOT_FOUND", "Reserva no encontrada.", 404);
    await lockBusiness(tx, initial.businessId);
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (asCustomer) {
      if (booking.customerId !== userId)
        throw new DomainError("FORBIDDEN", "No podés modificar esta reserva.", 403);
      if (target !== "CANCELED_CUSTOMER" || !mayCancel(booking.startsAt, booking.cancellationHours))
        throw new DomainError(
          "CANCEL_POLICY",
          "El plazo de cancelación online terminó. Contactá al negocio.",
          409,
        );
    } else {
      const member = await requireMember(userId, booking.businessId, ["OWNER", "EMPLOYEE"], tx);
      if (target === "CANCELED_CUSTOMER")
        throw new DomainError("INVALID_STATUS", "Solo el cliente puede usar este estado.");
      if (
        member.role === "EMPLOYEE" &&
        (!member.assetId ||
          !(await tx.bookingAllocation.count({
            where: { bookingId, assetId: member.assetId, businessId: booking.businessId },
          })))
      )
        throw new DomainError("FORBIDDEN", "La reserva no está asignada a tu agenda.", 403);
    }
    if (!transitions[booking.status].includes(target))
      throw new DomainError("INVALID_TRANSITION", "Ese cambio de estado no está permitido.", 409);
    if (["IN_PROGRESS", "COMPLETED", "NO_SHOW"].includes(target) && booking.startsAt > new Date())
      throw new DomainError("TOO_EARLY", "El turno todavía no comenzó.", 409);
    await tx.booking.update({ where: { id: bookingId }, data: { status: target } });
    if (["CANCELED_CUSTOMER", "CANCELED_BUSINESS", "NO_SHOW", "COMPLETED"].includes(target))
      await tx.bookingAllocation.updateMany({ where: { bookingId }, data: { active: false } });
    await tx.bookingStatusHistory.create({ data: { bookingId, status: target, actorId: userId } });
    if (target.startsWith("CANCELED")) await queueNotification(tx, bookingId, "Reserva cancelada");
    await tx.auditLog.create({
      data: {
        actorId: userId,
        businessId: booking.businessId,
        action: `booking.${target.toLowerCase()}`,
        entityId: bookingId,
      },
    });
  });
}
