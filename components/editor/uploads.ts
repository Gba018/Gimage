"use client";

import { api } from "@/lib/api-client";

export type Upload = { id: string; name: string; mime: string; size: number; width: number | null; height: number | null; url: string; createdAt: number };

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const MAX_UPLOAD_MB = 10;

type Listener = (upload: Upload) => void;
const listeners = new Set<Listener>();

/** Lets the uploads panel refresh when an image is uploaded via drop or paste. */
export function onUploaded(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function uploadImage(file: File): Promise<Upload> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error(`${file.name}: only PNG, JPEG, WebP and GIF are supported`);
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`${file.name} is larger than ${MAX_UPLOAD_MB} MB`);
  const form = new FormData();
  form.append("file", file);
  const { upload } = await api<{ upload: Upload }>("/api/uploads", { method: "POST", body: form });
  for (const l of listeners) l(upload);
  return upload;
}
