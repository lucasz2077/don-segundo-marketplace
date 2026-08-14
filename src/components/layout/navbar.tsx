import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { NavActions } from "@/components/layout/nav-actions";

export async function Navbar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-bone">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4">
        <div className="flex flex-wrap items-center gap-4 sm:gap-8">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-brand-900"
          >
            Don Segundo
          </Link>
          <Link
            href="/listados"
            className="text-sm font-medium text-brand-700 transition-colors hover:text-brand-900"
          >
            Explorar
          </Link>
        </div>
        <NavActions user={session?.user ?? null} />
      </nav>
    </header>
  );
}
