import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
const db = new PrismaClient();
async function main() {
  if (process.env.NODE_ENV === "production" || process.env.SEED_DEMO !== "true")
    throw new Error("Seed demo bloqueado. Solo desarrollo con SEED_DEMO=true.");
  const categories = [
    "Barberías",
    "Peluquerías",
    "Tatuajes",
    "Uñas y estética",
    "Lavaderos y detailing",
    "Otros servicios",
  ];
  const slugs = [
    "barberias",
    "peluquerias",
    "tatuajes",
    "unas-estetica",
    "lavaderos-detailing",
    "otros",
  ];
  for (let i = 0; i < categories.length; i++)
    await db.businessCategory.upsert({
      where: { slug: slugs[i] },
      create: { name: categories[i], slug: slugs[i] },
      update: {},
    });
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12)
    throw new Error("Definí DEMO_PASSWORD con al menos 12 caracteres.");
  const owner = await db.user.upsert({
    where: { email: "dueno@example.test" },
    create: {
      id: "demo-owner",
      name: "Dueño Demo",
      email: "dueno@example.test",
      emailVerified: true,
    },
    update: {},
  });
  const customer = await db.user.upsert({
    where: { email: "cliente@example.test" },
    create: {
      id: "demo-customer",
      name: "Cliente Demo",
      email: "cliente@example.test",
      emailVerified: true,
    },
    update: {},
  });
  for (const user of [owner, customer])
    await db.account.upsert({
      where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
      create: {
        id: `account-${user.id}`,
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: await hashPassword(password),
      },
      update: { password: await hashPassword(password) },
    });
  const samples = [
    {
      name: "Taller del corte · Demo",
      slug: "demo-barberia",
      category: "barberias",
      service: "Corte clásico",
      duration: 30,
      price: 1200000,
      staff: "Martín · Demo",
      resource: "Sillón 1",
    },
    {
      name: "Trazo estudio · Demo",
      slug: "demo-tatuajes",
      category: "tatuajes",
      service: "Consulta de diseño",
      duration: 30,
      price: 0,
      staff: "Sol · Demo",
      resource: "Sala de consulta",
    },
    {
      name: "Estudio Lila · Demo",
      slug: "demo-unas",
      category: "unas-estetica",
      service: "Uñas esculpidas",
      duration: 90,
      price: 2500000,
      staff: "Lucía · Demo",
      resource: "Mesa 1",
    },
    {
      name: "Punto limpio · Demo",
      slug: "demo-lavadero",
      category: "lavaderos-detailing",
      service: "Lavado completo",
      duration: 60,
      price: 1800000,
      staff: null,
      resource: "Bahía de lavado",
    },
  ];
  for (const [i, sample] of samples.entries()) {
    if (await db.business.findUnique({ where: { slug: sample.slug } })) continue;
    const category = await db.businessCategory.findUniqueOrThrow({
      where: { slug: sample.category },
    });
    await db.$transaction(async (tx) => {
      const b = await tx.business.create({
        data: {
          name: sample.name,
          slug: sample.slug,
          description:
            "Negocio de demostración para probar el recorrido de reservas. No representa un comercio real.",
          city: "Monte Grande",
          categoryId: category.id,
          isDemo: true,
          published: true,
          websiteLive: {
            theme: ["MINIMAL", "URBAN", "STUDIO"][i % 3],
            accent: "teal",
            headline: "Tu próximo momento empieza acá.",
            showTeam: true,
            showAddress: true,
          },
          memberships: { create: { userId: owner.id, role: "OWNER" } },
          hours: {
            create: [1, 2, 3, 4, 5, 6].map((weekday) => ({
              weekday,
              openMinute: 540,
              closeMinute: 1080,
            })),
          },
        },
      });
      const resource = await tx.asset.create({
        data: { businessId: b.id, kind: "RESOURCE", name: sample.resource },
      });
      const staff = sample.staff
        ? await tx.asset.create({ data: { businessId: b.id, kind: "STAFF", name: sample.staff } })
        : null;
      const service = await tx.service.create({
        data: {
          businessId: b.id,
          name: sample.service,
          duration: sample.duration,
          priceCents: sample.price,
          priceType: sample.category === "tatuajes" ? "QUOTE" : "FIXED",
          bufferAfter: 15,
        },
      });
      await tx.serviceAsset.createMany({
        data: [resource, ...(staff ? [staff] : [])].map((a) => ({
          businessId: b.id,
          serviceId: service.id,
          assetId: a.id,
        })),
      });
    });
  }
  console.info(
    "Seed demo listo. Cuentas: dueno@example.test y cliente@example.test. Contraseña: la provista en DEMO_PASSWORD.",
  );
}
main().finally(() => db.$disconnect());
