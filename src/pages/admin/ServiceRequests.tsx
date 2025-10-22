import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, Inbox, Loader2, Star, BarChart3, UserCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

const ServiceRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[] | null>(null);
  const [volunteers, setVolunteers] = useState<any[] | null>(null);

  useEffect(() => {
    const q = query(collection(db, "serviceRequests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "pendingVolunteers"), where("status", "==", "approved"));
    const unsub = onSnapshot(q, (snap) => {
      setVolunteers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  const toServiceId = (nameOrId: string): string => {
    const v = (nameOrId || "").toLowerCase();
    if (v.includes("companionship")) return "companionship";
    if (v.includes("housekeeping")) return "housekeeping";
    if (v.includes("errand")) return "errands";
    if (v.includes("visit")) return "visits";
    if (v.includes("social")) return "socialization";
    return v;
  };

  const getCompatibleVolunteers = (req: any): any[] => {
    if (!volunteers) return [];
    const reqServiceIds: string[] = Array.isArray(req.services)
      ? req.services.map((s: string) => toServiceId(s))
      : req.service ? [toServiceId(req.service)] : [];
    const matched = volunteers.filter((v) => {
      const volServiceIds: string[] = Array.isArray(v.services) ? v.services.map((s: string) => toServiceId(s)) : [];
      return reqServiceIds.some((sid) => volServiceIds.includes(sid));
    });
    // Prioritize by rating (desc), then tasksCompleted (desc)
    return matched.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.tasksCompleted ?? 0) - (a.tasksCompleted ?? 0));
  };

  const renderStars = (ratingNum: number) => {
    const full = Math.round(ratingNum ?? 0);
    return (
      <div className="flex items-center gap-0.5" aria-label={`Rating ${full} out of 5`}>
        {[0,1,2,3,4].map((i) => (
          <Star key={i} className={`h-4 w-4 ${i < full ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
        ))}
      </div>
    );
  };

  // Removed old static volunteers list; now using Firestore "pendingVolunteers" (approved)

  const handleAssign = async (requestId: string, volunteerName: string) => {
    try {
      await updateDoc(doc(db, "serviceRequests", requestId), { status: "assigned", assignedTo: volunteerName });
      toast({ title: "Volunteer Assigned", description: `${volunteerName} has been assigned to this request.` });
    } catch (e: any) {
      toast({ title: "Failed to assign", description: e?.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "assigned":
        return <Badge className="bg-green-500">Assigned</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getServiceColor = (service: string) => {
    const colors: Record<string, string> = {
      "Companionship": "border-l-purple-500",
      "Running Errands": "border-l-blue-500",
      "Light Housekeeping": "border-l-green-500",
      "Home Visits": "border-l-orange-500",
      "Socialization": "border-l-pink-500",
    };
    return colors[service] || "border-l-primary";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Service Requests</h1>
          <p className="text-muted-foreground">View and manage all service requests</p>
        </div>

        <div className="grid gap-6">
          {requests === null ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="grid place-items-center py-24 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No service requests yet.</p>
            </div>
          ) : requests.map((request) => (
            <Card key={request.id} className={`border-l-4 ${getServiceColor((request.services?.[0]) || request.service || "")}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{request.elderName}</CardTitle>
                    <p className="text-lg font-semibold text-primary mt-1">{Array.isArray(request.services) ? request.services.join(", ") : request.service}</p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{request.serviceDateDisplay}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{request.startTimeText} - {request.endTimeText}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{request.address}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {request.assignedTo && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{request.assignedTo}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium mb-1">Additional Notes</p>
                      <p className="text-sm text-muted-foreground">{request.notes || "—"}</p>
                    </div>
                  </div>
                </div>
                
                {request.status === "pending" && (
                  <div className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Suggested Volunteers</label>
                      <span className="text-xs text-muted-foreground">Sorted by rating and relevance</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1">
                      {getCompatibleVolunteers(request).map((v) => {
                        const rating = v.rating ?? 4.0;
                        const tasks = v.tasksCompleted ?? 0;
                        return (
                          <div key={v.id} className="min-w-[280px] md:min-w-[320px] snap-start border rounded-2xl bg-background shadow-sm">
                            <div className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-muted grid place-items-center">
                                    <UserCircle className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="font-semibold leading-tight">{v.fullName}</p>
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Volunteer</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {renderStars(rating)}
                                  <p className="text-xs text-muted-foreground mt-0.5">{rating.toFixed(1)} rating</p>
                                </div>
                              </div>

                              <p className="mt-3 text-sm text-foreground">
                                {(v.bio || `Experienced in ${Array.isArray(v.services) ? v.services.slice(0,3).join(", ") : "care"}.`).toString()}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-1">
                                {(v.services || []).map((s: string) => (
                                  <Badge key={s} variant="secondary" className="capitalize">{s.replace("_", " ")}</Badge>
                                ))}
                              </div>

                              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                <BarChart3 className="h-3.5 w-3.5" />
                                <span>{tasks} tasks completed</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t px-4 py-3">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button className="text-sm text-primary hover:underline">Read more</button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>{v.fullName}</DialogTitle>
                                    <DialogDescription>{v.email}</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                      {renderStars(rating)}
                                      <span className="text-xs text-muted-foreground">{tasks} tasks completed</span>
                                    </div>
                                    <div>
                                      <p className="font-medium">Services</p>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {(v.services || []).map((s: string) => (
                                          <Badge key={s} variant="secondary" className="capitalize">{s.replace("_", " ")}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                    {v.bio && (
                                      <div>
                                        <p className="font-medium">About</p>
                                        <p className="text-muted-foreground">{v.bio}</p>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button size="sm" onClick={() => handleAssign(request.id, v.fullName)}>Assign</Button>
                            </div>
                          </div>
                        );
                      })}
                      {getCompatibleVolunteers(request).length === 0 && (
                        <div className="col-span-full text-sm text-muted-foreground">No matching volunteers found.</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ServiceRequests;
