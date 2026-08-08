"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

type NavActionsProps = {
  user: {
    name: string;
    email: string;
  } | null;
};

export function NavActions({ user }: NavActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/sign-in"
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
      >
        {user.name}
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
