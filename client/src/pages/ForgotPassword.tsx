import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { MailCheck, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const forgotPasswordMutation = trpc.auth.forgotPassword.useMutation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await forgotPasswordMutation.mutateAsync({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      setSuccess(true);
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
      <Card className="w-full max-w-md gap-6 rounded-3xl border-border/80 bg-white p-6 shadow-2xl shadow-slate-950/12 sm:p-8">
        <div>
          <Link href="/">
            <a className="text-sm font-semibold text-primary">
              Artisan Connect
            </a>
          </Link>
          <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the email connected to your account. If it exists, we will
            send password reset instructions.
          </p>
        </div>

        {success ? (
          <Alert>
            <MailCheck className="h-4 w-4" />
            <AlertDescription>
              If an account exists for that email, a reset link has been sent.
              Please check your inbox.
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
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="input-field"
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-xl shadow-lg shadow-primary/20"
            disabled={submitting}
          >
            {submitting ? "Sending..." : "Send reset link"}
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
