"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";

const NAV_ITEMS = [
  { label: "Templates", href: "#templates" },
  { label: "Features", href: "#features" },
  { label: "My designs", href: "/dashboard" },
];

export function LumioHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="relative z-50 bg-[#7927e8] text-white">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight" aria-label="Gimage home">
          <LogoMark size={32} /> Gimage
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} href={item.href} className="text-sm font-medium text-white/85 transition-colors hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 sm:inline-flex">Log in</Link>
          <Link href="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#26212e] shadow-sm transition-colors hover:bg-[#f2edf9] sm:px-5">Sign up free</Link>
          <button type="button" aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-lg p-2 text-white hover:bg-white/10 md:hidden">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav aria-label="Mobile navigation" className="border-t border-white/20 bg-[#7927e8] px-4 pb-4 pt-2 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-white/10">{item.label}</Link>
          ))}
          <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-white/10 sm:hidden">Log in</Link>
        </nav>
      )}
    </header>
  );
}
