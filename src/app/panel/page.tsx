import Link from "next/link";
import { Plus, ArrowUpRight, Store } from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
export default async function Panel() {
  const user = await requireUser();
  const memberships = await db.businessMembership.findMany({
    where: { userId: user.id },
    include: { business: { include: { category: true } } },
  });
  return (
    <div className="container page-space">
      <div className="section-title">
        <div>
          <div className="eyebrow">TU ESPACIO DE TRABAJO</div>
          <h1>Hola, {user.name.split(" ")[0]}.</h1>
          <p className="muted">Elegí el negocio que querés gestionar.</p>
        </div>
        <Link className="btn primary" href="/panel/nuevo">
          <Plus size={17} /> Crear negocio
        </Link>
      </div>
      <div className="business-grid">
        {memberships.map((m) => (
          <Link className="card workspace-card" key={m.id} href={`/panel/${m.businessId}`}>
            <Store size={30} />
            <span className="badge">{m.role === "OWNER" ? "Propietario" : "Empleado"}</span>
            <h2>{m.business.name}</h2>
            <p>
              {m.business.category.name} · {m.business.city}
            </p>
            <span className="muted">
              {m.business.suspended
                ? "Suspendido"
                : m.business.published
                  ? "Publicado"
                  : "Borrador"}{" "}
              <ArrowUpRight size={16} />
            </span>
          </Link>
        ))}
      </div>
      {!memberships.length && (
        <div className="empty-state">
          <h2>Tu negocio merece su propio espacio</h2>
          <p>Creá un borrador, configurá tus servicios y publicá cuando esté listo.</p>
          <Link className="btn primary" href="/panel/nuevo">
            Crear mi primer negocio
          </Link>
          <Link href="/mis-reservas">Ver mis reservas como cliente</Link>
        </div>
      )}
    </div>
  );
}
