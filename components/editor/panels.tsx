"use client";

import { Eye, EyeOff, GripVertical, History, Image as ImageIcon, Lock, Trash2, Unlock, Upload as UploadIcon, Wallpaper } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { FONTS } from "@/lib/design/fonts";
import { rect, text as textBuilder } from "@/lib/design/builders";
import type { BrandKit } from "@/lib/server/brand-kit";
import { TEMPLATE_CATEGORIES, TEMPLATES } from "@/lib/design/templates";
import type { DesignDoc, PageData } from "@/lib/design/types";
import { DesignPreview } from "@/components/design-preview";
import { Button } from "@/components/ui/button";
import { Input, Spinner } from "@/components/ui/input";
import { ColorPicker } from "./color-picker";
import { useEditor } from "./editor-context";
import { FONT_COMBOS, GRADIENTS, LINES, SHAPES, TEXT_PRESETS } from "./elements";
import { backgroundCss } from "./fabric-setup";
import { ACCEPTED_IMAGE_TYPES, onUploaded, uploadImage, type Upload } from "./uploads";

export const DRAG_MIME = "application/x-lumio-element";

export type DragPayload = { kind: "shape" | "line" | "text"; id: string } | { kind: "image"; url: string; name: string };

function setDrag(e: React.DragEvent, payload: DragPayload) {
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copy";
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-ink-500 first:mt-0">{children}</h3>;
}

export function BrandKitPanel() {
  const { engine, state, notify } = useEditor();
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [newColor, setNewColor] = useState("#7d2ae8");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let alive = true;
    api<{ brandKit: BrandKit }>("/api/brand-kit").then(({ brandKit }) => { if (alive) setKit(brandKit); }).catch((error: Error) => notify(error.message, "error"));
    return () => { alive = false; };
  }, [notify]);
  if (!kit) return <Spinner size={22} />;
  const save = async () => {
    setSaving(true);
    try {
      const { brandKit } = await api<{ brandKit: BrandKit }>("/api/brand-kit", { method: "PUT", json: { colors: kit.colors, fontFamily: kit.fontFamily, logoUploadId: kit.logoUploadId } });
      setKit(brandKit);
      notify("Brand Kit saved");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save Brand Kit", "error");
    } finally {
      setSaving(false);
    }
  };
  return <div className="space-y-4 text-sm text-ink-700">
    <p className="text-xs text-ink-500">Save your colors, font and logo for reuse across designs.</p>
    <PanelHeading>Colors</PanelHeading>
    <div className="flex flex-wrap gap-2">{kit.colors.map((color) => <button key={color} type="button" title={`Apply ${color}`} aria-label={`Apply ${color}`} onClick={() => state.selection ? engine.updateSelection({ fill: color }) : engine.setBackground(color)} className="h-9 w-9 rounded-lg border border-ink-200" style={{ backgroundColor: color }} />)}</div>
    <div className="flex gap-2"><input type="color" aria-label="New brand color" value={newColor} onChange={(event) => setNewColor(event.target.value)} /><button type="button" disabled={kit.colors.length >= 12 || kit.colors.includes(newColor)} onClick={() => setKit({ ...kit, colors: [...kit.colors, newColor] })} className="rounded-lg bg-ink-100 px-3 py-1.5 disabled:opacity-50">Add color</button></div>
    {kit.colors.length > 0 && <button type="button" onClick={() => setKit({ ...kit, colors: kit.colors.slice(0, -1) })} className="text-xs text-ink-500 underline">Remove last color</button>}
    <PanelHeading>Font</PanelHeading>
    <select aria-label="Brand font" value={kit.fontFamily} onChange={(event) => setKit({ ...kit, fontFamily: event.target.value as BrandKit["fontFamily"] })} className="w-full rounded-lg border border-ink-200 bg-white p-2">{FONTS.map((font) => <option key={font.family} value={font.family}>{font.family}</option>)}</select>
    <button type="button" disabled={!state.selection?.text} onClick={() => void engine.updateText({ fontFamily: kit.fontFamily })} className="rounded-lg bg-ink-100 px-3 py-1.5 text-xs disabled:opacity-50">Apply to selected text</button>
    <PanelHeading>Logo</PanelHeading>
    {kit.logoUrl && <button type="button" onClick={() => void engine.addImage(kit.logoUrl!, "Brand logo")} className="block rounded-lg border border-ink-200 p-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- authenticated upload served by the API */}
      <img src={kit.logoUrl} alt="Brand logo" className="max-h-24 max-w-full" />
    </button>}
    <input type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} aria-label="Upload brand logo" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const upload = await uploadImage(file); setKit((current) => current && { ...current, logoUploadId: upload.id, logoUrl: upload.url }); } catch (error) { notify(error instanceof Error ? error.message : "Could not upload logo", "error"); } }} className="block w-full text-xs" />
    {kit.logoUploadId && <button type="button" onClick={() => setKit({ ...kit, logoUploadId: null, logoUrl: null })} className="text-xs text-ink-500 underline">Remove logo</button>}
    <Button type="button" onClick={() => void save()} disabled={saving} className="w-full">{saving ? "Saving…" : "Save Brand Kit"}</Button>
  </div>;
}

