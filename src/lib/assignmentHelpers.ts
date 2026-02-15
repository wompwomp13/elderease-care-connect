/**
 * Shared helpers for creating assignments from service requests.
 * Used by both admin (ServiceRequests) and volunteer (FindRequests) flows.
 */
export const SERVICE_RATES: Record<string, number> = {
  Companionship: 150,
  "Light Housekeeping": 170,
  "Running Errands": 200,
  "Home Visits": 180,
};

export type AdjustmentInfo = { tier: "Associate" | "Proficient" | "Advanced" | "Expert"; percent: number };
export const getDynamicAdjustment = (
  tasksCompleted: number,
  avgRating: number | null | undefined
): AdjustmentInfo => {
  const r = typeof avgRating === "number" ? avgRating : 0;
  if (tasksCompleted >= 40 && r >= 4.6) return { tier: "Expert", percent: 0.12 };
  if (tasksCompleted >= 20 && r >= 4.4) return { tier: "Advanced", percent: 0.08 };
  if (tasksCompleted >= 5 && r >= 4.2) return { tier: "Proficient", percent: 0.05 };
  return { tier: "Associate", percent: 0 };
};

export const genConfirmation = () =>
  `#SR-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

export const toMinutes = (t?: string | null): number | null => {
  if (!t) return null;
  const [h, m] = String(t).split(":").map((x: string) => parseInt(x || "0", 10));
  if (!isFinite(h)) return null;
  return h * 60 + (m || 0);
};

export const hasOverlap = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
) => aStart < bEnd && bStart < aEnd;
