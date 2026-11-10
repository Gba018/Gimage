"use client";

import { ActiveSelection, Canvas, FabricImage, FabricObject, Group, IText, Point, filters, type TPointerEventInfo } from "fabric";
import { loadFonts } from "@/lib/design/fonts";
import { MAX_OBJECTS_PER_PAGE, newPageId, type DesignDoc, type PageBackground, type PageData, type SerializedObject } from "@/lib/design/types";
import { scaleObjects } from "@/lib/design/scale";
import { applyLockState, backgroundFill, collectFonts, configureFabric, enlivenSafe, SERIALIZE_PROPS, uid } from "./fabric-setup";

export type TextProps = {
  fontFamily: string;
  fontSize: number;
  fontWeight: string | number;
  fontStyle: string;
  underline: boolean;
  linethrough: boolean;
  textAlign: string;
  lineHeight: number;
  charSpacing: number;
};

export type SelectionInfo = {
  count: number;
  type: string;
  locked: boolean;
  isGroup: boolean;
  isMulti: boolean;
  isText: boolean;
  isImage: boolean;
  isLine: boolean;
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;
  radius: number | null;
  shadow: boolean;
  text: TextProps | null;
  box: { x: number; y: number; width: number; height: number; angle: number };
};

export type LayerInfo = { id: string; name: string; type: string; locked: boolean; visible: boolean; selected: boolean };

export type PageInfo = { id: string; name?: string; background: PageBackground; data: PageData };

export type EngineState = {
  ready: boolean;
  width: number;
  height: number;
  zoom: number;
  activePage: number;
  pages: PageInfo[];
  selection: SelectionInfo | null;
  layers: LayerInfo[];
  canUndo: boolean;
  canRedo: boolean;
  revision: number;
};

export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

type Snapshot = { width: number; height: number; active: number; pages: PageData[] };

type Guide = { axis: "x" | "y"; pos: number };

const HISTORY_LIMIT = 100;
const SNAP_PX = 6;
const PASTE_OFFSET = 24;

function stripOrigin(objects: SerializedObject[]): SerializedObject[] {
  const origin = typeof location !== "undefined" ? location.origin : "";
  return objects.map((o) => {
    const next: SerializedObject = { ...o };
    if (typeof next.src === "string" && origin && next.src.startsWith(origin)) next.src = next.src.slice(origin.length);
    if (Array.isArray(next.objects)) next.objects = stripOrigin(next.objects as SerializedObject[]);
    return next;
  });
}

function serialize(obj: FabricObject): SerializedObject {
  return stripOrigin([obj.toObject(SERIALIZE_PROPS) as SerializedObject])[0];
}

function typeOf(obj: FabricObject): string {
  return (obj.constructor as typeof FabricObject).type?.toLowerCase() ?? obj.type.toLowerCase();
}

