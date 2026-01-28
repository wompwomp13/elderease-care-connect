import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export type ChatVolunteer = {
  id: string;
  fullName: string;
  services: string[];
  avgRating: number | null;
  ratingCount: number;
  tasksCompleted: number;
};

type RawVolunteer = {
  id: string;
  fullName?: string;
  email?: string;
  services?: string[];
  status?: string;
};

const ALLOWED_SERVICE_LABELS: Record<string, string> = {
  companionship: "Companionship",
  housekeeping: "Light Housekeeping",
  errands: "Running Errands",
  visits: "Home Visits",
};

const toServiceId = (
  nameOrId: string
): keyof typeof ALLOWED_SERVICE_LABELS | "unknown" => {
  const v = (nameOrId || "").toLowerCase();
  if (v.includes("companionship")) return "companionship";
  if (v.includes("housekeeping")) return "housekeeping";
  if (v.includes("errand")) return "errands";
  if (v.includes("visit")) return "visits";
  return "unknown";
};

const normalizeServices = (services: string[] | undefined | null): string[] => {
  const set = new Set<string>();
  for (const s of services || []) {
    const id = toServiceId(s);
    if (id !== "unknown") set.add(ALLOWED_SERVICE_LABELS[id]);
  }
  return Array.from(set);
};

export const useChatVolunteers = () => {
  const [baseVolunteers, setBaseVolunteers] = useState<RawVolunteer[]>([]);
  const [ratingsMap, setRatingsMap] = useState<
    Record<string, { sum: number; count: number }>
  >({});
  const [tasksMap, setTasksMap] = useState<Record<string, number>>({});

  // Approved volunteers from pendingVolunteers (public, status == approved)
  useEffect(() => {
    const q = query(
      collection(db, "pendingVolunteers"),
      where("status", "==", "approved")
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows: RawVolunteer[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          fullName: data.fullName,
          email: data.email,
          services: Array.isArray(data.services) ? data.services : [],
          status: data.status,
        };
      });
      setBaseVolunteers(rows);
    });
    return () => unsub();
  }, []);

  // Ratings aggregation (by volunteer email)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "ratings"), (snap) => {
      const map: Record<string, { sum: number; count: number }> = {};
      snap.docs.forEach((d) => {
        const r = d.data() as any;
        const email = (r.volunteerEmail || "").toLowerCase();
        const val = Number(r.rating) || 0;
        if (!email || val <= 0) return;
        if (!map[email]) map[email] = { sum: 0, count: 0 };
        map[email].sum += val;
        map[email].count += 1;
      });
      setRatingsMap(map);
    });
    return () => unsub();
  }, []);

  // Completed tasks (guardianConfirmed) per volunteer email
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "assignments"), (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const a = d.data() as any;
        if (!(a.status === "completed" && a.guardianConfirmed === true))
          return;
        const email = (a.volunteerEmail || "").toLowerCase();
        if (!email) return;
        counts[email] = (counts[email] || 0) + 1;
      });
      setTasksMap(counts);
    });
    return () => unsub();
  }, []);

  const volunteers: ChatVolunteer[] = useMemo(() => {
    if (!baseVolunteers.length) return [];
    return baseVolunteers.map((v) => {
      const emailKey = (v.email || "").toLowerCase();
      const ratingAgg = ratingsMap[emailKey];
      const tasks = tasksMap[emailKey] ?? 0;
      const services = normalizeServices(v.services || []);
      return {
        id: v.id,
        fullName: v.fullName || "Volunteer",
        services,
        avgRating: ratingAgg ? ratingAgg.sum / ratingAgg.count : null,
        ratingCount: ratingAgg?.count ?? 0,
        tasksCompleted: tasks,
      };
    });
  }, [baseVolunteers, ratingsMap, tasksMap]);

  return volunteers;
};

