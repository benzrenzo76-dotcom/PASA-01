import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listSlots } from "@/domain/availability";
import { apiError } from "@/lib/http";
export async function GET(request: NextRequest) {
  try {
    const data = z
      .object({
        businessId: z.string().min(1).max(100),
        serviceId: z.string().min(1).max(100),
        day: z.string().max(10),
        staffId: z.string().max(100).optional(),
      })
      .parse(Object.fromEntries(request.nextUrl.searchParams));
    return NextResponse.json(
      { slots: await listSlots(data.businessId, data.serviceId, data.day, data.staffId) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
