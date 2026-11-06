import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
export default function Login() {
  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <div className="eyebrow">BIENVENIDO DE NUEVO</div>
        <h1>
          Hacete un
          <br />
          tiempo para vos.
        </h1>
        <p>Tus reservas y tu negocio, en un mismo lugar.</p>
      </section>
      <section className="card auth-card">
        <h2>Ingresá a tu cuenta</h2>
        <p className="muted">Retomá donde te quedaste.</p>
        <AuthForm />
        <p>
          <Link href="/recuperar">Olvidé mi contraseña</Link>
        </p>
        <p>
          ¿Todavía no tenés cuenta? <Link href="/registro">Registrate</Link>
        </p>
      </section>
    </div>
  );
}
