import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "@/domain/errors";
export function apiError(e: unknown) {
  if (e instanceof DomainError)
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  if (e instanceof ZodError || e instanceof SyntaxError)
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Revisá los datos de la solicitud." } },
      { status: 400 },
    );
  console.error("[api_failure]", e instanceof Error ? e.name : "unknown");
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "No pudimos completar la operación." } },
    { status: 500 },
  );
}
