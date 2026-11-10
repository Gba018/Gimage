"use client";

import { useEffect, useState } from "react";
import { useEditor } from "./editor-context";
import type { HealthIssue } from "./health-check";

export function HealthReport({ currentOnly, scale, transparent, onReadyChange }: { currentOnly: boolean; scale: number; transparent: boolean; onReadyChange: (ready: boolean) => void }) {
  const { engine, state } = useEditor();
  const key = `${state.revision}:${state.activePage}:${currentOnly}:${scale}:${transparent}`;
  const [result, setResult] = useState<{ key: string; issues: HealthIssue[]; error?: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const doc = engine.toDoc();
    const pages = currentOnly ? [engine.activeIndex] : doc.pages.map((_, i) => i);
    import("./health-check").then(({ checkDesignHealth }) => checkDesignHealth(doc, pages, scale, transparent)).then(
      (issues) => { if (!cancelled) setResult({ key, issues }); },
      () => { if (!cancelled) setResult({ key, issues: [], error: "Health check could not finish. You can retry by reopening Download." }); },
    );
    return () => { cancelled = true; };
  }, [engine, key, currentOnly, scale, transparent]);
  const ready = result?.key === key;
  useEffect(() => { onReadyChange(ready); return () => onReadyChange(false); }, [ready, onReadyChange]);
  return <section className="mt-5 rounded-xl bg-ink-50 p-3" aria-label="Design health check" aria-live="polite">
    <h3 className="text-sm font-semibold text-ink-900">Design health check</h3>
    {!ready ? <p className="mt-1 text-xs text-ink-500">Checking images, text, contrast and fonts…</p> : result.error ? <p className="mt-1 text-xs text-danger-600">{result.error}</p> : <>
      <p className="mt-1 text-xs text-ink-600">{result.issues.length ? `${result.issues.length} warning${result.issues.length === 1 ? "" : "s"} — review before exporting.` : "No issues found in the checks performed."}</p>
      {result.issues.length > 0 && <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-ink-700">{result.issues.map((issue, i) => <li key={i}><strong>Page {issue.page + 1} · {issue.label}</strong><br />{issue.message}</li>)}</ul>}
    </>}
    <p className="mt-2 text-xs text-ink-500">Advisory checks. Contrast covers plain text on solid backgrounds; review gradients, photos and styled text visually.</p>
  </section>;
}
