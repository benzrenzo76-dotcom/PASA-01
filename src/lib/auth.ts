import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { sendMail } from "./mail";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    revokeSessionsOnPasswordReset: true,
    requireEmailVerification: process.env.NODE_ENV === "production",
    sendResetPassword: async ({ user, url }) =>
      sendMail(user.email, "Restablecé tu contraseña", `Elegí una nueva contraseña: ${url}`),
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) =>
      sendMail(user.email, "Verificá tu cuenta", `Confirmá tu dirección de correo: ${url}`),
  },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  plugins: [nextCookies()],
});
