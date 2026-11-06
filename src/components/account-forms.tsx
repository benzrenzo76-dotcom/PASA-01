"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export function ProfileForm({ name }: { name: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const value = String(new FormData(e.currentTarget).get("name")).trim();
      if (value.length < 2 || value.length > 100) {
        setMessage("El nombre debe tener entre 2 y 100 caracteres.");
        return;
      }
      const result = await authClient.updateUser({ name: value });
      setMessage(result.error ? "No pudimos actualizar el perfil." : "Tu perfil fue actualizado.");
      router.refresh();
    } catch {
      setMessage("No hay conexión. Intentá nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <label>
        Nombre
        <input name="name" defaultValue={name} required minLength={2} maxLength={100} />
      </label>
      <button className="btn primary" disabled={busy}>
        Guardar perfil
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
export function PasswordRecovery({ token }: { token?: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      if (token) {
        const result = await authClient.resetPassword({
          token,
          newPassword: String(form.get("password")),
        });
        setMessage(
          result.error
            ? "El enlace no es válido o venció. Pedí uno nuevo."
            : "Contraseña actualizada. Ya podés ingresar.",
        );
      } else {
        await authClient.requestPasswordReset({
          email: String(form.get("email")),
          redirectTo: "/recuperar",
        });
        setMessage(
          "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.",
        );
      }
    } catch {
      setMessage("No pudimos conectar. Intentá nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      {token ? (
        <label>
          Nueva contraseña
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
      ) : (
        <label>
          Correo electrónico
          <input name="email" type="email" autoComplete="email" required />
        </label>
      )}
      <button className="btn primary" disabled={busy}>
        {token ? "Actualizar contraseña" : "Enviar enlace"}
      </button>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </form>
  );
}
