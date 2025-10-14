import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, TrendingUp, Clock } from "lucide-react";

const Dashboard = () => {
  const stats = [
    { title: "Total Service Requests", value: "156", icon: ClipboardList, change: "+12% from last month", color: "text-blue-600" },
    { title: "Active Volunteers", value: "42", icon: Users, change: "+5 this week", color: "text-green-600" },
    { title: "Completion Rate", value: "94%", icon: TrendingUp, change: "+3% from last month", color: "text-purple-600" },
    { title: "Avg Response Time", value: "2.4hrs", icon: Clock, change: "-0.5hrs improvement", color: "text-orange-600" },
  ];

  const topServices = [
    { name: "Companionship", requests: 45, percentage: 28.8 },
    { name: "Running Errands", requests: 38, percentage: 24.4 },
    { name: "Light Housekeeping", requests: 32, percentage: 20.5 },
    { name: "Home Visits", requests: 25, percentage: 16.0 },
    { name: "Socialization", requests: 16, percentage: 10.3 },
  ];

  const recentActivity = [
    { id: 1, action: "New service request", detail: "Companionship - Mrs. Johnson", time: "5 mins ago" },
    { id: 2, action: "Volunteer approved", detail: "Sarah Williams", time: "23 mins ago" },
    { id: 3, action: "Service completed", detail: "Errands - Mr. Davis", time: "1 hour ago" },
    { id: 4, action: "New application", detail: "Mike Chen - Volunteer", time: "2 hours ago" },
  ];

  const volunteerRatings = [
    { name: "Sarah Williams", rating: 4.9, services: 28 },
    { name: "John Martinez", rating: 4.8, services: 25 },
    { name: "Emily Chen", rating: 4.8, services: 23 },
    { name: "Robert Johnson", rating: 4.7, services: 21 },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
          <p className="text-muted-foreground">Monitor system performance and key metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Requested Services */}
          <Card>
            <CardHeader>
              <CardTitle>Most Requested Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topServices.map((service) => (
                <div key={service.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{service.name}</span>
                    <span className="text-muted-foreground">{service.requests} requests</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${service.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top Rated Volunteers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Rated Volunteers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {volunteerRatings.map((volunteer, index) => (
                  <div key={volunteer.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{volunteer.name}</p>
                        <p className="text-xs text-muted-foreground">{volunteer.services} services completed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="font-semibold">{volunteer.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
