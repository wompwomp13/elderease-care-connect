import { Link } from "react-router-dom";
import { getCurrentUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.png";
import volunteerSarah from "@/assets/volunteer-sarah.jpg";
import volunteerJohn from "@/assets/volunteer-john.jpg";
import volunteerEmily from "@/assets/volunteer-emily.jpg";
import { HeartHandshake, Home, ShoppingBasket, Users, Star, Clock, DollarSign, TrendingUp } from "lucide-react";

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
          <Link to="/elder/services-info" className="opacity-90 hover:opacity-100 transition-opacity">Services</Link>
          <Link to="/elder/browse-services" className="font-semibold underline underline-offset-8 opacity-100">Browse</Link>
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

const serviceListings = [
  {
    id: 1,
    service: "Companionship",
    icon: HeartHandshake,
    price: "$25/hour",
    dynamicPrice: "Low demand",
    volunteer: {
      name: "Sarah Mitchell",
      image: volunteerSarah,
      rating: 4.9,
      completedSessions: 127
    },
    description: "Friendly conversation, activities, and emotional support",
    duration: "1-3 hours",
    availability: "Mon-Fri, 9am-5pm"
  },
  {
    id: 2,
    service: "Light Housekeeping",
    icon: Home,
    price: "$30/hour",
    dynamicPrice: "Medium demand",
    volunteer: {
      name: "John Davis",
      image: volunteerJohn,
      rating: 4.8,
      completedSessions: 98
    },
    description: "Tidying, laundry, dishwashing, and light cleaning",
    duration: "2-4 hours",
    availability: "Tue-Sat, 8am-4pm"
  },
  {
    id: 3,
    service: "Running Errands",
    icon: ShoppingBasket,
    price: "$35/hour",
    dynamicPrice: "High demand",
    volunteer: {
      name: "Emily Rodriguez",
      image: volunteerEmily,
      rating: 5.0,
      completedSessions: 143
    },
    description: "Grocery shopping, pharmacy pickups, and daily tasks",
    duration: "1-2 hours",
    availability: "Mon-Sun, 10am-6pm"
  },
  {
    id: 4,
    service: "Home Visits",
    icon: Users,
    price: "$28/hour",
    dynamicPrice: "Low demand",
    volunteer: {
      name: "Sarah Mitchell",
      image: volunteerSarah,
      rating: 4.9,
      completedSessions: 127
    },
    description: "Regular check-ins, medication reminders, safety checks",
    duration: "30min-1 hour",
    availability: "Daily, flexible"
  },
  {
    id: 5,
    service: "Socialization Activities",
    icon: Users,
    price: "$32/hour",
    dynamicPrice: "Medium demand",
    volunteer: {
      name: "John Davis",
      image: volunteerJohn,
      rating: 4.8,
      completedSessions: 98
    },
    description: "Outings, community events, and social engagement",
    duration: "2-4 hours",
    availability: "Weekends preferred"
  }
];

const BrowseServices = () => {
  const getDemandColor = (demand: string) => {
    if (demand === "High demand") return "bg-red-500/10 text-red-700 border-red-500/20";
    if (demand === "Medium demand") return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    return "bg-green-500/10 text-green-700 border-green-500/20";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <ElderNavbar />
      
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <ShoppingBasket className="h-5 w-5 text-primary" />
            <span className="text-primary font-medium">Available Now</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Browse Our Services
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            View available services with transparent pricing based on current demand. All volunteers are background-checked and highly rated.
          </p>
        </div>

        {/* Pricing Info Banner */}
        <div className="mb-8 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Dynamic Pricing</h3>
              <p className="text-sm text-muted-foreground">
                Our prices adjust based on real-time demand to ensure availability and fair compensation for volunteers. 
                Book during low-demand periods to get the best rates!
              </p>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {serviceListings.map((listing) => {
            const Icon = listing.icon;
            return (
              <Card key={listing.id} className="overflow-hidden hover:shadow-xl transition-all">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl mb-1">{listing.service}</CardTitle>
                        <CardDescription>{listing.description}</CardDescription>
                      </div>
                    </div>
                    <Badge className={getDemandColor(listing.dynamicPrice)}>
                      {listing.dynamicPrice}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Volunteer Info */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <img 
                      src={listing.volunteer.image} 
                      alt={listing.volunteer.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold">{listing.volunteer.name}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="font-medium">{listing.volunteer.rating}</span>
                        </div>
                        <span>•</span>
                        <span>{listing.volunteer.completedSessions} sessions</span>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-gradient-to-br from-primary/5 to-transparent rounded-xl border border-primary/10">
                      <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground mb-1">Price</p>
                      <p className="font-semibold">{listing.price}</p>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-primary/5 to-transparent rounded-xl border border-primary/10">
                      <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground mb-1">Duration</p>
                      <p className="font-semibold text-sm">{listing.duration}</p>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-primary/5 to-transparent rounded-xl border border-primary/10">
                      <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground mb-1">Available</p>
                      <p className="font-semibold text-xs">{listing.availability.split(',')[0]}</p>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Link to="/elder/request-service">
                    <Button className="w-full" size="lg">
                      Request This Service
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Can't find what you're looking for?
          </p>
          <Link to="/elder/request-service">
            <Button variant="outline" size="lg">
              Submit a Custom Request
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BrowseServices;