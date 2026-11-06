"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    try {
      const result = register
        ? await authClient.signUp.email({
            name: String(form.get("name")),
            email,
            password,
            callbackURL: "/panel",
          })
        : await authClient.signIn.email({ email, password });
      if (result.error)
        setError(
          register
            ? "No pudimos crear la cuenta. Revisá los datos o intentá ingresar."
            : "No pudimos ingresar. Revisá tus datos y verificá tu correo si corresponde.",
        );
      else if (register && !result.data?.token)
        setMessage("Revisá tu correo para verificar la cuenta y después ingresá.");
      else {
        router.push("/panel");
        router.refresh();
      }
    } catch {
      setError("No hay conexión. Intentá nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form">
      <fieldset disabled={busy}>
        {register && (
          <label>
            Tu nombre
            <input name="name" autoComplete="name" required minLength={2} maxLength={100} />
          </label>
        )}
        <label>
          Correo electrónico
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <label>
          Contraseña
          <input
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
            minLength={12}
            maxLength={128}
          />
          <small>Al menos 12 caracteres.</small>
        </label>
        <button className="btn primary" type="submit">
          {busy ? "Un momento…" : register ? "Crear mi cuenta" : "Ingresar"}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice success">
          {message}
        </p>
      )}
    </form>
  );
}
export function SignOut() {
  const router = useRouter();
  return (
    <button
      className="text-button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
