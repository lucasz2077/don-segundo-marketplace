import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-semibold">
          Don Segundo
        </Link>
      </nav>
    </header>
  );
}
