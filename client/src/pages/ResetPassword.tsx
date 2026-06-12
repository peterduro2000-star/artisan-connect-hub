import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setError(null);
        setCheckingSession(false);
      }
    });

    const initializeRecoverySession = async () => {
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );
      const queryParams = new URLSearchParams(window.location.search);
      const authError =
        hashParams.get("error_description") ??
        queryParams.get("error_description");

      if (authError) {
        setError(authError);
        setCheckingSession(false);
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const code = queryParams.get("code");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!mounted) return;

        if (error) {
          setError(
            "This reset link is invalid or expired. Please request a new password reset link."
          );
          setCheckingSession(false);
          return;
        }
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!mounted) return;

        if (error) {
          setError(
            "This reset link is invalid or expired. Please request a new password reset link."
          );
          setCheckingSession(false);
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !data.session) {
        setError(
          "This reset link is invalid or expired. Please request a new password reset link."
        );
      }

      setCheckingSession(false);
    };

    void initializeRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError(
        "This reset link is invalid or expired. Please request a new password reset link."
      );
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
      window.setTimeout(() => {
        setLocation("/login");
      }, 1800);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md gap-6 rounded-3xl border-border/80 bg-white p-6 shadow-2xl shadow-slate-950/12 sm:p-8">
        <div>
          <Link href="/">
            <a className="text-sm font-semibold text-primary">
              Artisan Connect
            </a>
          </Link>
          <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">
            Create a new password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a strong password for your Artisan Connect account.
          </p>
        </div>

        {success ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Password updated successfully. Redirecting to sign in...
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="input-field"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="input-field"
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-xl shadow-lg shadow-primary/20"
            disabled={checkingSession || submitting || success}
          >
            {checkingSession
              ? "Checking link..."
              : submitting
                ? "Updating..."
                : "Update password"}
          </Button>
        </form>

        <Link href="/login">
          <Button type="button" variant="ghost" className="w-full rounded-xl">
            Back to sign in
          </Button>
        </Link>
      </Card>
    </div>
  );
}
