"use client";

import {
  Check,
  CircleAlert,
  CloudUpload,
  FileSpreadsheet,
  Download,
  History,
  Home,
  Keyboard,
  Layers,
  LayoutTemplate,
  PaintBucket,
  Palette,
  Sparkles,
  Redo2,
  Scaling,
  Share2,
  Shapes,
  Type,
  Undo2,
  Upload as UploadIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { DesignDoc } from "@/lib/design/types";
import { Button, IconButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/input";
import { LogoMark } from "@/components/ui/logo";
import { ContextToolbar } from "./context-toolbar";
import { DownloadDialog, ResizeDialog, ShareDialog, ShortcutsDialog } from "./dialogs";
import { EditorContext, type EditorContextValue } from "./editor-context";
import { LINES, SHAPES, TEXT_PRESETS } from "./elements";
import { EditorEngine, type EngineState } from "./engine";
import { renderThumbnail } from "./fabric-setup";
import { AiPanel, BackgroundPanel, BrandKitPanel, DRAG_MIME, ElementsPanel, HistoryPanel, LayersPanel, TemplatesPanel, TextPanel, UploadsPanel, type DragPayload } from "./panels";
import { PageStrip } from "./page-strip";
import { useShortcuts } from "./use-shortcuts";
import { uploadImage } from "./uploads";
import { text as textBuilder } from "@/lib/design/builders";

export type EditorDesign = { id: string; title: string; doc: DesignDoc; shareToken: string | null; revision: number };

const BulkPanel = dynamic(() => import("./bulk-panel").then((module) => module.BulkPanel));

type PanelId = "templates" | "elements" | "text" | "uploads" | "bulk" | "brand" | "ai" | "background" | "layers" | "history";

const PANELS: { id: PanelId; label: string; icon: typeof Shapes }[] = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "elements", label: "Elements", icon: Shapes },
  { id: "text", label: "Text", icon: Type },
  { id: "uploads", label: "Uploads", icon: UploadIcon },
  { id: "bulk", label: "Bulk create", icon: FileSpreadsheet },
  { id: "brand", label: "Brand Kit", icon: Palette },
  { id: "ai", label: "AI Studio", icon: Sparkles },
  { id: "background", label: "Background", icon: PaintBucket },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "history", label: "History", icon: History },
];

type SaveStatus = "saved" | "saving" | "unsaved" | "error" | "conflict";
type Toast = { id: number; message: string; tone: "info" | "error" };

const CLIPBOARD_MARKER = "lumio-clipboard:";

const EMPTY_STATE: EngineState = {
  ready: false,
  width: 1,
  height: 1,
  zoom: 1,
  activePage: 0,
  pages: [],
  selection: null,
  layers: [],
  canUndo: false,
  canRedo: false,
  revision: 0,
};

