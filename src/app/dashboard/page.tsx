import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Welcome, <span className="font-medium">{session.user.name}</span>.
        </p>
        <dl className="mt-6 flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Email</dt>
            <dd className="font-medium text-zinc-900">{session.user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Role</dt>
            <dd className="font-medium text-zinc-900">{session.user.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Account type</dt>
            <dd className="font-medium text-zinc-900">
              {session.user.accountType}
            </dd>
          </div>
        </dl>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-zinc-900 underline"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
