import { requireUser } from "@/lib/session";
import { ProfileForm } from "@/components/account-forms";
import Link from "next/link";
export default async function Account() {
  const user = await requireUser();
  return (
    <div className="container narrow page-space">
      <div className="eyebrow">TU CUENTA</div>
      <h1>Mi perfil</h1>
      <section className="card">
        <p className="muted">{user.email}</p>
        <ProfileForm name={user.name} />
        <p className="muted small" style={{ marginTop: 24 }}>
          Cada negocio accede solo a los datos de las reservas que realizaste con él.
        </p>
        <Link href="/recuperar">Restablecer mi contraseña</Link>
      </section>
      <Link href="/mis-reservas">Ver mis reservas</Link>
    </div>
  );
}
