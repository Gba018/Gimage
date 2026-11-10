/** Fonts bundled locally through @fontsource (see app/fonts.css). */
export const FONTS = [
  { family: "Inter", category: "Sans serif" },
  { family: "Poppins", category: "Sans serif" },
  { family: "Montserrat", category: "Sans serif" },
  { family: "Space Grotesk", category: "Sans serif" },
  { family: "Oswald", category: "Display" },
  { family: "Bebas Neue", category: "Display" },
  { family: "Playfair Display", category: "Serif" },
  { family: "Roboto Slab", category: "Serif" },
  { family: "Lobster", category: "Script" },
  { family: "Dancing Script", category: "Script" },
] as const;

export type FontFamily = (typeof FONTS)[number]["family"];

export const DEFAULT_FONT: FontFamily = "Inter";

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 88, 96, 120, 144, 180, 220];

/** Waits for the given families to be usable by canvas text rendering. */
export async function loadFonts(families: Iterable<string>): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const loads: Promise<unknown>[] = [];
  for (const family of new Set(families)) {
    for (const weight of ["400", "700"]) loads.push(document.fonts.load(`${weight} 32px "${family}"`).catch(() => undefined));
  }
  await Promise.all(loads);
}
