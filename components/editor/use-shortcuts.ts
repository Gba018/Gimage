"use client";

import { useEffect, useRef } from "react";
import type { EditorEngine } from "./engine";
import { LINES, SHAPES, TEXT_PRESETS } from "./elements";

type Handlers = {
  save: () => void;
  fit: () => void;
  zoom: (factor: number) => void;
  showShortcuts: () => void;
  setPanning: (on: boolean) => void;
};

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  if (t.tagName === "TEXTAREA") return !t.closest(".canvas-container");
  return t.tagName === "INPUT" || t.tagName === "SELECT";
}

/** Global editor keyboard shortcuts. Copy/cut/paste are handled via clipboard events. */
export function useShortcuts(engine: EditorEngine | null, handlers: Handlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  useEffect(() => {
    if (!engine) return;
    const h = {
      save: () => ref.current.save(),
      fit: () => ref.current.fit(),
      zoom: (f: number) => ref.current.zoom(f),
      showShortcuts: () => ref.current.showShortcuts(),
      setPanning: (on: boolean) => ref.current.setPanning(on),
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || document.querySelector("dialog[open]")) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const editing = engine.isEditingText();

      if (mod && key === "s") {
        e.preventDefault();
        h.save();
        return;
      }
      if (editing) {
        // While typing on the canvas only text-style shortcuts apply.
        const sel = engine.getState().selection?.text;
        if (mod && sel && (key === "b" || key === "i" || key === "u")) {
          e.preventDefault();
          if (key === "b") void engine.updateText({ fontWeight: sel.fontWeight === "bold" ? "normal" : "bold" });
          if (key === "i") void engine.updateText({ fontStyle: sel.fontStyle === "italic" ? "normal" : "italic" });
          if (key === "u") void engine.updateText({ underline: !sel.underline });
        }
        return;
      }

      const { width, height } = engine.size;
      const run = (fn: () => unknown) => {
        e.preventDefault();
        void fn();
      };

      if (mod) {
        if (key === "z" && e.shiftKey) return run(() => engine.redo());
        if (key === "z" || (key === "y" && !e.shiftKey)) return run(() => (key === "y" ? engine.redo() : engine.undo()));
        if (key === "d") return run(() => engine.duplicate());
        if (key === "a") return run(() => engine.selectAll());
        if (key === "g" && e.shiftKey) return run(() => engine.ungroup());
        if (key === "g") return run(() => engine.group());
        if (key === "l" && e.shiftKey) return run(() => engine.toggleLock());
        if (e.key === "]" || e.code === "BracketRight") return run(() => engine.reorder(e.shiftKey ? "front" : "forward"));
        if (e.key === "[" || e.code === "BracketLeft") return run(() => engine.reorder(e.shiftKey ? "back" : "backward"));
        if (key === "=" || key === "+") return run(() => h.zoom(1.25));
        if (key === "-") return run(() => h.zoom(0.8));
        if (key === "0") return run(() => h.fit());
        const sel = engine.getState().selection?.text;
        if (sel && key === "b") return run(() => engine.updateText({ fontWeight: sel.fontWeight === "bold" ? "normal" : "bold" }));
        if (sel && key === "i") return run(() => engine.updateText({ fontStyle: sel.fontStyle === "italic" ? "normal" : "italic" }));
        if (sel && key === "u") return run(() => engine.updateText({ underline: !sel.underline }));
        return;
      }

      if (e.key === " " && !e.repeat) return run(() => h.setPanning(true));
      if (e.key === "Delete" || e.key === "Backspace") return run(() => engine.deleteSelection());
      if (e.key === "Escape") return run(() => engine.deselect());
      if (e.key === "?") return run(() => h.showShortcuts());
      if (e.key === "PageDown") return run(() => engine.gotoPage(engine.activeIndex + 1));
      if (e.key === "PageUp") return run(() => engine.gotoPage(engine.activeIndex - 1));
      if (e.key.startsWith("Arrow") && engine.getState().selection) {
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        return run(() => engine.nudge(dx, dy));
      }
      if (e.altKey) return;
      if (key === "t") return run(() => engine.addSerialized([TEXT_PRESETS[2].build(width, height)]));
      if (key === "r") return run(() => engine.addSerialized([SHAPES[0].build(width, height)]));
      if (key === "c") return run(() => engine.addSerialized([SHAPES[2].build(width, height)]));
      if (key === "l") return run(() => engine.addSerialized([LINES[0].build(width, height)]));
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") h.setPanning(false);
    };
    const onBlur = () => h.setPanning(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [engine]);
}
