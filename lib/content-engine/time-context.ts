export type TimeContext = "morning" | "lunch" | "afternoon" | "evening";

export function getCurrentTimeContext(now: Date = new Date()): TimeContext {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const minutesSinceMidnight = hour * 60 + minute;

  if (minutesSinceMidnight >= 8 * 60 && minutesSinceMidnight < 12 * 60) {
    return "morning";
  }

  if (minutesSinceMidnight >= 12 * 60 && minutesSinceMidnight < 15 * 60) {
    return "lunch";
  }

  if (minutesSinceMidnight >= 15 * 60 && minutesSinceMidnight < 18 * 60) {
    return "afternoon";
  }

  return "evening";
}