type AiLayout = { headline: string; subtitle: string; background: string; foreground: string; accent: string; layout: "centered" | "split" };

export function AiPanel() {
  const { engine, state, notify } = useEditor();
  const [prompt, setPrompt] = useState("");
  const [layout, setLayout] = useState<AiLayout | null>(null);
  const [busy, setBusy] = useState<"layout" | "image" | null>(null);

  async function generateLayout() {
    setBusy("layout");
    try {
      const result = await api<{ layout: AiLayout }>("/api/ai/layout", { method: "POST", json: { prompt } });
      setLayout(result.layout);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not generate layout", "error");
    } finally { setBusy(null); }
  }

  async function generateImage() {
    setBusy("image");
    try {
      const { upload } = await api<{ upload: Upload }>("/api/ai/image", { method: "POST", json: { prompt } });
      await engine.addImage(upload.url, "AI generated image");
      notify("Image added to design");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not generate image", "error");
    } finally { setBusy(null); }
  }

  async function applyLayout() {
    if (!layout) return;
    const w = state.width;
    const h = state.height;
    engine.setBackground(layout.background);
    const objects = layout.layout === "split" ? [rect(w * 0.55, 0, w * 0.45, h, layout.accent)] : [];
    objects.push(textBuilder(w * 0.08, h * 0.22, w * 0.48, layout.headline, { fontSize: Math.max(24, Math.round(w * 0.065)), fontFamily: "Poppins", fontWeight: "bold", fill: layout.foreground, align: layout.layout === "centered" ? "center" : "left" }));
    objects.push(textBuilder(w * 0.08, h * 0.53, w * 0.48, layout.subtitle, { fontSize: Math.max(16, Math.round(w * 0.028)), fontFamily: "Inter", fill: layout.foreground, align: layout.layout === "centered" ? "center" : "left" }));
    if (layout.layout === "centered") {
      objects[0].left = w * 0.1;
      objects[0].width = w * 0.8;
      objects[1].left = w * 0.18;
      objects[1].width = w * 0.64;
    }
    await engine.addSerialized(objects);
    notify("Suggested layout added. Edit each element on the canvas.");
  }

  return <div className="space-y-4 text-sm text-ink-700">
    <p className="text-xs text-ink-500">Describe your design. Generate editable copy and layout, or create an image. Your server needs an OpenAI API key.</p>
    <label className="block text-xs font-semibold">Design brief<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={500} rows={4} placeholder="A bold launch poster for a local coffee shop" className="mt-2 w-full rounded-lg border border-ink-200 p-3 text-sm" /></label>
    <div className="grid grid-cols-2 gap-2"><Button type="button" disabled={busy !== null || prompt.trim().length < 5} onClick={() => void generateLayout()}>{busy === "layout" ? "Generating…" : "Suggest layout"}</Button><Button type="button" variant="secondary" disabled={busy !== null || prompt.trim().length < 5} onClick={() => void generateImage()}>{busy === "image" ? "Generating…" : "Generate image"}</Button></div>
    {layout && <div className="space-y-3 rounded-lg border border-ink-200 p-3"><p className="font-semibold">{layout.headline}</p><p className="text-xs">{layout.subtitle}</p><div className="flex gap-2" aria-label="Suggested colors">{[layout.background, layout.foreground, layout.accent].map((color) => <span key={color} title={color} className="h-8 w-8 rounded-full border border-ink-200" style={{ backgroundColor: color }} />)}</div><p className="text-xs capitalize text-ink-500">{layout.layout} layout</p><Button type="button" onClick={() => void applyLayout()}>Apply editable layout</Button></div>}
  </div>;
}

