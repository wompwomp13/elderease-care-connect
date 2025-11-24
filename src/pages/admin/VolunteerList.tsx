import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Volunteer = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  services?: string[];
  gender?: string | null;
  status: "approved" | "pending" | "terminated";
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
  const [filter, setFilter] = useState<"approved" | "terminated" | "all">("approved");
  const [editing, setEditing] = useState<Volunteer | null>(null);
  const [form, setForm] = useState<{ fullName: string; phone: string; address: string; services: string[]; gender: string }>({
    fullName: "",
    phone: "",
    address: "",
    services: [],
    gender: "",
  });
  const [terminateTarget, setTerminateTarget] = useState<Volunteer | null>(null);

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
    setForm({
      fullName: v.fullName || "",
      phone: v.phone || "",
      address: v.address || "",
      services: Array.isArray(v.services) ? v.services : [],
      gender: v.gender || "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await updateDoc(doc(db, "pendingVolunteers", editing.id), {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        services: form.services,
        gender: form.gender || null,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Volunteer updated." });
      setEditing(null);
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const terminateVolunteer = async (v: Volunteer) => {
    try {
      await updateDoc(doc(db, "pendingVolunteers", v.id), { status: "terminated", decidedAt: serverTimestamp() });
      // Also set matching users.status = 'terminated' by email
      if (v.email) {
        const uq = query(collection(db, "users"), where("email", "==", v.email.toLowerCase()));
        const usnap = await getDocs(uq);
        for (const udoc of usnap.docs) {
          await updateDoc(doc(db, "users", udoc.id), { status: "terminated", updatedAt: serverTimestamp() });
        }
      }
      toast({ title: "Volunteer terminated." });
    } catch (e: any) {
      toast({ title: "Terminate failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const list = volunteers;

  const getAvg = (email?: string) => {
    const r = ratingsMap[(email || "").toLowerCase()];
    return r ? r.sum / r.count : null;
  };

  const getTasks = (email?: string) => {
    return tasksMap[(email || "").toLowerCase()] || 0;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Volunteer List</h1>
            <p className="text-sm text-muted-foreground">Manage approved volunteers, edit details, or terminate/delete accounts.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
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
                    <TableCell className="font-medium">{v.fullName || "—"}</TableCell>
                    <TableCell>{v.email || "—"}</TableCell>
                    <TableCell>{formatPH(v.phone)}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{Array.isArray(v.services) ? v.services.join(", ") : "—"}</TableCell>
                    <TableCell className="text-right">{getAvg(v.email)?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell className="text-right">{getTasks(v.email)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        v.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>{v.status}</span>
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(v)}>Edit</Button>
                      {v.status !== "terminated" && (
                        <Button size="sm" variant="destructive" onClick={() => setTerminateTarget(v)}>Terminate</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Volunteer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+63 9XXXXXXXXX" />
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={saveEdit}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Terminate Confirmation */}
        <AlertDialog open={!!terminateTarget} onOpenChange={(o) => { if (!o) setTerminateTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Terminate volunteer?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the volunteer as terminated and restrict their access. You can re-approve later by changing their status.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (terminateTarget) {
                    await terminateVolunteer(terminateTarget);
                  }
                  setTerminateTarget(null);
                }}
              >
                Confirm
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default VolunteerList;


