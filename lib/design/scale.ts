import type { SerializedObject } from "./types";

/**
 * Scales center-origin objects from one canvas size to another, preserving
 * aspect ratio and keeping content centred on the new canvas.
 */
export function scaleObjects(objects: SerializedObject[], from: { width: number; height: number }, to: { width: number; height: number }): SerializedObject[] {
  const s = Math.min(to.width / from.width, to.height / from.height);
  return objects.map((o) => ({
    ...o,
    left: ((Number(o.left) || 0) - from.width / 2) * s + to.width / 2,
    top: ((Number(o.top) || 0) - from.height / 2) * s + to.height / 2,
    scaleX: (Number(o.scaleX) || 1) * s,
    scaleY: (Number(o.scaleY) || 1) * s,
  }));
}
