import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import { getCurrentUser } from "@/lib/auth";
import ElderHome from "@/pages/elder/ElderHome";
import AdminHome from "@/pages/admin/AdminHome";
import CompanionHome from "@/pages/companion/CompanionHome";
import RequestService from "@/pages/elder/RequestService";

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

          {/* Role sections */}
          <Route path="/elder" element={<ElderHome />} />
          <Route path="/elder/request-service" element={<RequestService />} />
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/companion" element={<CompanionHome />} />

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
