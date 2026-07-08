import { Spinner } from "@/components/ui/spinner";

/**
 * PageLoader is a lightweight loading component.
 *
 * Used during:
 * - Lazy route loading (Suspense fallback)
 * - Route protection (ProtectedRoute, AdminRoute)
 * - Authentication state resolution
 */
export default function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner />
    </div>
  );
}
