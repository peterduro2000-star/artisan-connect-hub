import { useAuth } from "@/_core/hooks/useAuth";
import { Redirect } from "wouter";
import PageLoader from "./PageLoader";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute enforces admin-only access.
 *
 * - Shows PageLoader while auth state is loading
 * - Redirects unauthenticated users to login
 * - Redirects non-admin users to home page
 * - Allows only users with role === "admin"
 */
export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    // Redirect to login page
    return <Redirect to="/login" />;
  }

  if (user.role !== "admin") {
    // Redirect unauthorized users to home
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
