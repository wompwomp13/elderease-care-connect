import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import logo from "@/assets/logo.png";
import { CheckCircle, Calendar, Clock, DollarSign, User, MapPin, Home } from "lucide-react";
import { minutesSinceMidnight } from "@/lib/time";

type PerServiceHours = Record<string, number>;

const ElderNavbar = () => {
  const user = getCurrentUser();
  return (
    <nav className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-md">
      <div className="container mx-auto h-16 px-4 flex items-center justify-between">
        <Link to="/elder" className="flex items-center gap-2">
          <img src={logo} alt="ElderEase Logo" className="h-8 w-8" />
          <span className="text-lg font-bold">ElderEase</span>
        </Link>
        <div className="hidden md:flex items-center gap-5">
          <Link to="/elder" className="opacity-90 hover:opacity-100 transition-opacity">Home</Link>
          {user ? (
            <Button variant="nav" size="sm" onClick={() => { logout(); window.location.href = "/"; }}>
              Logout
            </Button>
          ) : (
            <Link to="/login"><Button variant="nav" size="sm">Login</Button></Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const PaymentConfirmation = () => {
  const location = useLocation();
  const requestData = location.state || {};

  const serviceRates: Record<string, number> = {
    "Companionship": 150,
    "Light Housekeeping": 170,
    "Running Errands": 200,
    "Home Visits": 180,
    "Socialization": 230,
  };

  const parseServicesArray = (rd: any): string[] => {
    if (Array.isArray(rd.servicesArray) && rd.servicesArray.length > 0) return rd.servicesArray as string[];
    if (typeof rd.services === "string" && rd.services.length > 0) return String(rd.services).split(",").map((s) => s.trim());
    return [];
  };

  const startEnd = useMemo(() => {
    const start24 = requestData.startTime24 as string | undefined;
    const end24 = requestData.endTime24 as string | undefined;
    if (start24 && end24) return { start24, end24 };
    // Fallback: try to parse from time string like "3:00 PM to 5:00 PM" (not robust, but fallback only)
    const timeStr = String(requestData.time || "");
    const parts = timeStr.split(/to|-/i).map((s: string) => s.trim());
    if (parts.length === 2) return { start24: start24 ?? "", end24: end24 ?? "" };
    return { start24: "", end24: "" };
  }, [requestData]);

  const duration = useMemo(() => {
    const startM = minutesSinceMidnight(startEnd.start24);
    const endM = minutesSinceMidnight(startEnd.end24);
    if (startM < 0 || endM < 0 || endM <= startM) return { minutes: 0, hours: 0 };
    const minutes = endM - startM;
    const hours = minutes / 60;
    return { minutes, hours };
  }, [startEnd]);

  const servicesSelected = useMemo(() => parseServicesArray(requestData), [requestData]);
  const perServiceHoursByName: PerServiceHours = useMemo(() => {
    const map = requestData.perServiceHoursByName as PerServiceHours | undefined;
    if (map && typeof map === "object") return map;
    return {};
  }, [requestData]);

  const pricing = useMemo(() => {
    if (servicesSelected.length === 0) return { lineItems: [], subtotal: 0, commission: 0, total: 0 };
    const hasPerService = Object.keys(perServiceHoursByName).length > 0;
    const fallbackHours = duration.hours;
    // If per-service hours provided, use them; else fallback to scheduled duration
    const lineItems = servicesSelected.map((name: string) => {
      const rate = serviceRates[name] ?? 0;
      const hours = hasPerService ? Math.max(0, Number(perServiceHoursByName[name] ?? 0)) : fallbackHours;
      const amount = rate * (Number.isFinite(hours) ? hours : 0);
      return { name, rate, hours, amount };
    }).filter((li) => li.hours > 0 && li.rate >= 0);
    const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
    const commission = subtotal * 0.05;
    const total = subtotal + commission;
    return { lineItems, subtotal, commission, total };
  }, [servicesSelected, duration.hours, perServiceHoursByName]);

  const formatPHP = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", currencyDisplay: "narrowSymbol", minimumFractionDigits: 2 }).format(value);

  const humanDuration = useMemo(() => {
    const mins = duration.minutes;
    if (mins <= 0) return "0 minutes";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hPart = h > 0 ? `${h} hour${h === 1 ? "" : "s"}` : "";
    const mPart = m > 0 ? `${m} minute${m === 1 ? "" : "s"}` : "";
    return [hPart, mPart].filter(Boolean).join(" ");
  }, [duration]);

  const confirmationNumber = useMemo(() => {
    const rid = String(requestData.requestId || "");
    if (rid) return `#SR-${rid.slice(0, 8).toUpperCase()}`;
    const ts = Date.now().toString(36).toUpperCase();
    return `#SR-${ts.slice(-8)}`;
  }, [requestData.requestId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <ElderNavbar />
      
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Request Confirmed!
          </h1>
          <p className="text-muted-foreground text-lg">
            Your service request has been received and is being processed
          </p>
        </div>

        {/* Confirmation Details Card */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="text-xl">Request Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Confirmation Number */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Confirmation Number</p>
              <p className="text-2xl font-bold text-primary">{confirmationNumber}</p>
            </div>

            <Separator />

            {/* Client Information */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Client Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{requestData.name || "John Doe"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span className="font-medium">{requestData.age || "72"} years</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-medium text-right max-w-[60%]">{requestData.address || "123 Maple Street, Springfield"}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Service Details */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Service Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Services:</span>
                  <span className="font-medium text-right max-w-[60%]">{requestData.services || "Companionship, Light Housekeeping"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{requestData.date || "March 25, 2025"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{requestData.time || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{humanDuration}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Information */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Payment Information
              </h3>
              <div className="bg-muted/50 p-4 rounded-xl space-y-3 text-sm">
                {pricing.lineItems.length > 0 ? (
                  <div className="space-y-2">
                    {pricing.lineItems.map((li) => (
                      <div key={li.name} className="flex justify-between">
                        <span className="text-muted-foreground">{li.name} ({formatPHP(li.rate)}/hr × {li.hours.toFixed(2)} hr)</span>
                        <span className="font-medium">{formatPHP(li.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground">No services selected</div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPHP(pricing.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission (5%)</span>
                  <span className="font-medium">{formatPHP(pricing.commission)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-bold text-primary text-lg">{formatPHP(pricing.total)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                * Payment will be processed after service completion. You will receive an invoice via email.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps Card */}
        <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-lg">What Happens Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                <span>Our team will review your request and match you with the best available volunteer</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                <span>You'll receive a confirmation email with volunteer details within 2 hours</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                <span>The assigned volunteer will contact you 24 hours before the scheduled visit</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                <span>Payment will be processed after service completion</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/elder">
            <Button size="lg" className="gap-2 w-full sm:w-auto">
              <Home className="h-5 w-5" />
              Return to Home
            </Button>
          </Link>
          <Link to="/elder/schedule">
            <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
              <Calendar className="h-5 w-5" />
              View My Schedule
            </Button>
          </Link>
        </div>

        {/* Support Section */}
        <div className="mt-8 text-center p-6 bg-muted/50 rounded-xl">
          <p className="text-sm text-muted-foreground mb-2">
            Need to make changes or have questions?
          </p>
          <p className="text-sm">
            Contact us at <a href="tel:555-123-4567" className="text-primary font-medium hover:underline">(555) 123-4567</a>
            {" "}or{" "}
            <a href="mailto:support@elderease.com" className="text-primary font-medium hover:underline">support@elderease.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;