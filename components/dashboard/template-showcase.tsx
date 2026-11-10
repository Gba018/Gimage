"use client";

import Link from "next/link";
import { DesignPreview } from "@/components/design-preview";
import { TEMPLATES } from "@/lib/design/templates";
import type { PageData } from "@/lib/design/types";

const FEATURED = ["summer-sale", "launch-story", "pitch-deck", "event-poster", "birthday-card", "minimal-quote"];

const pages = new Map<string, PageData>(
  TEMPLATES.map((t) => [t.id, { id: t.id, background: t.pages[0].background, objects: t.pages[0].objects }]),
);

export function TemplateShowcase() {
  const items = TEMPLATES.filter((t) => FEATURED.includes(t.id));
  return (
    <div className="columns-2 gap-4 sm:columns-3 lg:columns-6">
      {items.map((t) => (
        <Link key={t.id} href={`/dashboard?template=${t.id}`} className="group mb-4 block break-inside-avoid">
          <DesignPreview
            page={pages.get(t.id)!}
            width={t.width}
            height={t.height}
            alt={`${t.name} template`}
            className="rounded-xl shadow-panel ring-1 ring-ink-100 transition-transform group-hover:-translate-y-1"
          />
          <p className="mt-2 text-sm font-medium text-ink-700">{t.name}</p>
        </Link>
      ))}
    </div>
  );
}
