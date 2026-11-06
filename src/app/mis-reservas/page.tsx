import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { money, when, statusLabels } from "@/lib/format";
import { mayCancel } from "@/domain/bookings";
import { ActionForm } from "@/components/action-form";
import { statusAction } from "@/app/actions";
export default async function MyBookings({
  searchParams,
}: {
  searchParams: Promise<{ confirmada?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const bookings = await db.booking.findMany({
    where: { customerId: user.id },
    include: { business: true, allocations: { include: { asset: true } } },
    orderBy: { startsAt: "desc" },
    take: 100,
  });
  const future = bookings.filter((b) => b.startsAt >= new Date() && b.status === "CONFIRMED");
  const history = bookings.filter((b) => !future.some((f) => f.id === b.id));
  return (
    <div className="container page-space">
      <div className="eyebrow">TU CUENTA</div>
      <h1>Mis reservas</h1>
      <p className="muted">
        {user.name} · {user.email} · <Link href="/cuenta">Editar perfil</Link>
      </p>
      {params.confirmada && (
        <p className="notice success" role="status">
          Tu reserva fue confirmada. El aviso por correo está en cola de envío.
        </p>
      )}
      {[
        { title: "Tus próximos momentos", rows: future },
        { title: "Historial", rows: history },
      ].map((group) => (
        <section className="booking-section" key={group.title}>
          <h2>{group.title}</h2>
          {group.rows.length ? (
            group.rows.map((b) => (
              <article className="card reservation-card" key={b.id}>
                <div className="reservation-icon">
                  <CalendarDays size={25} />
                </div>
                <div>
                  <span className="badge">{statusLabels[b.status]}</span>
                  <h3>{b.serviceName}</h3>
                  <Link href={`/negocio/${b.business.slug}`}>{b.business.name}</Link>
                  <p>{when(b.startsAt)}</p>
                  <p className="muted small">
                    {b.allocations.map((a) => a.asset.name).join(" · ")}
                  </p>
                  <p className="muted small">
                    {b.priceType === "QUOTE"
                      ? "A presupuestar"
                      : `${money(b.priceCents)}${b.priceType === "ESTIMATED" ? " estimados" : ""}`}{" "}
                    · Pago coordinado con el negocio
                  </p>
                  <small>Código: {b.id}</small>
                </div>
                {b.status === "CONFIRMED" &&
                  (mayCancel(b.startsAt, b.cancellationHours) ? (
                    <ActionForm
                      action={statusAction}
                      className="inline-form"
                      confirm="¿Querés cancelar esta reserva?"
                    >
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input type="hidden" name="status" value="CANCELED_CUSTOMER" />
                      <input type="hidden" name="asCustomer" value="true" />
                      <button className="btn outline danger">Cancelar reserva</button>
                    </ActionForm>
                  ) : (
                    <p className="muted small">
                      Para cancelar, contactá al negocio.
                      <br />
                      El plazo online terminó.
                    </p>
                  ))}
              </article>
            ))
          ) : (
            <div className="card empty-inline">
              <p className="muted">Todavía no hay reservas en esta sección.</p>
              <Link href="/">Explorar negocios</Link>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
