import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export function AuthNavActions() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const loginUrl = getLoginUrl();

  const dashboardHref =
    user?.role === "admin"
      ? "/admin/dashboard"
      : user?.role === "artisan"
        ? "/artisan/dashboard"
        : "/search";

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      setLocation("/");
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!user) {
    return (
      <Button
        size="sm"
        className="rounded-full px-5 shadow-sm"
        disabled={!loginUrl}
        onClick={() => {
          if (loginUrl) window.location.href = loginUrl;
        }}
      >
        Sign In
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={dashboardHref}>
        <Button variant="outline" size="sm" className="rounded-full">
          Dashboard
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        className="rounded-full text-muted-foreground hover:text-foreground"
        onClick={handleSignOut}
        disabled={isSigningOut}
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">
          {isSigningOut ? "Signing out" : "Sign out"}
        </span>
      </Button>
    </div>
  );
}
