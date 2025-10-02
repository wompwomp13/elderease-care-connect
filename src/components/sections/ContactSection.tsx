import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, Mail } from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

const ContactSection = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For prototype, just show alert
    alert("Thank you! Your appointment request has been received.");
  };

  return (
    <section id="contact" className="py-20 bg-gradient-to-b from-secondary/30 to-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Phone className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Book Your Service</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Schedule Your Needed Service
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Fill out the form below and we'll get back to you within 24 hours
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="max-w-4xl mx-auto bg-card border-primary/10 shadow-2xl">
            <CardContent className="p-8 md:p-12">
            <div className="flex items-center gap-3 mb-8 justify-center">
              <img src={logo} alt="ElderEase" className="h-14 w-14" />
              <span className="text-2xl font-bold text-primary">ElderEase</span>
            </div>

            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">Name *</label>
                <Input placeholder="Enter your name" className="bg-background" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">Email *</label>
                <Input type="email" placeholder="Enter your email" className="bg-background" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">Service Needed *</label>
                <Input placeholder="e.g., Companionship" className="bg-background" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">Phone Number *</label>
                <Input placeholder="(555) 123-4567" className="bg-background" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">Select Time *</label>
                <Input type="time" className="bg-background" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">Address *</label>
                <Input placeholder="Enter address" className="bg-background" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">Select Date *</label>
                <Input type="date" className="bg-background" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground">Senior's Age *</label>
                <Input type="number" placeholder="Enter age" className="bg-background" required />
              </div>
              
              <div className="md:col-span-2 flex flex-col items-center gap-6 mt-4">
                <Button type="submit" size="lg" className="rounded-full px-12 bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 transition-opacity">
                  Submit Request
                </Button>
                <div className="flex flex-col sm:flex-row gap-6 text-sm bg-secondary/30 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">+63 123456789</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">ElderEase@gmail.com</span>
                  </div>
                </div>
              </div>
            </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;
