import { test, expect, request as newRequest } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  createBusiness,
  addAsset,
  addService,
  setHours,
  saveWebsite,
} from "../../src/domain/business";
const db = new PrismaClient();
test("API E2E: registro, sesión, negocio, publicación, marketplace, reserva y protección", async ({
  request,
}) => {
  const suffix = randomUUID();
  const email = `owner-${suffix}@example.test`;
  const customerEmail = `customer-${suffix}@example.test`;
  const origin = "http://localhost:3100";
  const headers = { origin };
  let businessId: string | undefined;
  try {
    const signup = await request.post("/api/auth/sign-up/email", {
      headers,
      data: { email, password: "Prueba-segura-123456", name: "Propietario E2E" },
    });
    expect(signup.ok(), await signup.text()).toBe(true);
    const owner = (await signup.json()).user;
    const session = await request.get("/api/auth/get-session");
    expect((await session.json()).user.id).toBe(owner.id);
    const category = await db.businessCategory.upsert({
      where: { slug: "e2e" },
      create: { slug: "e2e", name: "E2E" },
      update: {},
    });
    const b = await createBusiness(owner.id, {
      name: `Negocio E2E ${suffix}`,
      slug: `e2e-${suffix}`,
      categoryId: category.id,
      city: "Monte Grande",
    });
    businessId = b.id;
    const asset = await addAsset(owner.id, b.id, { name: "Bahía", kind: "RESOURCE" });
    const service = await addService(owner.id, b.id, {
      name: "Lavado E2E",
      duration: 60,
      priceCents: 2500000,
      priceType: "ESTIMATED",
      minNoticeMinutes: 0,
      assetIds: [asset.id],
    });
    await setHours(
      owner.id,
      b.id,
      Array.from({ length: 7 }, (_, weekday) => ({ weekday, openMinute: 540, closeMinute: 1080 })),
    );
    await saveWebsite(owner.id, b.id, { theme: "URBAN", headline: "Reserva real de prueba" }, true);
    const page = await request.get(`/negocio/${b.slug}`);
    expect(page.ok()).toBe(true);
    expect(await page.text()).toContain("Lavado E2E");
    const marketplace = await request.get(`/?q=${encodeURIComponent(b.name)}`);
    expect(await marketplace.text()).toContain(b.slug);
    const customer = await newRequest.newContext({ baseURL: origin });
    try {
      const customerSignup = await customer.post("/api/auth/sign-up/email", {
        headers,
        data: { email: customerEmail, password: "Cliente-seguro-123456", name: "Cliente E2E" },
      });
      expect(customerSignup.ok(), await customerSignup.text()).toBe(true);
      const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
      const slotsResponse = await customer.get(
        `/api/availability?businessId=${b.id}&serviceId=${service.id}&day=${day}`,
      );
      expect(slotsResponse.ok()).toBe(true);
      const slots = (await slotsResponse.json()).slots;
      expect(slots.length).toBeGreaterThan(0);
      const input = {
        businessId: b.id,
        serviceId: service.id,
        startsAt: slots[0].startsAt,
        idempotencyKey: randomUUID(),
      };
      const tampered = await customer.post("/api/bookings", {
        headers,
        data: { ...input, priceCents: 1 },
      });
      expect(tampered.status()).toBe(400);
      const wrongOrigin = await customer.post("/api/bookings", {
        headers: { origin: "https://attacker.example" },
        data: input,
      });
      expect(wrongOrigin.status()).toBe(403);
      const reserve = await customer.post("/api/bookings", { headers, data: input });
      expect(reserve.status(), await reserve.text()).toBe(201);
      const booking = (await reserve.json()).booking;
      expect(booking.priceCents).toBe(2500000);
      const retry = await customer.post("/api/bookings", { headers, data: input });
      expect((await retry.json()).booking.id).toBe(booking.id);
      const duplicate = await request.post("/api/bookings", {
        headers,
        data: { ...input, idempotencyKey: randomUUID() },
      });
      expect(duplicate.status()).toBe(409);
      const history = await customer.get("/mis-reservas");
      expect(await history.text()).toContain("Lavado E2E");
      const dashboard = await request.get(`/panel/${b.id}?tab=agenda`);
      expect(await dashboard.text()).toContain("Cliente E2E");
      // App Router may already have streamed HTTP 200 when notFound() is reached.
      // Verify the denied page and absence of private content in either case.
      const forbidden = await customer.get(`/panel/${b.id}`);
      const forbiddenBody = await forbidden.text();
      expect([200, 404]).toContain(forbidden.status());
      expect(forbiddenBody).toContain("No encontramos esta página");
      expect(forbiddenBody).not.toContain("Lavado E2E");
      const admin = await customer.get("/admin");
      expect(await admin.text()).toContain("No encontramos esta página");
      const signout = await customer.post("/api/auth/sign-out", { headers, data: {} });
      expect(signout.ok()).toBe(true);
      const unauthenticated = await customer.post("/api/bookings", {
        headers,
        data: { ...input, idempotencyKey: randomUUID() },
      });
      expect(unauthenticated.status()).toBe(401);
      const login = await customer.post("/api/auth/sign-in/email", {
        headers,
        data: { email: customerEmail, password: "Cliente-seguro-123456" },
      });
      expect(login.ok()).toBe(true);
    } finally {
      await customer.dispose();
    }
  } finally {
    const users = await db.user.findMany({
      where: { email: { in: [email, customerEmail] } },
      select: { id: true },
    });
    await db.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
    if (businessId) {
      await db.booking.deleteMany({ where: { businessId } });
      await db.business.delete({ where: { id: businessId } });
    }
    await db.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await db.$disconnect();
  }
});
