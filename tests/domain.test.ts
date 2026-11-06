import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  createBusiness,
  addAsset,
  addService,
  setHours,
  saveWebsite,
  addBlock,
  removeBlock,
  revokeEmployee,
} from "@/domain/business";
import { createBooking, transitionBooking, mayCancel, transitions } from "@/domain/bookings";
import { listSlots, overlaps } from "@/domain/availability";
import { requireMember, requireAdmin } from "@/domain/permissions";
import { themeInput } from "@/domain/validation";
const ownerId = randomUUID(),
  clientId = randomUUID(),
  otherId = randomUUID();
let categoryId: string;
const userIds = [ownerId, clientId, otherId];
const businessIds: string[] = [];
async function fixture({ staff = true, duration = 30, buffer = 0 } = {}) {
  const b = await createBusiness(ownerId, {
    name: "Negocio de prueba",
    slug: `test-${randomUUID()}`,
    categoryId,
    city: "Monte Grande",
  });
  businessIds.push(b.id);
  const resource = await addAsset(ownerId, b.id, { name: "Box", kind: "RESOURCE" });
  const professional = staff
    ? await addAsset(ownerId, b.id, { name: "Profesional", kind: "STAFF" })
    : null;
  const s = await addService(ownerId, b.id, {
    name: "Servicio",
    duration,
    priceCents: 1500000,
    priceType: "FIXED",
    minNoticeMinutes: 0,
    bufferAfter: buffer,
    assetIds: [resource.id, ...(professional ? [professional.id] : [])],
  });
  await setHours(
    ownerId,
    b.id,
    Array.from({ length: 7 }, (_, weekday) => ({ weekday, openMinute: 540, closeMinute: 1080 })),
  );
  await saveWebsite(ownerId, b.id, { theme: "MINIMAL" }, true);
  const day = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const start = `${day}T13:00:00.000Z`; // 10:00 Argentina
  const input = () => ({
    businessId: b.id,
    serviceId: s.id,
    startsAt: start,
    idempotencyKey: randomUUID(),
  });
  return { b, s, resource, professional, day, start, input };
}
beforeAll(async () => {
  for (const id of userIds)
    await db.user.create({
      data: { id, name: "Prueba", email: `${id}@example.test`, emailVerified: true },
    });
  categoryId = (
    await db.businessCategory.upsert({
      where: { slug: "test" },
      create: { name: "Prueba", slug: "test" },
      update: {},
    })
  ).id;
});
afterAll(async () => {
  await db.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await db.booking.deleteMany({ where: { businessId: { in: businessIds } } });
  await db.business.deleteMany({ where: { id: { in: businessIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});
describe("Disponibilidad y reservas con PostgreSQL real", () => {
  it("publica un negocio y reserva con precio servidor, recursos y notificaciones", async () => {
    const f = await fixture();
    const slots = await listSlots(f.b.id, f.s.id, f.day);
    expect(slots.some((s) => s.startsAt === f.start)).toBe(true);
    const b = await createBooking(clientId, f.input());
    expect(b.priceCents).toBe(1500000);
    expect(await db.bookingAllocation.count({ where: { bookingId: b.id } })).toBe(2);
    expect(await db.notification.count({ where: { bookingId: b.id } })).toBe(2);
    expect((await listSlots(f.b.id, f.s.id, f.day)).some((s) => s.startsAt === f.start)).toBe(
      false,
    );
  });
  it("resuelve dos reservas simultáneas: solo una ocupa el recurso", async () => {
    const f = await fixture({ staff: false });
    const results = await Promise.allSettled([
      createBooking(clientId, f.input()),
      createBooking(otherId, f.input()),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(await db.booking.count({ where: { businessId: f.b.id } })).toBe(1);
  });
  it("es idempotente cuando el cliente reintenta", async () => {
    const f = await fixture();
    const input = f.input();
    const first = await createBooking(clientId, input);
    const retry = await createBooking(clientId, input);
    expect(retry.id).toBe(first.id);
    await expect(
      createBooking(clientId, { ...input, startsAt: `${f.day}T14:00:00Z` }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("rechaza horarios fuera de apertura y de anticipación", async () => {
    const f = await fixture();
    await expect(
      createBooking(clientId, { ...f.input(), startsAt: `${f.day}T04:00:00Z` }),
    ).rejects.toMatchObject({ code: "SLOT_TAKEN" });
    await expect(
      createBooking(clientId, {
        ...f.input(),
        startsAt: new Date(Date.now() - 60000).toISOString(),
      }),
    ).rejects.toMatchObject({ code: "SLOT_TAKEN" });
  });
  it("respeta buffers y permite turnos adyacentes fuera del buffer", async () => {
    const f = await fixture({ buffer: 15 });
    await createBooking(clientId, f.input());
    await expect(
      createBooking(otherId, { ...f.input(), startsAt: `${f.day}T13:30:00Z` }),
    ).rejects.toMatchObject({ code: "SLOT_TAKEN" });
    expect(
      (await createBooking(otherId, { ...f.input(), startsAt: `${f.day}T13:45:00Z` })).status,
    ).toBe("CONFIRMED");
  });
  it("considera ausencia del profesional y bloqueo del negocio", async () => {
    const f = await fixture();
    await addBlock(ownerId, f.b.id, {
      assetId: f.professional!.id,
      startsAt: f.start,
      endsAt: `${f.day}T14:00:00Z`,
      reason: "Ausencia",
    });
    await expect(createBooking(clientId, f.input())).rejects.toMatchObject({ code: "SLOT_TAKEN" });
    const g = await fixture();
    await addBlock(ownerId, g.b.id, {
      startsAt: g.start,
      endsAt: `${g.day}T14:00:00Z`,
      reason: "Vacaciones",
    });
    await expect(createBooking(clientId, g.input())).rejects.toMatchObject({ code: "SLOT_TAKEN" });
  });
  it("no permite crear un bloqueo sobre reservas vigentes", async () => {
    const f = await fixture();
    await createBooking(clientId, f.input());
    await expect(
      addBlock(ownerId, f.b.id, {
        startsAt: f.start,
        endsAt: `${f.day}T14:00:00Z`,
        reason: "Mantenimiento",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("respeta horarios propios de un profesional", async () => {
    const f = await fixture();
    await setHours(
      ownerId,
      f.b.id,
      [{ weekday: new Date(`${f.day}T12:00:00Z`).getUTCDay(), openMinute: 840, closeMinute: 1080 }],
      f.professional!.id,
    );
    await expect(createBooking(clientId, f.input())).rejects.toMatchObject({ code: "SLOT_TAKEN" });
  });
  it("asigna automáticamente otro profesional libre", async () => {
    const f = await fixture();
    const a = await addAsset(ownerId, f.b.id, { name: "Segundo", kind: "STAFF" });
    const s = await addService(ownerId, f.b.id, {
      name: "Profesional sin box",
      duration: 30,
      priceCents: 0,
      priceType: "QUOTE",
      minNoticeMinutes: 0,
      assetIds: [a.id, f.professional!.id],
    });
    await createBooking(clientId, f.input());
    const b = await createBooking(otherId, { ...f.input(), serviceId: s.id });
    expect(
      (await db.bookingAllocation.findFirstOrThrow({ where: { bookingId: b.id } })).assetId,
    ).toBe(a.id);
  });
  it("la cancelación libera capacidad y conserva el historial", async () => {
    const f = await fixture();
    const b = await createBooking(clientId, f.input());
    await transitionBooking(clientId, b.id, "CANCELED_CUSTOMER", true);
    expect(await db.bookingAllocation.count({ where: { bookingId: b.id, active: true } })).toBe(0);
    expect(await db.bookingStatusHistory.count({ where: { bookingId: b.id } })).toBe(2);
    await createBooking(otherId, f.input());
    await expect(transitionBooking(clientId, b.id, "IN_PROGRESS", true)).rejects.toBeDefined();
  });
  it("rechaza cancelación fuera del plazo", async () => {
    const f = await fixture();
    const b = await createBooking(clientId, f.input());
    await db.booking.update({ where: { id: b.id }, data: { cancellationHours: 168 } });
    await expect(
      transitionBooking(clientId, b.id, "CANCELED_CUSTOMER", true),
    ).rejects.toMatchObject({ code: "CANCEL_POLICY" });
  });
  it("no permite completar un turno futuro ni saltear estados", async () => {
    const f = await fixture();
    const b = await createBooking(clientId, f.input());
    await expect(transitionBooking(ownerId, b.id, "COMPLETED")).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    await expect(transitionBooking(ownerId, b.id, "IN_PROGRESS")).rejects.toMatchObject({
      code: "TOO_EARLY",
    });
  });
});
describe("Aislamiento y límites", () => {
  it("impide leer permisos o mutar servicios de otro tenant", async () => {
    const f = await fixture();
    await expect(requireMember(otherId, f.b.id)).rejects.toMatchObject({ status: 403 });
    await expect(
      addAsset(otherId, f.b.id, { name: "Intruso", kind: "RESOURCE" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(saveWebsite(otherId, f.b.id, { theme: "URBAN" }, true)).rejects.toMatchObject({
      status: 403,
    });
  });
  it("rechaza recursos y servicios de otro negocio", async () => {
    const f = await fixture();
    const g = await fixture();
    await expect(
      addService(ownerId, f.b.id, {
        name: "Ajeno",
        duration: 30,
        priceCents: 0,
        priceType: "QUOTE",
        assetIds: [g.resource.id],
      }),
    ).rejects.toMatchObject({ code: "INVALID_ASSET" });
    await expect(
      createBooking(clientId, { ...f.input(), serviceId: g.s.id }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("rechaza alteración de precio enviada por el cliente", async () => {
    const f = await fixture();
    await expect(createBooking(clientId, { ...f.input(), priceCents: 1 })).rejects.toBeDefined();
    expect(await db.booking.count({ where: { businessId: f.b.id } })).toBe(0);
  });
  it("un cliente no cancela reservas de otra persona", async () => {
    const f = await fixture();
    const b = await createBooking(clientId, f.input());
    await expect(transitionBooking(otherId, b.id, "CANCELED_CUSTOMER", true)).rejects.toMatchObject(
      { status: 403 },
    );
  });
  it("un empleado solo opera su agenda y no tiene permisos de propietario", async () => {
    const f = await fixture();
    const b = await createBooking(clientId, f.input());
    await db.businessMembership.create({
      data: { businessId: f.b.id, userId: otherId, role: "EMPLOYEE", assetId: f.professional!.id },
    });
    await expect(
      addAsset(otherId, f.b.id, { name: "No autorizado", kind: "RESOURCE" }),
    ).rejects.toMatchObject({ status: 403 });
    await transitionBooking(otherId, b.id, "CANCELED_BUSINESS");
    const g = await fixture();
    const other = await createBooking(clientId, g.input());
    await expect(transitionBooking(otherId, other.id, "CANCELED_BUSINESS")).rejects.toMatchObject({
      status: 403,
    });
  });
  it("protege administración y publicación incompleta", async () => {
    await expect(requireAdmin(ownerId)).rejects.toMatchObject({ status: 403 });
    const b = await createBusiness(ownerId, {
      name: "Borrador",
      slug: `draft-${randomUUID()}`,
      categoryId,
      city: "Monte Grande",
    });
    businessIds.push(b.id);
    await expect(saveWebsite(ownerId, b.id, {}, true)).rejects.toMatchObject({
      code: "INCOMPLETE",
    });
  });
  it("PostgreSQL rechaza asignaciones solapadas aunque se omita el dominio", async () => {
    const f = await fixture();
    const b = await createBooking(clientId, f.input());
    const second = await createBooking(otherId, { ...f.input(), startsAt: `${f.day}T15:00:00Z` });
    await expect(
      db.bookingAllocation.updateMany({
        where: { bookingId: second.id, assetId: f.resource.id },
        data: { startsAt: b.startsAt, endsAt: b.endsAt },
      }),
    ).rejects.toBeDefined();
  });
});
describe("Operaciones y revocación", () => {
  it("completa un turno iniciado y conserva las reservas para métricas", async () => {
    const f = await fixture();
    const b = await createBooking(clientId, f.input());
    await db.booking.update({
      where: { id: b.id },
      data: { startsAt: new Date(Date.now() - 3600000), endsAt: new Date(Date.now() - 1800000) },
    });
    await transitionBooking(ownerId, b.id, "IN_PROGRESS");
    await transitionBooking(ownerId, b.id, "COMPLETED");
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("COMPLETED");
    expect(await db.bookingAllocation.count({ where: { bookingId: b.id, active: true } })).toBe(0);
    expect(await db.bookingStatusHistory.count({ where: { bookingId: b.id } })).toBe(3);
  });
  it("solo el propietario elimina bloqueos del mismo negocio", async () => {
    const f = await fixture();
    const g = await fixture();
    const block = await addBlock(ownerId, f.b.id, {
      startsAt: f.start,
      endsAt: `${f.day}T14:00:00Z`,
      reason: "Ausencia",
    });
    await expect(removeBlock(otherId, f.b.id, block.id)).rejects.toMatchObject({ status: 403 });
    await expect(removeBlock(ownerId, g.b.id, block.id)).rejects.toMatchObject({ status: 404 });
    await removeBlock(ownerId, f.b.id, block.id);
    await createBooking(clientId, f.input());
  });
  it("revocar empleado impide operaciones posteriores sin borrar historial", async () => {
    const f = await fixture();
    const b = await createBooking(clientId, f.input());
    await db.businessMembership.create({
      data: { businessId: f.b.id, userId: otherId, role: "EMPLOYEE", assetId: f.professional!.id },
    });
    await expect(revokeEmployee(otherId, f.b.id, ownerId)).rejects.toMatchObject({ status: 403 });
    await expect(revokeEmployee(ownerId, f.b.id, ownerId)).rejects.toMatchObject({
      code: "INVALID_MEMBER",
    });
    await revokeEmployee(ownerId, f.b.id, otherId);
    await expect(transitionBooking(otherId, b.id, "CANCELED_BUSINESS")).rejects.toMatchObject({
      status: 403,
    });
    expect(await db.booking.count({ where: { id: b.id } })).toBe(1);
  });
});
describe("Reglas puras", () => {
  it("los intervalos adyacentes no se solapan", () => {
    expect(overlaps(new Date(0), new Date(10), new Date(10), new Date(20))).toBe(false);
    expect(overlaps(new Date(0), new Date(11), new Date(10), new Date(20))).toBe(true);
  });
  it("respeta el borde de cancelación", () => {
    expect(mayCancel(new Date(3600000), 1, new Date(0))).toBe(true);
    expect(mayCancel(new Date(3599999), 1, new Date(0))).toBe(false);
  });
  it("los estados terminales no se reabren y el tema no acepta JS/CSS", () => {
    expect(transitions.COMPLETED).toEqual([]);
    expect(themeInput.safeParse({ theme: "<script>" }).success).toBe(false);
  });
});
