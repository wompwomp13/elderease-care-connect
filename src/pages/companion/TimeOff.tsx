import { useEffect, useMemo, useState } from "react";
import { CompanionNavbar } from "@/components/companion/CompanionNavbar";
import { subscribeToAuth, type AuthProfile } from "@/lib/auth";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarOff, Loader2, Trash2 } from "lucide-react";
import { format, parse } from "date-fns";
import {
  MAX_LEAVE_RANGE_DAYS,
  assignmentBlocksVolunteerLeave,
  getAssignmentServiceDayMs,
  normalizeDayMs,
  parseLeaveDoc,
  type VolunteerLeaveDoc,
} from "@/lib/volunteer-leave";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TimeOff = () => {
  const { toast } = useToast();
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [volunteerDocId, setVolunteerDocId] = useState<string | null>(null);
  const [volunteerProfile, setVolunteerProfile] = useState<{ id: string; email?: string } | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [leaveRows, setLeaveRows] = useState<VolunteerLeaveDoc[]>([]);
  const [saving, setSaving] = useState(false);
  const [fromStr, setFromStr] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [toStr, setToStr] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState<string>("vacation");
  const [note, setNote] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuth((p: AuthProfile | null) => {
      setAuthEmail(p?.email?.toLowerCase?.() ?? null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authEmail) {
      setVolunteerDocId(null);
      setVolunteerProfile(null);
      return;
    }
    const q = query(
      collection(db, "pendingVolunteers"),
      where("email", "==", authEmail),
      where("status", "==", "approved"),
      limit(1)
    );
    return onSnapshot(q, (snap) => {
      if (snap.empty) {
        setVolunteerDocId(null);
        setVolunteerProfile(null);
      } else {
        const d = snap.docs[0];
        const data = d.data() as { email?: string };
        setVolunteerDocId(d.id);
        setVolunteerProfile({ id: d.id, email: data.email });
      }
    });
  }, [authEmail]);

  /** Match assignment docs: use profile email as stored in Firestore (case-sensitive query), else auth. */
  const assignmentQueryEmail = (volunteerProfile?.email?.trim() || authEmail || "").trim() || null;

  useEffect(() => {
    if (!assignmentQueryEmail) {
      setAssignments([]);
      return;
    }
    const q = query(collection(db, "assignments"), where("volunteerEmail", "==", assignmentQueryEmail));
    return onSnapshot(q, (snap) => {
      setAssignments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, [assignmentQueryEmail]);

  useEffect(() => {
    if (!authEmail) {
      setLeaveRows([]);
      return;
    }
    const q = query(collection(db, "volunteerLeave"), where("volunteerEmail", "==", authEmail));
    return onSnapshot(q, (snap) => {
      const rows: VolunteerLeaveDoc[] = [];
      snap.docs.forEach((d) => {
        const parsed = parseLeaveDoc(d.id, d.data() as Record<string, unknown>);
        if (parsed) rows.push(parsed);
      });
      rows.sort((a, b) => b.startDayMs - a.startDayMs);
      setLeaveRows(rows);
    });
  }, [authEmail]);

  const tokenEmail = authEmail;

  const conflictingAssignments = useMemo(() => {
    if (!fromStr || !toStr) return [];
    const start = normalizeDayMs(parse(fromStr, "yyyy-MM-dd", new Date()));
    const end = normalizeDayMs(parse(toStr, "yyyy-MM-dd", new Date()));
    if (start > end) return [];
    return assignments.filter((a) => {
      if (!assignmentBlocksVolunteerLeave(a)) return false;
      const ts = getAssignmentServiceDayMs(a);
      if (!ts) return false;
      return ts >= start && ts <= end;
    });
  }, [assignments, fromStr, toStr]);

  const handleSave = async () => {
    if (!volunteerDocId || !tokenEmail) {
      toast({
        title: "Profile not found",
        description: "Only approved volunteers can add time off.",
        variant: "destructive",
      });
      return;
    }
    const todayStart = normalizeDayMs(new Date());
    const start = normalizeDayMs(parse(fromStr, "yyyy-MM-dd", new Date()));
    const end = normalizeDayMs(parse(toStr, "yyyy-MM-dd", new Date()));
    if (start < todayStart || end < todayStart) {
      toast({
        title: "Invalid dates",
        description: "You can only add time off from today onward.",
        variant: "destructive",
      });
      return;
    }
    if (start > end) {
      toast({ title: "Invalid range", description: "Start must be on or before end.", variant: "destructive" });
      return;
    }
    const spanDays = Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
    if (spanDays > MAX_LEAVE_RANGE_DAYS) {
      toast({
        title: "Range too long",
        description: `Time off is limited to ${MAX_LEAVE_RANGE_DAYS} days at a time.`,
        variant: "destructive",
      });
      return;
    }
    if (conflictingAssignments.length > 0) {
      const days = conflictingAssignments
        .map((a) => format(new Date(getAssignmentServiceDayMs(a)), "MMM d, yyyy"))
        .join(", ");
      toast({
        title: "Accepted visits in this period",
        description: `You have ${conflictingAssignments.length} accepted visit(s) on: ${days}. Reschedule or complete them first, or shorten your time off. Unaccepted admin assignments are listed under Find Requests, not here.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        volunteerDocId,
        volunteerEmail: tokenEmail,
        startDayMs: start,
        endDayMs: end,
        reason: reason || "other",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const trimmedNote = note.trim();
      if (trimmedNote) payload.note = trimmedNote;
      await addDoc(collection(db, "volunteerLeave"), payload);
      toast({ title: "Time off saved", description: "You won’t receive new bookings on those days." });
      setNote("");
    } catch (e: any) {
      toast({
        title: "Could not save",
        description: e?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "volunteerLeave", id));
      toast({ title: "Time off removed" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const todayStart = normalizeDayMs(new Date());
  const todayInputStr = format(new Date(), "yyyy-MM-dd");
  const toInputMin = fromStr >= todayInputStr ? fromStr : todayInputStr;

  const onFromDateChange = (value: string) => {
    let next = value;
    if (next < todayInputStr) next = todayInputStr;
    setFromStr(next);
    setToStr((prev) => (prev < next ? next : prev));
  };

  const onToDateChange = (value: string) => {
    let next = value;
    if (next < toInputMin) next = toInputMin;
    setToStr(next);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <CompanionNavbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <CalendarOff className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Time off</h1>
            <p className="text-sm text-muted-foreground">
              Mark full days when you need a break from visits. Those dates stay clear of new bookings—we won’t match you
              with family requests or admin assignments then, so your time off is protected.
            </p>
          </div>
        </div>

        {!volunteerDocId && authEmail ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No approved volunteer profile found for this account.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Add dates</CardTitle>
                <CardDescription>Inclusive range · local calendar days · max {MAX_LEAVE_RANGE_DAYS} days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="leave-from">From</Label>
                    <Input
                      id="leave-from"
                      type="date"
                      min={todayInputStr}
                      value={fromStr}
                      onChange={(e) => onFromDateChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leave-to">To</Label>
                    <Input
                      id="leave-to"
                      type="date"
                      min={toInputMin}
                      value={toStr}
                      onChange={(e) => onToDateChange(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="sick">Sick / medical</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leave-note">Note (optional)</Label>
                  <Input
                    id="leave-note"
                    placeholder="Short note for your records"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                {conflictingAssignments.length > 0 && (
                  <div className="text-sm text-destructive space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="font-medium">
                      {conflictingAssignments.length} accepted visit(s) already on{" "}
                      {conflictingAssignments.map((a) => format(new Date(getAssignmentServiceDayMs(a)), "MMM d, yyyy")).join(", ")}.
                    </p>
                    <p className="text-xs text-destructive/90">
                      Only visits you&apos;ve accepted (shown in My Assignments) block time off. Pending offers appear under Find
                      Requests.
                    </p>
                  </div>
                )}
                <Button onClick={() => void handleSave()} disabled={saving || !volunteerDocId}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    "Save time off"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your periods</CardTitle>
                <CardDescription>Delete a row to open those days again.</CardDescription>
              </CardHeader>
              <CardContent>
                {leaveRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No time off recorded yet.</p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {leaveRows.map((row) => {
                      const past = row.endDayMs < todayStart;
                      const start = new Date(row.startDayMs);
                      const end = new Date(row.endDayMs);
                      return (
                        <li
                          key={row.id}
                          className="flex items-center justify-between gap-3 px-3 py-3 text-sm"
                        >
                          <div>
                            <div className="font-medium">
                              {format(start, "MMM d, yyyy")} – {format(end, "MMM d, yyyy")}
                            </div>
                            <div className="text-muted-foreground text-xs capitalize">
                              {row.reason?.replace(/_/g, " ") || "—"}
                              {row.note ? ` · ${row.note}` : ""}
                              {past ? " · ended" : ""}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive shrink-0"
                            aria-label="Remove time off"
                            onClick={() => setDeleteId(row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this time off?</AlertDialogTitle>
            <AlertDialogDescription>
              Those dates will show you as available again for scheduling (subject to existing bookings).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && void handleDelete(deleteId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TimeOff;
