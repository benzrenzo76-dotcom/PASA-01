"use client";
import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/action";
export function ActionForm({
  action,
  children,
  className = "form",
  confirm,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  confirm?: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form
      action={submit}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <fieldset disabled={pending}>{children}</fieldset>
      {pending && <p role="status">Guardando…</p>}
      {state.error && (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="notice success" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}
