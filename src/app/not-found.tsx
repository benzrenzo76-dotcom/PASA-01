import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container empty-state">
      <h1>No encontramos esta página</h1>
      <p>El negocio puede estar en borrador o no estar disponible.</p>
      <Link className="btn primary" href="/">
        Volver a explorar
      </Link>
    </div>
  );
}
