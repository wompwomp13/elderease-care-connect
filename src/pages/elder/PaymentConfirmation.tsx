import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import logo from "@/assets/logo.png";
import { CheckCircle, Calendar, Clock, DollarSign, User, MapPin, Home } from "lucide-react";

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
              <p className="text-2xl font-bold text-primary">#SR-{Math.floor(Math.random() * 10000)}</p>
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
                  <span className="font-medium">{requestData.time || "3:00 PM"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">2 hours (estimated)</span>
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
              <div className="bg-muted/50 p-4 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Fee (2 hours):</span>
                  <span className="font-medium">$60.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Charge:</span>
                  <span className="font-medium">$5.00</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-bold text-primary text-lg">$65.00</span>
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