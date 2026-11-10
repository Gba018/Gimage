import "server-only";
import { execute, queryOne } from "./db";
import { FONTS, type FontFamily } from "@/lib/design/fonts";

export type BrandKit = { colors: string[]; fontFamily: FontFamily; logoUploadId: string | null; logoUrl: string | null };

type BrandKitRow = { colors: string[]; font_family: FontFamily | null; logo_upload_id: string | null };

export async function getBrandKit(userId: string): Promise<BrandKit> {
  const row = await queryOne<BrandKitRow>("SELECT colors, font_family, logo_upload_id FROM brand_kits WHERE user_id = $1", [userId]);
  const logoUploadId = row?.logo_upload_id ?? null;
  return { colors: row?.colors ?? [], fontFamily: row?.font_family ?? "Inter", logoUploadId, logoUrl: logoUploadId ? `/api/uploads/${logoUploadId}` : null };
}

export async function saveBrandKit(userId: string, kit: { colors: string[]; fontFamily: FontFamily; logoUploadId: string | null }): Promise<BrandKit | null> {
  if (!FONTS.some((font) => font.family === kit.fontFamily)) return null;
  if (kit.logoUploadId) {
    const owned = await queryOne("SELECT 1 FROM uploads WHERE id = $1 AND owner_id = $2", [kit.logoUploadId, userId]);
    if (!owned) return null;
  }
  await execute(
    `INSERT INTO brand_kits (user_id, colors, font_family, logo_upload_id, updated_at) VALUES ($1, $2::jsonb, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET colors = EXCLUDED.colors, font_family = EXCLUDED.font_family,
       logo_upload_id = EXCLUDED.logo_upload_id, updated_at = EXCLUDED.updated_at`,
    [userId, JSON.stringify(kit.colors), kit.fontFamily, kit.logoUploadId, Date.now()],
  );
  return getBrandKit(userId);
}
