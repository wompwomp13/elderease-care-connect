import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import { ChevronLeft, HeartHandshake, Home, ShoppingBasket, Users, Calendar as CalendarIcon, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import TimeRangePicker from "@/components/ui/time-range-picker";
import { format12h, isEndAfterStart } from "@/lib/time";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

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
  },
  {
    id: "socialization",
    name: "Socialization",
    description: "Activities and outings for social engagement",
    icon: Users,
    color: "orange"
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
  const [clientName, setClientName] = useState("");
  const [clientAge, setClientAge] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = () => {
    if (!clientName.trim() || !clientAge.trim() || !clientAddress.trim()) {
      toast({
        title: "Please fill in all client information",
        variant: "destructive"
      });
      return;
    }
    if (selectedServices.length === 0) {
      toast({
        title: "Please select at least one service",
        variant: "destructive"
      });
      return;
    }
    if (!selectedDate || !startTime || !endTime) {
      toast({
        title: "Please select date and time range",
        variant: "destructive"
      });
      return;
    }
    if (!isEndAfterStart(startTime, endTime)) {
      toast({ title: "End time must be after start time", variant: "destructive" });
      return;
    }
    const serviceNames = selectedServices.map(id => services.find(s => s.id === id)?.name).filter(Boolean) as string[];
    const currentUser = user;
    const payload = {
      userId: currentUser?.id ?? null,
      elderName: clientName.trim(),
      elderAge: clientAge.trim(),
      address: clientAddress.trim(),
      services: serviceNames,
      serviceDateDisplay: format(selectedDate, "PPP"),
      serviceDateTS: selectedDate.getTime(),
      startTime24: startTime,
      endTime24: endTime,
      startTimeText: format12h(startTime),
      endTimeText: format12h(endTime),
      notes: additionalNotes.trim() || null,
      status: "pending",
      createdAt: serverTimestamp(),
    };

    addDoc(collection(db, "serviceRequests"), payload)
      .then(() => {
        navigate("/elder/payment-confirmation", {
          state: {
            name: clientName,
            age: clientAge,
            address: clientAddress,
            services: serviceNames.join(", "),
            date: format(selectedDate, "PPP"),
            time: `${format12h(startTime)} to ${format12h(endTime)}`
          }
        });
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
                <div>
                  <Label htmlFor="clientName">Full Name *</Label>
                  <Input
                    id="clientName"
                    placeholder="Enter full name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="mt-1.5"
                  />
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
                <CardTitle>Select Services</CardTitle>
                <CardDescription>Choose one or more services you need assistance with</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {services.map((service) => {
                  const Icon = service.icon;
                  const isSelected = selectedServices.includes(service.id);
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
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
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

            <Card>
              <CardHeader>
                <CardTitle>Select Time Range</CardTitle>
                <CardDescription>
                  {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date first"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeRangePicker
                  start={startTime}
                  end={endTime}
                  onChange={({ start, end }) => { setStartTime(start); setEndTime(end); }}
                />
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
                  <p className="font-medium">
                    {selectedServices.length > 0
                      ? selectedServices.map(id => services.find(s => s.id === id)?.name).join(", ")
                      : "No services selected"}
                  </p>
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
                >
                  Submit Request
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestService;
