"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container empty-state">
      <h1>No pudimos cargar esta página</h1>
      <p>Intentá nuevamente en un momento.</p>
      <button className="btn primary" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}
