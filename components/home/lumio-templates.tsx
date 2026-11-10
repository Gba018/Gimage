"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight, Sparkles, LayoutTemplate } from "lucide-react";
import { DesignPreview } from "@/components/design-preview";
import { TEMPLATES } from "@/lib/design/templates";
import { SIZE_PRESETS } from "@/lib/design/presets";
import type { PageData } from "@/lib/design/types";

// Pre-create PageData map for templates
const pages = new Map<string, PageData>(
  TEMPLATES.map((t) => [t.id, { id: t.id, background: t.pages[0].background, objects: t.pages[0].objects }]),
);

interface LumioTemplatesProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

const TABS = [
  { id: "all", label: "All Templates" },
  { id: "social", label: "Social Media" },
  { id: "presentations", label: "Presentations" },
  { id: "print", label: "Posters & Print" },
  { id: "brand", label: "Marketing & Logos" },
];

export function LumioTemplates({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
}: LumioTemplatesProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [showAll, setShowAll] = useState(false);

  // Sync category dock with tabs
  const currentTab = useMemo(() => {
    if (selectedCategory && selectedCategory !== "all") {
      if (selectedCategory === "social") return "social";
      if (selectedCategory === "presentations") return "presentations";
      if (selectedCategory === "print" || selectedCategory === "docs") return "print";
      if (selectedCategory === "websites" || selectedCategory === "video") return "all";
    }
    return activeTab;
  }, [selectedCategory, activeTab]);

  // Filter templates based on tab and search query
  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((template) => {
      // Filter by tab
      if (currentTab === "social") {
        if (!template.category.toLowerCase().includes("instagram") && !template.category.toLowerCase().includes("social")) {
          return false;
        }
      } else if (currentTab === "presentations") {
        if (!template.category.toLowerCase().includes("presentation") && !template.name.toLowerCase().includes("deck")) {
          return false;
        }
      } else if (currentTab === "print") {
        if (!["poster", "flyer", "business card"].some((format) => template.category.toLowerCase().includes(format))) {
          return false;
        }
      } else if (currentTab === "brand") {
        if (!template.category.toLowerCase().includes("logo") && !template.tags.includes("promo") && !template.tags.includes("sale")) {
          return false;
        }
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = template.name.toLowerCase().includes(q);
        const matchesCategory = template.category.toLowerCase().includes(q);
        const matchesTags = template.tags.some((t) => t.toLowerCase().includes(q));
        return matchesName || matchesCategory || matchesTags;
      }

      return true;
    });
  }, [currentTab, searchQuery]);
  const visibleTemplates = showAll || searchQuery.trim() || currentTab !== "all" ? filteredTemplates : filteredTemplates.slice(0, 8);

  return (
    <section id="templates" className="scroll-mt-24 py-16 lg:py-20 bg-ink-50/70 border-t border-b border-ink-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-lumio-purple-light px-3 py-1 text-xs font-bold text-lumio-purple-dark">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Explore Templates</span>
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
              Start with a stunning template
            </h2>
            <p className="mt-2 text-base text-ink-600 max-w-xl">
              Every design is completely customizable. Change colors, fonts, shapes, or upload your own images in seconds.
            </p>
          </div>

          {/* Tab selector */}
          <div className="mt-6 flex w-full items-center gap-2 overflow-x-auto pb-2 no-scrollbar" role="group" aria-label="Template categories">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={currentTab === tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedCategory(tab.id);
                }}
                className={`min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  currentTab === tab.id
                    ? "bg-ink-950 text-white shadow-sm"
                    : "bg-white text-ink-700 hover:bg-ink-100 ring-1 ring-ink-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blank Preset Quick Row ("Create from scratch") */}
        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">
              Create blank design
            </h3>
            <span className="text-xs text-ink-400">Custom dimensions & presets</span>
          </div>

          <div className="flex gap-3 overflow-x-auto px-0.5 pb-3 no-scrollbar md:grid md:grid-cols-6 md:overflow-visible md:pb-0">
            {SIZE_PRESETS.slice(0, 6).map((preset) => (
              <Link
                key={preset.id}
                href={`/dashboard`}
                className="group flex min-h-30 min-w-36 flex-col items-center justify-center rounded-2xl bg-white p-3 ring-1 ring-ink-200/80 transition-all hover:-translate-y-1 hover:shadow-lumio-landing-hover hover:ring-lumio-purple/50 md:min-w-0 md:p-4"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-50 text-ink-600 group-hover:bg-lumio-purple-light group-hover:text-lumio-purple transition-colors">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="mt-3 text-center text-xs font-bold text-ink-900 group-hover:text-lumio-purple transition-colors">
                  {preset.name}
                </span>
                <span className="mt-0.5 text-[11px] text-ink-400">
                  {preset.width} × {preset.height} px
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Search status / Clear button */}
        {searchQuery && (
          <div className="mt-8 flex flex-col items-start gap-2 rounded-xl bg-brand-50/70 p-3 ring-1 ring-brand-200 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-brand-900">
              Showing templates matching: <strong className="font-semibold">&quot;{searchQuery}&quot;</strong> ({filteredTemplates.length} found)
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-bold text-brand-700 hover:underline"
            >
              Clear search filter
            </button>
          </div>
        )}

        {/* Templates Grid */}
        <div className="mt-8">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center ring-1 ring-ink-100">
              <LayoutTemplate className="h-12 w-12 text-ink-300" />
              <h4 className="mt-4 text-base font-semibold text-ink-900">No templates found for this criteria</h4>
              <p className="mt-1 text-sm text-ink-500">Try adjusting your search terms or browse all categories.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("all");
                  setSelectedCategory("all");
                }}
                className="lumio-gradient-btn mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {visibleTemplates.map((template) => {
                const page = pages.get(template.id);
                if (!page) return null;

                return (
                  <Link
                    key={template.id}
                    href={`/dashboard?template=${template.id}`}
                    aria-label={`Use ${template.name} template`}
                    className="group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-ink-200/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-lumio-landing-hover hover:ring-lumio-purple/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumio-purple"
                  >
                    {/* Preview Thumbnail Container */}
                    <div className="relative w-full overflow-hidden bg-ink-100/50 p-2 sm:p-3">
                      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#ece9ef] shadow-sm transition-transform duration-300 group-hover:scale-[1.02]">
                        <DesignPreview
                          page={page}
                          width={template.width}
                          height={template.height}
                          alt={`${template.name} design template`}
                          maxSize={320}
                          fit="contain"
                          className="h-full w-full"
                        />
                      </div>

                      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-ink-950/40 p-4 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100 sm:flex">
                        <span className="lumio-gradient-btn inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-lg">Customize <ArrowRight className="h-3.5 w-3.5" /></span>
                      </div>
                    </div>

                    {/* Card Footer Info */}
                    <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="max-w-full truncate rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700">
                            {template.category}
                          </span>
                          <span className="hidden text-[11px] text-ink-400 sm:inline">
                            {template.width} × {template.height}
                          </span>
                        </div>
                        <h4 className="mt-2 text-sm font-bold text-ink-950 group-hover:text-lumio-purple transition-colors">
                          {template.name}
                        </h4>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
                        <div className="hidden flex-wrap gap-1 sm:flex">
                          {template.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[10px] text-ink-400 font-medium">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-lumio-purple">Use template <ArrowRight className="h-3 w-3" /></span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {!showAll && !searchQuery.trim() && currentTab === "all" && filteredTemplates.length > visibleTemplates.length && (
            <button type="button" onClick={() => setShowAll(true)} className="mx-auto mt-8 flex min-h-11 items-center rounded-full border border-ink-200 bg-white px-6 text-sm font-semibold text-ink-900 transition-colors hover:border-lumio-purple hover:text-lumio-purple">
              Show all {filteredTemplates.length} templates
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
