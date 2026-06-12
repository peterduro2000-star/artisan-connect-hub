import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { MailCheck, Send } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function DevEmailTest() {
  const sendTestEmail = trpc.dev.sendSupabaseEmailTest.useMutation();
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState<boolean | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(false);
    setConfirmationSent(null);
    setError(null);

    try {
      const result = await sendTestEmail.mutateAsync({
        email,
        emailRedirectTo: `${window.location.origin}/login`,
      });
      setSuccess(true);
      setConfirmationSent(result.confirmationSent);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to send test email. Please try again."
      );
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
            <Send className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">
            Email smoke test
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Send a Supabase Auth email through the configured SMTP provider.
          </p>
        </div>

        {success ? (
          <Alert>
            <MailCheck className="h-4 w-4" />
            <AlertDescription>
              {confirmationSent
                ? "Supabase accepted a new confirmation email request. Check the inbox and spam folder."
                : "Supabase accepted the request, but did not report a new confirmation email. Try a brand-new test address or check Supabase Auth email settings."}
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
            <Label htmlFor="dev-email">Email</Label>
            <Input
              id="dev-email"
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
            disabled={sendTestEmail.isPending}
          >
            {sendTestEmail.isPending ? "Sending..." : "Send test email"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
