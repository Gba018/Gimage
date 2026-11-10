"use client";

import Link from "next/link";
import {
  FileText,
  Presentation,
  LayoutGrid,
  Video,
  Globe,
  Printer,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface SuiteProduct {
  id: string;
  title: string;
  category: string;
  icon: typeof FileText;
  description: string;
  features: string[];
  gradient: string;
  accentBg: string;
  accentText: string;
  link: string;
}

const PRODUCTS: SuiteProduct[] = [
  {
    id: "docs",
    title: "Docs",
    category: "Visual Documents",
    icon: FileText,
    description: "Create engaging documents with rich formatting, graphics, interactive charts, and 1-click Doc to Deck transformation.",
    features: ["Doc to Presentation in seconds", "Interactive data visualizations", "Collaborative commenting"],
    gradient: "from-blue-500 to-cyan-500",
    accentBg: "bg-blue-50",
    accentText: "text-blue-600",
    link: "/dashboard",
  },
  {
    id: "presentations",
    title: "Presentations",
    category: "Interactive Slides",
    icon: Presentation,
    description: "Make presentations that impress. Smooth slide transitions, presenter view, live audience Q&A, and remote control from your phone.",
    features: ["Cinematic animation presets", "Built-in presenter notes & timer", "Export to PDF or live URL"],
    gradient: "from-amber-500 to-orange-500",
    accentBg: "bg-amber-50",
    accentText: "text-amber-600",
    link: "/dashboard",
  },
  {
    id: "whiteboards",
    title: "Whiteboards",
    category: "Infinite Brainstorming",
    icon: LayoutGrid,
    description: "Unleash team creativity on an infinite canvas with sticky notes, flowcharts, voting stickers, and live cursor presence.",
    features: ["Infinite zoom canvas", "Smart flowcharts & shapes", "Team voting & countdown timer"],
    gradient: "from-purple-500 to-indigo-600",
    accentBg: "bg-purple-50",
    accentText: "text-purple-600",
    link: "/dashboard",
  },
  {
    id: "video",
    title: "Video Editor",
    category: "Drag-and-Drop Video",
    icon: Video,
    description: "Edit videos without the complexity. Trim clips, sync sound to beats, add captions, and export in 4K or vertical format.",
    features: ["Intuitive timeline multi-tracks", "Auto beat sync & audio fade", "Reels, TikTok & YouTube formats"],
    gradient: "from-rose-500 to-pink-500",
    accentBg: "bg-rose-50",
    accentText: "text-rose-600",
    link: "/dashboard",
  },
  {
    id: "websites",
    title: "Websites",
    category: "No-Code Sites",
    icon: Globe,
    description: "Publish responsive websites in minutes. Portfolio pages, event invites, and product showcases with custom domains.",
    features: ["Fully mobile responsive", "Password protection options", "Instant free web hosting"],
    gradient: "from-emerald-500 to-teal-500",
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-600",
    link: "/dashboard",
  },
  {
    id: "print",
    title: "Lumio Print",
    category: "Physical Merchandise",
    icon: Printer,
    description: "Bring your digital designs into the real world. Business cards, flyers, posters, t-shirts, and mugs delivered to your doorstep.",
    features: ["Premium paper stocks & finishes", "Sustainable eco-friendly printing", "Fast doorstep delivery"],
    gradient: "from-violet-500 to-purple-600",
    accentBg: "bg-violet-50",
    accentText: "text-violet-600",
    link: "/dashboard",
  },
];

export function LumioVisualSuite() {
  return (
    <section id="visual-suite" className="scroll-mt-24 py-20 lg:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section title */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-lumio-teal-light px-3.5 py-1 text-xs font-bold text-lumio-teal-dark">
            <Sparkles className="h-3.5 w-3.5" />
            <span>The Lumio Visual Suite</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl lg:text-5xl">
            A tool for every idea,{" "}
            <span className="lumio-gradient-text">all connected</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-600">
            From quick social stories to multi-page annual reports, brainstorm, design, and share without jumping between disjointed apps.
          </p>
        </div>

        {/* Products Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS.map((prod) => {
            const Icon = prod.icon;
            return (
              <div
                key={prod.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lumio-landing-hover hover:border-lumio-purple/30"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${prod.gradient} text-white shadow-sm transition-transform group-hover:scale-105`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${prod.accentBg} ${prod.accentText}`}>
                      {prod.category}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-ink-950 group-hover:text-lumio-purple transition-colors">
                    Lumio {prod.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {prod.description}
                  </p>

                  <ul className="mt-5 space-y-2 border-t border-ink-100 pt-4">
                    {prod.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs font-medium text-ink-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-lumio-teal" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-ink-100">
                  <Link
                    href={prod.link}
                    className="flex items-center justify-between text-xs font-bold text-lumio-purple hover:underline"
                  >
                    <span>Design with {prod.title}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
