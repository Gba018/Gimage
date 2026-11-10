"use client";

import { useState } from "react";
import { LumioHeader } from "@/components/home/lumio-header";
import { LumioHero } from "@/components/home/lumio-hero";
import { LumioTemplates } from "@/components/home/lumio-templates";
import { LumioFeatures } from "@/components/home/lumio-features";
import { LumioFooter } from "@/components/home/lumio-footer";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  return (
    <div className="flex min-h-screen flex-col bg-white text-ink-900 selection:bg-lumio-purple-light selection:text-lumio-purple">
      <LumioHeader />

      <main className="flex-1">
        <LumioHero
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <LumioTemplates
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />

        <LumioFeatures />
      </main>

      <LumioFooter />
    </div>
  );
}
