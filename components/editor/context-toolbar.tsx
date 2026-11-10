"use client";

import { useState } from "react";

import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceAround,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceAround,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Bold,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Group as GroupIcon,
  Italic,
  Layers2,
  Lock,
  Minus,
  Plus,
  Strikethrough,
  Trash2,
  Underline,
  Ungroup,
  Unlock,
} from "lucide-react";
import { FONTS, FONT_SIZES } from "@/lib/design/fonts";
import { api } from "@/lib/api-client";
import { IconButton } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { ColorPicker, ColorSwatchButton } from "./color-picker";
import { useEditor } from "./editor-context";
import { backgroundCss } from "./fabric-setup";
import type { Upload } from "./uploads";

function Divider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-ink-200" aria-hidden="true" />;
}

function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="block w-56 text-sm text-ink-700">
      <span className="mb-1 flex justify-between">
        {label}
        <span className="tabular-nums text-ink-500">{format ? format(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-brand-600" />
    </label>
  );
}

const ALIGN_ICONS = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify } as const;
const ALIGN_ORDER = ["left", "center", "right", "justify"] as const;

export function ContextToolbar({ onOpenBackground }: { onOpenBackground: () => void }) {
  const { engine, state } = useEditor();
  const sel = state.selection;
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function removeBackground() {
    const uploadId = engine.selectedImageUploadId();
    if (!uploadId) { setPhotoError("Select an image from your uploads first"); return; }
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const { upload } = await api<{ upload: Upload }>("/api/uploads/remove-background", { method: "POST", json: { uploadId } });
      await engine.replaceSelectedImage(upload.url);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Could not remove background");
    } finally {
      setPhotoBusy(false);
    }
  }

  if (!sel) {
    const bg = state.pages[state.activePage]?.background ?? "#fff";
    return (
      <div className="flex h-12 items-center gap-2 px-3 text-sm text-ink-500">
        <button type="button" onClick={onOpenBackground} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-ink-100" aria-label="Change background">
          <span className="h-5 w-5 rounded-full ring-1 ring-inset ring-black/15" style={{ background: backgroundCss(bg) }} />
          Background
        </button>
        <Divider />
        <span className="hidden sm:inline">Select an element to edit it, or add one from the left.</span>
      </div>
    );
  }

  const locked = sel.locked;
  const text = sel.text;
  const nextAlign = text ? ALIGN_ORDER[(ALIGN_ORDER.indexOf(text.textAlign as (typeof ALIGN_ORDER)[number]) + 1) % ALIGN_ORDER.length] : "left";
  const AlignIcon = text ? (ALIGN_ICONS[text.textAlign as keyof typeof ALIGN_ICONS] ?? AlignLeft) : AlignLeft;
  const setFontSize = (size: number) => engine.updateText({ fontSize: Math.max(4, Math.min(800, Math.round(size))) });

  return (
    <div className="flex h-12 items-center gap-0.5 overflow-x-auto px-2 [scrollbar-width:thin]" role="toolbar" aria-label="Selection tools">
      {locked ? (
        <span className="mr-2 flex items-center gap-1.5 rounded-md bg-ink-100 px-2 py-1 text-xs text-ink-700">
          <Lock size={13} /> Locked
        </span>
      ) : (
        <>
          {text && (
            <>
              <select
                aria-label="Font"
                value={text.fontFamily}
                onChange={(e) => engine.updateText({ fontFamily: e.target.value })}
                className="h-8 w-40 shrink-0 rounded-md border border-ink-200 bg-white px-2 text-sm"
                style={{ fontFamily: `"${text.fontFamily}"` }}
              >
                {!FONTS.some((f) => f.family === text.fontFamily) && <option value={text.fontFamily}>{text.fontFamily}</option>}
                {FONTS.map((f) => (
                  <option key={f.family} value={f.family} style={{ fontFamily: `"${f.family}"` }}>
                    {f.family}
                  </option>
                ))}
              </select>
              <div className="ml-1 flex shrink-0 items-center rounded-md border border-ink-200">
                <IconButton label="Decrease font size" onClick={() => setFontSize(text.fontSize - (text.fontSize > 40 ? 4 : 1))}>
                  <Minus size={14} />
                </IconButton>
                <input
                  aria-label="Font size"
                  list="font-sizes"
                  key={text.fontSize}
                  defaultValue={Math.round(text.fontSize)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v > 0 && v !== text.fontSize) setFontSize(v);
                  }}
                  className="h-7 w-11 border-x border-ink-200 text-center text-sm tabular-nums"
                />
                <datalist id="font-sizes">
                  {FONT_SIZES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <IconButton label="Increase font size" onClick={() => setFontSize(text.fontSize + (text.fontSize >= 40 ? 4 : 1))}>
                  <Plus size={14} />
                </IconButton>
              </div>
            </>
          )}
          {!sel.isImage && !sel.isLine && (
            <Popover label={text ? "Text color" : "Fill color"} trigger={({ toggle, open }) => <ColorSwatchButton color={sel.fill} onClick={toggle} open={open} label={text ? "Text color" : "Fill color"} />}>
              <ColorPicker value={sel.fill} onChange={(c) => engine.updateSelection({ fill: c })} allowNone={!text} />
            </Popover>
          )}
          {sel.isImage && <Popover label="Edit photo" trigger={({ toggle, open }) => (
            <button type="button" onClick={toggle} aria-expanded={open} className="h-8 shrink-0 rounded-md px-2 text-sm text-ink-700 hover:bg-ink-100">Edit photo</button>
          )}>
            <div className="w-56 space-y-3 text-sm text-ink-700">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Filters</p>
              <div className="grid grid-cols-2 gap-1">
                {(["none", "grayscale", "sepia", "vivid"] as const).map((preset) => <button key={preset} type="button" onClick={() => engine.applyImageFilter(preset)} className="rounded-md border border-ink-200 px-2 py-1.5 capitalize hover:bg-ink-100">{preset}</button>)}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Crop</p>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => engine.cropImage(0.1)} className="rounded-md border border-ink-200 px-2 py-1.5 hover:bg-ink-100">Inset 10%</button>
                <button type="button" onClick={() => engine.cropImage(0)} className="rounded-md border border-ink-200 px-2 py-1.5 hover:bg-ink-100">Reset crop</button>
              </div>
              <button type="button" disabled={photoBusy} onClick={removeBackground} className="w-full rounded-md bg-brand-600 px-2 py-2 text-white disabled:opacity-50">{photoBusy ? "Removing…" : "Remove background"}</button>
              {photoError && <p role="alert" className="text-xs text-danger-600">{photoError}</p>}
            </div>
          </Popover>}
          {text && (
            <>
              <IconButton label="Bold" active={text.fontWeight === "bold" || Number(text.fontWeight) >= 600} onClick={() => engine.updateText({ fontWeight: text.fontWeight === "bold" || Number(text.fontWeight) >= 600 ? "normal" : "bold" })}>
                <Bold size={16} />
              </IconButton>
              <IconButton label="Italic" active={text.fontStyle === "italic"} onClick={() => engine.updateText({ fontStyle: text.fontStyle === "italic" ? "normal" : "italic" })}>
                <Italic size={16} />
              </IconButton>
              <IconButton label="Underline" active={text.underline} onClick={() => engine.updateText({ underline: !text.underline })}>
                <Underline size={16} />
              </IconButton>
              <IconButton label="Strikethrough" active={text.linethrough} onClick={() => engine.updateText({ linethrough: !text.linethrough })}>
                <Strikethrough size={16} />
              </IconButton>
              <IconButton label={`Text align: ${text.textAlign} (click for ${nextAlign})`} onClick={() => engine.updateText({ textAlign: nextAlign })}>
                <AlignIcon size={16} />
              </IconButton>
              <Popover label="Spacing" trigger={({ toggle, open }) => (
                <button type="button" onClick={toggle} aria-expanded={open} className="h-8 shrink-0 rounded-md px-2 text-sm text-ink-700 hover:bg-ink-100">
                  Spacing
                </button>
              )}>
                <div className="space-y-4">
                  <Slider label="Letter spacing" value={text.charSpacing} min={-100} max={800} step={10} onChange={(v) => engine.updateText({ charSpacing: v })} />
                  <Slider label="Line height" value={text.lineHeight} min={0.6} max={3} step={0.05} onChange={(v) => engine.updateText({ lineHeight: v })} format={(v) => v.toFixed(2)} />
                </div>
              </Popover>
            </>
          )}
          {!text && !sel.isMulti && (
            <Popover label="Border" trigger={({ toggle, open }) => (
              <button type="button" onClick={toggle} aria-expanded={open} className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-ink-700 hover:bg-ink-100">
                <span className="h-4 w-4 rounded-sm border-2" style={{ borderColor: sel.stroke ?? "#c4c2d1" }} /> {sel.isLine ? "Line" : "Border"}
              </button>
            )}>
              <div className="space-y-4">
                <Slider label={sel.isLine ? "Thickness" : "Border width"} value={sel.strokeWidth} min={0} max={sel.isLine ? 80 : 40} step={1} onChange={(v) => engine.updateSelection({ strokeWidth: v })} />
                <ColorPicker value={sel.stroke} onChange={(c) => engine.updateSelection({ stroke: c })} />
              </div>
            </Popover>
          )}
          {sel.radius !== null && (
            <Popover label="Corner radius" trigger={({ toggle, open }) => (
              <button type="button" onClick={toggle} aria-expanded={open} className="h-8 shrink-0 rounded-md px-2 text-sm text-ink-700 hover:bg-ink-100">
                Corners
              </button>
            )}>
              <Slider label="Corner radius" value={sel.radius} min={0} max={Math.round(Math.min(sel.box.width, sel.box.height) / 2)} step={1} onChange={(v) => engine.updateSelection({ radius: v })} />
            </Popover>
          )}
          <Divider />
          <Popover label="Effects" trigger={({ toggle, open }) => (
            <button type="button" onClick={toggle} aria-expanded={open} className="h-8 shrink-0 rounded-md px-2 text-sm text-ink-700 hover:bg-ink-100">
              Effects
            </button>
          )}>
            <div className="space-y-4">
              <Slider label="Transparency" value={Math.round(sel.opacity * 100)} min={0} max={100} step={1} onChange={(v) => engine.updateSelection({ opacity: v / 100 })} format={(v) => `${v}%`} />
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" checked={sel.shadow} onChange={(e) => engine.updateSelection({ shadow: e.target.checked })} className="accent-brand-600" />
                Drop shadow
              </label>
            </div>
          </Popover>
          <IconButton label="Flip horizontal" onClick={() => engine.flip("x")}>
            <FlipHorizontal2 size={16} />
          </IconButton>
          <IconButton label="Flip vertical" onClick={() => engine.flip("y")}>
            <FlipVertical2 size={16} />
          </IconButton>
          <Popover label="Position" align="right" trigger={({ toggle, open }) => (
            <button type="button" onClick={toggle} aria-expanded={open} className="flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm text-ink-700 hover:bg-ink-100">
              <Layers2 size={15} /> Position
            </button>
          )}>
            <div className="w-64 space-y-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Layer order</p>
              <div className="grid grid-cols-2 gap-1">
                {([
                  ["forward", "Forward", ArrowUp],
                  ["backward", "Backward", ArrowDown],
                  ["front", "To front", ArrowUpToLine],
                  ["back", "To back", ArrowDownToLine],
                ] as const).map(([dir, label, Icon]) => (
                  <button key={dir} type="button" onClick={() => engine.reorder(dir)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-ink-100">
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{sel.isMulti ? "Align elements" : "Align to page"}</p>
              <div className="grid grid-cols-3 gap-1">
                {([
                  ["left", "Left", AlignHorizontalJustifyStart],
                  ["center", "Center", AlignHorizontalJustifyCenter],
                  ["right", "Right", AlignHorizontalJustifyEnd],
                  ["top", "Top", AlignVerticalJustifyStart],
                  ["middle", "Middle", AlignVerticalJustifyCenter],
                  ["bottom", "Bottom", AlignVerticalJustifyEnd],
                ] as const).map(([mode, label, Icon]) => (
                  <button key={mode} type="button" onClick={() => engine.align(mode)} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-ink-100">
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
              {sel.isMulti && sel.count >= 3 && (
                <div className="grid grid-cols-2 gap-1">
                  <button type="button" onClick={() => engine.distribute("x")} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-ink-100">
                    <AlignHorizontalSpaceAround size={15} /> Space evenly
                  </button>
                  <button type="button" onClick={() => engine.distribute("y")} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-ink-100">
                    <AlignVerticalSpaceAround size={15} /> Stack evenly
                  </button>
                </div>
              )}
            </div>
          </Popover>
          {sel.isMulti && (
            <IconButton label="Group (Ctrl+G)" onClick={() => engine.group()}>
              <GroupIcon size={16} />
            </IconButton>
          )}
          {sel.isGroup && (
            <IconButton label="Ungroup (Ctrl+Shift+G)" onClick={() => engine.ungroup()}>
              <Ungroup size={16} />
            </IconButton>
          )}
        </>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-2">
        <IconButton label={locked ? "Unlock (Ctrl+Shift+L)" : "Lock (Ctrl+Shift+L)"} active={locked} onClick={() => engine.toggleLock()}>
          {locked ? <Lock size={16} /> : <Unlock size={16} />}
        </IconButton>
        <IconButton label="Duplicate (Ctrl+D)" onClick={() => engine.duplicate()}>
          <Copy size={16} />
        </IconButton>
        <IconButton label="Delete (Del)" onClick={() => engine.deleteSelection()} disabled={locked}>
          <Trash2 size={16} />
        </IconButton>
      </div>
    </div>
  );
}
