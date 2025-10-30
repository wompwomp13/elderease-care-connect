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
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-md">
        <div className="container mx-auto h-16 px-4 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src={logo} alt="ElderEase Logo" className="h-10 w-auto" />
            <div>
              <span className="text-xl font-bold block">ElderEase</span>
              <span className="text-xs opacity-90">Admin Portal</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 text-sm transition-opacity ${
                  isActive(item.path) ? "font-semibold opacity-100 underline underline-offset-8" : "opacity-90 hover:opacity-100"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}

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
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
