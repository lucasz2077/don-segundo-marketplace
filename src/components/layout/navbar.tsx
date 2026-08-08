import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { NavActions } from "@/components/layout/nav-actions";

export async function Navbar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-bone">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-brand-900"
        >
          Don Segundo
        </Link>
        <NavActions user={session?.user ?? null} />
      </nav>
    </header>
  );
}
