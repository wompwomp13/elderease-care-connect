import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ClipboardList, TrendingUp, Clock, Star, Award, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import volunteerSarah from "@/assets/volunteer-sarah.jpg";
import volunteerJohn from "@/assets/volunteer-john.jpg";
import volunteerEmily from "@/assets/volunteer-emily.jpg";

const Dashboard = () => {
  const [expandedVolunteer, setExpandedVolunteer] = useState<string | null>(null);

  const stats = [
    { 
      title: "Total Service Requests", 
      value: "156", 
      icon: ClipboardList, 
      change: "+12%", 
      trend: "up",
      color: "from-emerald-500 to-emerald-600",
      subtitle: "from last month" 
    },
    { 
      title: "Active Volunteers", 
      value: "42", 
      icon: Users, 
      change: "+5", 
      trend: "up",
      color: "from-blue-500 to-blue-600",
      subtitle: "this week" 
    },
    { 
      title: "Completion Rate", 
      value: "94%", 
      icon: TrendingUp, 
      change: "+3%", 
      trend: "up",
      color: "from-purple-500 to-purple-600",
      subtitle: "from last month" 
    },
    { 
      title: "Avg Response Time", 
      value: "2.4hrs", 
      icon: Clock, 
      change: "-0.5hrs", 
      trend: "down",
      color: "from-orange-500 to-orange-600",
      subtitle: "improvement" 
    },
  ];

  const weeklyData = [
    { day: "Sun", requests: 12 },
    { day: "Mon", requests: 28 },
    { day: "Tue", requests: 24 },
    { day: "Wed", requests: 32 },
    { day: "Thu", requests: 18 },
    { day: "Fri", requests: 22 },
    { day: "Sat", requests: 20 },
  ];

  const monthlyTrend = [
    { month: "Jan", services: 120 },
    { month: "Feb", services: 145 },
    { month: "Mar", services: 156 },
  ];

  const topVolunteers = [
    {
      id: "1",
      name: "Sarah Williams",
      rating: 4.9,
      services: 28,
      image: volunteerSarah,
      specialty: "Companionship & Socialization",
      experience: "3 years",
      badge: "Top Performer",
      reviews: 24,
      completionRate: 98,
      about: "I work with the following requests: Success in work and personal life, in work-related issues, fears, depression, anxiety, panic attacks, self-harm, unexplained problems, conflict relationships, psychosomatic illnesses (PTSD), grief, loss, trust issues, etc.",
      education: "Certified Elder Care Specialist",
      method: "Person-centered approach with focus on building meaningful connections"
    },
    {
      id: "2",
      name: "John Martinez",
      rating: 4.8,
      services: 25,
      image: volunteerJohn,
      specialty: "Running Errands & Light Housekeeping",
      experience: "2.5 years",
      badge: "Rising Star",
      reviews: 21,
      completionRate: 96,
      about: "Dedicated to helping elderly individuals maintain their independence. Specialized in practical assistance and creating safe, comfortable home environments.",
      education: "Healthcare Assistant Certification",
      method: "Efficient and compassionate care with attention to detail"
    },
    {
      id: "3",
      name: "Emily Chen",
      rating: 4.8,
      services: 23,
      image: volunteerEmily,
      specialty: "Home Visits & Healthcare Support",
      experience: "2 years",
      badge: "Community Favorite",
      reviews: 20,
      completionRate: 97,
      about: "Passionate about elderly care with a focus on health monitoring and emotional support. Creating a positive impact in the lives of seniors.",
      education: "Registered Nurse, Gerontology Specialist",
      method: "Holistic care approach combining medical expertise with empathy"
    },
  ];

  const topServices = [
    { name: "Companionship", requests: 45, percentage: 28.8 },
    { name: "Running Errands", requests: 38, percentage: 24.4 },
    { name: "Light Housekeeping", requests: 32, percentage: 20.5 },
    { name: "Home Visits", requests: 25, percentage: 16.0 },
    { name: "Socialization", requests: 16, percentage: 10.3 },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dashboard Overview</h1>
          <p className="text-muted-foreground">Monitor system performance and key metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="relative overflow-hidden border-0 shadow-lg">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-90`} />
              <CardHeader className="relative pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium text-white/90">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-5 w-5 text-white/80" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="flex items-center gap-1 text-sm text-white/90">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">{stat.change}</span>
                  <span className="text-white/70">{stat.subtitle}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg">Weekly Activity</CardTitle>
              <p className="text-sm text-muted-foreground">Service requests this week</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg">Monthly Trend</CardTitle>
              <p className="text-sm text-muted-foreground">Total services completed</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="services" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Volunteers Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Top Volunteers</h2>
              <p className="text-sm text-muted-foreground">Outstanding performers this month</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {topVolunteers.map((volunteer, index) => (
              <Card 
                key={volunteer.id} 
                className={`shadow-lg border-0 transition-all cursor-pointer hover:shadow-xl ${
                  expandedVolunteer === volunteer.id ? "lg:col-span-3" : ""
                }`}
                onClick={() => setExpandedVolunteer(expandedVolunteer === volunteer.id ? null : volunteer.id)}
              >
                {expandedVolunteer === volunteer.id ? (
                  // Expanded View
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Image Gallery */}
                      <div className="space-y-2">
                        <img 
                          src={volunteer.image} 
                          alt={volunteer.name}
                          className="w-full h-64 object-cover rounded-lg"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <img 
                            src={volunteer.image} 
                            alt={`${volunteer.name} 2`}
                            className="w-full h-32 object-cover rounded-lg opacity-70"
                          />
                          <img 
                            src={volunteer.image} 
                            alt={`${volunteer.name} 3`}
                            className="w-full h-32 object-cover rounded-lg opacity-70"
                          />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="lg:col-span-2 space-y-6">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-2xl font-bold">{volunteer.name}</h3>
                              <p className="text-sm text-muted-foreground">{volunteer.experience} of experience</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Award className="h-5 w-5 text-yellow-500" />
                              <span className="text-sm font-medium">{volunteer.badge}</span>
                            </div>
                          </div>
                          <div className="text-lg font-semibold text-primary">
                            Individual consultation: 60 mins
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <Card className="bg-muted/50 border-0">
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">About me</div>
                              <p className="text-sm">{volunteer.about}</p>
                            </CardContent>
                          </Card>

                          <Card className="bg-muted/50 border-0">
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Education</div>
                              <p className="text-sm font-medium mb-2">{volunteer.education}</p>
                              <p className="text-xs text-muted-foreground">Working with expertise in {volunteer.specialty.toLowerCase()}</p>
                            </CardContent>
                          </Card>

                          <Card className="bg-muted/50 border-0">
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Care Method</div>
                              <p className="text-sm">{volunteer.method}</p>
                            </CardContent>
                          </Card>

                          <Card className="bg-muted/50 border-0">
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground mb-1">Performance</div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <span className="text-sm font-medium">{volunteer.rating} / 5.0</span>
                                  <span className="text-xs text-muted-foreground">({volunteer.reviews} reviews)</span>
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium">{volunteer.completionRate}%</span> completion rate
                                </div>
                                <div className="text-sm text-muted-foreground">{volunteer.services} services completed</div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Collapsed View
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4">
                      <div className="relative">
                        <img 
                          src={volunteer.image} 
                          alt={volunteer.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        {index === 0 && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Award className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold truncate">{volunteer.name}</p>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                            {volunteer.badge}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{volunteer.specialty}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{volunteer.rating}</span>
                          </div>
                          <span className="text-muted-foreground">{volunteer.services} services</span>
                          <span className="text-muted-foreground">{volunteer.completionRate}% rate</span>
                        </div>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
                        expandedVolunteer === volunteer.id ? "rotate-90" : ""
                      }`} />
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Most Requested Services */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-lg">Most Requested Services</CardTitle>
            <p className="text-sm text-muted-foreground">Distribution of service types</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {topServices.map((service) => (
              <div key={service.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{service.name}</span>
                  <span className="text-muted-foreground">{service.requests} requests</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-primary to-primary-dark rounded-full h-2.5 transition-all"
                    style={{ width: `${service.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;