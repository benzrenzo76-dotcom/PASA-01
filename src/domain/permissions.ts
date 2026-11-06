import { Prisma, MemberRole } from "@prisma/client";
import { db } from "@/lib/db";
import { DomainError } from "./errors";
export async function requireMember(
  userId: string,
  businessId: string,
  roles: MemberRole[] = ["OWNER"],
  client: Prisma.TransactionClient = db,
) {
  const member = await client.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId } },
  });
  if (!member || !roles.includes(member.role))
    throw new DomainError("FORBIDDEN", "No tenés permiso para operar este negocio.", 403);
  return member;
}
export async function requireAdmin(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.isAdmin) throw new DomainError("FORBIDDEN", "Acceso reservado a administración.", 403);
}
