"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Logo } from "@/components/ui/logo";

const STATS = [
  { value: "20", label: "Editable templates", sub: "ready to customize" },
  { value: "12", label: "Size presets", sub: "plus custom dimensions" },
  { value: "10", label: "Bundled fonts", sub: "for styled text" },
  { value: "4", label: "Export formats", sub: "PNG, JPG, SVG and PDF" },
];

const FOOTER_COLUMNS = [
  {
    title: "Features",
    links: [
      { label: "Design editor", href: "#features" },
      { label: "Templates", href: "#templates" },
      { label: "Multi-page designs", href: "#features" },
      { label: "Image uploads", href: "#features" },
      { label: "Version history", href: "#features" },
      { label: "Export formats", href: "#features" },
      { label: "Share links", href: "#features" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Design Templates", href: "#templates" },
      { label: "Instagram Posts", href: "#templates" },
      { label: "Pitch Decks", href: "#templates" },
      { label: "Posters & Flyers", href: "#templates" },
      { label: "Resumes", href: "#templates" },
      { label: "Business Cards", href: "#templates" },
      { label: "Logo Maker", href: "#templates" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Create an account", href: "/signup" },
      { label: "Your dashboard", href: "/dashboard" },
      { label: "Design templates", href: "#templates" },
      { label: "Share a design", href: "#features" },
      { label: "Make a copy", href: "#features" },
    ],
  },
  {
    title: "Business",
    links: [
      { label: "Private designs", href: "#features" },
      { label: "Saved versions", href: "#features" },
      { label: "View-only sharing", href: "#features" },
      { label: "Multi-page exports", href: "#features" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Create an account", href: "/signup" },
      { label: "Log in", href: "/login" },
      { label: "Open dashboard", href: "/dashboard" },
    ],
  },
];

export function LumioFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      {/* Feature summary banner */}
      <div className="border-b border-ink-100 bg-gradient-to-r from-lumio-purple/5 via-lumio-teal/5 to-lumio-pink/5 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-lumio-purple">
              Made for your next idea
            </h3>
            <p className="mt-1 text-2xl font-extrabold text-ink-950 sm:text-3xl">
              Everything you need to create
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
            {STATS.map((stat, i) => (
              <div key={i} className="rounded-2xl bg-white/80 p-5 ring-1 ring-ink-100 shadow-sm backdrop-blur-sm">
                <div className="text-3xl sm:text-4xl font-extrabold lumio-gradient-text">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm font-bold text-ink-900">{stat.label}</div>
                <div className="text-xs text-ink-500 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Directory Columns */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {FOOTER_COLUMNS.map((col, idx) => (
            <div key={idx}>
              <h4 className="text-sm font-bold text-ink-950 tracking-tight">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <Link
                      href={link.href}
                      className="text-xs text-ink-600 transition-colors hover:text-lumio-purple font-medium"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar: Language, Copyright, Legal */}
        <div className="mt-16 border-t border-ink-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-ink-500">
          <div className="flex flex-wrap items-center gap-4">
            <Logo />
            <span>© 2026 Gimage</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium">
            <span className="flex items-center gap-1 text-ink-400">
              Made with <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> for creators
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
