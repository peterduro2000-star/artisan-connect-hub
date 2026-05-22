import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Search from "./pages/Search";
import ArtisanProfile from "./pages/ArtisanProfile";
import ServiceRequest from "./pages/ServiceRequest";
import ArtisanRegister from "./pages/ArtisanRegister";
import ArtisanDashboard from "./pages/ArtisanDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/search"} component={Search} />
      <Route path={"/artisan/:id"} component={ArtisanProfile} />
      <Route path={"/service-request"} component={ServiceRequest} />
      <Route path={"/artisan/register"} component={ArtisanRegister} />
      <Route path={"/artisan/dashboard"} component={ArtisanDashboard} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
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
