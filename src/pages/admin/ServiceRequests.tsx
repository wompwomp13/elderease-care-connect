import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const ServiceRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState([
    {
      id: 1,
      elderName: "Mrs. Mary Johnson",
      service: "Companionship",
      date: "2025-01-15",
      time: "2:00 PM",
      location: "123 Oak Street, Apt 4B",
      status: "pending",
      assignedTo: null,
      notes: "Prefers conversation about gardening and cooking",
    },
    {
      id: 2,
      elderName: "Mr. Robert Davis",
      service: "Running Errands",
      date: "2025-01-16",
      time: "10:00 AM",
      location: "456 Maple Ave, Unit 2",
      status: "pending",
      assignedTo: null,
      notes: "Grocery shopping needed, list will be provided",
    },
    {
      id: 3,
      elderName: "Ms. Patricia Wilson",
      service: "Light Housekeeping",
      date: "2025-01-17",
      time: "9:00 AM",
      location: "789 Pine Road",
      status: "assigned",
      assignedTo: "Sarah Williams",
      notes: "Focus on kitchen and living room",
    },
  ]);

  const volunteers = [
    "Sarah Williams",
    "Michael Chen",
    "Emily Rodriguez",
    "John Martinez",
    "Lisa Anderson",
  ];

  const handleAssign = (requestId: number, volunteer: string) => {
    setRequests(reqs => reqs.map(req => 
      req.id === requestId ? { ...req, status: "assigned", assignedTo: volunteer } : req
    ));
    toast({
      title: "Volunteer Assigned",
      description: `${volunteer} has been assigned to this request.`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "assigned":
        return <Badge className="bg-green-500">Assigned</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getServiceColor = (service: string) => {
    const colors: Record<string, string> = {
      "Companionship": "border-l-purple-500",
      "Running Errands": "border-l-blue-500",
      "Light Housekeeping": "border-l-green-500",
      "Home Visits": "border-l-orange-500",
      "Socialization": "border-l-pink-500",
    };
    return colors[service] || "border-l-primary";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Service Requests</h1>
          <p className="text-muted-foreground">View and manage all service requests</p>
        </div>

        <div className="grid gap-6">
          {requests.map((request) => (
            <Card key={request.id} className={`border-l-4 ${getServiceColor(request.service)}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{request.elderName}</CardTitle>
                    <p className="text-lg font-semibold text-primary mt-1">{request.service}</p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{request.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{request.time}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{request.location}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {request.assignedTo && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{request.assignedTo}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium mb-1">Additional Notes</p>
                      <p className="text-sm text-muted-foreground">{request.notes}</p>
                    </div>
                  </div>
                </div>
                
                {request.status === "pending" && (
                  <div className="pt-4 space-y-2">
                    <label className="text-sm font-medium">Assign Volunteer</label>
                    <div className="flex gap-3">
                      <Select onValueChange={(value) => handleAssign(request.id, value)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a volunteer" />
                        </SelectTrigger>
                        <SelectContent>
                          {volunteers.map((volunteer) => (
                            <SelectItem key={volunteer} value={volunteer}>
                              {volunteer}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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

export default ServiceRequests;
