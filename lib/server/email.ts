import "server-only";
import nodemailer from "nodemailer";

export function emailConfigured(): boolean {
  return !!(process.env.SMTP_URL && process.env.SMTP_FROM && process.env.APP_ORIGIN);
}

export async function sendAccountEmail(to: string, kind: "verify" | "reset", token: string): Promise<void> {
  if (!emailConfigured()) throw new Error("SMTP_URL, SMTP_FROM and APP_ORIGIN are required for account email");
  const origin = new URL(process.env.APP_ORIGIN!);
  if (origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password || (origin.protocol !== "https:" && !(origin.protocol === "http:" && origin.hostname === "localhost"))) {
    throw new Error("APP_ORIGIN must be an HTTPS origin (or localhost for development)");
  }
  const path = kind === "verify" ? "/verify-email" : "/reset-password";
  const link = new URL(path, origin);
  link.searchParams.set("token", token);
  const subject = kind === "verify" ? "Verify your Gimage email" : "Reset your Gimage password";
  const text = kind === "verify"
    ? `Confirm your email address to use Gimage. This link expires in 24 hours:\n\n${link}\n\nIf you did not create an account, ignore this email.`
    : `Reset your Gimage password with this link. It expires in one hour:\n\n${link}\n\nIf you did not request this, ignore this email.`;
  const transport = nodemailer.createTransport({
    url: process.env.SMTP_URL!,
    requireTLS: process.env.NODE_ENV === "production" && !process.env.SMTP_URL!.startsWith("smtps:"),
    connectionTimeout: 10_000,
    socketTimeout: 10_000,
  });
  try {
    await transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
  } finally {
    transport.close();
  }
}
