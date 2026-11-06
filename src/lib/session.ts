import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
export async function session() {
  return auth.api.getSession({ headers: await headers() });
}
export async function requireUser() {
  const value = await session();
  if (!value) redirect("/ingresar");
  return value.user;
}
