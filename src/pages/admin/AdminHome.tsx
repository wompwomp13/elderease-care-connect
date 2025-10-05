import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";

const AdminHome = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-primary text-primary-foreground py-3 px-4 sticky top-0 z-50 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/admin" className="text-lg font-bold">ElderEase Admin</Link>
          <Button variant="outline" onClick={() => { logout(); window.location.href = "/"; }}>Log out</Button>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-10">
        <div className="bg-card text-card-foreground rounded-xl p-6 border">
          <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, content, and settings. (Placeholder)</p>
        </div>
      </main>
    </div>
  );
};

export default AdminHome;


