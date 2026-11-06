"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BookingStatus } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { errorMessage, type ActionState } from "@/lib/action";
import {
  createBusiness,
  addService,
  addAsset,
  setHours,
  saveWebsite,
  addBlock,
  ownerMutation,
  lockBusiness,
  revokeEmployee,
  removeBlock,
} from "@/domain/business";
import { transitionBooking } from "@/domain/bookings";
import { requireAdmin } from "@/domain/permissions";
import { DomainError } from "@/domain/errors";
import { businessInput } from "@/domain/validation";
import { TZ } from "@/lib/format";

const fields = (form: FormData) => Object.fromEntries(form.entries());
const str = (form: FormData, key: string) => String(form.get(key) ?? "");
function refresh(id: string) {
  revalidatePath(`/panel/${id}`);
  revalidatePath("/");
  revalidatePath("/negocio/[slug]", "page");
  revalidatePath("/mis-reservas");
}
export async function createBusinessAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  let id: string;
  try {
    id = (await createBusiness(user.id, fields(form))).id;
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/panel");
  redirect(`/panel/${id}?tab=servicios`);
}
export async function settingsAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = str(form, "businessId");
  try {
    const data = businessInput
      .omit({ slug: true, categoryId: true })
      .extend({ cancellationHours: z.coerce.number().int().min(0).max(168) })
      .parse(fields(form));
    await ownerMutation(user.id, id, "business.updated", (tx) =>
      tx.business.update({ where: { id }, data }),
    );
    refresh(id);
    return { success: "Configuración guardada." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function serviceAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = str(form, "businessId");
  try {
    const pesos = z.coerce.number().min(0).max(1000000).parse(form.get("price"));
    await addService(user.id, id, {
      ...fields(form),
      priceCents: Math.round(pesos * 100),
      assetIds: form.getAll("assetIds"),
    });
    refresh(id);
    return { success: "Servicio creado." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function assetAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = str(form, "businessId");
  try {
    await addAsset(user.id, id, fields(form));
    refresh(id);
    return { success: "Profesional o recurso creado." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function hoursAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = str(form, "businessId");
  const minute = (value: string) => {
    if (!/^\d{2}:\d{2}$/.test(value)) return NaN;
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  };
  try {
    const rows = form.getAll("weekdays").map((day) => ({
      weekday: Number(day),
      openMinute: minute(str(form, "open")),
      closeMinute: minute(str(form, "close")),
    }));
    await setHours(user.id, id, rows, str(form, "assetId") || undefined);
    refresh(id);
    return { success: "Horarios guardados. Las reservas existentes se conservan." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function websiteAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = str(form, "businessId");
  try {
    await saveWebsite(
      user.id,
      id,
      { ...fields(form), showTeam: form.has("showTeam"), showAddress: form.has("showAddress") },
      form.get("intent") === "publish",
    );
    refresh(id);
    return {
      success: form.get("intent") === "publish" ? "Micrositio publicado." : "Borrador guardado.",
    };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function blockAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = str(form, "businessId");
  try {
    await addBlock(user.id, id, {
      reason: str(form, "reason"),
      assetId: str(form, "assetId") || undefined,
      startsAt: fromZonedTime(str(form, "start"), TZ),
      endsAt: fromZonedTime(str(form, "end"), TZ),
    });
    refresh(id);
    return { success: "Bloqueo creado." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function statusAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    const status = z.enum(BookingStatus).parse(form.get("status"));
    await transitionBooking(
      user.id,
      str(form, "bookingId"),
      status,
      form.get("asCustomer") === "true",
    );
    revalidatePath("/panel", "layout");
    revalidatePath("/mis-reservas");
    return { success: "Estado actualizado." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function toggleServiceAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = str(form, "businessId");
  try {
    await ownerMutation(user.id, id, "service.toggled", async (tx) => {
      const service = await tx.service.findUnique({
        where: { businessId_id: { businessId: id, id: str(form, "serviceId") } },
      });
      if (!service) throw new DomainError("NOT_FOUND", "Servicio no encontrado.", 404);
      await tx.service.update({ where: { id: service.id }, data: { active: !service.active } });
    });
    refresh(id);
    return { success: "Servicio actualizado." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function memberAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = str(form, "businessId");
  try {
    const email = z.email().parse(str(form, "email"));
    const assetId = str(form, "assetId");
    await ownerMutation(user.id, id, "membership.granted", async (tx) => {
      const employee = await tx.user.findUnique({ where: { email } });
      if (!employee)
        throw new DomainError(
          "NOT_REGISTERED",
          "Esa persona debe crear una cuenta antes de recibir acceso.",
        );
      const asset = await tx.asset.findUnique({
        where: { businessId_id: { businessId: id, id: assetId } },
      });
      if (!asset || asset.kind !== "STAFF")
        throw new DomainError("INVALID_ASSET", "Elegí un profesional de este negocio.");
      const member = await tx.businessMembership.findUnique({
        where: { businessId_userId: { businessId: id, userId: employee.id } },
      });
      if (member?.role === "OWNER")
        throw new DomainError("OWNER", "No se puede reemplazar la membresía de un propietario.");
      await tx.businessMembership.upsert({
        where: { businessId_userId: { businessId: id, userId: employee.id } },
        create: { businessId: id, userId: employee.id, role: "EMPLOYEE", assetId },
        update: { assetId },
      });
    });
    refresh(id);
    return { success: "Acceso a la agenda asignada concedido." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function adminAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await requireAdmin(user.id);
    const id = str(form, "businessId");
    const suspended = form.get("suspend") === "true";
    const reason = z.string().trim().min(10).max(300).parse(str(form, "reason"));
    if (form.get("confirm") !== "on")
      throw new DomainError("CONFIRM", "Confirmá la acción administrativa.");
    await db.$transaction(async (tx) => {
      await lockBusiness(tx, id);
      await tx.business.update({ where: { id }, data: { suspended } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          businessId: id,
          action: `${suspended ? "admin.suspend" : "admin.restore"}: ${reason}`,
          entityId: id,
        },
      });
    });
    revalidatePath("/admin");
    refresh(id);
    return { success: "Estado actualizado y auditado." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function revokeMemberAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = str(form, "businessId");
  try {
    await revokeEmployee(user.id, id, str(form, "employeeId"));
    refresh(id);
    return { success: "Acceso revocado." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function removeBlockAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = str(form, "businessId");
  try {
    await removeBlock(user.id, id, str(form, "blockId"));
    refresh(id);
    return { success: "Bloqueo eliminado." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
