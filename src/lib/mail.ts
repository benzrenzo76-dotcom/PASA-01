import nodemailer from "nodemailer";
export async function sendMail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP no configurado");
    console.info("[CORREO DE DESARROLLO; NO ENVIADO]", { to, subject, text });
    return;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}
