export type Meridiem = "AM" | "PM";

export type TimeParts = {
  hour12: number; // 1-12
  minute: number; // 0-59
  meridiem: Meridiem;
};

export const clampNumber = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export const getPartsFrom24h = (time24h?: string | null): TimeParts => {
  if (!time24h) return { hour12: 9, minute: 0, meridiem: "AM" };
  const [hStr, mStr] = time24h.split(":");
  const hour24 = clampNumber(parseInt(hStr, 10), 0, 23);
  const minute = clampNumber(parseInt(mStr ?? "0", 10), 0, 59);
  const meridiem: Meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12Raw = hour24 % 12;
  const hour12 = hour12Raw === 0 ? 12 : hour12Raw;
  return { hour12, minute, meridiem };
};

export const partsTo24h = (parts: TimeParts): string => {
  const hour12 = clampNumber(parts.hour12, 1, 12);
  const minute = clampNumber(parts.minute, 0, 59);
  const isPM = parts.meridiem === "PM";
  const hour24 = (hour12 % 12) + (isPM ? 12 : 0);
  const h = String(hour24).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return `${h}:${m}`;
};

export const format12h = (time24h?: string | null): string => {
  if (!time24h) return "";
  const { hour12, minute, meridiem } = getPartsFrom24h(time24h);
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
};

export const minutesSinceMidnight = (time24h?: string | null): number => {
  if (!time24h) return -1;
  const [hStr, mStr] = time24h.split(":");
  const h = clampNumber(parseInt(hStr, 10), 0, 23);
  const m = clampNumber(parseInt(mStr ?? "0", 10), 0, 59);
  return h * 60 + m;
};

export const isEndAfterStart = (start?: string | null, end?: string | null): boolean => {
  if (!start || !end) return false;
  return minutesSinceMidnight(end) > minutesSinceMidnight(start);
};


