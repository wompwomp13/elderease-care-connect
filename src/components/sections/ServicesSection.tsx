import { Card, CardContent } from "@/components/ui/card";
import { Heart, ShoppingBag, Home, Eye, Sparkles } from "lucide-react";

const services = [
  {
    icon: Heart,
    title: "Companionship",
    description: "Friendly support and conversation for daily comfort"
  },
  {
    icon: Sparkles,
    title: "Light Housekeeping",
    description: "Help maintaining a clean and comfortable home"
  },
  {
    icon: ShoppingBag,
    title: "Running Errands",
    description: "Assistance with shopping and daily tasks"
  },
  {
    icon: Home,
    title: "Home Visits",
    description: "Regular check-ins and support at home"
  },
  {
    icon: Eye,
    title: "Socialization",
    description: "Activities and outings for social engagement"
  }
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-20 bg-gradient-to-b from-background to-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-primary-dark mb-4">
            Need a companion for today?<br />
            Call for an companionship services!
          </h2>
          <h3 className="text-3xl font-semibold text-foreground mt-8 mb-4">Our All Services</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore fugiat sunt culpa officia deserunt mollit anim eu laborum.
          </p>
        </div>

        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-none bg-card"
            >
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <service.icon className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{service.title}</h4>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
