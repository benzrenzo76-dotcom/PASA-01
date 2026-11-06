import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Scissors,
  Users,
  Clock3,
  Globe,
  Settings,
  ArrowUpRight,
  Plus,
  TrendingUp,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { requireMember } from "@/domain/permissions";
import { themeInput } from "@/domain/validation";
import { ActionForm } from "@/components/action-form";
import { WebsiteEditor } from "@/components/website-editor";
import {
  serviceAction,
  assetAction,
  hoursAction,
  blockAction,
  settingsAction,
  statusAction,
  toggleServiceAction,
  memberAction,
  revokeMemberAction,
  removeBlockAction,
} from "@/app/actions";
import { money, when, statusLabels, TZ } from "@/lib/format";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
const tabs = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "agenda", label: "Agenda y reservas", icon: CalendarDays },
  { id: "servicios", label: "Servicios", icon: Scissors },
  { id: "equipo", label: "Equipo y recursos", icon: Users },
  { id: "horarios", label: "Horarios y bloqueos", icon: Clock3 },
  { id: "sitio", label: "Mi sitio web", icon: Globe },
  { id: "configuracion", label: "Configuración", icon: Settings },
];
export default async function BusinessDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const { businessId } = await params;
  let member;
  try {
    member = await requireMember(user.id, businessId, ["OWNER", "EMPLOYEE"]);
  } catch {
    notFound();
  }
  const owner = member.role === "OWNER";
  const filters = await searchParams;
  const tab = owner ? (tabs.some((t) => t.id === filters.tab) ? filters.tab : "resumen") : "agenda";
  const business = await db.business.findUniqueOrThrow({
    where: { id: businessId },
    include: {
      services: { include: { assets: { include: { asset: true } } } },
      assets: { orderBy: { kind: "asc" } },
      hours: true,
      blocks: { orderBy: { startsAt: "asc" }, take: 50 },
    },
  });
  const employees = owner
    ? await db.businessMembership.findMany({
        where: { businessId, role: "EMPLOYEE" },
        include: { user: { select: { name: true, email: true } } },
      })
    : [];
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  const dayFilter =
    filters.fecha &&
    /^\d{4}-\d{2}-\d{2}$/.test(filters.fecha) &&
    !Number.isNaN(Date.parse(filters.fecha))
      ? filters.fecha
      : undefined;
  const from = fromZonedTime(`${dayFilter || today}T00:00:00`, TZ);
  const to = new Date(from.getTime() + 86400000);
  const allocations = !owner
    ? { some: { assetId: member.assetId || "__none__" } }
    : filters.profesional
      ? { some: { assetId: filters.profesional } }
      : undefined;
  const bookings =
    tab === "agenda"
      ? await db.booking.findMany({
          where: {
            businessId,
            ...(dayFilter ? { startsAt: { gte: from, lt: to } } : {}),
            ...(allocations ? { allocations } : {}),
            ...(filters.estado && Object.hasOwn(statusLabels, filters.estado)
              ? { status: filters.estado as keyof typeof import("@prisma/client").BookingStatus }
              : {}),
          },
          include: {
            customer: { select: { name: true, email: true } },
            allocations: { include: { asset: true } },
          },
          orderBy: { startsAt: "asc" },
          take: 100,
        })
      : [];
  const stats =
    owner && tab === "resumen"
      ? await Promise.all([
          db.booking.count({
            where: {
              businessId,
              startsAt: { gte: from, lt: to },
              status: { notIn: ["CANCELED_BUSINESS", "CANCELED_CUSTOMER"] },
            },
          }),
          db.booking.count({
            where: { businessId, startsAt: { gte: new Date() }, status: "CONFIRMED" },
          }),
          db.booking.count({ where: { businessId, status: "COMPLETED" } }),
          db.booking.count({
            where: { businessId, status: { in: ["CANCELED_CUSTOMER", "CANCELED_BUSINESS"] } },
          }),
          db.booking.aggregate({
            where: {
              businessId,
              status: { in: ["CONFIRMED", "COMPLETED", "IN_PROGRESS"] },
              priceType: { not: "QUOTE" },
            },
            _sum: { priceCents: true },
          }),
          db.booking.groupBy({ by: ["customerId"], where: { businessId }, _count: { _all: true } }),
        ])
      : null;
  const hidden = <input type="hidden" name="businessId" value={businessId} />;
  const staff = business.assets.filter((a) => a.kind === "STAFF");
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <Link href="/panel" className="muted small">
          ← Mis negocios
        </Link>
        <div className="sidebar-business">
          <div className="avatar">{business.name.charAt(0)}</div>
          <strong>{business.name}</strong>
          <span className="badge">
            {business.suspended ? "Suspendido" : business.published ? "Publicado" : "Borrador"}
          </span>
        </div>
        <nav aria-label="Panel del negocio">
          {tabs
            .filter((t) => owner || t.id === "agenda")
            .map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.id}
                  className={tab === t.id ? "active" : ""}
                  href={`/panel/${businessId}?tab=${t.id}`}
                >
                  <Icon size={18} />
                  {t.label}
                </Link>
              );
            })}
        </nav>
        {business.published && (
          <Link className="btn outline" href={`/negocio/${business.slug}`}>
            Ver mi sitio <ArrowUpRight size={16} />
          </Link>
        )}
        <div className="sidebar-note">
          Plan básico
          <br />
          <span>
            Reservas, sitio y agenda.
            <br />
            Sin cobros recurrentes activados.
          </span>
        </div>
      </aside>
      <div className="dashboard-content">
        <div className="dashboard-heading">
          <div>
            <div className="eyebrow">
              {owner ? "TU NEGOCIO, EN ORDEN" : "TU ESPACIO DE TRABAJO"}
            </div>
            <h1>{tabs.find((t) => t.id === tab)?.label}</h1>
            <p className="muted">{business.city} · Horarios de Buenos Aires</p>
          </div>
          <span className="date-pill">
            <CalendarDays size={16} />
            {new Intl.DateTimeFormat("es-AR", {
              timeZone: TZ,
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </span>
        </div>
        {business.suspended && (
          <p className="notice error">
            Este negocio está suspendido. La página pública y las nuevas reservas están
            deshabilitadas.
          </p>
        )}
        {!business.published && owner && (
          <div className="notice onboarding">
            Tu negocio está en borrador. Agregá equipo o recursos → servicios → horarios → publicá
            tu sitio.
          </div>
        )}
        {tab === "resumen" && stats && (
          <>
            <div className="stat-grid">
              {[
                { label: "Reservas de hoy", value: stats[0] },
                { label: "Próximas reservas", value: stats[1] },
                { label: "Completadas", value: stats[2] },
                { label: "Canceladas", value: stats[3] },
              ].map((s) => (
                <div className="card stat" key={s.label}>
                  <span>{s.label}</span>
                  <strong>{s.value}</strong>
                  <TrendingUp size={18} />
                </div>
              ))}
            </div>
            <div className="two-column">
              <section className="card">
                <div className="eyebrow">ACTIVIDAD REAL · TODO EL HISTORIAL</div>
                <h2>Tu negocio en números</h2>
                <div className="metric-row">
                  <span>Valor estimado de reservas</span>
                  <strong>{money(stats[4]._sum.priceCents || 0)}</strong>
                </div>
                <p className="muted small">
                  Reservas confirmadas, en curso y completadas con precio conocido. Este valor no
                  representa ingresos cobrados ni ganancias.
                </p>
                <div className="metric-row">
                  <span>Clientes con una reserva</span>
                  <strong>{stats[5].filter((c) => c._count._all === 1).length}</strong>
                </div>
                <div className="metric-row">
                  <span>Clientes recurrentes</span>
                  <strong>{stats[5].filter((c) => c._count._all > 1).length}</strong>
                </div>
                <p className="muted small">
                  Conteo por reservas registradas, incluidas cancelaciones. Pagos procesados y
                  analítica de visitas pendientes de integración.
                </p>
              </section>
              <section className="card quick-links">
                <div className="eyebrow">SEGUÍ CON TU DÍA</div>
                <h2>Todo a mano</h2>
                <Link href={`/panel/${businessId}?tab=agenda`}>
                  Abrir agenda <ArrowUpRight size={18} />
                </Link>
                <Link href={`/panel/${businessId}?tab=servicios`}>
                  Gestionar servicios <ArrowUpRight size={18} />
                </Link>
                <Link href={`/panel/${businessId}?tab=sitio`}>
                  Editar mi sitio <ArrowUpRight size={18} />
                </Link>
              </section>
            </div>
          </>
        )}
        {tab === "agenda" && (
          <>
            <form className="card filter-form">
              <input type="hidden" name="tab" value="agenda" />
              <label>
                Fecha
                <input type="date" name="fecha" defaultValue={dayFilter} />
              </label>
              {owner && (
                <label>
                  Profesional
                  <select name="profesional" defaultValue={filters.profesional || ""}>
                    <option value="">Todos</option>
                    {staff.map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Estado
                <select name="estado" defaultValue={filters.estado || ""}>
                  <option value="">Todos</option>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn dark">Filtrar</button>
              <Link href={`/panel/${businessId}?tab=agenda`}>Limpiar</Link>
            </form>
            <p className="muted small">
              Vista de lista · Hasta 100 reservas. Usá los filtros para consultar un día.
            </p>
            {!bookings.length && (
              <div className="card empty-inline">
                <CalendarDays size={32} />
                <h3>No hay reservas para mostrar</h3>
                <p className="muted">Las reservas de tus clientes van a aparecer acá.</p>
              </div>
            )}
            {bookings.map((b) => (
              <article key={b.id} className="card agenda-row">
                <div>
                  <span className="badge">{statusLabels[b.status]}</span>
                  <h3>{b.serviceName}</h3>
                  <strong>{when(b.startsAt)}</strong>
                  <p>
                    {b.customer.name} · {b.customer.email}
                  </p>
                  <p className="muted small">
                    {b.allocations.map((a) => a.asset.name).join(" · ")}
                  </p>
                  {owner && (
                    <small>
                      {b.priceType === "QUOTE"
                        ? "A presupuestar"
                        : `${money(b.priceCents)}${b.priceType === "ESTIMATED" ? " estimados" : ""}`}{" "}
                      · Sin pago acreditado
                    </small>
                  )}
                </div>
                <div className="agenda-actions">
                  {b.status === "CONFIRMED" && (
                    <>
                      <ActionForm action={statusAction} className="inline-form">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <input type="hidden" name="status" value="IN_PROGRESS" />
                        <button className="btn primary compact">Iniciar turno</button>
                      </ActionForm>
                      <ActionForm
                        action={statusAction}
                        className="inline-form"
                        confirm="¿Marcar que el cliente no asistió?"
                      >
                        <input type="hidden" name="bookingId" value={b.id} />
                        <input type="hidden" name="status" value="NO_SHOW" />
                        <button className="btn outline compact">No asistió</button>
                      </ActionForm>
                    </>
                  )}
                  {b.status === "IN_PROGRESS" && (
                    <ActionForm action={statusAction} className="inline-form">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input type="hidden" name="status" value="COMPLETED" />
                      <button className="btn primary compact">Completar turno</button>
                    </ActionForm>
                  )}
                  {["CONFIRMED", "IN_PROGRESS"].includes(b.status) && (
                    <ActionForm
                      action={statusAction}
                      className="inline-form"
                      confirm="¿Cancelar esta reserva? El cliente recibirá un aviso."
                    >
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input type="hidden" name="status" value="CANCELED_BUSINESS" />
                      <button className="btn outline danger compact">Cancelar</button>
                    </ActionForm>
                  )}
                </div>
              </article>
            ))}
          </>
        )}
        {tab === "servicios" && (
          <div className="two-column">
            <section className="card">
              <h2>Tus servicios</h2>
              {!business.services.length && (
                <p className="muted">
                  Agregá primero un profesional o recurso en Equipo y recursos.
                </p>
              )}
              {business.services.map((s) => (
                <div className="service-row" key={s.id}>
                  <div>
                    <h3>{s.name}</h3>
                    <p className="muted">
                      {s.duration} min ·{" "}
                      {s.priceType === "QUOTE" ? "A presupuestar" : money(s.priceCents)}
                    </p>
                    <small>{s.assets.map((a) => a.asset.name).join(" · ")}</small>
                  </div>
                  <ActionForm action={toggleServiceAction} className="inline-form">
                    {hidden}
                    <input name="serviceId" type="hidden" value={s.id} />
                    <button className="btn outline compact">
                      {s.active ? "Desactivar" : "Activar"}
                    </button>
                  </ActionForm>
                </div>
              ))}
            </section>
            <section className="card">
              <h2>
                <Plus size={20} /> Nuevo servicio
              </h2>
              <ActionForm action={serviceAction}>
                {hidden}
                <label>
                  Nombre
                  <input name="name" required maxLength={100} />
                </label>
                <label>
                  Descripción
                  <textarea name="description" rows={2} maxLength={2000} />
                </label>
                <div className="form-row">
                  <label>
                    Duración en minutos
                    <input
                      name="duration"
                      type="number"
                      defaultValue={30}
                      min={15}
                      max={720}
                      step={15}
                      required
                    />
                  </label>
                  <label>
                    Precio ARS
                    <input
                      type="number"
                      name="price"
                      min="0"
                      max="1000000"
                      step="0.01"
                      defaultValue={0}
                      required
                    />
                  </label>
                </div>
                <label>
                  Tipo de precio
                  <select name="priceType">
                    <option value="FIXED">Fijo</option>
                    <option value="ESTIMATED">Estimado</option>
                    <option value="QUOTE">A presupuestar</option>
                  </select>
                </label>
                <div className="form-row">
                  <label>
                    Preparación (min)
                    <input name="bufferBefore" type="number" defaultValue={0} min={0} max={120} />
                  </label>
                  <label>
                    Limpieza (min)
                    <input name="bufferAfter" type="number" defaultValue={0} min={0} max={120} />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Anticipación mínima (min)
                    <input
                      name="minNoticeMinutes"
                      type="number"
                      defaultValue={60}
                      min={0}
                      max={10080}
                    />
                  </label>
                  <label>
                    Hasta cuántos días antes
                    <input
                      name="maxAdvanceDays"
                      type="number"
                      defaultValue={60}
                      min={1}
                      max={365}
                    />
                  </label>
                </div>
                <div>
                  <strong>Profesionales habilitados y recursos requeridos</strong>
                  <p className="muted small">
                    Se asigna un profesional disponible y se ocupan todos los recursos elegidos.
                    Elegí al menos uno.
                  </p>
                  {business.assets.map((a) => (
                    <label className="check" key={a.id}>
                      <input type="checkbox" name="assetIds" value={a.id} />
                      {a.name} · {a.kind === "STAFF" ? "Profesional" : "Recurso"}
                    </label>
                  ))}
                </div>
                <button className="btn primary" disabled={!business.assets.length}>
                  Crear servicio
                </button>
              </ActionForm>
            </section>
          </div>
        )}
        {tab === "equipo" && (
          <div className="two-column">
            <section className="card">
              <h2>Personal y capacidad</h2>
              {business.assets.map((a) => (
                <div className="service-row" key={a.id}>
                  <div className="avatar">{a.name.charAt(0)}</div>
                  <div>
                    <h3>{a.name}</h3>
                    <p className="muted">{a.kind === "STAFF" ? "Profesional" : "Recurso físico"}</p>
                  </div>
                </div>
              ))}
              {!business.assets.length && (
                <p className="muted">
                  Creá profesionales, sillones, cabinas o boxes según tu negocio.
                </p>
              )}
              <h3>Agregar profesional o recurso</h3>
              <ActionForm action={assetAction}>
                {hidden}
                <label>
                  Nombre
                  <input name="name" minLength={2} required maxLength={100} />
                </label>
                <label>
                  Tipo
                  <select name="kind">
                    <option value="STAFF">Profesional</option>
                    <option value="RESOURCE">Recurso físico</option>
                  </select>
                </label>
                <button className="btn primary">Agregar</button>
              </ActionForm>
            </section>
            <section className="card">
              <h2>Dar acceso a un empleado</h2>
              <p className="muted">
                Solo podrá ver y operar los turnos de su profesional asignado. Debe tener una cuenta
                registrada.
              </p>
              <ActionForm action={memberAction}>
                {hidden}
                <label>
                  Correo de la cuenta
                  <input name="email" type="email" required />
                </label>
                <label>
                  Profesional asignado
                  <select name="assetId" required>
                    {staff.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn dark" disabled={!staff.length}>
                  Conceder acceso a agenda
                </button>
              </ActionForm>
              {employees.map((m) => (
                <div key={m.id} className="block-row">
                  <strong>{m.user.name}</strong>
                  <p className="muted small">{m.user.email}</p>
                  <ActionForm
                    action={revokeMemberAction}
                    className="inline-form"
                    confirm="¿Revocar el acceso de este empleado al negocio?"
                  >
                    {hidden}
                    <input type="hidden" name="employeeId" value={m.userId} />
                    <button className="btn outline compact danger">Revocar acceso</button>
                  </ActionForm>
                </div>
              ))}
            </section>
          </div>
        )}
        {tab === "horarios" && (
          <div className="two-column">
            <section className="card">
              <h2>Horario semanal</h2>
              <p className="muted">
                Elegí días y una franja. Los recursos heredan el horario del negocio salvo que
                tengan uno propio.
              </p>
              <ActionForm action={hoursAction}>
                {hidden}
                <label>
                  Aplicar a
                  <select name="assetId">
                    <option value="">Todo el negocio</option>
                    {business.assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="check-group">
                  {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d, i) => (
                    <label className="check" key={i}>
                      <input
                        type="checkbox"
                        name="weekdays"
                        value={i}
                        defaultChecked={business.hours.some((h) => h.weekday === i)}
                      />
                      {d}
                    </label>
                  ))}
                </div>
                <div className="form-row">
                  <label>
                    Apertura
                    <input type="time" name="open" defaultValue="09:00" required />
                  </label>
                  <label>
                    Cierre
                    <input type="time" name="close" defaultValue="18:00" required />
                  </label>
                </div>
                <button className="btn primary">Guardar horarios</button>
              </ActionForm>
              <p className="muted small">Configuración actual del negocio:</p>
              {business.hours.map((h) => (
                <p className="small" key={h.id}>
                  {
                    ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][
                      h.weekday
                    ]
                  }{" "}
                  · {String(Math.floor(h.openMinute / 60)).padStart(2, "0")}:
                  {String(h.openMinute % 60).padStart(2, "0")}–
                  {String(Math.floor(h.closeMinute / 60)).padStart(2, "0")}:
                  {String(h.closeMinute % 60).padStart(2, "0")}
                </p>
              ))}
            </section>
            <section className="card">
              <h2>Ausencias y bloqueos</h2>
              <ActionForm action={blockAction}>
                {hidden}
                <label>
                  Recurso
                  <select name="assetId">
                    <option value="">Todo el negocio</option>
                    {business.assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Desde
                  <input name="start" type="datetime-local" required />
                </label>
                <label>
                  Hasta
                  <input name="end" type="datetime-local" required />
                </label>
                <label>
                  Motivo
                  <input name="reason" required minLength={2} maxLength={200} />
                </label>
                <button className="btn dark">Crear bloqueo</button>
              </ActionForm>
              <p className="muted small">
                Horas de Buenos Aires. Si hay reservas, primero deberán resolverse.
              </p>
              {business.blocks.map((b) => (
                <div className="block-row" key={b.id}>
                  <strong>{b.reason}</strong>
                  <p className="muted small">
                    {when(b.startsAt)} → {when(b.endsAt)}
                  </p>
                  <ActionForm
                    action={removeBlockAction}
                    className="inline-form"
                    confirm="¿Eliminar este bloqueo y habilitar el horario?"
                  >
                    {hidden}
                    <input type="hidden" name="blockId" value={b.id} />
                    <button className="btn outline compact danger">Eliminar bloqueo</button>
                  </ActionForm>
                </div>
              ))}
            </section>
          </div>
        )}
        {tab === "sitio" && (
          <WebsiteEditor
            businessId={businessId}
            businessName={business.name}
            initial={themeInput.parse(business.websiteDraft)}
          />
        )}
        {tab === "configuracion" && (
          <section className="card narrow">
            <h2>Datos del negocio</h2>
            <ActionForm action={settingsAction}>
              {hidden}
              <label>
                Nombre
                <input name="name" required defaultValue={business.name} maxLength={100} />
              </label>
              <label>
                Localidad
                <input name="city" required defaultValue={business.city} maxLength={100} />
              </label>
              <label>
                Dirección
                <input name="address" defaultValue={business.address} maxLength={200} />
              </label>
              <label>
                Descripción
                <textarea
                  name="description"
                  defaultValue={business.description}
                  maxLength={2000}
                  rows={4}
                />
              </label>
              <label>
                Teléfono
                <input name="phone" defaultValue={business.phone} maxLength={40} />
              </label>
              <label>
                Cancelación online hasta cuántas horas antes
                <input
                  name="cancellationHours"
                  type="number"
                  min={0}
                  max={168}
                  defaultValue={business.cancellationHours}
                />
                <small>Solo aplica a reservas nuevas; las anteriores conservan su política.</small>
              </label>
              <button className="btn primary">Guardar configuración</button>
            </ActionForm>
          </section>
        )}
      </div>
    </div>
  );
}
