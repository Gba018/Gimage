"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/input";
import type { EditorDesign } from "./editor";

// Fabric touches `window` at import time, so the editor only renders in the browser.
const Editor = dynamic(() => import("./editor").then((m) => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-ink-100 text-brand-600">
      <Spinner size={28} />
    </div>
  ),
});

export function EditorLoader({ design }: { design: EditorDesign }) {
  return <Editor design={design} />;
}
