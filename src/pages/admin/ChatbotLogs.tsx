import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, TrendingUp } from "lucide-react";

const ChatbotLogs = () => {
  const topQueries = [
    { query: "How do I request a service?", count: 45, category: "Service Information" },
    { query: "What services are available?", count: 38, category: "Service Information" },
    { query: "How do I become a volunteer?", count: 32, category: "Volunteer Information" },
    { query: "What are your hours?", count: 28, category: "General Information" },
    { query: "How much does it cost?", count: 25, category: "Pricing" },
    { query: "Can I cancel a service?", count: 22, category: "Service Management" },
    { query: "How do I contact support?", count: 18, category: "Support" },
  ];

  const recentConversations = [
    {
      id: 1,
      timestamp: "2025-01-14 10:23 AM",
      query: "What is companionship service?",
      response: "Companionship service provides friendly support and conversation...",
      satisfaction: "positive",
    },
    {
      id: 2,
      timestamp: "2025-01-14 09:45 AM",
      query: "How do I sign up as a volunteer?",
      response: "To become a volunteer, please visit our Join Our Team page...",
      satisfaction: "positive",
    },
    {
      id: 3,
      timestamp: "2025-01-14 09:12 AM",
      query: "Do you provide medical services?",
      response: "We provide non-medical support services including companionship...",
      satisfaction: "neutral",
    },
    {
      id: 4,
      timestamp: "2025-01-14 08:56 AM",
      query: "What areas do you serve?",
      response: "We currently serve the greater metropolitan area...",
      satisfaction: "positive",
    },
  ];

  const getSatisfactionColor = (satisfaction: string) => {
    switch (satisfaction) {
      case "positive":
        return "text-green-600";
      case "neutral":
        return "text-yellow-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Chatbot Logs</h1>
          <p className="text-muted-foreground">Monitor common inquiries to improve FAQ content</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Queries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Most Common Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topQueries.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.query}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">{item.count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${(item.count / 45) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Conversations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentConversations.map((conv) => (
                  <div key={conv.id} className="pb-4 border-b last:border-0">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-muted-foreground">{conv.timestamp}</p>
                      <span className={`text-xs font-medium ${getSatisfactionColor(conv.satisfaction)}`}>
                        {conv.satisfaction}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Query:</p>
                        <p className="text-sm font-medium">{conv.query}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Response:</p>
                        <p className="text-sm text-muted-foreground">{conv.response}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights Card */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle>Insights & Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-sm">
                <strong>Service Information</strong> is the most queried category (83 queries). 
                Consider adding more detailed FAQ entries about available services.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-sm">
                <strong>Volunteer Information</strong> queries increased by 45% this week. 
                Update the volunteer page with clearer application process details.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-sm">
                <strong>Pricing questions</strong> suggest users want transparent cost information. 
                Consider adding a pricing section to the main website.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ChatbotLogs;
