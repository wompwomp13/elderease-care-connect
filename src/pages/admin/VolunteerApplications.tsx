import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, Phone, Calendar, MapPin, Inbox, Loader2, FileText, Search, ImageOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, Timestamp, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PendingVolunteer = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  services: string[];
  message: string;
  idFileName?: string | null;
  idFileUrl?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt?: Timestamp;
};

const VolunteerApplications = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<PendingVolunteer[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<number>(1);
  const [idPreview, setIdPreview] = useState<{ url: string; name: string; isPdf: boolean } | null>(null);
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
              <Card key={app.id} className="border-l-4 border-l-primary overflow-hidden transition-shadow hover:shadow-md">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{app.fullName}</CardTitle>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 shrink-0" />
                        Applied: {app.createdAt ? format(app.createdAt.toDate(), "PPP p") : "–"}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(app.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* ID Document */}
                  <div className="lg:w-52 shrink-0">
                    <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">ID Document</p>
                    {app.idFileUrl ? (
                      app.idFileName?.toLowerCase().endsWith(".pdf") ? (
                        <button
                          type="button"
                          onClick={() => setIdPreview({ url: app.idFileUrl!, name: app.fullName, isPdf: true })}
                          className="w-full aspect-video rounded-xl border-2 border-muted bg-muted/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer shadow-sm"
                        >
                          <FileText className="h-10 w-10 text-muted-foreground" />
                          <span className="text-xs font-medium text-center px-2">PDF</span>
                          <span className="text-[10px] text-muted-foreground">Click to view</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIdPreview({ url: app.idFileUrl!, name: app.fullName, isPdf: false })}
                          className="block w-full aspect-video rounded-xl border-2 border-muted overflow-hidden bg-muted/20 hover:border-primary/50 transition-all group cursor-pointer text-left shadow-sm"
                        >
                          <img
                            src={app.idFileUrl}
                            alt={`ID for ${app.fullName}`}
                            className="w-full h-full object-contain bg-muted/30 group-hover:scale-[1.02] transition-transform duration-200"
                          />
                          <span className="sr-only">Click to view full size</span>
                        </button>
                      )
                    ) : (
                      <div className="w-full aspect-video rounded-xl border-2 border-dashed border-muted bg-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <ImageOff className="h-10 w-10 opacity-60" />
                        <span className="text-xs text-center px-2">No ID provided</span>
                        {app.idFileName && <span className="text-[10px]">(legacy)</span>}
                      </div>
                    )}
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-5">
                    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{app.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm">{app.phone}</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-sm">{app.address}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Services</p>
                        <div className="flex flex-wrap gap-2">
                          {app.services?.length ? app.services.map((s) => (
                            <Badge key={s} variant="secondary" className="capitalize text-xs">{s.replace("_", " ")}</Badge>
                          )) : <span className="text-sm text-muted-foreground">None</span>}
                        </div>
                      </div>
                    </div>
                    {(app.message ?? "").trim() && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Message</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-lg bg-muted/30 px-4 py-3 border border-transparent">{app.message}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {app.status === "pending" && (
                  <div className="flex gap-3 pt-6 mt-6 border-t">
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

      <Dialog open={!!idPreview} onOpenChange={(open) => !open && setIdPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 [&>button]:right-2 [&>button]:top-2">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>ID Document — {idPreview?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-6 pb-6">
            {idPreview && (
              idPreview.isPdf ? (
                <iframe
                  src={idPreview.url}
                  title={`ID for ${idPreview.name}`}
                  className="w-full aspect-video min-h-[400px] rounded-lg border bg-muted"
                />
              ) : (
                <img
                  src={idPreview.url}
                  alt={`ID for ${idPreview.name}`}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default VolunteerApplications;
