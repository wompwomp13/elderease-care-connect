import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Heart, Mail, Phone, MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";

const VolunteerSection = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Thank you for your interest in volunteering! We'll be in touch soon.");
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
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    required
                    className="mt-1.5"
                  />
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
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold text-foreground">
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    required
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="service" className="text-sm font-semibold text-foreground">
                    Service You Want to Help With *
                  </Label>
                  <Input
                    id="service"
                    type="text"
                    placeholder="e.g., Companionship, Transportation, Meal Prep"
                    required
                    className="mt-1.5"
                  />
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
                    className="mt-1.5 resize-none"
                  />
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