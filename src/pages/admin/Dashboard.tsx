import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ClipboardList, Star, Award, ChevronRight, ArrowUpRight, ArrowDownRight, User as UserIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

const Dashboard = () => {
  const [expandedVolunteer, setExpandedVolunteer] = useState<string | null>(null);

  // Live collections
  const [requests, setRequests] = useState<any[] | null>(null);
  const [approvedVolunteers, setApprovedVolunteers] = useState<any[] | null>(null);
  const [assignments, setAssignments] = useState<any[] | null>(null);
  const [ratingsMap, setRatingsMap] = useState<Record<string, { sum: number; count: number }>>({});

  // Subscribe to Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "serviceRequests"), (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const qv = query(collection(db, "pendingVolunteers"), where("status", "==", "approved"));
    const unsub = onSnapshot(qv, (snap) => {
      setApprovedVolunteers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "assignments"), (snap) => {
      setAssignments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "ratings"), (snap) => {
      const map: Record<string, { sum: number; count: number }> = {};
      snap.docs.forEach((doc) => {
        const r = doc.data() as any;
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

  // Derived metrics
  const totalRequests = requests?.length ?? 0;
  const pendingRequests = (requests || []).filter((r) => (r.status || "pending") === "pending").length;
  const activeVolunteers = approvedVolunteers?.length ?? 0;

  const now = new Date();
  const weekAgoMs = now.getTime() - 6 * 24 * 60 * 60 * 1000;
  const isCompletedConfirmed = (a: any) => a.status === "completed" && a.guardianConfirmed === true;
  const getDateMs = (a: any) => {
    const ms = typeof a.serviceDateTS === "number" ? a.serviceDateTS : (a.serviceDateTS?.toMillis?.() ?? 0);
    return ms || 0;
  };
  const completedThisWeek = (assignments || []).filter((a) => isCompletedConfirmed(a) && getDateMs(a) >= weekAgoMs).length;

  const stats = [
    { title: "Total Service Requests", value: String(totalRequests), icon: ClipboardList, change: "", trend: "up", color: "from-emerald-500 to-emerald-600", subtitle: "live" },
    { title: "Active Volunteers", value: String(activeVolunteers), icon: Users, change: "", trend: "up", color: "from-blue-500 to-blue-600", subtitle: "approved" },
    { title: "Completed This Week", value: String(completedThisWeek), icon: Star, change: "", trend: "up", color: "from-purple-500 to-purple-600", subtitle: "confirmed" },
    { title: "Pending Requests", value: String(pendingRequests), icon: ClipboardList, change: "", trend: "up", color: "from-orange-500 to-orange-600", subtitle: "awaiting assignment" },
  ];

  // Weekly activity (last 7 days)
  const weekdayShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;
  const weeklyData = useMemo(() => {
    const base = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      return { day: weekdayShort[d.getDay()], key: d.toDateString(), requests: 0 };
    });
    (assignments || []).forEach((a) => {
      if (!isCompletedConfirmed(a)) return;
      const ms = getDateMs(a);
      if (!ms || ms < weekAgoMs) return;
      const ds = new Date(ms).toDateString();
      const idx = base.findIndex((b) => b.key === ds);
      if (idx >= 0) base[idx].requests += 1;
    });
    return base.map(({ day, requests }) => ({ day, requests }));
  }, [assignments]);

  // Monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: { month: string; services: number; key: string }[] = [];
    const cur = new Date(now);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleString(undefined, { month: "short" });
      months.push({ month: label, services: 0, key });
    }
    (assignments || []).forEach((a) => {
      if (!isCompletedConfirmed(a)) return;
      const ms = getDateMs(a);
      if (!ms) return;
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = months.findIndex((m) => m.key === key);
      if (idx >= 0) months[idx].services += 1;
    });
    return months.map(({ month, services }) => ({ month, services }));
  }, [assignments]);

  // Top performers (top 3 by avg rating then services completed)
  const tasksMap: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    (assignments || []).forEach((a) => {
      if (!isCompletedConfirmed(a)) return;
      const email = (a.volunteerEmail || "").toLowerCase();
      if (!email) return;
      counts[email] = (counts[email] || 0) + 1;
    });
    return counts;
  }, [assignments]);

  const topVolunteers = useMemo(() => {
    const list = (approvedVolunteers || []).map((v) => {
      const emailKey = (v.email || "").toLowerCase();
      const r = ratingsMap[emailKey];
      const avg = r ? r.sum / r.count : null;
      const count = tasksMap[emailKey] || 0;
      return {
        id: v.id,
        name: v.fullName || v.name || v.email || "Volunteer",
        rating: avg,
        reviews: r?.count || 0,
        services: count,
        specialty: Array.isArray(v.services) ? v.services.slice(0,2).join(" & ") : (v.services || "Care Services"),
        badge: avg && avg >= 4.8 ? "Top Performer" : avg && avg >= 4.5 ? "Rising Star" : "Volunteer",
        about: v.bio || "Reliable and compassionate volunteer.",
        education: v.education || "",
        method: v.method || "Client-centered care",
      };
    })
    .filter((v) => v.rating != null)
    .sort((a, b) => (b.rating! - a.rating!) || (b.services - a.services))
    .slice(0, 3);
    return list;
  }, [approvedVolunteers, ratingsMap, tasksMap]);

  // Normalize service names to canonical ids and labels
  const toServiceId = (nameOrId: string): string => {
    const v = (nameOrId || "").toLowerCase();
    if (v.includes("companionship")) return "companionship";
    if (v.includes("housekeeping")) return "housekeeping";
    if (v.includes("errand")) return "errands";
    if (v.includes("visit")) return "visits";
    if (v.includes("social")) return "socialization";
    return v;
  };
  const toDisplayName = (id: string): string => {
    switch (id) {
      case "companionship": return "Companionship";
      case "housekeeping": return "Light Housekeeping";
      case "errands": return "Running Errands";
      case "visits": return "Home Visits";
      case "socialization": return "Socialization";
      default: return id?.charAt(0).toUpperCase() + id?.slice(1);
    }
  };

  // Most requested services (live from serviceRequests)
  const topServices = useMemo(() => {
    const counts: Record<string, number> = {};
    (requests || []).forEach((r) => {
      const arr: string[] = Array.isArray(r.services) ? r.services : (r.service ? [r.service] : []);
      arr.forEach((s) => {
        const id = toServiceId(s);
        if (!id) return;
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((acc, [, n]) => acc + n, 0) || 1;
    return entries.map(([id, n]) => ({ name: toDisplayName(id), requests: n, percentage: Math.round((n / total) * 1000) / 10 }));
  }, [requests]);


  

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dashboard Overview</h1>
          <p className="text-muted-foreground">Monitor system performance and key metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="relative overflow-hidden border-0 shadow-lg">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-90`} />
              <CardHeader className="relative pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium text-white/90">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-5 w-5 text-white/80" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="flex items-center gap-1 text-sm text-white/90">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">{stat.change}</span>
                  <span className="text-white/70">{stat.subtitle}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg">Weekly Activity</CardTitle>
              <p className="text-sm text-muted-foreground">Completed services this week</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg">Monthly Trend</CardTitle>
              <p className="text-sm text-muted-foreground">Total services completed</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="services" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Volunteers Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Top Volunteers</h2>
              <p className="text-sm text-muted-foreground">Outstanding performers this month</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {topVolunteers.map((volunteer, index) => (
              <Card 
                key={volunteer.id} 
                className={`shadow-lg border-0 transition-all cursor-pointer hover:shadow-xl ${
                  expandedVolunteer === volunteer.id ? "lg:col-span-3" : ""
                }`}
                onClick={() => setExpandedVolunteer(expandedVolunteer === volunteer.id ? null : volunteer.id)}
              >
                {expandedVolunteer === volunteer.id ? (
                  // Expanded View
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Profile Icon */}
                      <div className="space-y-2 flex items-center justify-center">
                        <div className="h-64 w-64 rounded-full bg-muted grid place-items-center">
                          <UserIcon className="h-24 w-24 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="lg:col-span-2 space-y-6">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-2xl font-bold">{volunteer.name}</h3>
                              <p className="text-sm text-muted-foreground">{volunteer.reviews} reviews</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Award className="h-5 w-5 text-yellow-500" />
                              <span className="text-sm font-medium">{volunteer.badge}</span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">Specialties: {volunteer.specialty}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <Card className="bg-muted/50 border-0">
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">About me</div>
                              <p className="text-sm">{volunteer.about}</p>
                            </CardContent>
                          </Card>

                          <Card className="bg-muted/50 border-0">
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Education</div>
                              <p className="text-sm font-medium mb-2">{volunteer.education}</p>
                              <p className="text-xs text-muted-foreground">Working with expertise in {volunteer.specialty.toLowerCase()}</p>
                            </CardContent>
                          </Card>

                          <Card className="bg-muted/50 border-0">
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Care Method</div>
                              <p className="text-sm">{volunteer.method}</p>
                            </CardContent>
                          </Card>

                          <Card className="bg-muted/50 border-0">
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Performance</div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <span className="text-sm font-medium">{volunteer.rating?.toFixed(1)} / 5.0</span>
                                  <span className="text-xs text-muted-foreground">({volunteer.reviews} reviews)</span>
                                </div>
                                <div className="text-sm text-muted-foreground">{volunteer.services} services completed</div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Collapsed View
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-muted grid place-items-center">
                          <UserIcon className="h-7 w-7 text-muted-foreground" />
                        </div>
                        {index === 0 && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Award className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold truncate">{volunteer.name}</p>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                            {volunteer.badge}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{volunteer.specialty}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{volunteer.rating?.toFixed(1)}</span>
                          </div>
                          <span className="text-muted-foreground">{volunteer.services} services</span>
                        </div>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
                        expandedVolunteer === volunteer.id ? "rotate-90" : ""
                      }`} />
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Most Requested Services */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-lg">Most Requested Services</CardTitle>
            <p className="text-sm text-muted-foreground">Distribution of service types</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {topServices.map((service) => (
              <div key={service.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{service.name}</span>
                  <span className="text-muted-foreground">{service.requests} requests</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-primary to-primary-dark rounded-full h-2.5 transition-all"
                    style={{ width: `${service.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;