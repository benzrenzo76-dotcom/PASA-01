import { db } from "../src/lib/db";
import { sendMail } from "../src/lib/mail";
async function main() {
  // Hold one row lock during delivery so concurrent workers do not send the same row.
  for (let i = 0; i < 20; i++) {
    const processed = await db.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<
          { id: string; recipient: string; subject: string; body: string }[]
        >`SELECT id, recipient, subject, body FROM "Notification" WHERE "sentAt" IS NULL AND attempts < 5 ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
        const row = rows[0];
        if (!row) return false;
        try {
          await sendMail(row.recipient, row.subject, row.body);
          await tx.notification.update({
            where: { id: row.id },
            data: { sentAt: new Date(), attempts: { increment: 1 } },
          });
        } catch {
          await tx.notification.update({
            where: { id: row.id },
            data: { attempts: { increment: 1 } },
          });
          console.error("[mail_delivery_failed]", row.id);
        }
        return true;
      },
      { timeout: 30000 },
    );
    if (!processed) break;
  }
}
main().finally(() => db.$disconnect());
