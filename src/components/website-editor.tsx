"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { websiteAction } from "@/app/actions";
type Theme = {
  theme: "MINIMAL" | "URBAN" | "STUDIO";
  accent: "teal" | "orange" | "violet";
  headline: string;
  showTeam: boolean;
  showAddress: boolean;
};
export function WebsiteEditor({
  businessId,
  businessName,
  initial,
}: {
  businessId: string;
  businessName: string;
  initial: Theme;
}) {
  const [theme, setTheme] = useState(initial);
  return (
    <div className="two-column">
      <section className="card">
        <h2>Tu identidad, a tu manera</h2>
        <p className="muted">
          Guardá un borrador o publicá los cambios. La vista previa refleja tu diseño.
        </p>
        <ActionForm action={websiteAction}>
          <input type="hidden" name="businessId" value={businessId} />
          <label>
            Plantilla
            <select
              name="theme"
              value={theme.theme}
              onChange={(e) => setTheme({ ...theme, theme: e.target.value as Theme["theme"] })}
            >
              <option value="MINIMAL">Minimal · Limpia y directa</option>
              <option value="URBAN">Urban · Contraste y carácter</option>
              <option value="STUDIO">Studio · Cálida y sofisticada</option>
            </select>
          </label>
          <label>
            Paleta
            <select
              name="accent"
              value={theme.accent}
              onChange={(e) => setTheme({ ...theme, accent: e.target.value as Theme["accent"] })}
            >
              <option value="teal">Verde profundo</option>
              <option value="orange">Terracota</option>
              <option value="violet">Violeta</option>
            </select>
          </label>
          <label>
            Frase de bienvenida
            <input
              name="headline"
              maxLength={140}
              value={theme.headline}
              onChange={(e) => setTheme({ ...theme, headline: e.target.value })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              name="showTeam"
              checked={theme.showTeam}
              onChange={(e) => setTheme({ ...theme, showTeam: e.target.checked })}
            />
            Mostrar equipo
          </label>
          <label className="check">
            <input
              type="checkbox"
              name="showAddress"
              checked={theme.showAddress}
              onChange={(e) => setTheme({ ...theme, showAddress: e.target.checked })}
            />
            Mostrar dirección
          </label>
          <div className="button-row">
            <button className="btn outline" name="intent" value="draft">
              Guardar borrador
            </button>
            <button className="btn primary" name="intent" value="publish">
              Publicar sitio
            </button>
          </div>
        </ActionForm>
      </section>
      <section className="preview-panel">
        <div className="eyebrow">VISTA PREVIA DEL DISEÑO</div>
        <div className={`microsite theme-${theme.theme.toLowerCase()} accent-${theme.accent}`}>
          <div className="business-cover preview-cover">
            <div>
              <span className="eyebrow">TU NEGOCIO</span>
              <h2>{businessName}</h2>
              <p>{theme.headline || "Un espacio para tu próximo momento."}</p>
            </div>
          </div>
          <div className="preview-body">
            <h3>Servicios y reservas</h3>
            <p>Tu catálogo real aparecerá en el sitio público.</p>
            {theme.showTeam && <p>Sección del equipo visible</p>}
            {theme.showAddress && <p>Dirección visible</p>}
            <span className="badge">{theme.theme}</span>
          </div>
        </div>
        <p className="muted small">
          Esta vista muestra el estilo. Los turnos se consultan en la página pública.
        </p>
      </section>
    </div>
  );
}