function solidColor(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Owns the Fabric canvas and the multi-page document. React subscribes to a
 * compact immutable state snapshot; all mutations go through methods here.
 */
export class EditorEngine {
  readonly canvas: Canvas;
  private width: number;
  private height: number;
  private pages: PageData[];
  private active = 0;
  private zoom = 1;
  private past: string[] = [];
  private future: string[] = [];
  private current = "";
  private loading = false;
  private loadToken = 0;
  private clipboard: SerializedObject[] = [];
  private guides: Guide[] = [];
  private snapCache: { xs: number[]; ys: number[] } | null = null;
  private listeners = new Set<() => void>();
  private state: EngineState;
  private revision = 0;
  private disposed = false;
  private onDocChange: () => void;

  constructor(el: HTMLCanvasElement, doc: DesignDoc, onDocChange: () => void) {
    configureFabric();
    this.width = doc.width;
    this.height = doc.height;
    this.pages = doc.pages.map((p) => ({ ...p, objects: p.objects.map((o) => ({ ...o })) }));
    this.onDocChange = onDocChange;
    this.canvas = new Canvas(el, {
      width: doc.width,
      height: doc.height,
      preserveObjectStacking: true,
      renderOnAddRemove: false,
      stopContextMenu: true,
      fireRightClick: false,
      selectionColor: "rgba(124, 58, 237, 0.08)",
      selectionBorderColor: "#7c3aed",
      selectionLineWidth: 1,
      controlsAboveOverlay: true,
    });
    this.state = this.buildState(false);
    this.bindEvents();
  }

  async init(): Promise<void> {
    await this.loadPage(this.active);
    this.current = this.snapshot();
    this.emit(true);
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    void this.canvas.dispose();
  }

  // ---------------------------------------------------------------- state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): EngineState => this.state;

  private emit(ready = this.state.ready): void {
    if (this.disposed) return;
    this.state = this.buildState(ready);
    for (const l of this.listeners) l();
  }

  private buildState(ready: boolean): EngineState {
    const activeIds = new Set(this.canvas.getActiveObjects().map((o) => o.id));
    const layers = this.canvas
      .getObjects()
      .map((o) => ({
        id: o.id ?? "",
        name: o.name || typeOf(o),
        type: typeOf(o),
        locked: !!o.locked,
        visible: o.visible !== false,
        selected: activeIds.has(o.id),
      }))
      .reverse();
    return {
      ready,
      width: this.width,
      height: this.height,
      zoom: this.zoom,
      activePage: this.active,
      pages: this.pages.map((p) => ({ id: p.id, name: p.name, background: p.background, data: p })),
      selection: this.selectionInfo(),
      layers,
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
      revision: this.revision,
    };
  }

  private selectionInfo(): SelectionInfo | null {
    const active = this.canvas.getActiveObject();
    if (!active) return null;
    const objects = this.canvas.getActiveObjects();
    const isMulti = active instanceof ActiveSelection;
    const first = isMulti ? objects[0] : active;
    const leaf = first instanceof Group && !(first instanceof ActiveSelection) ? first.getObjects()[0] ?? first : first;
    const isText = !isMulti && active instanceof IText;
    const box = active.getBoundingRect();
    return {
      count: objects.length,
      type: isMulti ? "selection" : typeOf(active),
      locked: objects.length > 0 && objects.every((o) => o.locked),
      isGroup: !isMulti && active instanceof Group,
      isMulti,
      isText,
      isImage: !isMulti && active instanceof FabricImage,
      isLine: !isMulti && typeOf(active) === "line",
      fill: solidColor(leaf?.fill),
      stroke: solidColor(leaf?.stroke),
      strokeWidth: leaf?.strokeWidth ?? 0,
      opacity: active.opacity ?? 1,
      radius: !isMulti && typeOf(active) === "rect" ? ((active as FabricObject & { rx?: number }).rx ?? 0) : null,
      shadow: !!first?.shadow,
      text: isText
        ? {
            fontFamily: (active as IText).fontFamily,
            fontSize: (active as IText).fontSize,
            fontWeight: (active as IText).fontWeight,
            fontStyle: (active as IText).fontStyle,
            underline: (active as IText).underline,
            linethrough: (active as IText).linethrough,
            textAlign: (active as IText).textAlign,
            lineHeight: (active as IText).lineHeight,
            charSpacing: (active as IText).charSpacing,
          }
        : null,
      box: { x: box.left, y: box.top, width: box.width, height: box.height, angle: active.angle ?? 0 },
    };
  }

  // ---------------------------------------------------------------- events

  private bindEvents(): void {
    const c = this.canvas;
    c.on("object:modified", () => this.commit());
    c.on("text:editing:exited", () => this.commit());
    c.on("text:changed", () => this.emit());
    c.on("selection:created", () => this.emit());
    c.on("selection:updated", () => this.emit());
    c.on("selection:cleared", () => this.emit());
    c.on("object:moving", (e) => this.snap(e.target));
    c.on("object:scaling", () => this.emit());
    c.on("mouse:up", () => {
      this.snapCache = null;
      if (this.guides.length) {
        this.guides = [];
        c.requestRenderAll();
      }
    });
    c.on("after:render", ({ ctx }) => this.drawGuides(ctx));
  }

  private snap(target: FabricObject): void {
    if (!this.snapCache) {
      const moving = new Set(this.canvas.getActiveObjects());
      moving.add(target);
      const xs = [0, this.width / 2, this.width];
      const ys = [0, this.height / 2, this.height];
      for (const o of this.canvas.getObjects()) {
        if (moving.has(o) || o.visible === false) continue;
        const b = o.getBoundingRect();
        xs.push(b.left, b.left + b.width / 2, b.left + b.width);
        ys.push(b.top, b.top + b.height / 2, b.top + b.height);
      }
      this.snapCache = { xs, ys };
    }
    const threshold = SNAP_PX / this.zoom;
    const b = target.getBoundingRect();
    const best = (edges: number[], candidates: number[]) => {
      let delta = Infinity;
      for (const e of edges) for (const c of candidates) if (Math.abs(c - e) < Math.abs(delta)) delta = c - e;
      return Math.abs(delta) <= threshold ? delta : 0;
    };
    const dx = best([b.left, b.left + b.width / 2, b.left + b.width], this.snapCache.xs);
    const dy = best([b.top, b.top + b.height / 2, b.top + b.height], this.snapCache.ys);
    if (dx) target.set("left", target.left + dx);
    if (dy) target.set("top", target.top + dy);
    target.setCoords();
    const nb = target.getBoundingRect();
    const eps = 0.5;
    const guides: Guide[] = [];
    for (const e of [nb.left, nb.left + nb.width / 2, nb.left + nb.width]) {
      if (this.snapCache.xs.some((x) => Math.abs(x - e) < eps)) guides.push({ axis: "x", pos: e });
    }
    for (const e of [nb.top, nb.top + nb.height / 2, nb.top + nb.height]) {
      if (this.snapCache.ys.some((y) => Math.abs(y - e) < eps)) guides.push({ axis: "y", pos: e });
    }
    this.guides = guides;
  }

  private drawGuides(ctx: CanvasRenderingContext2D): void {
    if (!this.guides.length) return;
    const vpt = this.canvas.viewportTransform;
    ctx.save();
    ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
    ctx.strokeStyle = "#ec4899";
    ctx.lineWidth = 1 / this.zoom;
    ctx.setLineDash([4 / this.zoom, 3 / this.zoom]);
    ctx.beginPath();
    for (const g of this.guides) {
      if (g.axis === "x") {
        ctx.moveTo(g.pos, 0);
        ctx.lineTo(g.pos, this.height);
      } else {
        ctx.moveTo(0, g.pos);
        ctx.lineTo(this.width, g.pos);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- history & persistence

  private flush(): void {
    if (this.loading) return;
    // Canvas-level serialization realizes active-selection transforms, so selected
    // objects are saved in page coordinates rather than relative to the selection.
    const { objects } = this.canvas.toObject(SERIALIZE_PROPS) as { objects: SerializedObject[] };
    this.pages = this.pages.map((p, i) => (i === this.active ? { ...p, objects: stripOrigin(objects) } : p));
  }

  private snapshot(): string {
    const snap: Snapshot = { width: this.width, height: this.height, active: this.active, pages: this.pages };
    return JSON.stringify(snap);
  }

  /** Records the current canvas into the document and history. */
  commit(): void {
    if (this.loading || this.disposed) return;
    this.flush();
    const snap = this.snapshot();
    if (snap !== this.current) {
      this.past.push(this.current);
      if (this.past.length > HISTORY_LIMIT) this.past.shift();
      this.future = [];
      this.current = snap;
      this.revision++;
      this.onDocChange();
    }
    this.emit();
  }

  private async restore(serialized: string): Promise<void> {
    const snap = JSON.parse(serialized) as Snapshot;
    this.width = snap.width;
    this.height = snap.height;
    this.pages = snap.pages;
    this.active = Math.min(snap.active, snap.pages.length - 1);
    this.current = serialized;
    this.revision++;
    this.applyZoom();
    await this.loadPage(this.active);
    this.onDocChange();
    this.emit();
  }

  async undo(): Promise<void> {
    this.exitEditing();
    const prev = this.past.pop();
    if (prev === undefined) return;
    this.future.push(this.current);
    await this.restore(prev);
  }

  async redo(): Promise<void> {
    this.exitEditing();
    const next = this.future.pop();
    if (next === undefined) return;
    this.past.push(this.current);
    await this.restore(next);
  }

  toDoc(): DesignDoc {
    this.flush();
    return { version: 1, width: this.width, height: this.height, pages: this.pages };
  }

  /** Replaces the whole document (e.g. restoring a saved version); undoable. */
  async replaceDoc(doc: DesignDoc): Promise<void> {
    this.flush();
    this.past.push(this.current);
    this.future = [];
    this.width = doc.width;
    this.height = doc.height;
    this.pages = doc.pages;
    this.active = 0;
    this.applyZoom();
    await this.loadPage(0);
    this.current = this.snapshot();
    this.revision++;
    this.onDocChange();
    this.emit();
  }

  /** Applies a saved remote revision without treating it as a local edit. */
  async syncRemoteDoc(doc: DesignDoc): Promise<void> {
    this.width = doc.width;
    this.height = doc.height;
    this.pages = doc.pages;
    this.active = Math.min(this.active, doc.pages.length - 1);
    this.past = [];
    this.future = [];
    this.applyZoom();
    await this.loadPage(this.active);
    this.current = this.snapshot();
    this.revision++;
    this.emit();
  }

  getPage(index: number): PageData {
    if (index === this.active) this.flush();
    return this.pages[index];
  }

  get pageCount(): number {
    return this.pages.length;
  }

  get activeIndex(): number {
    return this.active;
  }

  get size(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  // ---------------------------------------------------------------- pages

  private async loadPage(index: number): Promise<void> {
    const token = ++this.loadToken;
    this.loading = true;
    const page = this.pages[index];
    await loadFonts(collectFonts(page.objects));
    const objects = await enlivenSafe(page.objects);
    if (token !== this.loadToken || this.disposed) return;
    const c = this.canvas;
    c.discardActiveObject();
    c.remove(...c.getObjects());
    for (const o of objects) this.prepare(o);
    if (objects.length) c.add(...objects);
    c.backgroundColor = backgroundFill(page.background, this.width, this.height);
    this.guides = [];
    this.loading = false;
    c.requestRenderAll();
  }

  private prepare(obj: FabricObject): void {
    if (!obj.id) obj.id = uid();
    applyLockState(obj);
  }

  async gotoPage(index: number): Promise<void> {
    if (index < 0 || index >= this.pages.length || index === this.active) return;
    this.exitEditing();
    this.flush();
    this.active = index;
    await this.loadPage(index);
    this.current = this.snapshot();
    this.emit();
  }

  async addPage(afterIndex = this.active, page?: PageData): Promise<void> {
    this.flush();
    const bg = this.pages[this.active]?.background ?? "#ffffff";
    const newPage: PageData = page ?? { id: newPageId(), background: typeof bg === "string" ? "#ffffff" : bg, objects: [] };
    this.pages = [...this.pages.slice(0, afterIndex + 1), newPage, ...this.pages.slice(afterIndex + 1)];
    this.active = afterIndex + 1;
    await this.loadPage(this.active);
    this.commit();
  }

  async duplicatePage(index = this.active): Promise<void> {
    const source = this.getPage(index);
    const objects = (JSON.parse(JSON.stringify(source.objects)) as SerializedObject[]).map((o) => ({ ...o, id: uid() }));
    await this.addPage(index, { ...source, id: newPageId(), objects });
  }

  async deletePage(index = this.active): Promise<void> {
    if (this.pages.length <= 1) return;
    this.flush();
    this.pages = this.pages.filter((_, i) => i !== index);
    this.active = Math.max(0, Math.min(index === this.active ? index - (index > 0 ? 1 : 0) : this.active - (index < this.active ? 1 : 0), this.pages.length - 1));
    await this.loadPage(this.active);
    this.commit();
  }

  movePage(from: number, to: number): void {
    if (from === to || to < 0 || to >= this.pages.length) return;
    this.flush();
    const activeId = this.pages[this.active].id;
    const next = [...this.pages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    this.pages = next;
    this.active = next.findIndex((p) => p.id === activeId);
    this.commit();
  }

  renamePage(index: number, name: string): void {
    this.flush();
    this.pages = this.pages.map((p, i) => (i === index ? { ...p, name: name.slice(0, 120) || undefined } : p));
    this.commit();
  }

  setBackground(bg: PageBackground): void {
    this.flush();
    this.pages = this.pages.map((p, i) => (i === this.active ? { ...p, background: bg } : p));
    this.canvas.backgroundColor = backgroundFill(bg, this.width, this.height);
    this.canvas.requestRenderAll();
    this.commit();
  }

  /**
   * Inserts template pages after the active page (replacing it when empty),
   * scaling them to this design's size.
   */
  async applyTemplatePages(pages: { background: PageBackground; objects: SerializedObject[] }[], size: { width: number; height: number }): Promise<void> {
    this.exitEditing();
    this.flush();
    const to = { width: this.width, height: this.height };
    const incoming: PageData[] = pages.map((p) => ({
      id: newPageId(),
      background: p.background,
      objects: scaleObjects(structuredClone(p.objects), size, to).map((o) => ({ ...o, id: uid() })),
    }));
    const replace = this.pages[this.active].objects.length === 0;
    const at = replace ? this.active : this.active + 1;
    this.pages = [...this.pages.slice(0, at), ...incoming, ...this.pages.slice(replace ? at + 1 : at)];
    this.active = at;
    await this.loadPage(at);
    this.commit();
  }

  /** Changes the canvas size, scaling and re-centering all content to fit. */
  async resize(width: number, height: number): Promise<void> {
    this.exitEditing();
    this.flush();
    const from = { width: this.width, height: this.height };
    this.pages = this.pages.map((p) => ({ ...p, objects: scaleObjects(p.objects, from, { width, height }) }));
    this.width = width;
    this.height = height;
    this.applyZoom();
    await this.loadPage(this.active);
    this.commit();
  }

  // ---------------------------------------------------------------- zoom

  setZoom(zoom: number): void {
    this.zoom = Math.min(8, Math.max(0.05, zoom));
    this.applyZoom();
    this.emit();
  }

  getZoom(): number {
    return this.zoom;
  }

  private applyZoom(): void {
    this.canvas.setDimensions({ width: Math.round(this.width * this.zoom), height: Math.round(this.height * this.zoom) });
    this.canvas.setZoom(this.zoom);
    this.canvas.requestRenderAll();
  }

  fitZoom(containerWidth: number, containerHeight: number, padding = 64): number {
    return Math.max(0.05, Math.min((containerWidth - padding * 2) / this.width, (containerHeight - padding * 2) / this.height, 4));
  }

  // ---------------------------------------------------------------- adding content

  private center(): Point {
    return new Point(this.width / 2, this.height / 2);
  }

  async addSerialized(objects: SerializedObject[], at?: { x: number; y: number }): Promise<void> {
    if (this.canvas.getObjects().length + objects.length > MAX_OBJECTS_PER_PAGE) throw new Error(`A page supports up to ${MAX_OBJECTS_PER_PAGE} layers`);
    this.exitEditing();
    const enlivened = await enlivenSafe(objects.map((o) => ({ ...o, id: uid() })));
    if (!enlivened.length) return;
    await loadFonts(collectFonts(objects));
    for (const o of enlivened) {
      this.prepare(o);
      if (at) {
        o.set({ left: at.x, top: at.y });
      }
      o.setCoords();
    }
    this.canvas.add(...enlivened);
    this.select(enlivened);
    this.commit();
  }

  async addImage(url: string, name = "Image", at?: { x: number; y: number }): Promise<void> {
    const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    const maxW = this.width * 0.6;
    const maxH = this.height * 0.6;
    const scale = Math.min(1, maxW / img.width, maxH / img.height);
    const c = at ?? this.center();
    img.set({ left: c.x, top: c.y, scaleX: scale, scaleY: scale, name, id: uid() });
    this.prepare(img);
    this.canvas.add(img);
    this.select([img]);
    this.commit();
  }

  async setBackgroundImage(url: string): Promise<void> {
    const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    const scale = Math.max(this.width / img.width, this.height / img.height);
    img.set({ left: this.width / 2, top: this.height / 2, scaleX: scale, scaleY: scale, name: "Background image", id: uid(), locked: true });
    this.prepare(img);
    this.canvas.insertAt(0, img);
    this.canvas.requestRenderAll();
    this.commit();
  }

  selectedImageUploadId(): string | null {
    const image = this.canvas.getActiveObject();
    if (!(image instanceof FabricImage) || image.locked) return null;
    const src = image.getSrc().replace(/^https?:\/\/[^/]+/, "");
    return /^\/api\/uploads\/([A-Za-z0-9_-]{8,64})$/.exec(src)?.[1] ?? null;
  }

  applyImageFilter(preset: "none" | "grayscale" | "sepia" | "vivid"): void {
    const image = this.canvas.getActiveObject();
    if (!(image instanceof FabricImage) || image.locked) return;
    image.filters = preset === "grayscale" ? [new filters.Grayscale()]
      : preset === "sepia" ? [new filters.Sepia()]
        : preset === "vivid" ? [new filters.Contrast({ contrast: 0.2 }), new filters.Saturation({ saturation: 0.3 })] : [];
    image.applyFilters();
    this.canvas.requestRenderAll();
    this.commit();
  }

  cropImage(inset: number): void {
    const image = this.canvas.getActiveObject();
    if (!(image instanceof FabricImage) || image.locked || inset < 0 || inset >= 0.45) return;
    const element = image.getElement();
    const width = element.width;
    const height = element.height;
    const nextWidth = width * (1 - inset * 2);
    const nextHeight = height * (1 - inset * 2);
    const center = image.getCenterPoint();
    image.set({ cropX: width * inset, cropY: height * inset, width: nextWidth, height: nextHeight });
    image.setPositionByOrigin(center, "center", "center");
    image.setCoords();
    this.canvas.requestRenderAll();
    this.commit();
  }

  async replaceSelectedImage(url: string): Promise<void> {
    const old = this.canvas.getActiveObject();
    if (!(old instanceof FabricImage) || old.locked) return;
    const replacement = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    const center = old.getCenterPoint();
    replacement.set({
      angle: old.angle, opacity: old.opacity,
      scaleX: old.getScaledWidth() / replacement.width, scaleY: old.getScaledHeight() / replacement.height,
      name: old.name, id: old.id,
    });
    replacement.setPositionByOrigin(center, "center", "center");
    const index = this.canvas.getObjects().indexOf(old);
    this.canvas.remove(old);
    this.prepare(replacement);
    this.canvas.insertAt(index, replacement);
    this.select([replacement]);
    this.commit();
  }

  // ---------------------------------------------------------------- selection

  private select(objects: FabricObject[]): void {
    const c = this.canvas;
    c.discardActiveObject();
    if (objects.length === 1) c.setActiveObject(objects[0]);
    else if (objects.length > 1) c.setActiveObject(new ActiveSelection(objects, { canvas: c }));
    c.requestRenderAll();
  }

  selectAll(): void {
    this.select(this.canvas.getObjects().filter((o) => o.visible !== false && !o.locked));
    this.emit();
  }

  deselect(): void {
    this.exitEditing();
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    this.emit();
  }

  isEditingText(): boolean {
    const a = this.canvas.getActiveObject();
    return a instanceof IText && a.isEditing;
  }

  private exitEditing(): void {
    const a = this.canvas.getActiveObject();
    if (a instanceof IText && a.isEditing) a.exitEditing();
  }

  /** Runs fn with the selected objects in canvas coordinates, then reselects them. */
  private withDetached<T>(fn: (objects: FabricObject[]) => T): T {
    const objects = this.canvas.getActiveObjects();
    this.canvas.discardActiveObject();
    const result = fn(objects);
    for (const o of objects) o.setCoords();
    this.select(objects.filter((o) => this.canvas.getObjects().includes(o)));
    return result;
  }

  private findById(id: string): FabricObject | undefined {
    return this.canvas.getObjects().find((o) => o.id === id);
  }

  // ---------------------------------------------------------------- editing

  deleteSelection(): void {
    const objects = this.canvas.getActiveObjects().filter((o) => !o.locked);
    if (!objects.length) return;
    this.canvas.discardActiveObject();
    this.canvas.remove(...objects);
    this.canvas.requestRenderAll();
    this.commit();
  }

  copy(): boolean {
    if (!this.canvas.getActiveObject()) return false;
    this.clipboard = this.withDetached((objects) => objects.map(serialize));
    return true;
  }

  cut(): void {
    if (this.copy()) this.deleteSelection();
  }

  async paste(): Promise<void> {
    if (!this.clipboard.length) return;
    this.clipboard = this.clipboard.map((o) => ({
      ...o,
      left: (Number(o.left) || 0) + PASTE_OFFSET,
      top: (Number(o.top) || 0) + PASTE_OFFSET,
    }));
    await this.addSerialized(this.clipboard.map((o) => ({ ...o, locked: false })));
  }

  hasClipboard(): boolean {
    return this.clipboard.length > 0;
  }

  async duplicate(): Promise<void> {
    if (!this.canvas.getActiveObject()) return;
    const data = this.withDetached((objects) => objects.map(serialize));
    await this.addSerialized(
      data.map((o) => ({ ...o, locked: false, left: (Number(o.left) || 0) + PASTE_OFFSET, top: (Number(o.top) || 0) + PASTE_OFFSET })),
    );
  }

  group(): void {
    const active = this.canvas.getActiveObject();
    if (!(active instanceof ActiveSelection)) return;
    const c = this.canvas;
    const all = c.getObjects();
    const objects = [...c.getActiveObjects()].sort((a, b) => all.indexOf(a) - all.indexOf(b));
    const index = all.indexOf(objects[0]);
    c.discardActiveObject();
    c.remove(...objects);
    const group = new Group(objects, { id: uid(), name: "Group" } as Partial<Group>);
    this.prepare(group);
    c.insertAt(Math.max(0, index), group);
    c.setActiveObject(group);
    c.requestRenderAll();
    this.commit();
  }

  ungroup(): void {
    const active = this.canvas.getActiveObject();
    if (!(active instanceof Group) || active instanceof ActiveSelection || active.locked) return;
    const c = this.canvas;
    const index = c.getObjects().indexOf(active);
    c.discardActiveObject();
    const items = active.removeAll();
    c.remove(active);
    for (const o of items) this.prepare(o);
    c.insertAt(index, ...items);
    this.select(items);
    this.commit();
  }

  toggleLock(): void {
    const objects = this.canvas.getActiveObjects();
    if (!objects.length) return;
    const lock = !objects.every((o) => o.locked);
    for (const o of objects) {
      o.locked = lock;
      applyLockState(o);
    }
    this.canvas.requestRenderAll();
    this.commit();
  }

  reorder(direction: "forward" | "backward" | "front" | "back"): void {
    const c = this.canvas;
    const all = c.getObjects();
    const objects = [...c.getActiveObjects()].sort((a, b) => all.indexOf(a) - all.indexOf(b));
    if (!objects.length) return;
    // Iteration order keeps the relative stacking of a multi-selection intact.
    if (direction === "forward" || direction === "back") objects.reverse();
    for (const o of objects) {
      if (direction === "forward") c.bringObjectForward(o);
      else if (direction === "backward") c.sendObjectBackwards(o);
      else if (direction === "front") c.bringObjectToFront(o);
      else c.sendObjectToBack(o);
    }
    c.requestRenderAll();
    this.commit();
  }

  align(mode: AlignMode): void {
    const active = this.canvas.getActiveObject();
    if (!active) return;
    const multi = active instanceof ActiveSelection;
    const frame = multi ? active.getBoundingRect() : { left: 0, top: 0, width: this.width, height: this.height };
    this.withDetached((objects) => {
      for (const o of objects) {
        if (o.locked) continue;
        const b = o.getBoundingRect();
        let dx = 0;
        let dy = 0;
        if (mode === "left") dx = frame.left - b.left;
        if (mode === "center") dx = frame.left + frame.width / 2 - (b.left + b.width / 2);
        if (mode === "right") dx = frame.left + frame.width - (b.left + b.width);
        if (mode === "top") dy = frame.top - b.top;
        if (mode === "middle") dy = frame.top + frame.height / 2 - (b.top + b.height / 2);
        if (mode === "bottom") dy = frame.top + frame.height - (b.top + b.height);
        o.set({ left: o.left + dx, top: o.top + dy });
      }
    });
    this.commit();
  }

  /** Spreads 3+ selected objects evenly along an axis. */
  distribute(axis: "x" | "y"): void {
    const active = this.canvas.getActiveObject();
    if (!(active instanceof ActiveSelection) || active.size() < 3) return;
    this.withDetached((objects) => {
      const items = objects.map((o) => ({ o, b: o.getBoundingRect() }));
      const start = (b: { left: number; top: number }) => (axis === "x" ? b.left : b.top);
      const size = (b: { width: number; height: number }) => (axis === "x" ? b.width : b.height);
      items.sort((a, b) => start(a.b) - start(b.b));
      const first = items[0].b;
      const last = items[items.length - 1].b;
      const total = start(last) + size(last) - start(first);
      const gap = (total - items.reduce((s, i) => s + size(i.b), 0)) / (items.length - 1);
      let cursor = start(first);
      for (const { o, b } of items) {
        const delta = cursor - start(b);
        if (axis === "x") o.set("left", o.left + delta);
        else o.set("top", o.top + delta);
        cursor += size(b) + gap;
      }
    });
    this.commit();
  }

  flip(axis: "x" | "y"): void {
    for (const o of this.canvas.getActiveObjects()) {
      if (o.locked) continue;
      if (axis === "x") o.set("flipX", !o.flipX);
      else o.set("flipY", !o.flipY);
    }
    this.canvas.requestRenderAll();
    this.commit();
  }

  nudge(dx: number, dy: number): void {
    const active = this.canvas.getActiveObject();
    if (!active || this.canvas.getActiveObjects().some((o) => o.locked)) return;
    active.set({ left: active.left + dx, top: active.top + dy });
    active.setCoords();
    this.canvas.requestRenderAll();
    this.commit();
  }

  /** Applies visual properties to every selected object (recursing into groups for colors). */
  updateSelection(props: Partial<{ fill: string; stroke: string; strokeWidth: number; opacity: number; radius: number; shadow: boolean }>): void {
    const targets = this.canvas.getActiveObjects();
    const apply = (o: FabricObject, deep: boolean) => {
      if (deep && o instanceof Group) {
        for (const child of o.getObjects()) apply(child, true);
        o.set("dirty", true);
        return;
      }
      if (props.fill !== undefined) {
        if (o instanceof IText && o.isEditing && o.selectionStart !== o.selectionEnd) o.setSelectionStyles({ fill: props.fill });
        else o.set("fill", props.fill);
      }
      if (props.stroke !== undefined) o.set({ stroke: props.stroke, strokeWidth: o.strokeWidth || 2 });
      if (props.strokeWidth !== undefined) o.set({ strokeWidth: props.strokeWidth, stroke: o.stroke ?? "#111111" });
      if (props.radius !== undefined && typeOf(o) === "rect") o.set({ rx: props.radius, ry: props.radius } as Partial<FabricObject>);
    };
    for (const o of targets) {
      if (o.locked) continue;
      if (props.opacity !== undefined) o.set("opacity", props.opacity);
      if (props.shadow !== undefined) {
        o.set("shadow", props.shadow ? { color: "rgba(0,0,0,0.25)", blur: 24, offsetX: 0, offsetY: 8 } : null);
      }
      apply(o, true);
      o.setCoords();
    }
    this.canvas.requestRenderAll();
    this.commit();
  }

  async updateText(props: Partial<TextProps>): Promise<void> {
    const active = this.canvas.getActiveObject();
    if (!(active instanceof IText) || active.locked) return;
    if (props.fontFamily) await loadFonts([props.fontFamily]);
    const styleKeys = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "underline", "linethrough"] as const;
    const hasRange = active.isEditing && active.selectionStart !== active.selectionEnd;
    if (hasRange && Object.keys(props).every((k) => (styleKeys as readonly string[]).includes(k))) {
      active.setSelectionStyles(props);
    } else {
      active.set(props);
      // Whole-object changes override per-character styles of the same keys.
      if (active.styles && Object.keys(active.styles).length) {
        const keys = Object.keys(props).filter((k) => (styleKeys as readonly string[]).includes(k));
        for (const k of keys) active.cleanStyle(k as (typeof styleKeys)[number]);
      }
    }
    active.initDimensions();
    active.setCoords();
    this.canvas.requestRenderAll();
    this.commit();
  }

  // ---------------------------------------------------------------- layers

  selectLayer(id: string, additive: boolean): void {
    const obj = this.findById(id);
    if (!obj) return;
    this.exitEditing();
    if (additive) {
      const current = this.canvas.getActiveObjects();
      const next = current.includes(obj) ? current.filter((o) => o !== obj) : [...current, obj];
      this.select(next);
    } else {
      this.select([obj]);
    }
    this.emit();
  }

  toggleLayerVisibility(id: string): void {
    const obj = this.findById(id);
    if (!obj) return;
    obj.visible = obj.visible === false;
    if (!obj.visible && this.canvas.getActiveObjects().includes(obj)) this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    this.commit();
  }

  toggleLayerLock(id: string): void {
    const obj = this.findById(id);
    if (!obj) return;
    obj.locked = !obj.locked;
    applyLockState(obj);
    this.canvas.requestRenderAll();
    this.commit();
  }

  renameLayer(id: string, name: string): void {
    const obj = this.findById(id);
    if (!obj) return;
    obj.name = name.trim().slice(0, 80) || undefined;
    this.commit();
  }

  /** Moves a layer to a position in the top-first layer list. */
  moveLayer(id: string, toListIndex: number): void {
    const obj = this.findById(id);
    if (!obj) return;
    const count = this.canvas.getObjects().length;
    const index = Math.max(0, Math.min(count - 1, count - 1 - toListIndex));
    this.canvas.moveObjectTo(obj, index);
    this.canvas.requestRenderAll();
    this.commit();
  }

  /** Scene coordinates for a client (viewport) point, used for drag-and-drop. */
  clientToScene(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.upperCanvasEl.getBoundingClientRect();
    return { x: (clientX - rect.left) / this.zoom, y: (clientY - rect.top) / this.zoom };
  }

  onDoubleClick(handler: (e: TPointerEventInfo) => void): void {
    this.canvas.on("mouse:dblclick", handler);
  }
}
