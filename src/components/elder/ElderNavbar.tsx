import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser, logout, subscribeToAuth, type AuthProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";
import { ChevronDown } from "lucide-react";

export type ElderNavbarVariant = "app" | "browse" | "minimal";

const AccountMenu = () => {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  useEffect(() => subscribeToAuth(setProfile), []);

  const user = getCurrentUser();
  const displayName =
    profile?.displayName?.trim() ||
    profile?.email?.split("@")[0] ||
    user?.name ||
    "Guardian";
  const menuFirstName =
    profile?.displayName?.trim().split(/\s+/)[0] ||
    user?.name?.trim().split(/\s+/)[0] ||
    profile?.email?.split("@")[0] ||
    "Guardian";
  const email = profile?.email ?? null;

  if (!user) {
    return (
      <Link to="/login">
        <Button variant="nav" size="sm">
          Login
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 border-0 bg-transparent p-0 cursor-pointer",
            "text-primary-foreground font-[inherit] text-[length:inherit] leading-[inherit]",
            "transition-opacity opacity-90 hover:opacity-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-primary rounded-sm"
          )}
          aria-label={`${menuFirstName} account menu`}
        >
          <span className="max-w-[10rem] truncate">{menuFirstName}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="min-w-max w-max max-w-[min(17rem,calc(100vw-1.25rem))] p-0.5 text-center"
      >
        <DropdownMenuLabel className="px-2 py-1 text-sm font-normal">
          <div className="flex flex-col items-center gap-0.5 text-center">
            <p className="text-sm font-medium leading-tight text-foreground">{displayName}</p>
            {email ? (
              <p className="w-full text-xs leading-tight text-muted-foreground break-words">{email}</p>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="-mx-0.5 my-0.5" />
        <DropdownMenuItem asChild className="justify-center px-2 py-1 text-sm">
          <Link to="/elder/profile" className="cursor-pointer text-center">
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="-mx-0.5 my-0.5" />
        <DropdownMenuItem
          className="cursor-pointer justify-center px-2 py-1 text-center text-sm text-destructive focus:text-destructive"
          onClick={() => {
            logout();
            window.location.href = "/";
          }}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const ElderNavbar = ({ variant = "app" }: { variant?: ElderNavbarVariant }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-md">
      <div className="container mx-auto h-16 px-4 flex items-center justify-between">
        <Link to="/elder" className="flex items-center gap-2" aria-label="ElderEase Home" tabIndex={0}>
          <img src={logo} alt="ElderEase Logo" className="h-8 w-8" />
          <span className="text-lg font-bold">ElderEase</span>
        </Link>
        <div className="hidden md:flex items-center gap-5 text-base" role="navigation" aria-label="Primary">
          {variant === "browse" && (
            <>
              <Link to="/elder" className={`transition-opacity ${isActive("/elder") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>
                Home
              </Link>
              <Link to="/elder/services-info" className={`transition-opacity ${isActive("/elder/services-info") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>
                Services
              </Link>
              <Link to="/elder/browse-services" className={`transition-opacity ${isActive("/elder/browse-services") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>
                Browse
              </Link>
              <Link to="/elder/request-service" className={`transition-opacity ${isActive("/elder/request-service") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>
                Request Service
              </Link>
            </>
          )}
          {variant === "app" && (
            <>
              <Link to="/elder" className={`transition-opacity ${isActive("/elder") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>
                Home
              </Link>
              <Link to="/elder/schedule" className={`transition-opacity ${isActive("/elder/schedule") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>
                My Schedule
              </Link>
              <Link to="/elder/request-service" className={`transition-opacity ${isActive("/elder/request-service") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>
                Request Service
              </Link>
              <Link to="/elder/notifications" className={`transition-opacity ${isActive("/elder/notifications") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>
                Notifications
              </Link>
            </>
          )}
          {variant === "minimal" && (
            <Link to="/elder" className={`transition-opacity ${isActive("/elder") ? "font-semibold underline underline-offset-8 opacity-100" : "opacity-90 hover:opacity-100"}`}>
              Home
            </Link>
          )}
          <AccountMenu />
        </div>
      </div>
    </nav>
  );
};

export default ElderNavbar;
