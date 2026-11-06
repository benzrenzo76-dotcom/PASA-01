import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Compass } from "lucide-react";
import { session } from "@/lib/session";
import { SignOut } from "@/components/auth-form";
import "./globals.css";
export const dynamic = "force-dynamic";
const name = process.env.NEXT_PUBLIC_APP_NAME || "Plataforma";
export const metadata: Metadata = {
  title: { default: `${name} · Servicios cerca tuyo`, template: `%s · ${name}` },
  description:
    "Descubrí negocios de servicios y reservá tu próximo turno. Belleza, cuidado personal y servicios para tu auto.",
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const current = await session();
  return (
    <html lang="es-AR">
      <body>
        <a className="skip-link" href="#contenido">
          Ir al contenido
        </a>
        <header className="header">
          <div className="header-inner">
            <Link href="/" className="brand">
              <span className="brand-symbol">
                <Compass size={22} />
              </span>
              {name}
              <span className="beta">V1</span>
            </Link>
            <nav aria-label="Navegación principal">
              <Link className="nav-discover" href="/">
                Explorar
              </Link>
              {current ? (
                <>
                  <Link href="/mis-reservas">Mis reservas</Link>
                  <Link className="nav-panel" href="/panel">
                    Mi panel
                  </Link>
                  <SignOut />
                </>
              ) : (
                <>
                  <Link href="/ingresar">Ingresar</Link>
                  <Link href="/registro" className="btn dark compact">
                    Sumá tu negocio <ArrowUpRight size={15} />
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main id="contenido">{children}</main>
        <footer className="footer">
          <Link href="/" className="brand small-brand">
            <Compass size={20} />
            {name}
          </Link>
          <span>Tu tiempo, mejor aprovechado.</span>
          <span>Argentina · ARS · Buenos Aires (UTC−3)</span>
        </footer>
      </body>
    </html>
  );
}
