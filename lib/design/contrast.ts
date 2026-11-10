export type Rgb = [number, number, number];

/** Only opaque solid colors can be assessed without guessing image/gradient content. */
export function solidRgb(color: unknown): Rgb | null {
  if (typeof color !== "string") return null;
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color);
  if (hex) {
    const value = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as Rgb;
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(1(?:\.0*)?))?\s*\)$/i.exec(color);
  if (rgb) {
    const values = rgb.slice(1, 4).map(Number) as Rgb;
    if (values.every((v) => v <= 255)) return values;
  }
  const named: Record<string, Rgb> = { black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0], blue: [0, 0, 255], yellow: [255, 255, 0] };
  return named[color.toLowerCase()] ?? null;
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const luminance = (rgb: Rgb) => rgb.map((n) => { const c = n / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
