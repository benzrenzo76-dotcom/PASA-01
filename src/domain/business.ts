import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMember } from "./permissions";
import { businessInput, hoursInput, serviceInput, themeInput } from "./validation";
import { DomainError } from "./errors";

export async function lockBusiness(tx: Prisma.TransactionClient, businessId: string) {
  const result = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM "Business" WHERE id = ${businessId} FOR UPDATE`;
  if (!result.length) throw new DomainError("NOT_FOUND", "No encontramos el negocio.", 404);
}
export async function createBusiness(userId: string, input: unknown) {
  const data = businessInput.parse(input);
  return db.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: { ...data, memberships: { create: { userId, role: "OWNER" } } },
    });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        businessId: business.id,
        action: "business.created",
        entityId: business.id,
      },
    });
    return business;
  });
}
export async function ownerMutation<T>(
  userId: string,
  businessId: string,
  action: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return db.$transaction(
    async (tx) => {
      await lockBusiness(tx, businessId);
      await requireMember(userId, businessId, ["OWNER"], tx);
      const result = await fn(tx);
      await tx.auditLog.create({
        data: { actorId: userId, businessId, action, entityId: businessId },
      });
      return result;
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
export async function addService(userId: string, businessId: string, input: unknown) {
  const { assetIds, ...data } = serviceInput.parse(input);
  return ownerMutation(userId, businessId, "service.created", async (tx) => {
    const assets = await tx.asset.findMany({
      where: { businessId, id: { in: assetIds }, active: true },
    });
    if (assets.length !== new Set(assetIds).size)
      throw new DomainError("INVALID_ASSET", "Los recursos deben pertenecer a este negocio.");
    if (!assets.length)
      throw new DomainError(
        "REQUIRED_ASSET",
        "Asigná al menos un profesional o recurso para controlar capacidad.",
      );
    const service = await tx.service.create({ data: { ...data, businessId } });
    await tx.serviceAsset.createMany({
      data: assets.map((a) => ({ assetId: a.id, businessId, serviceId: service.id })),
    });
    return service;
  });
}
export async function addAsset(userId: string, businessId: string, input: unknown) {
  const data = z
    .object({ name: z.string().trim().min(2).max(100), kind: z.enum(["STAFF", "RESOURCE"]) })
    .parse(input);
  return ownerMutation(userId, businessId, "asset.created", (tx) =>
    tx.asset.create({ data: { ...data, businessId } }),
  );
}
export async function revokeEmployee(userId: string, businessId: string, employeeId: string) {
  return ownerMutation(userId, businessId, "membership.revoked", async (tx) => {
    const member = await tx.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId: employeeId } },
    });
    if (!member || member.role !== "EMPLOYEE")
      throw new DomainError("INVALID_MEMBER", "Solo se puede revocar el acceso de un empleado.");
    await tx.businessMembership.delete({ where: { id: member.id } });
  });
}
export async function removeBlock(userId: string, businessId: string, blockId: string) {
  return ownerMutation(userId, businessId, "block.removed", async (tx) => {
    const block = await tx.bookingBlock.findFirst({ where: { id: blockId, businessId } });
    if (!block) throw new DomainError("NOT_FOUND", "Bloqueo no encontrado.", 404);
    await tx.bookingBlock.delete({ where: { id: blockId } });
  });
}
export async function setHours(
  userId: string,
  businessId: string,
  input: unknown,
  assetId?: string,
) {
  const rows = hoursInput.parse(input);
  return ownerMutation(userId, businessId, "hours.updated", async (tx) => {
    if (assetId) {
      const asset = await tx.asset.findUnique({
        where: { businessId_id: { businessId, id: assetId } },
      });
      if (!asset) throw new DomainError("NOT_FOUND", "No encontramos el recurso.", 404);
      await tx.assetHours.deleteMany({ where: { businessId, assetId } });
      await tx.assetHours.createMany({ data: rows.map((r) => ({ ...r, businessId, assetId })) });
    } else {
      await tx.businessHours.deleteMany({ where: { businessId } });
      await tx.businessHours.createMany({ data: rows.map((r) => ({ ...r, businessId })) });
    }
  });
}
export async function saveWebsite(
  userId: string,
  businessId: string,
  input: unknown,
  publish = false,
) {
  const theme = themeInput.parse(input);
  return ownerMutation(
    userId,
    businessId,
    publish ? "website.published" : "website.draft_saved",
    async (tx) => {
      if (publish) {
        const [hours, services] = await Promise.all([
          tx.businessHours.count({ where: { businessId } }),
          tx.service.count({ where: { businessId, active: true, assets: { some: {} } } }),
        ]);
        if (!hours || !services)
          throw new DomainError(
            "INCOMPLETE",
            "Agregá horarios y un servicio con recursos antes de publicar.",
          );
        const business = await tx.business.findUniqueOrThrow({ where: { id: businessId } });
        if (business.suspended)
          throw new DomainError("SUSPENDED", "El negocio está suspendido.", 403);
      }
      return tx.business.update({
        where: { id: businessId },
        data: { websiteDraft: theme, ...(publish ? { websiteLive: theme, published: true } : {}) },
      });
    },
  );
}
export async function addBlock(userId: string, businessId: string, input: unknown) {
  const data = z
    .object({
      assetId: z.string().optional(),
      startsAt: z.coerce.date(),
      endsAt: z.coerce.date(),
      reason: z.string().trim().min(2).max(200),
    })
    .refine((d) => d.startsAt < d.endsAt, "Intervalo inválido.")
    .parse(input);
  return ownerMutation(userId, businessId, "block.created", async (tx) => {
    if (
      data.assetId &&
      !(await tx.asset.findUnique({ where: { businessId_id: { businessId, id: data.assetId } } }))
    )
      throw new DomainError("INVALID_ASSET", "Recurso ajeno al negocio.");
    const conflicts = await tx.bookingAllocation.count({
      where: {
        businessId,
        ...(data.assetId ? { assetId: data.assetId } : {}),
        active: true,
        startsAt: { lt: data.endsAt },
        endsAt: { gt: data.startsAt },
      },
    });
    if (conflicts)
      throw new DomainError(
        "CONFLICT",
        "Hay reservas en ese intervalo. Resolvelas antes de bloquearlo.",
        409,
      );
    return tx.bookingBlock.create({ data: { ...data, businessId } });
  });
}
