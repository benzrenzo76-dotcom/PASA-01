import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBooking } from "@/domain/bookings";
import { DomainError } from "@/domain/errors";
import { apiError } from "@/lib/http";
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL!).origin)
      throw new DomainError("ORIGIN", "Origen no permitido.", 403);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new DomainError("UNAUTHORIZED", "Ingresá a tu cuenta para reservar.", 401);
    if (Number(request.headers.get("content-length") || 0) > 8192)
      throw new DomainError("TOO_LARGE", "Solicitud demasiado grande.", 413);
    const body = await request.text();
    if (body.length > 8192) throw new DomainError("TOO_LARGE", "Solicitud demasiado grande.", 413);
    return NextResponse.json(
      { booking: await createBooking(session.user.id, JSON.parse(body)) },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
