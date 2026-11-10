import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountAction } from "@/components/auth/account-action";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return <AuthShell title="Verify your email" subtitle="Confirm your address to finish setting up your account."><Suspense><AccountAction purpose="verify" /></Suspense></AuthShell>;
}
