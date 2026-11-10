"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { safeNext } from "@/lib/safe-redirect";
import { Button } from "@/components/ui/button";
import { Input, Spinner } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const googleError = {
    google_not_configured: "Google sign-in is not set up yet. Use email and password for now.",
    google_cancelled: "Google sign-in was cancelled. You can try again.",
    google_existing_account: "This email already has an account. Log in with your password.",
    google_auth_failed: "Google sign-in could not be completed. Please try again.",
  }[params.get("error") ?? ""];
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const result = await api<{ needsVerification?: boolean }>(`/api/auth/${mode}`, {
        method: "POST",
        json: Object.fromEntries(form.entries()),
      });
      if (result.needsVerification) {
        setNotice("Check your inbox for the verification link before logging in.");
        setPending(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPending(false);
    }
  }

  const other = mode === "login" ? "/signup" : "/login";
  return (
    <div>
      <a
        href={`/api/auth/login?google=1&from=${mode}&next=${encodeURIComponent(next)}`}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-900 transition hover:border-ink-300 hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumio-purple"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="#4285F4" d="M21.35 12.22c0-.73-.06-1.42-.19-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.26Z" />
          <path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.44-2.22l-3.14-2.45c-.87.58-1.99.93-3.3.93-2.54 0-4.69-1.72-5.46-4.02H3.3v2.53A9.73 9.73 0 0 0 12 21.7Z" />
          <path fill="#FBBC05" d="M6.54 13.94a5.85 5.85 0 0 1 0-3.88V7.53H3.3a9.7 9.7 0 0 0 0 8.94l3.24-2.53Z" />
          <path fill="#EA4335" d="M12 6.04c1.43 0 2.71.49 3.72 1.46l2.79-2.8A9.36 9.36 0 0 0 12 2.3a9.73 9.73 0 0 0-8.7 5.23l3.24 2.53C7.31 7.76 9.46 6.04 12 6.04Z" />
        </svg>
        Continue with Google
      </a>
      <div className="my-7 flex items-center gap-4 text-xs font-medium text-ink-400">
        <span className="h-px flex-1 bg-ink-200" />or continue with email<span className="h-px flex-1 bg-ink-200" />
      </div>
      <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      {mode === "signup" && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink-700">Name</span>
          <Input name="name" autoComplete="name" required maxLength={80} placeholder="Your name" className="h-12 rounded-xl px-4" />
        </label>
      )}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink-700">Email</span>
        <Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="h-12 rounded-xl px-4" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink-700">Password</span>
        <Input
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "signup" ? 8 : 1}
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          className="h-12 rounded-xl px-4"
        />
      </label>
      {(error || googleError) && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-600">
          {error || googleError}
        </p>
      )}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      <Button type="submit" size="lg" className="lumio-gradient-btn mt-2 w-full rounded-xl" disabled={pending}>
        {pending && <Spinner />}
        {mode === "login" ? "Log in" : "Create account"}
      </Button>
      <p className="text-center text-sm text-ink-500">
        {mode === "login" ? "New to Gimage? " : "Already have an account? "}
        <Link href={`${other}?next=${encodeURIComponent(next)}`} className="font-medium text-brand-700 hover:underline">
          {mode === "login" ? "Create an account" : "Log in"}
        </Link>
      </p>
      {mode === "login" && <p className="text-center text-sm"><Link href="/forgot-password" className="text-brand-700 hover:underline">Forgot password?</Link> · <Link href="/verify-email" className="text-brand-700 hover:underline">Resend verification</Link></p>}
      {mode === "signup" && <p className="text-center text-sm"><Link href="/verify-email" className="text-brand-700 hover:underline">Resend verification</Link></p>}
      </form>
    </div>
  );
}
