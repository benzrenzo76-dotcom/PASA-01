import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const categories = {
  barberias: "Barberías",
  peluquerias: "Peluquerías",
  tatuajes: "Tatuajes",
  "unas-estetica": "Uñas y estética",
  "lavaderos-detailing": "Lavaderos y detailing",
  otros: "Otros servicios",
};
async function main() {
  for (const [slug, name] of Object.entries(categories))
    await db.businessCategory.upsert({ where: { slug }, create: { slug, name }, update: {} });
}
main().finally(() => db.$disconnect());
