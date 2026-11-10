"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Spinner } from "@/components/ui/input";

export function AccountAction({ purpose }: { purpose: "verify" | "reset" }) {
  const token = useSearchParams().get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (token) {
        await api("/api/auth/email", { method: "PATCH", json: { purpose, token, ...(purpose === "reset" ? { password } : {}) } });
        setMessage(purpose === "verify" ? "Email verified. You can log in now." : "Password updated. Log in with your new password.");
      } else {
        await api("/api/auth/email", { method: "POST", json: { purpose, email } });
        setMessage("If this address has an eligible account, a link is on its way. Check your inbox.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not complete this request");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!token && <label className="block space-y-1.5"><span className="text-sm font-medium text-ink-700">Email</span><Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-xl px-4" /></label>}
      {token && purpose === "reset" && <label className="block space-y-1.5"><span className="text-sm font-medium text-ink-700">New password</span><Input type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-xl px-4" /></label>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-600">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
      {!message && <Button type="submit" size="lg" disabled={pending} className="lumio-gradient-btn w-full rounded-xl">{pending && <Spinner />}{token ? (purpose === "verify" ? "Verify email" : "Reset password") : (purpose === "verify" ? "Send verification link" : "Send reset link")}</Button>}
      <p className="text-center text-sm"><Link href="/login" className="text-brand-700 hover:underline">Back to login</Link></p>
    </form>
  );
}
