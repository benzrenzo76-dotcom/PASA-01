import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
export default function Register() {
  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <div className="eyebrow">UN LUGAR PARA TUS PLANES</div>
        <h1>
          Tu próximo paso
          <br />
          empieza acá.
        </h1>
        <p>Creá una cuenta para reservar o gestionar uno o varios negocios.</p>
      </section>
      <section className="card auth-card">
        <h2>Creá tu cuenta</h2>
        <p className="muted">Solo los datos que necesitamos para empezar.</p>
        <AuthForm register />
        <p>
          ¿Ya tenés cuenta? <Link href="/ingresar">Ingresá</Link>
        </p>
      </section>
    </div>
  );
}
