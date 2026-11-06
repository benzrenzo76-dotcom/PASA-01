import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { requireAdmin } from "@/domain/permissions";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { adminAction } from "@/app/actions";
import { when } from "@/lib/format";
export default async function Admin() {
  const user = await requireUser();
  try {
    await requireAdmin(user.id);
  } catch {
    notFound();
  }
  const [businesses, users, logs] = await Promise.all([
    db.business.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.user.count(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return (
    <div className="container page-space">
      <div className="eyebrow">ACCESO RESTRINGIDO</div>
      <h1>Administración</h1>
      <p>
        {users} cuentas registradas · {businesses.length} negocios mostrados
      </p>
      {businesses.map((b) => (
        <section key={b.id} className="card">
          <h2>{b.name}</h2>
          <p className="muted">
            {b.city} · {b.slug} ·{" "}
            {b.suspended ? "Suspendido" : b.published ? "Publicado" : "Borrador"}
          </p>
          <ActionForm
            action={adminAction}
            confirm="¿Confirmás el cambio de estado de este negocio?"
          >
            <input type="hidden" name="businessId" value={b.id} />
            <input type="hidden" name="suspend" value={String(!b.suspended)} />
            <label>
              Motivo
              <input name="reason" required minLength={10} maxLength={300} />
            </label>
            <label className="check">
              <input name="confirm" type="checkbox" required />
              Confirmo el cambio de estado
            </label>
            <button className="btn outline danger">
              {b.suspended ? "Restablecer acceso público" : "Suspender acceso público"}
            </button>
          </ActionForm>
        </section>
      ))}
      <section className="card">
        <h2>Últimas acciones auditadas</h2>
        {logs.map((l) => (
          <p className="small" key={l.id}>
            {when(l.createdAt)} · {l.action} · {l.entityId}
          </p>
        ))}
      </section>
    </div>
  );
}
