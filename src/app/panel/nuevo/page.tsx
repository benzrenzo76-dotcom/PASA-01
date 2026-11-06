import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { createBusinessAction } from "@/app/actions";
export default async function NewBusiness() {
  await requireUser();
  const categories = await db.businessCategory.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="container narrow page-space">
      <div className="eyebrow">PASO 1 · TU NEGOCIO</div>
      <h1>Dale su propio lugar.</h1>
      <p className="muted">Empezá con lo esencial. Podés continuar el borrador cuando quieras.</p>
      <section className="card">
        <ActionForm action={createBusinessAction}>
          <label>
            Nombre del negocio
            <input name="name" required maxLength={100} />
          </label>
          <label>
            Identificador de tu sitio
            <input
              name="slug"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="mi-negocio"
              required
              maxLength={80}
            />
            <small>Tu dirección será /negocio/mi-negocio</small>
          </label>
          <label>
            Categoría principal
            <select name="categoryId" required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Localidad
              <input name="city" placeholder="Monte Grande" required maxLength={100} />
            </label>
            <label>
              Dirección
              <input name="address" maxLength={200} />
            </label>
          </div>
          <label>
            Descripción
            <textarea name="description" maxLength={2000} rows={4} />
          </label>
          <label>
            Teléfono
            <input name="phone" type="tel" maxLength={40} />
          </label>
          <button className="btn primary">Crear borrador y continuar</button>
        </ActionForm>
      </section>
    </div>
  );
}
