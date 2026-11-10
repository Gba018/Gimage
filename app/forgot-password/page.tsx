import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountAction } from "@/components/auth/account-action";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return <AuthShell title="Forgot password?" subtitle="We'll email you a link to reset it."><Suspense><AccountAction purpose="reset" /></Suspense></AuthShell>;
}
