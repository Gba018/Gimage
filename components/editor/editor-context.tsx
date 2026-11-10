"use client";

import { createContext, useContext } from "react";
import type { EditorEngine, EngineState } from "./engine";

export type EditorContextValue = {
  engine: EditorEngine;
  state: EngineState;
  designId: string;
  notify: (message: string, tone?: "info" | "error") => void;
};

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside the editor");
  return ctx;
}
