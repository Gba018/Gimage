"use client";

import Link from "next/link";
import { ArrowRight, Search, Shapes, Type, Image as ImageIcon } from "lucide-react";
import { DesignPreview } from "@/components/design-preview";
import { TEMPLATES } from "@/lib/design/templates";
import type { PageData } from "@/lib/design/types";

const featured = ["summer-sale", "pitch-deck", "launch-story"].map((id) => {
  const template = TEMPLATES.find((item) => item.id === id)!;
  const page: PageData = { id: template.id, ...template.pages[0] };
  return { ...template, page };
});

export function LumioHero({ searchQuery, setSearchQuery }: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  const searchTemplates = (event: React.FormEvent) => {
    event.preventDefault();
    document.getElementById("templates")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#7927e8_0%,#6251ed_44%,#238cc6_78%,#64c8d5_100%)] px-4 pb-16 pt-12 text-white sm:px-6 sm:pt-20 lg:pb-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_85%_68%,rgba(18,16,99,0.22),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl text-center">
        <span className="inline-flex items-center rounded-full border border-white/35 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur-sm">A design space for every idea</span>
        <h1 className="mx-auto mt-6 max-w-5xl text-5xl font-medium leading-[1.08] tracking-[-0.045em] sm:text-7xl lg:text-[88px]">
          Your ideas, made real with Gimage
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/90 sm:text-xl">
          Create social posts, presentations, documents, and more. Start with a template, make it yours, then export or share.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#272332] shadow-[0_6px_16px_rgba(25,20,75,0.2)] transition-transform hover:-translate-y-0.5 hover:bg-[#f7f4fb]">
            Start designing for free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="#templates" className="inline-flex min-h-12 items-center rounded-xl border border-white/50 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20">Explore templates</Link>
        </div>

        <form onSubmit={searchTemplates} role="search" className="mx-auto mt-7 flex h-12 max-w-xl items-center gap-3 rounded-xl border border-white/40 bg-[#231f46]/30 px-4 text-left backdrop-blur-md focus-within:ring-2 focus-within:ring-white/70">
          <Search className="h-5 w-5 shrink-0 text-white/80" />
          <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search templates" aria-label="Search templates" className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/75 focus:outline-none" />
          <button type="submit" className="text-xs font-bold text-white hover:underline">Search</button>
        </form>

        <div className="relative mx-auto mt-12 max-w-6xl rounded-[26px] border border-white/30 bg-[#22202c] p-2 text-left shadow-[0_30px_90px_rgba(26,17,98,0.32)] sm:mt-16 sm:p-3">
          <div className="flex h-10 items-center justify-between rounded-t-2xl bg-[#2c2938] px-4 text-xs text-white/70">
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#ff6b78]" /><span className="h-2.5 w-2.5 rounded-full bg-[#ffc45f]" /><span className="h-2.5 w-2.5 rounded-full bg-[#5fd4a2]" /></div>
            <span className="font-medium text-white">Create with Gimage</span>
            <span className="hidden sm:inline">Your design space</span>
          </div>
          <div className="flex min-h-[250px] rounded-b-2xl bg-[#f5f3f7] sm:min-h-[400px]">
            <div className="hidden w-16 shrink-0 flex-col items-center gap-6 rounded-bl-2xl border-r border-[#dfdbe5] bg-white py-7 text-[#625b70] sm:flex">
              <Shapes className="h-5 w-5" /><Type className="h-5 w-5" /><ImageIcon className="h-5 w-5" />
            </div>
            <div className="flex flex-1 items-center justify-center gap-4 overflow-hidden p-4 sm:gap-8 sm:p-8">
              <div className="hidden w-[21%] -rotate-6 overflow-hidden rounded-xl bg-white p-2 shadow-xl lg:block">
                <DesignPreview page={featured[0].page} width={featured[0].width} height={featured[0].height} alt="Summer Sale social post template" />
                <p className="px-1 pt-2 text-xs font-semibold text-[#302c39]">Social posts</p>
              </div>
              <div className="w-full max-w-[610px] overflow-hidden rounded-xl bg-white p-2 shadow-2xl sm:p-3">
                <DesignPreview page={featured[1].page} width={featured[1].width} height={featured[1].height} alt="Startup Pitch presentation template" />
                <p className="px-1 pt-2 text-xs font-semibold text-[#302c39] sm:pt-3">Presentations that stand out</p>
              </div>
              <div className="hidden w-[16%] rotate-6 overflow-hidden rounded-xl bg-white p-2 shadow-xl lg:block">
                <DesignPreview page={featured[2].page} width={featured[2].width} height={featured[2].height} alt="Product Launch story template" />
                <p className="px-1 pt-2 text-xs font-semibold text-[#302c39]">Stories</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
