import { Link } from "react-router-dom";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logo from "@/assets/logo.png";
import { HeartHandshake, Home, ShoppingBasket, Users, Calendar, Check } from "lucide-react";

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
          <Link to="/elder/services-info" className="font-semibold underline underline-offset-8 opacity-100">Services</Link>
          <Link to="/elder/browse-services" className="opacity-90 hover:opacity-100 transition-opacity">Browse</Link>
          <Link to="/elder/request-service" className="opacity-90 hover:opacity-100 transition-opacity">Request Service</Link>
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

const services = [
  {
    id: "companionship",
    icon: HeartHandshake,
    title: "Companionship",
    description: "Friendly support and conversation for daily comfort",
    details: [
      "One-on-one meaningful conversations",
      "Emotional support and active listening",
      "Engaging activities and games",
      "Reading books or newspapers together",
      "Watching movies or favorite shows"
    ],
    benefits: "Combat loneliness and maintain mental wellness through regular social interaction"
  },
  {
    id: "home-visits",
    icon: Users,
    title: "Home Visits",
    description: "Regular check-ins and support at home",
    details: [
      "Scheduled wellness check-ins",
      "Medication reminder assistance",
      "Safety assessment of living space",
      "Coordination with family members",
      "Emergency contact protocols"
    ],
    benefits: "Peace of mind knowing your loved one is safe and cared for"
  },
  {
    id: "errands",
    icon: ShoppingBasket,
    title: "Running Errands",
    description: "Assistance with shopping and daily tasks",
    details: [
      "Grocery shopping and delivery",
      "Pharmacy pickups",
      "Post office visits",
      "Banking assistance",
      "Pet supply shopping"
    ],
    benefits: "Maintain independence while getting help with tasks that become challenging"
  },
  {
    id: "housekeeping",
    icon: Home,
    title: "Light Housekeeping",
    description: "Help maintaining a clean and comfortable home",
    details: [
      "Tidying and organizing spaces",
      "Laundry and linen changes",
      "Dishwashing and kitchen cleanup",
      "Dusting and vacuuming",
      "Trash removal"
    ],
    benefits: "Live in a clean, organized environment without the physical strain"
  },
  {
    id: "socialization",
    icon: Users,
    title: "Socialization Activities",
    description: "Activities and outings for social engagement",
    details: [
      "Accompanied outings to parks",
      "Attendance at community events",
      "Group activities and clubs",
      "Cultural experiences (museums, concerts)",
      "Restaurant and café visits"
    ],
    benefits: "Stay active and connected with your community"
  }
];

const ServicesInfo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <ElderNavbar />
      
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <HeartHandshake className="h-5 w-5 text-primary" />
            <span className="text-primary font-medium">Our Services</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Comprehensive Care Services
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover how our dedicated volunteers can support you or your loved ones with compassionate, professional care
          </p>
        </div>

        {/* Services Grid */}
        <div className="space-y-8">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Card key={service.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">{service.title}</CardTitle>
                      <CardDescription className="text-base">{service.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        What's Included
                      </h3>
                      <ul className="space-y-2">
                        {service.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl border border-primary/20">
                      <h3 className="font-semibold text-lg mb-3">Key Benefits</h3>
                      <p className="text-muted-foreground">{service.benefits}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-8 rounded-2xl border border-primary/20">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Browse our available services and volunteers, or request a service directly
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/elder/browse-services">
              <Button size="lg" className="gap-2">
                <ShoppingBasket className="h-5 w-5" />
                Browse Services
              </Button>
            </Link>
            <Link to="/elder/request-service">
              <Button size="lg" variant="outline" className="gap-2">
                <Calendar className="h-5 w-5" />
                Request Service
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesInfo;