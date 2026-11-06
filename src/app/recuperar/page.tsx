import { PasswordRecovery } from "@/components/account-forms";
import Link from "next/link";
export default async function Recovery({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="container narrow page-space">
      <section className="card">
        <h1>Recuperá tu cuenta</h1>
        <PasswordRecovery token={token} />
        <p style={{ marginTop: 24 }}>
          <Link href="/ingresar">Volver a ingresar</Link>
        </p>
      </section>
    </div>
  );
}
