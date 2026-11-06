"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { money } from "@/lib/format";
type Service = {
  id: string;
  name: string;
  duration: number;
  priceCents: number;
  priceType: string;
  staff: { id: string; name: string }[];
};
export function BookingWidget({
  businessId,
  services,
  loggedIn,
  cancellationHours,
}: {
  businessId: string;
  services: Service[];
  loggedIn: boolean;
  cancellationHours: number;
}) {
  const router = useRouter();
  const [serviceId, setService] = useState(services[0]?.id ?? "");
  const [staffId, setStaff] = useState("");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [day, setDay] = useState(today);
  const [slots, setSlots] = useState<{ startsAt: string; label: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [requestKey, setRequestKey] = useState("");
  const service = services.find((s) => s.id === serviceId);
  useEffect(() => {
    setRequestKey(crypto.randomUUID());
  }, [serviceId, staffId, day, selected]);
  useEffect(() => {
    const controller = new AbortController();
    setSelected("");
    setSlots([]);
    setError("");
    if (!day || !serviceId) return;
    setLoading(true);
    fetch(
      `/api/availability?${new URLSearchParams({ businessId, serviceId, day, ...(staffId ? { staffId } : {}) })}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error?.message || "No pudimos consultar los horarios.");
        setSlots(data.slots);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [businessId, serviceId, day, staffId, version]);
  async function reserve() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          serviceId,
          startsAt: selected,
          ...(staffId ? { staffId } : {}),
          idempotencyKey: requestKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) setVersion((v) => v + 1);
        throw new Error(data.error?.message || "No pudimos confirmar la reserva.");
      }
      router.push("/mis-reservas?confirmada=1");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error de conexión. Podés reintentar la misma solicitud.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!services.length) return <p>Este negocio todavía no tiene servicios disponibles.</p>;
  return (
    <section className="card booking-widget" id="reservar" aria-label="Reservá tu turno">
      <div className="eyebrow">TU PRÓXIMO MOMENTO</div>
      <h2>Reservá tu turno</h2>
      <label>
        Servicio
        <select
          value={serviceId}
          onChange={(e) => {
            setService(e.target.value);
            setStaff("");
          }}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.duration} min
            </option>
          ))}
        </select>
      </label>
      {!!service?.staff.length && (
        <label>
          Profesional
          <select value={staffId} onChange={(e) => setStaff(e.target.value)}>
            <option value="">Cualquiera disponible</option>
            {service.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Fecha
        <input type="date" value={day} min={today} onChange={(e) => setDay(e.target.value)} />
      </label>
      <p className="muted">Horarios de Buenos Aires (UTC−3)</p>
      {loading ? (
        <p role="status">Consultando disponibilidad…</p>
      ) : (
        <div className="slots" role="group" aria-label="Horarios disponibles">
          {slots.map((s) => (
            <button
              key={s.startsAt}
              type="button"
              className={selected === s.startsAt ? "slot selected" : "slot"}
              aria-pressed={selected === s.startsAt}
              onClick={() => setSelected(s.startsAt)}
            >
              {s.label}
            </button>
          ))}
          {!slots.length && <p>No hay horarios disponibles para esta fecha.</p>}
        </div>
      )}
      {service && (
        <div className="booking-summary">
          <strong>
            {service.priceType === "QUOTE"
              ? "A presupuestar"
              : `${service.priceType === "ESTIMATED" ? "Estimado: " : ""}${money(service.priceCents)}`}
          </strong>
          <span>{service.duration} minutos</span>
        </div>
      )}
      <p className="muted small">
        Cancelación online hasta {cancellationHours} h antes. El pago se coordina con el negocio.
        Reservar no acredita un pago.
      </p>
      {loggedIn ? (
        <button
          className="btn primary full"
          disabled={!selected || busy || loading}
          onClick={reserve}
        >
          {busy ? "Confirmando…" : "Confirmar reserva"}
        </button>
      ) : (
        <Link className="btn primary full" href="/ingresar">
          Ingresá para reservar
        </Link>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
