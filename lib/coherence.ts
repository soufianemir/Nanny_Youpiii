export const EXCEPTION_SHIFT_NOTE = "__NANNY_EXCEPTION__";

export function allChildrenAllowed(allowedIds: string[], linkedIds: string[]) {
  if (!linkedIds.length) return true;
  const allowed = new Set(allowedIds);
  return linkedIds.every(id => allowed.has(id));
}

export function isTimeWithinWindow(start: string, end: string | null | undefined, windowStart: string, windowEnd: string) {
  const effectiveEnd = end || start;
  return start >= windowStart && effectiveEnd <= windowEnd && effectiveEnd >= start;
}

export function sectionDate(section: string, selectedDate: string, todayIso: string) {
  return section === "planning" ? selectedDate : todayIso;
}

export function canSeeCashFromPermissions(shopping: boolean, cash: boolean) {
  return shopping || cash;
}

export function localDateTime(date: string, time: string | null | undefined) {
  if (!time) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}
