import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, Phone, Calendar, MapPin, Inbox, Loader2, FileText, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, Timestamp, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

type PendingVolunteer = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  services: string[];
  message: string;
  idFileName?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt?: Timestamp;
};

const VolunteerApplications = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<PendingVolunteer[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<number>(1);
  const perPage = 5;

  useEffect(() => {
    const q = query(collection(db, "pendingVolunteers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items: PendingVolunteer[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PendingVolunteer, "id">) }));
      setApplications(items);
    });
    return () => unsub();
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const handleApprove = async (id: string, name: string) => {
    try {
      await updateDoc(doc(db, "pendingVolunteers", id), { status: "approved", decidedAt: serverTimestamp() });
      toast({ title: "Application Approved", description: `${name} marked as approved.` });
    } catch (e: any) {
      toast({ title: "Failed to approve", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const handleReject = async (id: string, name: string) => {
    try {
      await updateDoc(doc(db, "pendingVolunteers", id), { status: "rejected", decidedAt: serverTimestamp() });
      toast({ title: "Application Rejected", description: `${name} marked as rejected.`, variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Failed to reject", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending Review</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Volunteer Applications</h1>
          <p className="text-muted-foreground">Review and manage volunteer applications submitted from the public form</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex rounded-md border overflow-hidden">
            {(["all","pending","approved","rejected"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-sm capitalize ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                aria-pressed={statusFilter === s}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="pl-9" />
          </div>
        </div>

        {applications === null ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading applications...
          </div>
        ) : applications.length === 0 ? (
          <div className="grid place-items-center py-24 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No applications yet. New submissions will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {(() => {
              const filtered = applications
                .filter((app) => statusFilter === "all" ? true : app.status === statusFilter)
                .filter((app) => {
                  const q = search.trim().toLowerCase();
                  if (!q) return true;
                  return app.fullName.toLowerCase().includes(q) || app.email.toLowerCase().includes(q);
                });
              const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
              const safePage = Math.min(page, totalPages);
              const start = (safePage - 1) * perPage;
              const pageItems = filtered.slice(start, start + perPage);
              return (
                <>
                  {pageItems.map((app) => (
              <Card key={app.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{app.fullName}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Applied: {app.createdAt ? format(app.createdAt.toDate(), "PPP p") : "–"}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(app.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{app.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{app.phone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{app.address}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Services</p>
                      <div className="flex flex-wrap gap-2">
                        {app.services?.length ? app.services.map((s) => (
                          <Badge key={s} variant="secondary" className="capitalize">{s.replace("_", " ")}</Badge>
                        )) : <span className="text-sm text-muted-foreground">None</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Message</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.message}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>ID Attachment: {app.idFileName ? `${app.idFileName} (placeholder)` : "Not provided"}</span>
                    </div>
                  </div>
                </div>
                
                {app.status === "pending" && (
                  <div className="flex gap-3 pt-4">
                    <Button onClick={() => handleApprove(app.id, app.fullName)} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Check className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button onClick={() => handleReject(app.id, app.fullName)} variant="destructive" className="flex-1">
                      <X className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
                  ))}
                  <Pagination className="mt-2">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious onClick={(e) => { e.preventDefault(); setPage(Math.max(1, safePage - 1)); }} href="#" />
                      </PaginationItem>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink href="#" isActive={safePage === (i + 1)} onClick={(e) => { e.preventDefault(); setPage(i + 1); }}>
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, safePage + 1)); }} href="#" />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default VolunteerApplications;
