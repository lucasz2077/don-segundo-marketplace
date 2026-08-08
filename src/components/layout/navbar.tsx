import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { NavActions } from "@/components/layout/nav-actions";

export async function Navbar() {
  const session = await getSession();

  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-semibold">
          Don Segundo
        </Link>
        <NavActions user={session?.user ?? null} />
      </nav>
    </header>
  );
}
