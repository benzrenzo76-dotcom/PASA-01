import Link from "next/link";
import {
  Search,
  ArrowUpRight,
  MapPin,
  SlidersHorizontal,
  Scissors,
  Sparkles,
  Car,
  Brush,
  PenTool,
  CalendarDays,
  Store,
  ArrowRight,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
const icons = [Scissors, Sparkles, PenTool, Brush, Car, Store];
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const param = (key: string) =>
    typeof params[key] === "string" ? String(params[key]).slice(0, 100) : "";
  const q = param("q");
  const category = param("categoria");
  const city = param("localidad");
  const maxPrice = Number(param("precio"));
  const where: Prisma.BusinessWhereInput = {
    published: true,
    suspended: false,
    ...(process.env.NODE_ENV === "production" ? { isDemo: false } : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { services: { some: { active: true, name: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
    ...(maxPrice > 0
      ? {
          services: {
            some: {
              active: true,
              priceType: { not: "QUOTE" },
              priceCents: { lte: Math.min(maxPrice, 1000000) * 100 },
            },
          },
        }
      : {}),
  };
  const [categories, businesses, count] = await Promise.all([
    db.businessCategory.findMany({ orderBy: { name: "asc" } }),
    db.business.findMany({
      where,
      include: {
        category: true,
        services: { where: { active: true }, orderBy: { priceCents: "asc" } },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 60,
    }),
    db.business.count({ where }),
  ]);
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">
              <span className="live-dot" /> DESCUBRÍ · ELEGÍ · RESERVÁ
            </div>
            <h1>
              Un turno para vos.
              <br />
              <span>Todo cerca tuyo.</span>
            </h1>
            <p className="hero-text">
              Ese corte que venís postergando. Un momento de cuidado.
              <br className="desktop" /> Tu auto como nuevo. Encontrá el lugar y hacete un tiempo.
            </p>
            <a href="#explorar" className="text-link">
              Encontrá tu próximo lugar <ArrowUpRight size={19} />
            </a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-grid" />
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="art-plus">✳</span>
            <div className="appointment-card">
              <span className="art-icon">
                <CalendarDays size={28} />
              </span>
              <span>
                Tu próximo momento<strong>Empieza con un turno.</strong>
              </span>
              <span className="art-check">✓</span>
            </div>
            <span className="art-caption">MÁS TIEMPO PARA LO QUE TE GUSTA</span>
          </div>
        </div>
      </section>
      <section className="container explore" id="explorar">
        <form className="search-bar" action="/#explorar">
          <label>
            <Search size={20} />
            <span className="sr-only">Buscá negocio o servicio</span>
            <input name="q" placeholder="¿Qué servicio estás buscando?" defaultValue={q} />
          </label>
          <label>
            <MapPin size={19} />
            <span className="sr-only">Localidad</span>
            <input
              name="localidad"
              placeholder="Localidad, por ejemplo Monte Grande"
              defaultValue={city}
            />
          </label>
          {category && <input type="hidden" name="categoria" value={category} />}
          <button className="btn primary" type="submit">
            Buscar <ArrowRight size={17} />
          </button>
        </form>
        <div className="category-row">
          <Link href="/#explorar" className={!category ? "category active" : "category"}>
            <span>
              <Store size={21} />
            </span>
            Todos
          </Link>
          {categories.map((c, i) => {
            const Icon = icons[i % icons.length];
            const query = new URLSearchParams({
              ...(q ? { q } : {}),
              ...(city ? { localidad: city } : {}),
              categoria: c.slug,
            });
            return (
              <Link
                href={`/?${query}#explorar`}
                className={category === c.slug ? "category active" : "category"}
                key={c.id}
              >
                <span>
                  <Icon size={21} />
                </span>
                {c.name}
              </Link>
            );
          })}
        </div>
        <div className="section-title">
          <div>
            <div className="eyebrow">BUENOS LUGARES, A TU ALCANCE</div>
            <h2>{q || city || category ? "Encontrá tu lugar" : "Descubrí dónde reservar"}</h2>
            <p className="muted">
              {count} {count === 1 ? "negocio disponible" : "negocios disponibles"} · Orden
              alfabético, sin posiciones pagas
            </p>
          </div>
          <details className="filters">
            <summary>
              <SlidersHorizontal size={17} /> Filtros
            </summary>
            <form action="/#explorar">
              <input type="hidden" name="q" value={q} />
              <input type="hidden" name="localidad" value={city} />
              <input type="hidden" name="categoria" value={category} />
              <label>
                Precio máximo en ARS
                <input
                  type="number"
                  name="precio"
                  min="0"
                  max="1000000"
                  defaultValue={maxPrice || ""}
                />
              </label>
              <button className="btn dark">Aplicar</button>
              <Link href="/#explorar">Limpiar filtros</Link>
            </form>
          </details>
        </div>
        {businesses.length ? (
          <div className="business-grid">
            {businesses.map((b, i) => {
              const price = b.services.find((s) => s.priceType !== "QUOTE");
              return (
                <Link href={`/negocio/${b.slug}`} key={b.id} className="business-card">
                  <div className={`business-art art-${i % 4}`}>
                    <span className="business-initial">{b.name.charAt(0)}</span>
                    <span className="art-category">{b.category.name}</span>
                    <span className="card-arrow">
                      <ArrowUpRight size={19} />
                    </span>
                    {b.isDemo && <span className="demo-label">DEMOSTRACIÓN</span>}
                  </div>
                  <div className="business-info">
                    <div className="eyebrow">{b.category.name}</div>
                    <h3>{b.name}</h3>
                    <p className="muted">
                      <MapPin size={14} />
                      {b.city}
                    </p>
                    <div className="card-bottom">
                      <span>
                        {price ? (
                          <>
                            Desde <strong>{money(price.priceCents)}</strong>
                            {price.priceType === "ESTIMATED" ? " estimados" : ""}
                          </>
                        ) : (
                          "Consultá los servicios"
                        )}
                      </span>
                      <span>
                        Ver turnos <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <Store size={30} />
            </span>
            <h3>
              {q || city || category
                ? "Todavía no hay coincidencias"
                : "El próximo negocio puede ser el tuyo"}
            </h3>
            <p>Probá otra búsqueda o creá tu espacio para empezar a recibir reservas.</p>
            <Link href="/panel/nuevo" className="btn dark">
              Crear mi negocio <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
        <div className="business-banner">
          <div>
            <div className="eyebrow">PARA QUIENES HACEN</div>
            <h2>
              Vos ocupate de tu negocio.
              <br />
              Dale un lugar a tus próximos clientes.
            </h2>
            <p>Tu sitio, tus servicios y tu agenda, en un mismo espacio.</p>
          </div>
          <Link href="/panel/nuevo" className="btn dark">
            Empezá con tu negocio <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
