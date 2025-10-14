import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";
import { LayoutDashboard, Users, ClipboardList, MessageSquare, FileEdit, LogOut } from "lucide-react";
import logo from "@/assets/logo.png";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/applications", icon: Users, label: "Volunteer Applications" },
    { path: "/admin/requests", icon: ClipboardList, label: "Service Requests" },
    { path: "/admin/chatbot", icon: MessageSquare, label: "Chatbot Logs" },
    { path: "/admin/content", icon: FileEdit, label: "Manage Content" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground py-3 px-6 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src={logo} alt="ElderEase Logo" className="h-10 w-auto" />
            <div>
              <span className="text-xl font-bold block">ElderEase</span>
              <span className="text-xs opacity-90">Admin Portal</span>
            </div>
          </Link>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => { logout(); window.location.href = "/"; }}
            className="bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20 text-primary-foreground hover:text-primary-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </nav>
      
      <div className="flex">
        <aside className="w-64 bg-card border-r min-h-[calc(100vh-64px)] p-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>
        
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
