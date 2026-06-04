function hashString(value: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDailySeed(date: Date = new Date()): number {
  return hashString(getLocalDateKey(date));
}

export function getSeededBoost(id: string, date: Date = new Date()): number {
  const hash = hashString(`${getDailySeed(date)}:${id}`);

  return hash % 25;
}