const templatePages = new Map<string, PageData>(TEMPLATES.map((t) => [t.id, { id: t.id, background: t.pages[0].background, objects: t.pages[0].objects }]));

export function TemplatesPanel() {
  const { engine, state, notify } = useEditor();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const ratio = state.width / state.height;
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return TEMPLATES.filter((t) => (!cat || t.category === cat) && (!query || t.name.toLowerCase().includes(query) || t.tags.some((g) => g.includes(query))))
      // Templates matching the current aspect ratio first.
      .sort((a, b) => Math.abs(a.width / a.height - ratio) - Math.abs(b.width / b.height - ratio));
  }, [q, cat, ratio]);
  return (
    <div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates" aria-label="Search templates" />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[null, ...TEMPLATE_CATEGORIES].map((c) => (
          <button
            key={c ?? "all"}
            type="button"
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
            className={`rounded-full px-2.5 py-1 text-xs ${cat === c ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200"}`}
          >
            {c ?? "All"}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-500">Applying a template adds its pages after the current one, scaled to fit.</p>
      <ul className="mt-3 columns-2 gap-3">
        {list.map((t) => (
          <li key={t.id} className="mb-3 break-inside-avoid">
            <button
              type="button"
              className="group block w-full text-left"
              onClick={async () => {
                await engine.applyTemplatePages(t.pages, { width: t.width, height: t.height });
                notify(`Added “${t.name}”`);
              }}
            >
              <DesignPreview page={templatePages.get(t.id)!} width={t.width} height={t.height} alt="" className="rounded-lg ring-1 ring-ink-100 group-hover:ring-2 group-hover:ring-brand-500" />
              <span className="mt-1 block truncate text-xs text-ink-700">{t.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="mt-6 text-center text-sm text-ink-500">No templates found.</p>}
    </div>
  );
}

export function ElementsPanel() {
  const { engine, state } = useEditor();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shapes = SHAPES.filter((s) => !query || s.label.toLowerCase().includes(query));
  const lines = LINES.filter((s) => !query || s.label.toLowerCase().includes(query));
  return (
    <div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search elements" aria-label="Search elements" />
      <PanelHeading>Shapes</PanelHeading>
      <div className="grid grid-cols-4 gap-2">
        {shapes.map((s) => (
          <button
            key={s.id}
            type="button"
            draggable
            onDragStart={(e) => setDrag(e, { kind: "shape", id: s.id })}
            onClick={() => engine.addSerialized([s.build(state.width, state.height)])}
            className="flex aspect-square items-center justify-center rounded-lg bg-ink-50 p-3 hover:bg-ink-100"
            aria-label={`Add ${s.label}`}
            title={s.label}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full fill-ink-700" aria-hidden="true">
              <path d={s.preview} />
            </svg>
          </button>
        ))}
      </div>
      <PanelHeading>Lines</PanelHeading>
      <div className="grid grid-cols-4 gap-2">
        {lines.map((s) => (
          <button
            key={s.id}
            type="button"
            draggable
            onDragStart={(e) => setDrag(e, { kind: "line", id: s.id })}
            onClick={() => engine.addSerialized([s.build(state.width, state.height)])}
            className="flex aspect-square items-center justify-center rounded-lg bg-ink-50 p-3 hover:bg-ink-100"
            aria-label={`Add ${s.label}`}
            title={s.label}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full stroke-ink-700" aria-hidden="true">
              <path d={s.preview} strokeWidth="6" strokeLinecap="round" strokeDasharray={s.id === "dashed" ? "14 10" : undefined} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TextPanel() {
  const { engine, state } = useEditor();
  return (
    <div>
      <div className="space-y-2">
        {TEXT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            draggable
            onDragStart={(e) => setDrag(e, { kind: "text", id: p.id })}
            onClick={() => engine.addSerialized([p.build(state.width, state.height)])}
            className={`block w-full rounded-lg bg-ink-50 px-4 py-3 text-left text-ink-900 hover:bg-ink-100 ${p.className}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <PanelHeading>Font combinations</PanelHeading>
      <div className="grid grid-cols-2 gap-2">
        {FONT_COMBOS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => engine.addSerialized(c.build(state.width, state.height))}
            className="rounded-lg bg-ink-50 px-3 py-4 text-center hover:bg-ink-100"
            title={c.label}
          >
            <span className="block truncate text-xl font-bold" style={{ fontFamily: `"${c.heading}"` }}>
              Big idea
            </span>
            <span className="block truncate text-xs text-ink-500" style={{ fontFamily: `"${c.body}"` }}>
              Supporting line
            </span>
          </button>
        ))}
      </div>
      <PanelHeading>Fonts</PanelHeading>
      <ul className="space-y-1 text-sm text-ink-700">
        {FONTS.map((f) => (
          <li key={f.family} className="flex justify-between rounded px-2 py-1" style={{ fontFamily: `"${f.family}"` }}>
            {f.family}
            <span className="font-sans text-xs text-ink-400">{f.category}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UploadsPanel() {
  const { engine, notify } = useEditor();
  const [uploads, setUploads] = useState<Upload[] | null>(null);
  const [busy, setBusy] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    api<{ uploads: Upload[] }>("/api/uploads")
      .then((d) => alive && setUploads(d.uploads))
      .catch((err: unknown) => {
        if (!alive) return;
        notify(err instanceof Error ? err.message : "Could not load uploads", "error");
        setUploads([]);
      });
    const off = onUploaded((u) => setUploads((list) => (list && !list.some((x) => x.id === u.id) ? [u, ...list] : list)));
    return () => {
      alive = false;
      off();
    };
  }, [notify]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      setBusy((b) => b + 1);
      try {
        if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
          const { importSvg } = await import("./svg-import");
          await engine.addSerialized(await importSvg(file, engine.size));
          notify("SVG imported as editable layers");
        } else {
          await uploadImage(file);
        }
      } catch (err) {
        notify(err instanceof Error ? err.message : "Upload failed", "error");
      } finally {
        setBusy((b) => b - 1);
      }
    }
  }

  return (
    <div>
      <input ref={input} type="file" accept={[...ACCEPTED_IMAGE_TYPES, "image/svg+xml", ".svg"].join(",")} multiple hidden onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }} />
      <Button className="w-full" onClick={() => input.current?.click()} disabled={busy > 0}>
        {busy > 0 ? <Spinner /> : <UploadIcon size={16} />} {busy > 0 ? "Uploading…" : "Upload images"}
      </Button>
      <p className="mt-2 text-xs text-ink-500">PNG, JPEG, WebP or GIF up to 10 MB. Plain SVG up to 2 MB imports directly as editable shape and text layers. You can also drop files onto the canvas.</p>
      {uploads === null ? (
        <div className="mt-6 flex justify-center text-brand-600">
          <Spinner size={22} />
        </div>
      ) : uploads.length === 0 ? (
        <div className="mt-8 text-center text-sm text-ink-500">
          <ImageIcon className="mx-auto mb-2 text-ink-300" size={32} />
          No uploads yet
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {uploads.map((u) => (
            <li key={u.id} className="group relative">
              <button
                type="button"
                draggable
                onDragStart={(e) => setDrag(e, { kind: "image", url: u.url, name: u.name })}
                onClick={() => engine.addImage(u.url, u.name).catch(() => notify("Could not add image", "error"))}
                className="block aspect-square w-full overflow-hidden rounded-lg bg-ink-100"
                title={`Add ${u.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- user upload served by the API */}
                <img src={u.url} alt={u.name} className="h-full w-full object-cover" loading="lazy" />
              </button>
              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  title="Set as background"
                  aria-label={`Set ${u.name} as background`}
                  onClick={() => engine.setBackgroundImage(u.url).catch(() => notify("Could not set background", "error"))}
                  className="rounded-md bg-white/90 p-1 text-ink-700 shadow hover:bg-white"
                >
                  <Wallpaper size={14} />
                </button>
                <button
                  type="button"
                  title="Delete upload"
                  aria-label={`Delete ${u.name}`}
                  onClick={async () => {
                    if (!confirm(`Delete “${u.name}”? Designs using it will show it as missing.`)) return;
                    try {
                      await api(`/api/uploads/${u.id}`, { method: "DELETE" });
                      setUploads((l) => l?.filter((x) => x.id !== u.id) ?? null);
                    } catch (err) {
                      notify(err instanceof Error ? err.message : "Delete failed", "error");
                    }
                  }}
                  className="rounded-md bg-white/90 p-1 text-danger-600 shadow hover:bg-white"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BackgroundPanel() {
  const { engine, state } = useEditor();
  const bg = state.pages[state.activePage]?.background ?? "#ffffff";
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="h-10 w-10 rounded-lg ring-1 ring-ink-200" style={{ background: backgroundCss(bg) }} />
        <span className="text-sm text-ink-700">Page {state.activePage + 1} background</span>
      </div>
      <PanelHeading>Solid colors</PanelHeading>
      <ColorPicker value={typeof bg === "string" ? bg : null} onChange={(c) => engine.setBackground(c)} />
      <PanelHeading>Gradients</PanelHeading>
      <div className="grid grid-cols-4 gap-2">
        {GRADIENTS.map((g, i) => {
          const value = { type: "linear" as const, angle: g.angle, stops: g.stops.map((color, j) => ({ offset: j / (g.stops.length - 1), color })) };
          return (
            <button
              key={i}
              type="button"
              aria-label={`Gradient ${g.stops.join(" to ")}`}
              onClick={() => engine.setBackground(value)}
              className="aspect-square rounded-lg ring-1 ring-inset ring-black/10"
              style={{ background: backgroundCss(value) }}
            />
          );
        })}
      </div>
      <p className="mt-4 text-xs text-ink-500">To use a photo as the background, open Uploads and choose “Set as background”.</p>
    </div>
  );
}

export function LayersPanel() {
  const { engine, state } = useEditor();
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  if (!state.layers.length) return <p className="mt-8 text-center text-sm text-ink-500">This page has no elements yet.</p>;
  return (
    <ul className="space-y-1" aria-label="Layers, top first">
      {state.layers.map((layer, index) => (
        <li
          key={layer.id}
          draggable={editing !== layer.id}
          onDragStart={(e) => {
            setDragId(layer.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId && dragId !== layer.id) engine.moveLayer(dragId, index);
            setDragId(null);
          }}
          className={`group flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm ${layer.selected ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-ink-50"} ${dragId === layer.id ? "opacity-50" : ""}`}
        >
          <GripVertical size={14} className="shrink-0 cursor-grab text-ink-300" aria-hidden="true" />
          {editing === layer.id ? (
            <input
              autoFocus
              defaultValue={layer.name}
              aria-label="Layer name"
              className="h-7 min-w-0 flex-1 rounded border border-brand-500 px-1.5 text-sm"
              onBlur={(e) => {
                engine.renameLayer(layer.id, e.target.value);
                setEditing(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditing(null);
              }}
            />
          ) : (
            <button
              type="button"
              className={`min-w-0 flex-1 truncate py-1 text-left ${layer.visible ? "text-ink-800" : "text-ink-400"}`}
              onClick={(e) => engine.selectLayer(layer.id, e.shiftKey || e.metaKey || e.ctrlKey)}
              onDoubleClick={() => setEditing(layer.id)}
              title="Click to select, double-click to rename, drag to reorder"
            >
              {layer.name}
              <span className="ml-1.5 text-xs text-ink-400">{layer.type}</span>
            </button>
          )}
          <button type="button" onClick={() => engine.toggleLayerLock(layer.id)} aria-label={layer.locked ? "Unlock layer" : "Lock layer"} title={layer.locked ? "Unlock" : "Lock"} className={`rounded p-1 hover:bg-ink-100 ${layer.locked ? "text-brand-700" : "text-ink-400 opacity-0 group-hover:opacity-100 focus:opacity-100"}`}>
            {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button type="button" onClick={() => engine.toggleLayerVisibility(layer.id)} aria-label={layer.visible ? "Hide layer" : "Show layer"} title={layer.visible ? "Hide" : "Show"} className={`rounded p-1 hover:bg-ink-100 ${layer.visible ? "text-ink-400 opacity-0 group-hover:opacity-100 focus:opacity-100" : "text-ink-700"}`}>
            {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </li>
      ))}
    </ul>
  );
}

type Version = { id: string; label: string | null; thumbnail: string | null; createdAt: number };

export function HistoryPanel({ saveNow }: { saveNow: () => Promise<boolean> }) {
  const { engine, designId, notify } = useEditor();
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchVersions = useCallback(() => api<{ versions: Version[] }>(`/api/designs/${designId}/versions`).then((d) => d.versions), [designId]);
  const load = useCallback(async () => {
    try {
      setVersions(await fetchVersions());
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not load history", "error");
    }
  }, [fetchVersions, notify]);

  useEffect(() => {
    let alive = true;
    fetchVersions()
      .then((v) => alive && setVersions(v))
      .catch((err: unknown) => alive && notify(err instanceof Error ? err.message : "Could not load history", "error"));
    return () => {
      alive = false;
    };
  }, [fetchVersions, notify]);

  async function saveVersion() {
    setBusy(true);
    try {
      if (!(await saveNow())) throw new Error("Save failed");
      await api(`/api/designs/${designId}/versions`, { method: "POST", json: { label: label.trim() || "Saved version" } });
      setLabel("");
      notify("Version saved");
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not save version", "error");
    } finally {
      setBusy(false);
    }
  }

  async function restore(v: Version) {
    if (!confirm("Restore this version? Your current design stays available through undo.")) return;
    try {
      const { doc } = await api<{ doc: DesignDoc }>(`/api/designs/${designId}/versions/${v.id}`);
      await engine.replaceDoc(doc);
      notify("Version restored");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not restore", "error");
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void saveVersion();
        }}
        className="flex gap-2"
      >
        <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="Version name (optional)" aria-label="Version name" />
        <Button type="submit" disabled={busy}>
          {busy ? <Spinner /> : "Save"}
        </Button>
      </form>
      <p className="mt-2 text-xs text-ink-500">Lumio also keeps an automatic checkpoint every 10 minutes while you edit.</p>
      {versions === null ? (
        <div className="mt-6 flex justify-center text-brand-600">
          <Spinner size={22} />
        </div>
      ) : versions.length === 0 ? (
        <div className="mt-8 text-center text-sm text-ink-500">
          <History className="mx-auto mb-2 text-ink-300" size={32} />
          No saved versions yet
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {versions.map((v) => (
            <li key={v.id} className="flex items-center gap-3 rounded-lg p-2 ring-1 ring-ink-100">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-ink-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- stored data URL */}
                {v.thumbnail && <img src={v.thumbnail} alt="" className="max-h-full max-w-full" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-800">{v.label ?? "Auto checkpoint"}</p>
                <p className="text-xs text-ink-500">{new Date(v.createdAt).toLocaleString()}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => restore(v)}>
                Restore
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
