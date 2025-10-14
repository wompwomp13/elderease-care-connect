import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, Phone, Calendar } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const VolunteerApplications = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState([
    {
      id: 1,
      name: "Sarah Williams",
      email: "sarah.w@email.com",
      phone: "(555) 123-4567",
      experience: "5 years in elderly care",
      availability: "Weekdays 9AM-5PM",
      appliedDate: "2025-01-08",
      status: "pending",
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "m.chen@email.com",
      phone: "(555) 234-5678",
      experience: "3 years volunteering at senior center",
      availability: "Weekends and evenings",
      appliedDate: "2025-01-07",
      status: "pending",
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      email: "emily.r@email.com",
      phone: "(555) 345-6789",
      experience: "Nursing background, 7 years",
      availability: "Flexible schedule",
      appliedDate: "2025-01-06",
      status: "pending",
    },
  ]);

  const handleApprove = (id: number, name: string) => {
    setApplications(apps => apps.map(app => 
      app.id === id ? { ...app, status: "approved" } : app
    ));
    toast({
      title: "Application Approved",
      description: `${name} has been approved as a volunteer.`,
    });
  };

  const handleReject = (id: number, name: string) => {
    setApplications(apps => apps.map(app => 
      app.id === id ? { ...app, status: "rejected" } : app
    ));
    toast({
      title: "Application Rejected",
      description: `${name}'s application has been rejected.`,
      variant: "destructive",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending Review</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Volunteer Applications</h1>
          <p className="text-muted-foreground">Review and manage volunteer applications</p>
        </div>

        <div className="grid gap-6">
          {applications.map((app) => (
            <Card key={app.id} className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{app.name}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Applied: {app.appliedDate}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(app.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{app.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{app.phone}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Experience</p>
                      <p className="text-sm text-muted-foreground">{app.experience}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Availability</p>
                      <p className="text-sm text-muted-foreground">{app.availability}</p>
                    </div>
                  </div>
                </div>
                
                {app.status === "pending" && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => handleApprove(app.id, app.name)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(app.id, app.name)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default VolunteerApplications;
