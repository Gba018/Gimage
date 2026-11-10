import { z } from "zod";
import { designDocSchema } from "@/lib/design/types";
import { FONTS, type FontFamily } from "@/lib/design/fonts";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email").max(254);

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

export const emailRequestSchema = z.object({ email: emailSchema, purpose: z.enum(["verify", "reset"]) });
export const emailConsumeSchema = z.discriminatedUnion("purpose", [
  z.object({ purpose: z.literal("verify"), token: z.string().max(200) }),
  z.object({ purpose: z.literal("reset"), token: z.string().max(200), password: signupSchema.shape.password }),
]);

export const titleSchema = z.string().trim().min(1).max(120);

// Thumbnails are small JPEG/PNG previews produced client-side.
export const thumbnailSchema = z
  .string()
  .max(400_000)
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Invalid thumbnail");

export const createDesignSchema = z.object({
  title: titleSchema.optional(),
  doc: designDocSchema,
  workspaceId: z.uuid().optional(),
});

export const patchDesignSchema = z.object({
  title: titleSchema.optional(),
  favourite: z.boolean().optional(),
  folderId: z.uuid().nullable().optional(),
  doc: designDocSchema.optional(),
  thumbnail: thumbnailSchema.nullable().optional(),
  /** The document revision the client's edits are based on; enables conflict detection. */
  baseRevision: z.number().int().nonnegative().optional(),
});

export const folderSchema = z.object({ name: z.string().trim().min(1).max(80) });
export const brandKitSchema = z.object({
  colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(12),
  fontFamily: z.enum(FONTS.map((font) => font.family) as [FontFamily, ...FontFamily[]]),
  logoUploadId: z.string().max(100).nullable(),
});
export const commentSchema = z.object({
  authorName: z.string().trim().min(1).max(60),
  body: z.string().trim().min(1).max(2000),
  pageIndex: z.number().int().min(0).max(100),
});

export const createVersionSchema = z.object({
  label: z.string().trim().max(80).optional(),
});

export const MAX_DOC_BYTES = 8_000_000;
