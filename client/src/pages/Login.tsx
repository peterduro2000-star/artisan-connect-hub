import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

const loginImage =
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=80";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();
  const resendConfirmationMutation = trpc.auth.resendConfirmation.useMutation();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    setLocation(
      user.role === "admin"
        ? "/admin/dashboard"
        : user.role === "artisan"
          ? "/artisan/dashboard"
          : "/search"
    );
  }, [loading, setLocation, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result =
        mode === "sign-in"
          ? await loginMutation.mutateAsync({ email, password })
          : await signupMutation.mutateAsync({
              email,
              password,
              name: name.trim() || undefined,
            });

      if (result.session) {
        const { error } = await supabase.auth.setSession({
          access_token: result.session.accessToken,
          refresh_token: result.session.refreshToken,
        });

        if (error) {
          setError("Unable to complete sign in. Please try again.");
          return;
        }
      }

      await utils.auth.me.invalidate();

      if (mode === "sign-up" && !result.session) {
        setMessage("Check your email to confirm your account, then sign in.");
        return;
      }

      setLocation("/search");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "We could not complete that request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await resendConfirmationMutation.mutateAsync({
        email,
        emailRedirectTo: `${window.location.origin}/login`,
      });
      setMessage(
        "If that account is waiting for confirmation, a new email has been sent."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "We could not complete that request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="grid w-full max-w-5xl overflow-hidden rounded-3xl border-border/80 bg-white p-0 shadow-2xl shadow-slate-950/12 lg:grid-cols-[1fr_0.95fr]">
        <div className="relative hidden min-h-[560px] overflow-hidden lg:block">
          <img
            src={loginImage}
            alt="Client and service professional shaking hands"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              Secure Supabase sign in
            </div>
            <h2 className="text-3xl font-bold text-white">
              Manage requests, profiles, and approvals with confidence.
            </h2>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-6 p-6 sm:p-8">
          <div>
            <Link href="/">
              <a className="text-sm font-semibold text-primary">
                Artisan Connect
              </a>
            </Link>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              {mode === "sign-in" ? "Sign in" : "Create account"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Use your email and password to continue.
            </p>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {message ? (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  autoComplete="name"
                  className="input-field"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Password</Label>
                {mode === "sign-in" ? (
                  <Link href="/forgot-password">
                    <a className="text-sm font-semibold text-primary hover:underline">
                      Forgot password?
                    </a>
                  </Link>
                ) : null}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                className="input-field"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-xl shadow-lg shadow-primary/20"
              disabled={submitting}
            >
              {submitting
                ? "Please wait"
                : mode === "sign-in"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-xl"
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setError(null);
              setMessage(null);
            }}
          >
            {mode === "sign-in"
              ? "Create an account"
              : "Already have an account? Sign in"}
          </Button>

          {mode === "sign-up" ? (
            <Button
              type="button"
              variant="link"
              className="w-full"
              disabled={submitting || !email}
              onClick={handleResendConfirmation}
            >
              Resend confirmation email
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
