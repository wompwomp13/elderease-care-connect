import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Heart, Mail, Phone, MapPin, Clock, Users, Home, ShoppingBasket, HeartHandshake, Upload, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SERVICES = [
  { id: "companionship", name: "Companionship", description: "Friendly support and conversation for daily comfort", icon: HeartHandshake },
  { id: "housekeeping", name: "Light Housekeeping", description: "Help maintaining a clean and comfortable home", icon: Home },
  { id: "errands", name: "Running Errands", description: "Assistance with shopping and daily tasks", icon: ShoppingBasket },
  { id: "visits", name: "Home Visits", description: "Regular check-ins and support at home", icon: Users },
];

const normalizePHPhone = (input: string): string | null => {
  const digits = input.replace(/\D+/g, "");
  if (digits.startsWith("639") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("09") && digits.length === 11) return `+63${digits.slice(1)}`;
  if (digits.startsWith("9") && digits.length === 10) return `+63${digits}`;
  if (digits.startsWith("63") && digits.length === 12) return `+${digits}`;
  return null;
};

const VolunteerSection = () => {
  const formStartRef = useRef<number | null>(null);
  const markFormStarted = () => { if (!formStartRef.current) formStartRef.current = Date.now(); };
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [idPreviewName, setIdPreviewName] = useState<string | null>(null); // placeholder, not uploaded
  const [gender, setGender] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const toggleService = (id: string) => {
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !address.trim() || !gender || selectedServices.length === 0) {
      toast({ title: "Please complete all required fields and select at least one service.", variant: "destructive" });
      return;
    }
    const normalizedPhone = normalizePHPhone(phone);
    if (!normalizedPhone) {
      setPhoneError("Please use +63 9XXXXXXXXX");
      toast({ title: "Invalid Philippine phone number", description: "Use +63 9XXXXXXXXX format.", variant: "destructive" });
      return;
    }
    setPhoneError(null);
    try {
      const fullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");
      await addDoc(collection(db, "pendingVolunteers"), {
        fullName: fullName.trim(),
        firstName: firstName.trim(),
        middleName: middleName.trim() || null,
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
        address: address.trim(),
        gender,
        services: selectedServices,
        message: message.trim(),
        idFileName: idPreviewName, // placeholder only; file is not uploaded yet
        status: "pending",
        createdAt: serverTimestamp(),
      });
      // fire-and-forget: record form completion time
      try {
        const startedAtMs = formStartRef.current ?? Date.now();
        const durationMs = Math.max(0, Date.now() - startedAtMs);
        await addDoc(collection(db, "formMetrics"), {
          type: "volunteer_application",
          userRole: "volunteer",
          email: email.trim().toLowerCase(),
          durationMs,
          startedAtMs,
          submittedAt: serverTimestamp(),
        });
      } catch {}
      toast({ title: "Application submitted!", description: "Our admin team will review your details and contact you soon." });
      setFirstName(""); setMiddleName(""); setLastName(""); setEmail(""); setPhone(""); setAddress(""); setMessage(""); setSelectedServices([]); setIdPreviewName(null); setGender("");
    } catch (err: any) {
      toast({ title: "Submission failed", description: err?.message ?? "Please try again later.", variant: "destructive" });
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-accent/10 via-background to-primary/5">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Heart className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Join Our Team</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Become a Companion Volunteer
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Share your time, skills, and compassion with seniors in your community. Fill out the form below to get started.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Contact Information Card */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground shadow-2xl border-0 h-full">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6">Get In Touch</h3>
              <p className="mb-8 opacity-90">
                Have questions about volunteering? We're here to help! Reach out through any of these channels.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Phone</p>
                    <p className="opacity-90">(555) 123-4567</p>
                    <p className="text-sm opacity-75">Mon-Fri 9AM-6PM</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Email</p>
                    <p className="opacity-90">volunteer@elderease.com</p>
                    <p className="text-sm opacity-75">We reply within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Address</p>
                    <p className="opacity-90">123 Care Street</p>
                    <p className="opacity-90">Community City, ST 12345</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Office Hours</p>
                    <p className="opacity-90">Monday - Friday: 9:00 AM - 6:00 PM</p>
                    <p className="opacity-90">Saturday: 10:00 AM - 4:00 PM</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* Volunteer Form */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="shadow-2xl h-full">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5" onFocusCapture={markFormStarted}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-semibold text-foreground">
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Juan"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm font-semibold text-foreground">
                      Last Name *
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Dela Cruz"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="middleName" className="text-sm font-semibold text-foreground">
                    Middle Name
                  </Label>
                  <Input
                    id="middleName"
                    type="text"
                    placeholder="Optional"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-foreground">Gender *</Label>
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

                <div>
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold text-foreground">
                    Phone Number (PH) *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+63 9XXXXXXXXX"
                    required
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(null); }}
                    aria-invalid={!!phoneError}
                    className={`mt-1.5 ${phoneError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-foreground">
                    Services You Want to Help With *
                  </Label>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2">
                    {SERVICES.map((s) => {
                      const Icon = s.icon;
                      const checked = selectedServices.includes(s.id);
                      const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleService(s.id);
                        }
                      };
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleService(s.id)}
                          onKeyDown={handleKeyDown}
                          role="checkbox"
                          aria-checked={checked}
                          tabIndex={0}
                          className={`w-full p-3 rounded-lg border text-left flex items-start gap-3 cursor-pointer ${checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                          aria-label={`Toggle ${s.name}`}
                        >
                          <span
                            aria-hidden
                            className={`h-4 w-4 rounded-sm border border-primary grid place-items-center mt-0.5 ${checked ? "bg-primary text-primary-foreground" : "bg-transparent"}`}
                          >
                            {checked ? <Check className="h-3 w-3" /> : null}
                          </span>
                          <div className="p-2 rounded-md bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium leading-none mb-1">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="text-sm font-semibold text-foreground">
                    Address *
                  </Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="Your full address"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="message" className="text-sm font-semibold text-foreground">
                    Tell Us How You Can Help *
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Share your availability, skills, and why you'd like to volunteer..."
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1.5 resize-none"
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold text-foreground">Upload Valid ID (placeholder)</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <Input type="file" accept="image/*,application/pdf" disabled onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setIdPreviewName(file ? file.name : null);
                    }} aria-label="Upload government ID (disabled placeholder)" />
                    <Button type="button" variant="outline" className="gap-2" disabled>
                      <Upload className="h-4 w-4" /> Upload
                    </Button>
                  </div>
                  {idPreviewName && (
                    <p className="text-xs text-muted-foreground mt-1">Selected: {idPreviewName} (not uploaded)</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">ID upload will be enabled once storage is set up.</p>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 transition-opacity"
                >
                  Submit Application
                </Button>
              </form>
            </CardContent>
          </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default VolunteerSection;