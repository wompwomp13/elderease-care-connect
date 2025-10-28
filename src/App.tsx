import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SignupVolunteer from "./pages/SignupVolunteer";
import NotFound from "./pages/NotFound";
import { getCurrentUser } from "@/lib/auth";
import ElderHome from "@/pages/elder/ElderHome";
import ElderNotifications from "@/pages/elder/Notifications";
import RequestService from "@/pages/elder/RequestService";
import ServicesInfo from "@/pages/elder/ServicesInfo";
import BrowseServices from "@/pages/elder/BrowseServices";
import PaymentConfirmation from "@/pages/elder/PaymentConfirmation";
import MySchedule from "@/pages/elder/MySchedule";
import Dashboard from "@/pages/admin/Dashboard";
import VolunteerApplications from "@/pages/admin/VolunteerApplications";
import ServiceRequests from "@/pages/admin/ServiceRequests";
import ChatbotLogs from "@/pages/admin/ChatbotLogs";
import ContentManagement from "@/pages/admin/ContentManagement";
import CompanionHome from "@/pages/companion/CompanionHome";
import MyAssignments from "@/pages/companion/MyAssignments";
import CompanionProfile from "@/pages/companion/Profile";
import ActivityLog from "@/pages/companion/ActivityLog";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/signup/volunteer" element={<SignupVolunteer />} />

          {/* Role sections */}
          <Route path="/elder" element={<ElderHome />} />
          <Route path="/elder/notifications" element={<ElderNotifications />} />
          <Route path="/elder/schedule" element={<MySchedule />} />
          <Route path="/elder/request-service" element={<RequestService />} />
          <Route path="/elder/services-info" element={<ServicesInfo />} />
          <Route path="/elder/browse-services" element={<BrowseServices />} />
          <Route path="/elder/payment-confirmation" element={<PaymentConfirmation />} />
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/applications" element={<VolunteerApplications />} />
          <Route path="/admin/requests" element={<ServiceRequests />} />
          <Route path="/admin/chatbot" element={<ChatbotLogs />} />
          <Route path="/admin/content" element={<ContentManagement />} />
          <Route path="/companion" element={<CompanionHome />} />
          <Route path="/companion/assignments" element={<MyAssignments />} />
          <Route path="/companion/activity" element={<ActivityLog />} />
          
          <Route path="/companion/profile" element={<CompanionProfile />} />

          {/* Fallback: if already logged, push to role home */}
          <Route path="/home" element={(() => {
            const user = getCurrentUser();
            if (!user) return <Navigate to="/login" replace />;
            return <Navigate to={`/${user.role === 'elderly' ? 'elder' : user.role}`} replace />;
          })()} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
