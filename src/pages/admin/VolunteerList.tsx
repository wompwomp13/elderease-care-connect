import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { IdDocumentView } from "@/components/IdDocumentView";
import { VolunteerAvatar } from "@/components/VolunteerAvatar";

type Volunteer = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  services?: string[];
  gender?: string | null;
  status: "approved" | "pending" | "terminated";
  idFileUrl?: string | null;
  idFileName?: string | null;
  profilePhotoUrl?: string | null;
};

const SERVICE_OPTIONS = [
  { id: "companionship", label: "Companionship" },
  { id: "housekeeping", label: "Light Housekeeping" },
  { id: "errands", label: "Running Errands" },
  { id: "visits", label: "Home Visits" },
];

const VolunteerList = () => {
  const { toast } = useToast();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, { sum: number; count: number }>>({});
  const [tasksMap, setTasksMap] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<"approved" | "terminated" | "all">("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    | "name_asc"
    | "name_desc"
    | "email_asc"
    | "email_desc"
    | "rating_desc"
    | "rating_asc"
    | "completed_desc"
    | "completed_asc"
  >("name_asc");
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const [editing, setEditing] = useState<Volunteer | null>(null);
  const [form, setForm] = useState<{ fullName: string; phone: string; address: string; services: string[]; gender: string }>({
    fullName: "",
    phone: "",
    address: "",
    services: [],
    gender: "",
  });
  const [terminateTarget, setTerminateTarget] = useState<Volunteer | null>(null);
  const [terminationReason, setTerminationReason] = useState("");
  const [reactivateTarget, setReactivateTarget] = useState<Volunteer | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Allowed service catalog (normalized)
  const ALLOWED_SERVICE_LABELS: Record<string, string> = {
    companionship: "Companionship",
    housekeeping: "Light Housekeeping",
    errands: "Running Errands",
    visits: "Home Visits",
  };
  const toServiceId = (nameOrId: string): keyof typeof ALLOWED_SERVICE_LABELS | "unknown" => {
    const v = (nameOrId || "").toLowerCase();
    if (v.includes("companionship")) return "companionship";
    if (v.includes("housekeeping")) return "housekeeping";
    if (v.includes("errand")) return "errands";
    if (v.includes("visit")) return "visits";
    return "unknown";
  };
  const normalizeServices = (services: string[]): string[] => {
    const set = new Set<string>();
    for (const s of services || []) {
      const id = toServiceId(s);
      if (id !== "unknown") set.add(ALLOWED_SERVICE_LABELS[id]);
    }
    return Array.from(set);
  };
  const normalizePHPhone = (input: string): string | null => {
    const digits = (input || "").replace(/\D+/g, "");
    if (digits.startsWith("639") && digits.length === 12) return `+${digits}`;
    if (digits.startsWith("09") && digits.length === 11) return `+63${digits.slice(1)}`;
    if (digits.startsWith("9") && digits.length === 10) return `+63${digits}`;
    if (digits.startsWith("63") && digits.length === 12) return `+${digits}`;
    return null;
  };

  // Load volunteers (from pendingVolunteers where status approved/terminated)
  useEffect(() => {
    const q = filter === "all"
      ? query(collection(db, "pendingVolunteers"))
      : query(collection(db, "pendingVolunteers"), where("status", "in", filter === "approved" ? ["approved"] : ["terminated"]));
    const unsub = onSnapshot(q, (snap) => {
      setVolunteers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [filter]);

  // Ratings map (by volunteer email)
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

  // Completed tasks count (guardianConfirmed)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "assignments"), (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const a = d.data() as any;
        if (!(a.status === "completed" && a.guardianConfirmed === true)) return;
        const email = (a.volunteerEmail || "").toLowerCase();
        if (!email) return;
        counts[email] = (counts[email] || 0) + 1;
      });
      setTasksMap(counts);
    });
    return () => unsub();
  }, []);

  const formatPH = (phone?: string | null): string => {
    if (!phone) return "—";
    const raw = phone.trim();
    if (raw.startsWith("+63")) return raw;
    const digits = raw.replace(/\D+/g, "");
    if (digits.startsWith("639") && digits.length === 12) return `+${digits}`;
    if (digits.startsWith("09") && digits.length === 11) return `+63${digits.slice(1)}`;
    if (digits.startsWith("9") && digits.length === 10) return `+63${digits}`;
    return raw;
  };

  const openEdit = (v: Volunteer) => {
    setEditing(v);
    setPhoneError(null);
    setForm({
      fullName: v.fullName || "",
      phone: v.phone || "",
      address: v.address || "",
      services: Array.isArray(v.services) ? normalizeServices(v.services) : [],
      gender: v.gender || "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const normalizedPhone = normalizePHPhone(form.phone);
      if (!normalizedPhone) {
        setPhoneError("Please use +63 9XXXXXXXXX");
        toast({ title: "Invalid Philippine phone number", description: "Use +63 9XXXXXXXXX or 09XXXXXXXXX", variant: "destructive" });
        return;
      }
      const normalizedServices = normalizeServices(form.services);

      await updateDoc(doc(db, "pendingVolunteers", editing.id), {
        fullName: form.fullName.trim(),
        phone: normalizedPhone,
        address: form.address.trim(),
        services: normalizedServices,
        gender: form.gender || null,
        updatedAt: serverTimestamp(),
      });
      // Also update matching users profile (by email) so all pages reflect edits
      if (editing.email) {
        const uq = query(collection(db, "users"), where("email", "==", editing.email.toLowerCase()));
        const usnap = await getDocs(uq);
        for (const udoc of usnap.docs) {
          await updateDoc(doc(db, "users", udoc.id), {
            displayName: form.fullName.trim(),
            phone: normalizedPhone,
            address: form.address.trim(),
            services: normalizedServices,
            gender: form.gender || null,
            updatedAt: serverTimestamp(),
          });
        }
      }
      toast({ title: "Volunteer updated." });
      setEditing(null);
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const terminateVolunteer = async (v: Volunteer, reason: string) => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast({ title: "Please provide a reason for termination", variant: "destructive" });
      return;
    }
    try {
      await updateDoc(doc(db, "pendingVolunteers", v.id), {
        status: "terminated",
        terminationReason: trimmed,
        decidedAt: serverTimestamp(),
      });
      // Also set matching users.status = 'terminated' and terminationReason by email
      if (v.email) {
        const uq = query(collection(db, "users"), where("email", "==", v.email.toLowerCase()));
        const usnap = await getDocs(uq);
        for (const udoc of usnap.docs) {
          await updateDoc(doc(db, "users", udoc.id), {
            status: "terminated",
            terminationReason: trimmed,
            updatedAt: serverTimestamp(),
          });
        }
      }
      toast({ title: "Volunteer terminated." });
    } catch (e: any) {
      toast({ title: "Terminate failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const reactivateVolunteer = async (v: Volunteer) => {
    try {
      await updateDoc(doc(db, "pendingVolunteers", v.id), { status: "approved", terminationReason: null, decidedAt: serverTimestamp() });
      // Also set matching users.status = 'approved' and clear terminationReason by email
      if (v.email) {
        const uq = query(collection(db, "users"), where("email", "==", v.email.toLowerCase()));
        const usnap = await getDocs(uq);
        for (const udoc of usnap.docs) {
          await updateDoc(doc(db, "users", udoc.id), { status: "approved", terminationReason: null, updatedAt: serverTimestamp() });
        }
      }
      toast({ title: "Volunteer reactivated." });
    } catch (e: any) {
      toast({ title: "Reactivate failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const getFamilyName = (fullName?: string | null): string => {
    const name = (fullName || "").trim();
    if (!name) return "";
    const parts = name.split(/\s+/);
    return parts[parts.length - 1]?.toLowerCase() || "";
  };

  const getAvg = (email?: string) => {
    const r = ratingsMap[(email || "").toLowerCase()];
    return r ? r.sum / r.count : null;
  };

  const getTasks = (email?: string) => {
    return tasksMap[(email || "").toLowerCase()] || 0;
  };

  const list = useMemo(() => {
    let rows = volunteers.slice();
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      rows = rows.filter((v) => {
        const services = Array.isArray(v.services) ? v.services.join(", ") : (v.services ?? "");
        return [
          v.fullName || "",
          v.email || "",
          services,
        ]
          .some((val) => String(val).toLowerCase().includes(term));
      });
    }

    if (serviceFilters.length > 0) {
      rows = rows.filter((v) => {
        const services = Array.isArray(v.services) ? v.services : [];
        if (!services.length) return false;
        return serviceFilters.some((s) =>
          services.some((vs) => vs.toLowerCase().includes(s.toLowerCase()))
        );
      });
    }

    rows.sort((a, b) => {
      switch (sortBy) {
        case "name_asc": {
          const fa = getFamilyName(a.fullName);
          const fb = getFamilyName(b.fullName);
          if (fa !== fb) return fa.localeCompare(fb);
          return (a.fullName || "").localeCompare(b.fullName || "");
        }
        case "name_desc": {
          const fa = getFamilyName(a.fullName);
          const fb = getFamilyName(b.fullName);
          if (fa !== fb) return fb.localeCompare(fa);
          return (b.fullName || "").localeCompare(a.fullName || "");
        }
        case "email_asc":
          return (a.email || "").toLowerCase().localeCompare((b.email || "").toLowerCase());
        case "email_desc":
          return (b.email || "").toLowerCase().localeCompare((a.email || "").toLowerCase());
        case "rating_desc": {
          const ra = getAvg(a.email) ?? 0;
          const rb = getAvg(b.email) ?? 0;
          return rb - ra;
        }
        case "rating_asc": {
          const ra = getAvg(a.email) ?? 0;
          const rb = getAvg(b.email) ?? 0;
          return ra - rb;
        }
        case "completed_desc": {
          const ta = getTasks(a.email);
          const tb = getTasks(b.email);
          return tb - ta;
        }
        case "completed_asc": {
          const ta = getTasks(a.email);
          const tb = getTasks(b.email);
          return ta - tb;
        }
        default:
          return 0;
      }
    });

    return rows;
  }, [volunteers, searchTerm, sortBy, serviceFilters, ratingsMap, tasksMap]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Volunteer List</h1>
            <p className="text-sm text-muted-foreground">Manage volunteers, edit details, terminate or reactivate accounts.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Status:</span>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approved only</SelectItem>
                <SelectItem value="terminated">Terminated only</SelectItem>
                <SelectItem value="all">All volunteers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-4 border-b">
              <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, email, services..."
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[180px] h-9 text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">Name A–Z</SelectItem>
                    <SelectItem value="name_desc">Name Z–A</SelectItem>
                    <SelectItem value="email_asc">Email A–Z</SelectItem>
                    <SelectItem value="email_desc">Email Z–A</SelectItem>
                    <SelectItem value="rating_desc">Rating ↓</SelectItem>
                    <SelectItem value="rating_asc">Rating ↑</SelectItem>
                    <SelectItem value="completed_desc">Completed ↓</SelectItem>
                    <SelectItem value="completed_asc">Completed ↑</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>Services</span>
                      {serviceFilters.length > 0 && (
                        <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1.5 text-xs">
                          {serviceFilters.length}
                        </Badge>
                      )}
                      <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Filter by services</span>
                        {serviceFilters.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => setServiceFilters([])}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SERVICE_OPTIONS.map((s) => {
                          const active = serviceFilters.includes(s.label);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() =>
                                setServiceFilters((current) => {
                                  const next = new Set(current);
                                  if (active) next.delete(s.label);
                                  else next.add(s.label);
                                  return Array.from(next);
                                })
                              }
                              className={cn(
                                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                                active
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                              )}
                            >
                              {active && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="px-4 py-2 border-b bg-muted/30 text-sm text-muted-foreground">
              {list.length} volunteer{list.length !== 1 ? "s" : ""} found
              {(searchTerm.trim() || serviceFilters.length > 0) && " (filtered)"}
            </div>
            <div className="overflow-x-auto">
            <Table className="w-full min-w-[800px] table-fixed">
              <colgroup>
                <col style={{ width: "11%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "21%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead className="text-right">Avg Rating</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">No volunteers found.</TableCell>
                  </TableRow>
                ) : list.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <VolunteerAvatar profilePhotoUrl={v.profilePhotoUrl} name={v.fullName} size="sm" />
                        <span>{v.fullName || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{v.email || "—"}</TableCell>
                    <TableCell>{formatPH(v.phone)}</TableCell>
                    <TableCell className="break-words">{Array.isArray(v.services) ? v.services.join(", ") : "—"}</TableCell>
                    <TableCell className="text-right">{getAvg(v.email)?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell className="text-right">{getTasks(v.email)}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full border",
                        v.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        v.status === "terminated" ? "bg-rose-50 text-rose-700 border-rose-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      )}>{v.status}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2 flex-nowrap">
                        <Button size="sm" variant="outline" onClick={() => openEdit(v)}>Edit</Button>
                        {v.status === "terminated" ? (
                          <Button size="sm" variant="outline" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0" onClick={() => setReactivateTarget(v)}>Reactivate</Button>
                        ) : (
                          <Button size="sm" variant="destructive" onClick={() => setTerminateTarget(v)} className="shrink-0">Terminate</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Volunteer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 min-w-0 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => { setPhoneError(null); setForm((f) => ({ ...f, phone: e.target.value })); }}
                    placeholder="+63 9XXXXXXXXX"
                    className={cn(phoneError && "border-destructive focus-visible:ring-destructive")}
                    aria-invalid={!!phoneError}
                    aria-label="Phone Number"
                  />
                  {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Services</label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_OPTIONS.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.services.includes(s.label)}
                        onCheckedChange={(checked) => {
                          setForm((f) => {
                            const current = new Set(f.services);
                            if (checked) current.add(s.label); else current.delete(s.label);
                            return { ...f, services: Array.from(current) };
                          });
                        }}
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
              </div>
              {editing && (
                <div className="md:w-48 shrink-0 md:border-l md:pl-6 flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Profile Photo</label>
                    <VolunteerAvatar profilePhotoUrl={editing.profilePhotoUrl} name={editing.fullName} size="lg" className="border-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">ID Document</label>
                    <IdDocumentView
                      url={editing.idFileUrl ?? null}
                      fileName={editing.idFileName}
                      name={editing.fullName || editing.email || "Volunteer"}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={saveEdit}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Terminate Confirmation */}
        <AlertDialog open={!!terminateTarget} onOpenChange={(o) => { if (!o) { setTerminateTarget(null); setTerminationReason(""); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Terminate volunteer?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the volunteer as terminated. They will be able to log in to see this reason but cannot access any other features. You can reactivate their account later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="termination-reason" className="block text-sm font-medium mb-2">Reason for termination (required)</label>
                <Textarea
                  id="termination-reason"
                  placeholder="e.g., Policy violation, no longer available, appeal under review..."
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">The volunteer will see this message when they log in.</p>
              </div>
              <div className="flex justify-end gap-2">
                <AlertDialogCancel onClick={() => setTerminationReason("")}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!terminationReason.trim()}
                  onClick={async () => {
                    if (terminateTarget && terminationReason.trim()) {
                      await terminateVolunteer(terminateTarget, terminationReason.trim());
                    }
                    setTerminateTarget(null);
                    setTerminationReason("");
                  }}
                >
                  Confirm
                </AlertDialogAction>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reactivate Confirmation */}
        <AlertDialog open={!!reactivateTarget} onOpenChange={(o) => { if (!o) setReactivateTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reactivate volunteer?</AlertDialogTitle>
              <AlertDialogDescription>
                This will restore the volunteer&apos;s account and grant them access again. They will be able to receive new assignments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={async () => {
                  if (reactivateTarget) {
                    await reactivateVolunteer(reactivateTarget);
                  }
                  setReactivateTarget(null);
                }}
              >
                Reactivate
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default VolunteerList;


