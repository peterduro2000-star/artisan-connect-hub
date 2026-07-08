import { useAuth } from "@/_core/hooks/useAuth";
import { Redirect } from "wouter";
import PageLoader from "./PageLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute enforces authentication.
 *
 * - Shows PageLoader while auth state is loading
 * - Redirects unauthenticated users to login
 * - Preserves the current location for post-login redirect
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    // Redirect to login page, preserving the original location
    const current = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    const loginUrl = `/login?redirect=${encodeURIComponent(current)}`;
    return <Redirect to={loginUrl} />;
  }

  return <>{children}</>;
}
