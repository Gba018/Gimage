export type SizePreset = { id: string; name: string; width: number; height: number; group: string };

export const SIZE_PRESETS: SizePreset[] = [
  { id: "ig-post", name: "Instagram Post", width: 1080, height: 1080, group: "Social" },
  { id: "ig-story", name: "Instagram Story", width: 1080, height: 1920, group: "Social" },
  { id: "x-post", name: "X / Twitter Post", width: 1600, height: 900, group: "Social" },
  { id: "fb-cover", name: "Facebook Cover", width: 1640, height: 624, group: "Social" },
  { id: "li-banner", name: "LinkedIn Banner", width: 1584, height: 396, group: "Social" },
  { id: "yt-thumb", name: "YouTube Thumbnail", width: 1280, height: 720, group: "Video" },
  { id: "presentation", name: "Presentation (16:9)", width: 1920, height: 1080, group: "Business" },
  { id: "business-card", name: "Business Card", width: 1050, height: 600, group: "Business" },
  { id: "a4", name: "A4 Document", width: 1240, height: 1754, group: "Print" },
  { id: "letter-flyer", name: "Flyer (Letter)", width: 1275, height: 1650, group: "Print" },
  { id: "poster", name: "Poster (18×24)", width: 1800, height: 2400, group: "Print" },
  { id: "logo", name: "Logo", width: 1000, height: 1000, group: "Brand" },
];

export function presetById(id: string): SizePreset | undefined {
  return SIZE_PRESETS.find((p) => p.id === id);
}
