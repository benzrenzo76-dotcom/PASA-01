import { z } from "zod";
const text = (max: number) => z.string().trim().min(1).max(max);
export const businessInput = z.object({
  name: text(100),
  slug: text(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usá letras minúsculas, números y guiones."),
  categoryId: text(100),
  city: text(100),
  address: z.string().trim().max(200).default(""),
  description: z.string().trim().max(2000).default(""),
  phone: z.string().trim().max(40).default(""),
});
export const themeInput = z.object({
  theme: z.enum(["MINIMAL", "URBAN", "STUDIO"]).default("MINIMAL"),
  accent: z.enum(["teal", "orange", "violet"]).default("teal"),
  headline: z.string().trim().max(140).default(""),
  showTeam: z.boolean().default(true),
  showAddress: z.boolean().default(true),
});
export const serviceInput = z.object({
  name: text(100),
  description: z.string().trim().max(2000).default(""),
  duration: z.coerce.number().int().min(15).max(720).multipleOf(15),
  priceCents: z.coerce.number().int().min(0).max(100000000),
  priceType: z.enum(["FIXED", "ESTIMATED", "QUOTE"]),
  bufferBefore: z.coerce.number().int().min(0).max(120).default(0),
  bufferAfter: z.coerce.number().int().min(0).max(120).default(0),
  minNoticeMinutes: z.coerce.number().int().min(0).max(10080).default(60),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365).default(60),
  assetIds: z.array(text(100)).max(30).default([]),
});
export const bookingInput = z
  .object({
    businessId: text(100),
    serviceId: text(100),
    startsAt: z.iso.datetime({ offset: true }),
    staffId: text(100).optional(),
    idempotencyKey: z.uuid(),
  })
  .strict();
export const hoursInput = z
  .array(
    z
      .object({
        weekday: z.number().int().min(0).max(6),
        openMinute: z.number().int().min(0).max(1439),
        closeMinute: z.number().int().min(1).max(1440),
      })
      .refine((h) => h.openMinute < h.closeMinute, "La apertura debe ser anterior al cierre."),
  )
  .max(7)
  .refine((rows) => new Set(rows.map((r) => r.weekday)).size === rows.length, "Días repetidos.");
