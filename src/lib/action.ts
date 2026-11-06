import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { DomainError } from "@/domain/errors";
export type ActionState = { error?: string; success?: string };
export function errorMessage(error: unknown) {
  if (error instanceof DomainError) return error.message;
  if (error instanceof ZodError) return error.issues.map((i) => i.message).join(" · ");
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    return "Ese identificador ya está en uso.";
  console.error("[operation_failed]", error instanceof Error ? error.name : "unknown");
  return "No pudimos guardar el cambio. Intentá nuevamente.";
}
