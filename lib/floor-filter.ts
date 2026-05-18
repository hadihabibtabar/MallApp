const FLOOR_LEVELS = [-1, 0, 1, 2, 3, 4] as const;

export type FloorLevel = (typeof FLOOR_LEVELS)[number];
export type FloorFilterValue = FloorLevel | "all";

function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function getFloorLabel(level: FloorLevel): string {
  if (level === -1) {
    return "طبقه -۱";
  }

  if (level === 0) {
    return "طبقه همکف";
  }

  if (level === 1) {
    return "طبقه ۱";
  }
  if (level === 2) {
    return "طبقه ۲";
  }
  if (level === 3) {
    return "طبقه ۳";
  }
  return "طبقه ۴";
}

export function parseStoreFloorToLevel(floorText: string): FloorLevel | null {
  if (!floorText) {
    return null;
  }

  if (floorText.includes("همکف")) {
    return 0;
  }

  const normalized = normalizeDigits(floorText);
  const match = normalized.match(/-?\d+/);

  if (!match) {
    return null;
  }

  const level = Number(match[0]);

  if (!FLOOR_LEVELS.includes(level as FloorLevel)) {
    return null;
  }

  return level as FloorLevel;
}

export { FLOOR_LEVELS };
