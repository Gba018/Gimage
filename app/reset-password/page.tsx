import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountAction } from "@/components/auth/account-action";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return <AuthShell title="Reset your password" subtitle="Choose a new password for your account."><Suspense><AccountAction purpose="reset" /></Suspense></AuthShell>;
}
