import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, Mail } from "lucide-react";
import logo from "@/assets/logo.png";

const ContactSection = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For prototype, just show alert
    alert("Thank you! Your appointment request has been received.");
  };

  return (
    <section id="contact" className="py-20 bg-gradient-to-b from-background to-accent/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">Schedule Your Needed Service</h2>
        </div>

        <Card className="max-w-4xl mx-auto bg-accent/50 border-none shadow-2xl">
          <CardContent className="p-8 md:p-12">
            <div className="flex items-center gap-3 mb-8">
              <img src={logo} alt="ElderEase" className="h-12 w-12" />
              <span className="text-2xl font-bold text-foreground">ElderEase</span>
            </div>

            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Name :</label>
                <Input placeholder="Enter your name" className="bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email :</label>
                <Input type="email" placeholder="Enter your email" className="bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Service that you need :</label>
                <Input placeholder="Enter service" className="bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number :</label>
                <Input placeholder="Enter phone" className="bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Select the time:</label>
                <Input type="time" className="bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Address :</label>
                <Input placeholder="Enter address" className="bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Select the date:</label>
                <Input type="date" className="bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Age of the Senior :</label>
                <Input placeholder="Enter age" className="bg-background" />
              </div>
              
              <div className="md:col-span-2 flex flex-col items-center gap-4 mt-4">
                <Button type="submit" size="lg" className="rounded-full px-12">
                  Submit
                </Button>
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <span>+63 123456789</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span>ElderEase@gmail.com</span>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ContactSection;
