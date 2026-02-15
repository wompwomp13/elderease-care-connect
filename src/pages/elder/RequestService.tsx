import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logo from "@/assets/logo.png";
import { ChevronLeft, HeartHandshake, Home, ShoppingBasket, Users, Calendar as CalendarIcon, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import TimeRangePicker from "@/components/ui/time-range-picker";
import ElderChatbot from "@/components/elder/ElderChatbot";
import { VolunteerAvatar } from "@/components/VolunteerAvatar";
import { format12h, isEndAfterStart } from "@/lib/time";
import { db } from "@/lib/firebase";
import { addDoc, collection, getDocs, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";

const ElderNavbar = () => {
  const user = getCurrentUser();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  return (
    <nav className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-md">
      <div className="container mx-auto h-16 px-4 flex items-center justify-between">
        <Link to="/elder" className="flex items-center gap-2">
          <img src={logo} alt="ElderEase Logo" className="h-8 w-8" />
          <span className="text-lg font-bold">ElderEase</span>
        </Link>
        <div className="hidden md:flex items-center gap-5">
          <Link to="/elder" className={`transition-opacity ${isActive("/elder") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Home</Link>
          <Link to="/elder/schedule" className={`transition-opacity ${isActive("/elder/schedule") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>My Schedule</Link>
          <Link to="/elder/request-service" className={`transition-opacity ${isActive("/elder/request-service") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Request Service</Link>
          <Link to="/elder/notifications" className={`transition-opacity ${isActive("/elder/notifications") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>Notifications</Link>
          <button className="hover:opacity-80 transition-opacity">Profile</button>
          {user ? (
            <Button
              variant="nav"
              size="sm"
              onClick={() => { logout(); window.location.href = "/"; }}
            >
              Logout
            </Button>
          ) : (
            <Link to="/login">
              <Button variant="nav" size="sm">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const services = [
  {
    id: "companionship",
    name: "Companionship",
    description: "Friendly support and conversation for daily comfort",
    icon: HeartHandshake,
    color: "primary"
  },
  {
    id: "housekeeping",
    name: "Light Housekeeping",
    description: "Help maintaining a clean and comfortable home",
    icon: Home,
    color: "green"
  },
  {
    id: "errands",
    name: "Running Errands",
    description: "Assistance with shopping and daily tasks",
    icon: ShoppingBasket,
    color: "blue"
  },
  {
    id: "visits",
    name: "Home Visits",
    description: "Regular check-ins and support at home",
    icon: Users,
    color: "purple"
  }
];

// Static times replaced by precise time range picker

const RequestService = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState<string | null>(null); // HH:mm (24h)
  const [endTime, setEndTime] = useState<string | null>(null); // HH:mm (24h)
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [gender, setGender] = useState<string>("");
  const [clientAge, setClientAge] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [serviceHoursById, setServiceHoursById] = useState<Record<string, number>>({});
  const [showSubmittedDialog, setShowSubmittedDialog] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const formStartRef = useRef<number | null>(null);
  const markFormStarted = () => { if (!formStartRef.current) formStartRef.current = Date.now(); };

  // Preferred volunteer selection and availability
  const [volunteers, setVolunteers] = useState<any[] | null>(null);
  const [ratingsMap, setRatingsMap] = useState<Record<string, { avg: number; count: number }>>({});
  const [tasksMap, setTasksMap] = useState<Record<string, number>>({});
  const [preferredVolunteerEmail, setPreferredVolunteerEmail] = useState<string | null>(null);
  const [preferredVolunteerName, setPreferredVolunteerName] = useState<string | null>(null);
  const [busyByEmail, setBusyByEmail] = useState<Record<string, Array<[number, number]>>>({}); // for selected date only
  const [busyLoading, setBusyLoading] = useState<boolean>(false);

  // Pre-fill client info from most recent request when user has history (scoped to this account only)
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    (async () => {
      try {
        const q = query(collection(db, "serviceRequests"), where("userId", "==", uid));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const getCreatedMs = (r: any) => {
          const ts = r.createdAt;
          return ts ? (typeof ts === "number" ? ts : ts?.toMillis?.() ?? 0) : 0;
        };
        docs.sort((a, b) => getCreatedMs(b) - getCreatedMs(a));
        const latest = docs[0];
        // Ensure we only use data from this logged-in account (userId = auth UID)
        if (latest?.userId !== uid) return;
        if (latest?.elderFamilyName != null) setFamilyName(String(latest.elderFamilyName).trim());
        if (latest?.elderFirstName != null) setFirstName(String(latest.elderFirstName).trim());
        if (latest?.elderMiddleName != null) setMiddleName(String(latest.elderMiddleName).trim());
        if (latest?.elderAge != null) setClientAge(String(latest.elderAge).trim());
        if (latest?.elderGender != null) setGender(String(latest.elderGender).trim());
        if (latest?.address != null) setClientAddress(String(latest.address).trim());
      } catch {}
    })();
  }, [user?.id]);

  const getTotalSelectedHours = (): number => {
    return selectedServices.reduce((sum, id) => sum + (Number(serviceHoursById[id]) || 0), 0);
  };

  const computeEndFromStartAndHours = (start: string | null, totalHours: number): string | null => {
    if (!start || !Number.isFinite(totalHours) || totalHours <= 0) return start;
    const [sh, sm] = start.split(":").map((x) => parseInt(x || "0", 10));
    const startMinutes = (sh * 60) + sm;
    const endMinutes = startMinutes + Math.round(totalHours * 60);
    const eh = Math.floor((endMinutes % (24 * 60)) / 60);
    const em = endMinutes % 60;
    const hh = String(eh).padStart(2, "0");
    const mm = String(em).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
    setServiceHoursById(prev => {
      const next = { ...prev };
      if (serviceId in next) {
        // keep existing value when toggling on/off; it will be ignored if unselected
        return next;
      }
      next[serviceId] = 1; // default 1 hour for new selection
      return next;
    });
  };

  // Auto-calc end time whenever start time or per-service hours change
  useEffect(() => {
    const total = getTotalSelectedHours();
    const nextEnd = computeEndFromStartAndHours(startTime, total);
    if (nextEnd && nextEnd !== endTime) {
      setEndTime(nextEnd);
    }
    // If no total or start, clear end
    if ((!startTime || !Number.isFinite(total) || total <= 0) && endTime) {
      setEndTime(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, selectedServices, serviceHoursById]);

  // Subscribe to approved volunteers (for selection list)
  useEffect(() => {
    const q = query(collection(db, "pendingVolunteers"), where("status", "==", "approved"));
    const unsub = onSnapshot(q, (snap) => {
      setVolunteers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  // Live ratings aggregation (by volunteer email)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "ratings"), (snap) => {
      const sums: Record<string, { sum: number; count: number }> = {};
      snap.docs.forEach((doc) => {
        const r = doc.data() as any;
        const email = (r.volunteerEmail || "").toLowerCase();
        const value = Number(r.rating) || 0;
        if (!email || value <= 0) return;
        if (!sums[email]) sums[email] = { sum: 0, count: 0 };
        sums[email].sum += value;
        sums[email].count += 1;
      });
      const avg: Record<string, { avg: number; count: number }> = {};
      Object.keys(sums).forEach((email) => {
        const { sum, count } = sums[email];
        avg[email] = { avg: sum / count, count };
      });
      setRatingsMap(avg);
    });
    return () => unsub();
  }, []);

  // Tasks completed aggregation (by volunteer email)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "assignments"), (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const a = d.data() as any;
        const email = (a.volunteerEmail || "").toLowerCase();
        if (!email) return;
        const isCompleted = a.status === "completed";
        const confirmed = a.guardianConfirmed === true;
        if (isCompleted && confirmed) {
          counts[email] = (counts[email] || 0) + 1;
        }
      });
      setTasksMap(counts);
    });
    return () => unsub();
  }, []);

  // For selected date, compute busy intervals by volunteer email
  useEffect(() => {
    if (!selectedDate) { setBusyByEmail({}); setBusyLoading(false); return; }
    // Clear previous day intervals immediately to avoid stale "Unavailable" flashes
    setBusyByEmail({});
    setBusyLoading(true);
    const dayMs = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
    const q = query(collection(db, "assignments"), where("serviceDateTS", "==", dayMs));
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, Array<[number, number]>> = {};
      snap.docs.forEach((d) => {
        const a = d.data() as any;
        const email = (a.volunteerEmail || "").toLowerCase();
        const [sh, sm] = String(a.startTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
        const [eh, em] = String(a.endTime24 || "").split(":").map((x: string) => parseInt(x || "0", 10));
        const startMin = sh * 60 + (sm || 0);
        const endMin = eh * 60 + (em || 0);
        if (!email || !isFinite(startMin) || !isFinite(endMin)) return;
        if (a.status === "cancelled") return;
        if (!map[email]) map[email] = [];
        // Handle cross-midnight assignments by splitting into two intervals
        if (endMin <= startMin) {
          // interval [startMin, 1440) and [0, endMin]
          map[email].push([startMin, 24 * 60]);
          if (endMin > 0) map[email].push([0, endMin]);
        } else {
          map[email].push([startMin, endMin]);
        }
      });
      setBusyByEmail(map);
      setBusyLoading(false);
    });
    return () => unsub();
  }, [selectedDate]);

  const toMinutes = (t?: string | null) => {
    if (!t) return null;
    const [h, m] = String(t).split(":").map((x: string) => parseInt(x || "0", 10));
    if (!isFinite(h)) return null;
    return h * 60 + (m || 0);
  };
  const hasOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

  const enrichedVolunteers = useMemo(() => {
    const list = volunteers || [];
    const rs = toMinutes(startTime);
    const re = toMinutes(endTime);
    return list.map((v) => {
      const email = (v.email || "").toLowerCase();
      const ratingAgg = ratingsMap[email];
      const tasksDone = tasksMap[email] ?? 0;
      const intervals = busyByEmail[email] || [];
      let available: boolean | null = null;
      if (!busyLoading && rs != null && re != null) {
        available = !intervals.some(([bs, be]) => hasOverlap(rs, re, bs, be));
      }
      return {
        ...v,
        rating: ratingAgg?.avg ?? null,
        ratingCount: ratingAgg?.count ?? 0,
        tasksCompleted: tasksDone,
        available,
      };
    })
    // Optional: sort available first if we know availability
    .sort((a, b) => {
      if (a.available === b.available) return 0;
      if (a.available === true) return -1;
      if (b.available === true) return 1;
      return 0;
    });
  }, [volunteers, ratingsMap, tasksMap, busyByEmail, startTime, endTime]);

  const handleSubmit = () => {
    setServicesError(null);
    setTimeError(null);
    if (!familyName.trim() || !firstName.trim() || !clientAge.trim() || !clientAddress.trim() || !gender) {
      toast({
        title: "Please complete client details",
        variant: "destructive"
      });
      return;
    }
    if (selectedServices.length === 0) {
      setServicesError("Please select at least one service.");
      return;
    }
    if (!selectedDate || !startTime || !endTime) {
      setTimeError("Choose a date and start time. End time fills in automatically.");
      return;
    }
    // Disallow scheduling in the past for same day
    const today = new Date();
    const isSameDay =
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate();
    if (isSameDay) {
      const [hh, mm] = startTime.split(":").map((x) => parseInt(x, 10));
      const startMinutes = hh * 60 + mm;
      const nowMinutes = today.getHours() * 60 + today.getMinutes();
      if (startMinutes <= nowMinutes) {
        setTimeError("For today, please pick a start time later than now.");
        return;
      }
    }
    // Validate hours for selected services
    const invalid = selectedServices.some(id => {
      const val = Number(serviceHoursById[id]);
      return !Number.isFinite(val) || val <= 0;
    });
    if (invalid) {
      setServicesError("Set duration (hours) for each selected service.");
      return;
    }
    // If preferred volunteer selected, block submission when they are unavailable
    if (preferredVolunteerEmail) {
      const sel = enrichedVolunteers.find((x) => (x.email || "").toLowerCase() === preferredVolunteerEmail);
      if (busyLoading) {
        toast({ title: "Checking availability", description: "Please wait a moment while we verify your preferred volunteer's schedule.", variant: "destructive" });
        return;
      }
      if (sel && sel.available === false) {
        toast({
          title: "Preferred volunteer unavailable",
          description: "Your preferred volunteer isn’t available at the selected time. Please pick another time or submit without a preference.",
          variant: "destructive",
        });
        return;
      }
    }
    const serviceNames = selectedServices.map(id => services.find(s => s.id === id)?.name).filter(Boolean) as string[];
    // Build mapping by service display name for clarity
    const perServiceHoursByName: Record<string, number> = {};
    selectedServices.forEach((id) => {
      const name = services.find(s => s.id === id)?.name;
      if (name) perServiceHoursByName[name] = Number(serviceHoursById[id]) || 0;
    });
    const currentUser = user;
    const elderName = [familyName.trim(), firstName.trim(), middleName.trim()].filter(Boolean).join(", ");
    // Normalize date to midnight for consistent availability queries
    const serviceDayMs = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
    const payload = {
      userId: currentUser?.id ?? null,
      elderName, // keep for backward compatibility
      elderFirstName: firstName.trim(),
      elderMiddleName: middleName.trim() || null,
      elderFamilyName: familyName.trim(),
      elderGender: gender,
      elderAge: clientAge.trim(),
      address: clientAddress.trim(),
      services: serviceNames,
      perServiceHoursByName,
      serviceDateDisplay: format(selectedDate, "PPP"),
      serviceDateTS: serviceDayMs,
      startTime24: startTime,
      endTime24: endTime,
      startTimeText: format12h(startTime),
      endTimeText: format12h(endTime),
      notes: additionalNotes.trim() || null,
      preferredVolunteerEmail: preferredVolunteerEmail || null,
      preferredVolunteerName: preferredVolunteerName || null,
      status: "pending",
      createdAt: serverTimestamp(),
    };

    addDoc(collection(db, "serviceRequests"), payload)
      .then(() => {
        // fire-and-forget: record form completion duration for analytics
        try {
          const startedAtMs = formStartRef.current ?? Date.now();
          const durationMs = Math.max(0, Date.now() - startedAtMs);
          addDoc(collection(db, "formMetrics"), {
            type: "elder_request_service",
            userRole: "elder",
            userId: currentUser?.id ?? null,
            durationMs,
            startedAtMs,
            submittedAt: serverTimestamp(),
          });
        } catch {}
        // Open center confirmation dialog; elder will click OK to continue
        setShowSubmittedDialog(true);
      })
      .catch((err) => {
        toast({ title: "Failed to submit request", description: err?.message ?? "Please try again.", variant: "destructive" });
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <ElderNavbar />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Request a Service for your loved one</h1>
          <p className="text-muted-foreground">Choose services and schedule a time that works best for them</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Service Selection */}
          <div className="space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
                <CardDescription>Please provide details about who will receive the service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="familyName">Family name *</Label>
                    <Input
                      id="familyName"
                      placeholder="e.g., Dela Cruz"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstName">First name *</Label>
                    <Input
                      id="firstName"
                      placeholder="e.g., Juan"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="middleName">Middle name</Label>
                    <Input
                      id="middleName"
                      placeholder="Optional"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Gender *</Label>
                    <Select value={gender} onValueChange={(v) => setGender(v)}>
                      <SelectTrigger className="mt-1.5">
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
                  <Label htmlFor="clientAge">Age of Senior *</Label>
                  <Input
                    id="clientAge"
                    type="number"
                    placeholder="Enter age"
                    value={clientAge}
                    onChange={(e) => setClientAge(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="clientAddress">Address *</Label>
                  <Textarea
                    id="clientAddress"
                    placeholder="Enter complete street address and city"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    rows={3}
                    className="mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>1) Select Services</CardTitle>
                <CardDescription>Choose one or more services you need assistance with</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {servicesError && <p className="text-sm text-destructive">{servicesError}</p>}
                {services.map((service) => {
                  const Icon = service.icon;
                  const isSelected = selectedServices.includes(service.id);
                  const hoursVal = serviceHoursById[service.id] ?? 1;
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          isSelected ? "bg-primary/10" : "bg-muted"
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            isSelected ? "text-primary" : "text-muted-foreground"
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold">{service.name}</h3>
                            {isSelected && (
                              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                          {isSelected && (
                            <div className="mt-3 flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Duration (hrs)</Label>
                              <Input
                                type="number"
                                min={0.5}
                                step={0.5}
                                className="h-8 w-24"
                                value={hoursVal}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const raw = parseFloat(e.target.value);
                                  setServiceHoursById((prev) => ({ ...prev, [service.id]: Number.isFinite(raw) ? raw : 0 }));
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
                <CardDescription>Any specific requests or preferences?</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Let us know if you have any special requirements..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Date & Time Selection */}
          <div className="space-y-6">
            <Card onFocusCapture={markFormStarted}>
              <CardHeader>
                <CardTitle>2) Select Date</CardTitle>
                <CardDescription>Choose your preferred date</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card onFocusCapture={markFormStarted}>
              <CardHeader>
                <CardTitle>3) Choose Start Time</CardTitle>
                <CardDescription>
                  {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date first"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeRangePicker
                  start={startTime}
                  end={endTime}
                  endDisabled
                  onChange={({ start }) => {
                    setStartTime(start);
                    // end time will be recalculated automatically from selected service hours
                  }}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  End time is automatically calculated from the total selected service hours.
                </p>
                {timeError && <p className="mt-2 text-sm text-destructive">{timeError}</p>}
              </CardContent>
            </Card>

            {/* Preferred Volunteer */}
            <Card onFocusCapture={markFormStarted}>
              <CardHeader>
                <CardTitle>4) Preferred Volunteer (optional)</CardTitle>
                <CardDescription>Select someone you prefer. Availability shows after choosing date & time.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const ANY_VOLUNTEER = "__any__";
                  const selected = enrichedVolunteers.find((x) => (x.email || "").toLowerCase() === (preferredVolunteerEmail || ""));
                  const selectedLabel = selected
                    ? `${selected.fullName || selected.email}`
                    : "Any volunteer (no preference)";
                  return (
                    <div className="space-y-2">
                      <Label className="text-sm mb-1 block">Preferred Volunteer</Label>
                      <Select
                        value={preferredVolunteerEmail || ANY_VOLUNTEER}
                        onValueChange={(val) => {
                          if (val === ANY_VOLUNTEER) {
                            setPreferredVolunteerEmail(null);
                            setPreferredVolunteerName(null);
                          } else {
                            setPreferredVolunteerEmail(val || null);
                            const v = enrichedVolunteers.find((x) => (x.email || "").toLowerCase() === val);
                            setPreferredVolunteerName(v?.fullName || null);
                          }
                        }}
                      >
                        <SelectTrigger className="h-11">
                          <span className="truncate">
                            {selected ? selected.fullName || selected.email : (enrichedVolunteers.length ? selectedLabel : "Loading volunteers...")}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="max-h-96 p-0">
                          <SelectItem value={ANY_VOLUNTEER} className="py-2">
                            <span className="text-muted-foreground italic">Any volunteer (no preference)</span>
                          </SelectItem>
                          {enrichedVolunteers.map((v) => {
                            const email = (v.email || "").toLowerCase();
                            const rating = typeof v.rating === "number" ? v.rating.toFixed(1) : "—";
                            const tasks = v.tasksCompleted ?? 0;
                            const availabilityLabel = v.available == null ? "Pick date & time to check" : (v.available ? "Available" : "Unavailable");
                            return (
                              <SelectItem key={email} value={email} className="py-2">
                                <div className="flex items-center gap-2">
                                  <VolunteerAvatar profilePhotoUrl={v.profilePhotoUrl} name={v.fullName} size="sm" />
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium leading-tight">{v.fullName || v.email}</span>
                                  {v.email && <span className="text-xs text-muted-foreground">{v.email}</span>}
                                  <div className="text-xs text-muted-foreground">
                                    Rating: {rating} • Tasks: {tasks}
                                  </div>
                                    <div className={`text-xs ${v.available === false ? "text-destructive" : "text-emerald-600"}`}>
                                      {availabilityLabel}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {selected && (
                        <div className="rounded-lg border bg-muted/40 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <VolunteerAvatar profilePhotoUrl={selected.profilePhotoUrl} name={selected.fullName} size="md" />
                              <div>
                                <p className="font-medium leading-tight">{selected.fullName || selected.email}</p>
                                {selected.email && <p className="text-xs text-muted-foreground">{selected.email}</p>}
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Rating: {typeof selected.rating === "number" ? selected.rating.toFixed(1) : "—"} • Tasks: {selected.tasksCompleted ?? 0}
                                </p>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${selected.available === false ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700"}`}>
                              {selected.available == null ? "Pick date & time" : selected.available ? "Available" : "Unavailable"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Request Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Services</Label>
                    {selectedServices.length > 0 ? (
                      <div className="text-sm space-y-1">
                        {selectedServices.map((id) => {
                          const s = services.find(x => x.id === id);
                          const h = serviceHoursById[id] ?? 1;
                          return (
                            <div key={id} className="flex items-center justify-between">
                              <span className="font-medium">{s?.name}</span>
                              <span className="text-muted-foreground">{h} hr</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="font-medium">No services selected</p>
                    )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date & Time</Label>
                  <p className="font-medium">
                    {selectedDate && startTime && endTime
                      ? `${format(selectedDate, "PPP")} • ${format12h(startTime)} to ${format12h(endTime)}`
                      : "Not selected"}
                  </p>
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full mt-4"
                  size="lg"
                  disabled={
                    !familyName.trim() ||
                    !firstName.trim() ||
                    !clientAge.trim() ||
                    !clientAddress.trim() ||
                    !gender ||
                    selectedServices.length === 0 ||
                    !selectedDate ||
                    !startTime ||
                    !endTime
                  }
                >
                  Submit Request
                </Button>
                <p className="text-xs text-muted-foreground">
                  You’ll receive a receipt in Notifications once a volunteer is assigned.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <ElderChatbot />
      {showSubmittedDialog && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <div className="relative z-[101] w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="text-center space-y-2 mb-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 grid place-items-center">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <h2 className="text-xl font-bold">Request Submitted</h2>
              <p className="text-sm text-muted-foreground">
                We’ve received your request. You’ll get a receipt once a volunteer is assigned.
              </p>
            </div>
            <div className="flex justify-center">
              <Button size="lg" onClick={() => navigate("/elder/notifications")}>OK</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestService;

