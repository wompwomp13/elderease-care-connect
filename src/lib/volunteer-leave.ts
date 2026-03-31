/**
 * Volunteer leave (full-day unavailability) helpers.
 * Day boundaries match elder RequestService: local midnight via Date(y, m, d).
 */

export const MAX_LEAVE_RANGE_DAYS = 60;

/** Calendar day start in local time, same convention as serviceDateTS on requests. */
export function normalizeDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Inclusive range on day granularity: startDayMs and endDayMs are both midnight timestamps. */
export function leaveRangeOverlapsDay(startDayMs: number, endDayMs: number, dayMs: number): boolean {
  return startDayMs <= dayMs && dayMs <= endDayMs;
}

/** Minutes from midnight; full day blocks any assignment time on that calendar day. */
export function fullDayBusyInterval(): [number, number] {
  return [0, 24 * 60];
}

export type BusyByEmail = Record<string, Array<[number, number]>>;

export function mergeLeaveEmailsIntoBusyMap(busyByEmail: BusyByEmail, emailsOnLeave: Iterable<string>): void {
  const [a, b] = fullDayBusyInterval();
  for (const raw of emailsOnLeave) {
    const key = raw.toLowerCase().trim();
    if (!key) continue;
    if (!busyByEmail[key]) busyByEmail[key] = [];
    busyByEmail[key].push([a, b]);
  }
}

export type VolunteerLeaveDoc = {
  id: string;
  volunteerDocId: string;
  volunteerEmail: string;
  startDayMs: number;
  endDayMs: number;
  reason?: string;
  note?: string;
};

export function parseLeaveDoc(id: string, data: Record<string, unknown>): VolunteerLeaveDoc | null {
  const volunteerDocId = typeof data.volunteerDocId === "string" ? data.volunteerDocId : "";
  const volunteerEmail = typeof data.volunteerEmail === "string" ? data.volunteerEmail : "";
  const startDayMs = typeof data.startDayMs === "number" ? data.startDayMs : NaN;
  const endDayMs = typeof data.endDayMs === "number" ? data.endDayMs : NaN;
  if (!volunteerDocId || !volunteerEmail || !Number.isFinite(startDayMs) || !Number.isFinite(endDayMs)) return null;
  return {
    id,
    volunteerDocId,
    volunteerEmail,
    startDayMs,
    endDayMs,
    reason: typeof data.reason === "string" ? data.reason : undefined,
    note: typeof data.note === "string" ? data.note : undefined,
  };
}

/** True if dayMs falls inside any leave period (inclusive). */
export function isDayCoveredByLeave(dayMs: number, leaves: Iterable<{ startDayMs: number; endDayMs: number }>): boolean {
  for (const L of leaves) {
    if (leaveRangeOverlapsDay(L.startDayMs, L.endDayMs, dayMs)) return true;
  }
  return false;
}

/**
 * Firestore query `where("endDayMs", ">=", dayMs)` plus this filter yields the same overlap set as
 * `startDayMs <= dayMs && endDayMs >= dayMs` without requiring a composite index on (startDayMs, endDayMs).
 */
export function leaveDocOverlapsCalendarDay(
  data: Record<string, unknown>,
  dayMs: number
): { volunteerEmail: string; startDayMs: number; endDayMs: number } | null {
  const parsed = parseLeaveDoc("", data);
  if (!parsed) return null;
  if (!leaveRangeOverlapsDay(parsed.startDayMs, parsed.endDayMs, dayMs)) return null;
  return {
    volunteerEmail: parsed.volunteerEmail,
    startDayMs: parsed.startDayMs,
    endDayMs: parsed.endDayMs,
  };
}

/** Normalize assignment service day to ms (number or Firestore Timestamp). */
export function getAssignmentServiceDayMs(a: {
  serviceDateTS?: number | { toMillis?: () => number } | null;
}): number {
  const t = a.serviceDateTS;
  if (typeof t === "number" && Number.isFinite(t)) return t;
  if (t != null && typeof t === "object" && typeof (t as { toMillis?: () => number }).toMillis === "function") {
    const ms = (t as { toMillis: () => number }).toMillis();
    return typeof ms === "number" && Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

/**
 * True if saving time off on this assignment's service day should be blocked.
 * Matches what volunteers see under My Assignments: accepted work only — not admin-assigned
 * rows still waiting for acceptance (those live under Find Requests). Fully completed and
 * guardian-confirmed visits are excluded so historical work doesn't block PTO ranges.
 */
export function assignmentBlocksVolunteerLeave(a: {
  status?: string;
  acceptedByVolunteer?: boolean;
  guardianConfirmed?: boolean;
}): boolean {
  const st = (a.status || "").toLowerCase();
  if (st === "cancelled" || st === "declined") return false;
  if (a.acceptedByVolunteer !== true) return false;
  if (st === "completed" && a.guardianConfirmed === true) return false;
  return true;
}
