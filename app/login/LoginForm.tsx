"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = useMemo(() => search.get("next") || "/", [search]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="rounded-3xl bg-white ring-1 ring-black/10 shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-black/60">
            Use a test account (admin / teacher / student).
          </p>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block space-y-1">
            <div className="text-sm font-medium">Username</div>
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="block space-y-1">
            <div className="text-sm font-medium">Password</div>
            <input
              type="password"
              className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black text-white px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

