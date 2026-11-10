"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  PenTool,
  RefreshCw,
  Layers,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface MagicFeature {
  id: string;
  title: string;
  tagline: string;
  icon: typeof Wand2;
  description: string;
  bullets: string[];
  mockupPrompt: string;
  badge: string;
  gradient: string;
}

const MAGIC_FEATURES: MagicFeature[] = [
  {
    id: "magic-design",
    title: "AI Layout",
    tagline: "Turn a brief into an editable starting layout",
    icon: Wand2,
    description:
      "Describe a design idea and get a headline, supporting copy, colors, and an editable layout you can refine on the canvas.",
    bullets: [
      "Suggests a headline and supporting copy",
      "Offers centered or split layouts",
      "Suggests a color palette",
    ],
    mockupPrompt: "Generate an eco-friendly pitch deck with natural tones and clean charts",
    badge: "Most Popular",
    gradient: "from-lumio-purple to-lumio-teal",
  },
  {
    id: "magic-media",
    title: "AI Images",
    tagline: "Create an image from a prompt",
    icon: ImageIcon,
    description:
      "Describe the image you need. With your server's OpenAI key, Lumio generates an asset and adds it to your design.",
    bullets: [
      "Generate a 1024 × 1024 image",
      "Save the asset with your uploads",
      "Add it directly to your canvas",
    ],
    mockupPrompt: "A futuristic glowing holographic sneaker floating in a dark studio, neon cyan",
    badge: "Gen AI",
    gradient: "from-blue-600 to-lumio-teal",
  },
  {
    id: "magic-edit",
    title: "Photo Tools",
    tagline: "Crop, filter, and remove backgrounds",
    icon: PenTool,
    description:
      "Edit an uploaded image on the canvas. Apply a preset filter, crop its edges, or remove its background with a connected provider.",
    bullets: [
      "Grayscale, sepia and vivid filters",
      "Remove photo backgrounds with a connected provider",
      "Crop and reset the image crop",
    ],
    mockupPrompt: "Apply a vivid filter and remove the background",
    badge: "Smart Editing",
    gradient: "from-lumio-pink to-amber-500",
  },
  {
    id: "magic-switch",
    title: "Quick Resize",
    tagline: "Resize a design for another format",
    icon: RefreshCw,
    description:
      "Choose a size preset or enter custom dimensions. Lumio scales the objects on each page to fit the new canvas size.",
    bullets: [
      "Choose from 12 size presets",
      "Scale page objects with the canvas",
      "Undo a resize from the editor history",
    ],
    mockupPrompt: "Resize 1080x1080 Post -> 1920x1080 Presentation + 1080x1920 Story",
    badge: "Time Saver",
    gradient: "from-indigo-600 to-purple-600",
  },
];

export function LumioMagicStudio() {
  const [selectedFeature, setSelectedFeature] = useState(MAGIC_FEATURES[0]);

  return (
    <section id="magic-studio" className="scroll-mt-24 py-20 lg:py-28 relative overflow-hidden bg-ink-950 text-white">
      {/* Background glowing auras */}
      <div
        className="pointer-events-none absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-lumio-purple/30 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-lumio-teal/25 blur-[130px]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md ring-1 ring-white/15">
            <Sparkles className="h-4 w-4 text-lumio-teal" />
            <span className="text-xs font-bold tracking-wider uppercase text-white">
              Magic Studio™
            </span>
          </div>

          <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Creative tools,{" "}
            <span className="bg-gradient-to-r from-lumio-teal via-white to-lumio-pink bg-clip-text text-transparent">
              all in one place
            </span>
          </h2>

          <p className="mt-5 text-base sm:text-lg text-ink-300">
            Generate editable copy and images with your own AI key, then crop, filter, resize, and export from one editor.
          </p>
        </div>

        {/* Feature selector tabs */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
          {MAGIC_FEATURES.map((feat) => {
            const Icon = feat.icon;
            const isSelected = selectedFeature.id === feat.id;

            return (
              <button
                key={feat.id}
                type="button"
                onClick={() => setSelectedFeature(feat)}
                className={`flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                  isSelected
                    ? "bg-white text-ink-950 shadow-lg ring-2 ring-lumio-teal scale-105"
                    : "bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white ring-1 ring-white/10"
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? "text-lumio-purple" : "text-lumio-teal"}`} />
                <span>{feat.title}</span>
                <span className={`text-[10px] font-bold uppercase rounded-md px-1.5 py-0.5 ${
                  isSelected ? "bg-lumio-purple-light text-lumio-purple" : "bg-white/10 text-white/70"
                }`}>
                  {feat.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feature Interactive Showcase Card */}
        <div className="mt-10 rounded-3xl border border-white/15 bg-white/[0.04] p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Description & points */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-lg bg-lumio-purple/20 px-3 py-1 text-xs font-bold text-lumio-teal">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{selectedFeature.badge}</span>
              </div>

              <h3 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                {selectedFeature.tagline}
              </h3>

              <p className="text-base text-ink-300 leading-relaxed">
                {selectedFeature.description}
              </p>

              <div className="space-y-3 pt-2">
                {selectedFeature.bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-lumio-teal mt-0.5" />
                    <span className="text-sm font-medium text-ink-200">{bullet}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup"
                  className="lumio-gradient-btn inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-md"
                >
                  <span>Experience Magic Studio</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors ring-1 ring-white/15"
                >
                  <span>Explore tools</span>
                </Link>
              </div>
            </div>

            {/* Right: Visual Interactive Mockup Card */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-gradient-to-br from-ink-900 to-ink-950 p-6 shadow-2xl">
                {/* Glow pill */}
                <div
                  className={`absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gradient-to-br ${selectedFeature.gradient} opacity-30 blur-2xl`}
                />

                {/* Prompt bar simulator */}
                <div className="relative rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-xs font-semibold text-lumio-teal mb-2">
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>AI Studio Prompt</span>
                  </div>
                  <div className="rounded-lg bg-black/40 px-3 py-2 text-sm text-ink-200 font-mono flex items-center justify-between">
                    <span className="line-clamp-1">&ldquo;{selectedFeature.mockupPrompt}&rdquo;</span>
                    <span className="shrink-0 rounded bg-lumio-purple px-1.5 py-0.5 text-[10px] font-bold text-white uppercase ml-2">
                      Generate
                    </span>
                  </div>
                </div>

                {/* Visual results preview mockup */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 p-3 group hover:border-lumio-teal/50 transition-all">
                    <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-lumio-purple/40 to-lumio-teal/30 flex items-center justify-center p-3 relative overflow-hidden">
                      <div className="text-center">
                        <Sparkles className="h-6 w-6 text-white mx-auto mb-1 animate-pulse" />
                        <span className="text-[11px] font-bold text-white">Variation A</span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-ink-300">Modern Layout</span>
                      <span className="text-[10px] text-lumio-teal font-semibold">Ready</span>
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 p-3 group hover:border-lumio-pink/50 transition-all">
                    <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-lumio-pink/30 to-amber-500/30 flex items-center justify-center p-3 relative overflow-hidden">
                      <div className="text-center">
                        <Layers className="h-6 w-6 text-white mx-auto mb-1 animate-pulse" />
                        <span className="text-[11px] font-bold text-white">Variation B</span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-ink-300">Bold Minimal</span>
                      <span className="text-[10px] text-lumio-pink font-semibold">Ready</span>
                    </div>
                  </div>
                </div>

                {/* Status bottom bar */}
                <div className="mt-4 flex items-center justify-between text-xs text-ink-400 border-t border-white/10 pt-3">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Connect your own AI key</span>
                  </span>
                  <span>Instant high-res export</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
