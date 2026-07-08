import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import PageLoader from "./components/PageLoader";

// ── Eagerly loaded (public, always needed) ────────────────────────────────────
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// ── Lazily loaded (only downloaded when actually visited) ─────────────────────
const Search          = lazy(() => import("./pages/Search"));
const ArtisanProfile  = lazy(() => import("./pages/ArtisanProfile"));
const ForgotPassword  = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword   = lazy(() => import("./pages/ResetPassword"));
const ArtisanRegister = lazy(() => import("./pages/ArtisanRegister"));

// ── Auth-protected lazy pages ─────────────────────────────────────────────────
const ServiceRequest   = lazy(() => import("./pages/ServiceRequest"));
const ArtisanDashboard = lazy(() => import("./pages/ArtisanDashboard"));

// ── Admin-only lazy pages ─────────────────────────────────────────────────────
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// ── Dev-only pages (NEVER shipped in production build) ────────────────────────
const DevEmailTest = import.meta.env.DEV
  ? lazy(() => import("./pages/DevEmailTest"))
  : null;

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* ── Public routes ───────────────────────────────────────────────── */}
        <Route path="/"                component={Home} />
        <Route path="/login"           component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password"  component={ResetPassword} />
        <Route path="/search"          component={Search} />
        <Route path="/artisan/register" component={ArtisanRegister} />

        {/* Specific artisan routes must come BEFORE the dynamic :id catch-all */}
        <Route path="/artisan/dashboard">
          <ProtectedRoute>
            <ArtisanDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/artisan/:id" component={ArtisanProfile} />

        {/* ── Auth-protected routes ────────────────────────────────────────── */}
        <Route path="/service-request">
          <ProtectedRoute>
            <ServiceRequest />
          </ProtectedRoute>
        </Route>

        {/* ── Admin-only routes ────────────────────────────────────────────── */}
        <Route path="/admin/dashboard">
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        </Route>
        {/* Redirect bare /admin to the canonical admin URL */}
        <Route path="/admin">
          <Redirect to="/admin/dashboard" />
        </Route>

        {/* ── Dev-only routes (stripped from production bundle entirely) ────── */}
        {import.meta.env.DEV && DevEmailTest && (
          <Route path="/dev/email-test" component={DevEmailTest} />
        )}

        {/* ── Fallback ─────────────────────────────────────────────────────── */}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;