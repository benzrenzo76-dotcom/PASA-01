import { notFound } from "next/navigation";
import { MapPin, Clock3, Phone, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { session } from "@/lib/session";
import { money } from "@/lib/format";
import { themeInput } from "@/domain/validation";
import { BookingWidget } from "@/components/booking-widget";
async function getBusiness(slug: string) {
  return db.business.findFirst({
    where: {
      slug,
      published: true,
      suspended: false,
      ...(process.env.NODE_ENV === "production" ? { isDemo: false } : {}),
    },
    include: {
      category: true,
      hours: { orderBy: { weekday: "asc" } },
      assets: { where: { kind: "STAFF", active: true } },
      services: { where: { active: true }, include: { assets: { include: { asset: true } } } },
    },
  });
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const b = await getBusiness((await params).slug);
  return { title: b?.name || "Negocio no encontrado", description: b?.description.slice(0, 160) };
}
export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const b = await getBusiness((await params).slug);
  if (!b) notFound();
  const current = await session();
  const theme = themeInput.parse(b.websiteLive);
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const clock = (m: number) =>
    `${Math.floor(m / 60)
      .toString()
      .padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
  return (
    <div className={`microsite theme-${theme.theme.toLowerCase()} accent-${theme.accent}`}>
      <div className="business-cover">
        <div className="container">
          <span className="eyebrow">
            {b.category.name} · {b.city}
          </span>
          <h1>{b.name}</h1>
          <p>{theme.headline || "Un espacio para tu próximo momento."}</p>
          {b.isDemo && <span className="badge">NEGOCIO DE DEMOSTRACIÓN · SOLO DESARROLLO</span>}
        </div>
        <span className="cover-letter" aria-hidden="true">
          {b.name.charAt(0)}
        </span>
      </div>
      <div className="container microsite-grid">
        <div>
          <section className="card">
            <div className="eyebrow">CONOCÉ EL LUGAR</div>
            <h2>Bienvenido a {b.name}</h2>
            <p className="prose">
              {b.description || "Conocé nuestros servicios y reservá tu próximo turno."}
            </p>
            <div className="business-contact">
              {theme.showAddress && (
                <span>
                  <MapPin size={18} />
                  {b.address ? `${b.address}, ` : ""}
                  {b.city}, {b.province}
                </span>
              )}
              {b.phone && (
                <span>
                  <Phone size={18} />
                  {b.phone}
                </span>
              )}
            </div>
          </section>
          <section className="card">
            <h2>Nuestros servicios</h2>
            {b.services.map((s) => (
              <div className="service-row" key={s.id}>
                <div>
                  <h3>{s.name}</h3>
                  <p className="muted">{s.description}</p>
                  <span className="muted small">
                    <Clock3 size={14} />
                    {s.duration} minutos
                  </span>
                </div>
                <div>
                  <strong>
                    {s.priceType === "QUOTE" ? "A presupuestar" : money(s.priceCents)}
                  </strong>
                  {s.priceType === "ESTIMATED" && <small>Precio estimado</small>}
                  <a href="#reservar" className="text-link">
                    Reservar <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
            ))}
          </section>
          {theme.showTeam && !!b.assets.length && (
            <section className="card">
              <h2>El equipo</h2>
              <div className="team-grid">
                {b.assets.map((a) => (
                  <div key={a.id}>
                    <div className="avatar">{a.name.charAt(0)}</div>
                    <strong>{a.name}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="card">
            <h2>Horarios</h2>
            {b.hours.map((h) => (
              <div className="hours-row" key={h.id}>
                <span>{days[h.weekday]}</span>
                <span>
                  {clock(h.openMinute)}–{clock(h.closeMinute)}
                </span>
              </div>
            ))}
            <p className="muted small">
              Horarios de Buenos Aires. Los turnos consideran bloqueos y disponibilidad de cada
              recurso.
            </p>
          </section>
        </div>
        <div>
          <BookingWidget
            businessId={b.id}
            cancellationHours={b.cancellationHours}
            loggedIn={!!current}
            services={b.services.map((s) => ({
              id: s.id,
              name: s.name,
              duration: s.duration,
              priceCents: s.priceCents,
              priceType: s.priceType,
              staff: s.assets
                .filter((a) => a.asset.kind === "STAFF" && a.asset.active)
                .map((a) => ({ id: a.assetId, name: a.asset.name })),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
