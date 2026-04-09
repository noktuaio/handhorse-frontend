import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>AppAI</h1>
      <Link href="/auth/login">Ir para login</Link>
    </main>
  );
}