export function Editor({ design }: { design: EditorDesign }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<EditorEngine | null>(null);
  const [title, setTitle] = useState(design.title);
  const [panel, setPanel] = useState<PanelId | null>("templates");
  const [dialog, setDialog] = useState<"download" | "share" | "resize" | "shortcuts" | null>(null);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [panning, setPanning] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [participants, setParticipants] = useState<{ id: string; name: string }[]>([]);

  const notify = useCallback((message: string, tone: "info" | "error" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3000);
  }, []);

  // ------------------------------------------------------------ autosave
  const save = useRef({
    dirty: false,
    saving: false,
    failures: 0,
    conflict: false,
    // Server version our edits build on; sent with each save so stale tabs can't overwrite newer work.
    base: design.revision,
    timer: 0 as unknown as ReturnType<typeof setTimeout>,
  });
  const engineRef = useRef<EditorEngine | null>(null);
  const savedTitle = useRef(design.title);
  const saveNowRef = useRef<() => Promise<boolean>>(async () => false);

  const saveNow = useCallback(async (): Promise<boolean> => {
    const s = save.current;
    const eng = engineRef.current;
    clearTimeout(s.timer);
    if (!eng || s.conflict) return false;
    if (s.saving) {
      // A save is in flight; the finally-block reschedules if more changes arrived.
      return new Promise((resolve) => setTimeout(() => resolve(saveNowRef.current()), 300));
    }
    if (!s.dirty) return true;
    s.saving = true;
    s.dirty = false;
    setStatus("saving");
    try {
      const doc = eng.toDoc();
      const thumbnail = await renderThumbnail(doc.pages[0], doc.width, doc.height).catch(() => undefined);
      const res = await api<{ revision: number }>(`/api/designs/${design.id}`, {
        method: "PATCH",
        json: { doc, thumbnail, baseRevision: s.base },
      });
      s.base = res.revision;
      s.failures = 0;
      setStatus(s.dirty ? "unsaved" : "saved");
      return true;
    } catch (err) {
      s.dirty = true;
      if (err instanceof ApiError && err.status === 409) {
        s.conflict = true;
        setStatus("conflict");
        return false;
      }
      s.failures++;
      setStatus("error");
      if (s.failures === 1) notify(err instanceof Error ? `Couldn't save: ${err.message}` : "Couldn't save", "error");
      return false;
    } finally {
      s.saving = false;
      // Back off while the server is unreachable.
      if (s.dirty) s.timer = setTimeout(() => void saveNowRef.current(), s.failures ? Math.min(30_000, 2000 * 2 ** s.failures) : 1500);
    }
  }, [design.id, notify]);

  useEffect(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);

  const onDocChange = useCallback(() => {
    const s = save.current;
    s.dirty = true;
    setStatus((st) => (st === "saving" ? st : "unsaved"));
    clearTimeout(s.timer);
    s.timer = setTimeout(() => void saveNow(), 1200);
  }, [saveNow]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (save.current.dirty || save.current.saving) e.preventDefault();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden" && save.current.dirty) void saveNow();
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [saveNow]);

  useEffect(() => {
    let active = true;
    let polling = false;
    const poll = async () => {
      if (!active || polling || document.visibilityState === "hidden" || !engineRef.current) return;
      polling = true;
      try {
        const status = await api<{ revision: number; title: string; participants: { id: string; name: string }[] }>(`/api/designs/${design.id}/presence`, { method: "POST" });
        if (!active) return;
        setParticipants(status.participants);
        const current = save.current;
        if (status.revision > current.base && !current.dirty && !current.saving && !current.conflict) {
          const { design: remote } = await api<{ design: EditorDesign }>(`/api/designs/${design.id}`);
          if (active && !current.dirty && !current.saving && remote.revision > current.base && engineRef.current) {
            await engineRef.current.syncRemoteDoc(remote.doc);
            current.base = remote.revision;
            setTitle(remote.title);
            savedTitle.current = remote.title;
            notify("Latest design changes loaded");
          }
        } else if (status.title !== savedTitle.current && document.activeElement?.getAttribute("aria-label") !== "Design title") {
          setTitle(status.title);
          savedTitle.current = status.title;
        }
      } catch {
        // Autosave reports connectivity errors; presence is best effort.
      } finally {
        polling = false;
      }
    };
    const timer = window.setInterval(() => void poll(), 3000);
    void poll();
    return () => { active = false; clearInterval(timer); };
  }, [design.id, notify]);

  // ------------------------------------------------------------ engine lifecycle
  // While true, the page refits whenever the workspace changes size; any manual zoom turns it off.
  const autoFit = useRef(true);
  const fit = useCallback((eng: EditorEngine | null = engineRef.current) => {
    const el = scrollRef.current;
    if (!eng || !el) return;
    autoFit.current = true;
    const inner = el.firstElementChild as HTMLElement | null;
    const pad = inner ? parseFloat(getComputedStyle(inner).paddingLeft) || 0 : 0;
    eng.setZoom(eng.fitZoom(el.clientWidth, el.clientHeight, pad + 8));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (autoFit.current) fit();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const el = document.createElement("canvas");
    host.appendChild(el);
    const eng = new EditorEngine(el, design.doc, () => onDocChange());
    engineRef.current = eng;
    if (process.env.NODE_ENV === "development") (window as unknown as { __lumio?: EditorEngine }).__lumio = eng;
    fit(eng);
    let cancelled = false;
    eng.init().then(() => {
      if (!cancelled) setEngine(eng);
    });
    return () => {
      cancelled = true;
      engineRef.current = null;
      eng.dispose();
      host.replaceChildren();
    };
    // The editor mounts once per design; later doc changes flow through the engine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.id]);

  const subscribe = useCallback((cb: () => void) => (engine ? engine.subscribe(cb) : () => undefined), [engine]);
  const state = useSyncExternalStore(subscribe, () => engine?.getState() ?? EMPTY_STATE, () => EMPTY_STATE);

  // Refit when the design is resized.
  const lastSize = useRef(`${design.doc.width}x${design.doc.height}`);
  useEffect(() => {
    const key = `${state.width}x${state.height}`;
    if (state.ready && key !== lastSize.current) {
      lastSize.current = key;
      fit();
    }
  }, [state.width, state.height, state.ready, fit]);

  // ------------------------------------------------------------ title
  async function saveTitle(next: string) {
    const clean = next.trim().slice(0, 120) || "Untitled design";
    setTitle(clean);
    if (clean === savedTitle.current) return;
    try {
      await api(`/api/designs/${design.id}`, { method: "PATCH", json: { title: clean } });
      savedTitle.current = clean;
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not rename", "error");
    }
  }

  // ------------------------------------------------------------ zoom & pan
  const zoomAround = useCallback((nextZoom: number, clientX: number, clientY: number) => {
    const eng = engineRef.current;
    const scroller = scrollRef.current;
    const host = hostRef.current;
    if (!eng || !scroller || !host) return;
    autoFit.current = false;
    const before = host.getBoundingClientRect();
    const z = eng.getZoom();
    const sx = (clientX - before.left) / z;
    const sy = (clientY - before.top) / z;
    eng.setZoom(nextZoom);
    requestAnimationFrame(() => {
      const after = host.getBoundingClientRect();
      const nz = eng.getZoom();
      scroller.scrollLeft += after.left - (clientX - sx * nz);
      scroller.scrollTop += after.top - (clientY - sy * nz);
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const eng = engineRef.current;
      if (!eng) return;
      zoomAround(eng.getZoom() * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAround]);

  const panStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  // ------------------------------------------------------------ adding content
  const addImageFiles = useCallback(
    async (files: File[], at?: { x: number; y: number }) => {
      const eng = engineRef.current;
      if (!eng) return;
      for (const file of files) {
        try {
          if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
            const { importSvg } = await import("./svg-import");
            await eng.addSerialized(await importSvg(file, eng.size, at));
            notify("SVG imported as editable layers");
            continue;
          }
          const upload = await uploadImage(file);
          await eng.addImage(upload.url, upload.name, at);
        } catch (err) {
          notify(err instanceof Error ? err.message : "Upload failed", "error");
        }
      }
    },
    [notify],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropActive(false);
    const eng = engineRef.current;
    if (!eng) return;
    const at = eng.clientToScene(e.clientX, e.clientY);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/") || f.name.toLowerCase().endsWith(".svg"));
    if (files.length) {
      void addImageFiles(files, at);
      return;
    }
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    const payload = JSON.parse(raw) as DragPayload;
    const { width, height } = eng.size;
    if (payload.kind === "image") {
      void eng.addImage(payload.url, payload.name, at).catch(() => notify("Could not add image", "error"));
      return;
    }
    const source = payload.kind === "shape" ? SHAPES : payload.kind === "line" ? LINES : TEXT_PRESETS;
    const item = source.find((s) => s.id === payload.id);
    if (item) void eng.addSerialized([item.build(width, height)], at);
  }

  // System clipboard: our own copies carry a marker; images upload; plain text becomes a text box.
  useEffect(() => {
    const isFormField = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "SELECT"].includes(t.tagName) || (t.tagName === "TEXTAREA" && !t.closest(".canvas-container")));
    const onCopy = (e: ClipboardEvent) => {
      const eng = engineRef.current;
      if (!eng || isFormField(e.target) || eng.isEditingText()) return;
      if (eng.copy()) {
        e.preventDefault();
        e.clipboardData?.setData("text/plain", CLIPBOARD_MARKER + Date.now());
        if (e.type === "cut") eng.deleteSelection();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const eng = engineRef.current;
      if (!eng || isFormField(e.target) || eng.isEditingText()) return;
      const data = e.clipboardData;
      if (!data) return;
      const files = Array.from(data.files).filter((f) => f.type.startsWith("image/"));
      const txt = data.getData("text/plain");
      e.preventDefault();
      if (files.length) void addImageFiles(files);
      else if (txt.startsWith(CLIPBOARD_MARKER) || (!txt && eng.hasClipboard())) void eng.paste();
      else if (txt.trim()) {
        const { width, height } = eng.size;
        const fs = Math.max(12, Math.round(Math.min(width, height) * 0.04));
        void eng.addSerialized([textBuilder(width * 0.15, height / 2 - fs / 2, width * 0.7, txt.slice(0, 5000), { fontSize: fs, align: "center" })]);
      }
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, [addImageFiles]);

  useShortcuts(engine, {
    save: () => void saveNow(),
    fit: () => fit(),
    zoom: (factor) => {
      const el = scrollRef.current;
      const eng = engineRef.current;
      if (!el || !eng) return;
      const r = el.getBoundingClientRect();
      zoomAround(eng.getZoom() * factor, r.left + r.width / 2, r.top + r.height / 2);
    },
    showShortcuts: () => setDialog("shortcuts"),
    setPanning,
  });

  const ctx = useMemo<EditorContextValue | null>(() => (engine ? { engine, state, designId: design.id, notify } : null), [engine, state, design.id, notify]);

  const statusView = {
    saved: { icon: <Check size={14} />, text: "Saved" },
    saving: { icon: <Spinner size={12} />, text: "Saving…" },
    unsaved: { icon: <CloudUpload size={14} />, text: "Unsaved changes" },
    error: { icon: <CircleAlert size={14} />, text: "Not saved — retrying" },
    conflict: { icon: <CircleAlert size={14} />, text: "Changed elsewhere" },
  }[status];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ink-100">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 bg-gradient-to-r from-brand-700 via-brand-600 to-[#a34bd8] px-2 text-white sm:px-3">
        <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/10" aria-label="Back to home">
          <LogoMark size={26} />
          <Home size={16} className="hidden sm:block" />
        </Link>
        <input
          aria-label="Design title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={(e) => saveTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          maxLength={120}
          className="h-9 w-32 min-w-0 rounded-md bg-transparent px-2 text-sm font-medium placeholder:text-white/60 hover:bg-white/10 focus:bg-white/15 focus:outline-none sm:w-64"
        />
        <span className="hidden items-center gap-1.5 text-xs text-white/80 md:flex" role="status" aria-live="polite">
          {statusView.icon} {statusView.text}
        </span>
        {participants.length > 0 && <span className="hidden truncate text-xs text-white/80 lg:inline" title={participants.map((person) => person.name).join(", ")}>{participants.map((person) => person.name).join(", ")} editing</span>}
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Undo (Ctrl+Z)" className="text-white hover:bg-white/15 disabled:text-white/40" disabled={!state.canUndo} onClick={() => engine?.undo()}>
            <Undo2 size={17} />
          </IconButton>
          <IconButton label="Redo (Ctrl+Shift+Z)" className="text-white hover:bg-white/15 disabled:text-white/40" disabled={!state.canRedo} onClick={() => engine?.redo()}>
            <Redo2 size={17} />
          </IconButton>
          <IconButton label="Resize design" className="hidden text-white hover:bg-white/15 sm:inline-flex" onClick={() => setDialog("resize")} disabled={!engine}>
            <Scaling size={17} />
          </IconButton>
          <IconButton label="Keyboard shortcuts (?)" className="hidden text-white hover:bg-white/15 sm:inline-flex" onClick={() => setDialog("shortcuts")}>
            <Keyboard size={17} />
          </IconButton>
          <Button size="sm" variant="glass" className="ml-1" onClick={() => setDialog("share")} disabled={!engine}>
            <Share2 size={15} /> <span className="hidden sm:inline">Share</span>
          </Button>
          <Button size="sm" variant="light" onClick={() => setDialog("download")} disabled={!engine}>
            <Download size={15} /> <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </header>

      {status === "conflict" && (
        <div role="alert" className="flex shrink-0 flex-wrap items-center gap-3 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <CircleAlert size={16} />
          This design was changed in another tab or window, so your latest edits here weren&apos;t saved.
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              save.current.dirty = false;
              window.location.reload();
            }}
          >
            Reload latest version
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        {/* Left rail */}
        <nav className="flex shrink-0 overflow-x-auto border-t border-ink-200 bg-white md:w-[76px] md:flex-col md:overflow-visible md:border-r md:border-t-0 md:py-2" aria-label="Editor panels">
          {PANELS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanel((p) => (p === id ? null : id))}
              aria-pressed={panel === id}
              className={`flex min-w-[68px] flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium md:mx-1.5 md:rounded-lg ${panel === id ? "text-brand-700 md:bg-brand-50" : "text-ink-500 hover:text-ink-900"}`}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>

        {/* Side panel */}
        {panel && (
          <aside className="relative max-h-[42vh] w-full shrink-0 overflow-y-auto border-t border-ink-200 bg-white p-4 md:max-h-none md:w-[320px] md:border-r md:border-t-0" aria-label={`${PANELS.find((p) => p.id === panel)?.label} panel`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-ink-900">{PANELS.find((p) => p.id === panel)?.label}</h2>
              <IconButton label="Close panel" onClick={() => setPanel(null)}>
                <X size={16} />
              </IconButton>
            </div>
            {ctx ? (
              <EditorContext value={ctx}>
                {panel === "templates" && <TemplatesPanel />}
                {panel === "ai" && <AiPanel />}
                {panel === "elements" && <ElementsPanel />}
                {panel === "text" && <TextPanel />}
                {panel === "uploads" && <UploadsPanel />}
                {panel === "bulk" && <BulkPanel />}
                {panel === "brand" && <BrandKitPanel />}
                {panel === "background" && <BackgroundPanel />}
                {panel === "layers" && <LayersPanel />}
                {panel === "history" && <HistoryPanel saveNow={saveNow} />}
              </EditorContext>
            ) : (
              <div className="flex justify-center py-8 text-brand-600">
                <Spinner size={22} />
              </div>
            )}
          </aside>
        )}

        {/* Workspace */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-ink-200 bg-white">
            {ctx ? (
              <EditorContext value={ctx}>
                <ContextToolbar onOpenBackground={() => setPanel("background")} />
              </EditorContext>
            ) : (
              <div className="h-12" />
            )}
          </div>
          <div
            ref={scrollRef}
            className={`canvas-checker relative min-h-0 flex-1 overflow-auto ${dropActive ? "ring-4 ring-inset ring-brand-500/50" : ""}`}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(DRAG_MIME) || e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
                setDropActive(true);
              }
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setDropActive(false);
            }}
            onDrop={onDrop}
            onPointerDown={(e) => {
              // Clicking the grey area around the page clears the selection.
              if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.workspace) engine?.deselect();
            }}
          >
            <div data-workspace="1" className="flex min-h-full min-w-full w-max items-center justify-center p-6 sm:p-12">
              <div ref={hostRef} className="shrink-0 bg-white shadow-[0_2px_12px_rgba(15,13,26,0.12)]" />
            </div>
            {panning && (
              <div
                className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  const el = scrollRef.current;
                  if (!el) return;
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  panStart.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
                }}
                onPointerMove={(e) => {
                  const el = scrollRef.current;
                  const start = panStart.current;
                  if (!el || !start) return;
                  el.scrollLeft = start.left - (e.clientX - start.x);
                  el.scrollTop = start.top - (e.clientY - start.y);
                }}
                onPointerUp={() => (panStart.current = null)}
              />
            )}
            {!engine && (
              <div className="absolute inset-0 flex items-center justify-center text-brand-600">
                <Spinner size={28} />
              </div>
            )}
          </div>
          {ctx && (
            <EditorContext value={ctx}>
              <PageStrip onFit={() => fit()} onManualZoom={() => (autoFit.current = false)} />
            </EditorContext>
          )}
        </main>
      </div>

      {ctx && (
        <EditorContext value={ctx}>
          <DownloadDialog open={dialog === "download"} onClose={() => setDialog(null)} title={title} />
          <ShareDialog open={dialog === "share"} onClose={() => setDialog(null)} initialToken={design.shareToken} />
          <ResizeDialog open={dialog === "resize"} onClose={() => setDialog(null)} />
        </EditorContext>
      )}
      <ShortcutsDialog open={dialog === "shortcuts"} onClose={() => setDialog(null)} />

      <div className="pointer-events-none fixed bottom-28 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={`pointer-events-auto rounded-lg px-4 py-2 text-sm shadow-pop ${t.tone === "error" ? "bg-danger-600 text-white" : "bg-ink-900 text-white"}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
