import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AuthNavActions } from "@/components/AuthNavActions";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Phone,
  MessageCircle,
  MapPin,
  Star,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getTelHref, getWhatsAppHref } from "@/lib/contact";

const fallbackProfileImage =
  "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?auto=format&fit=crop&w=900&q=80";

export default function ArtisanProfile() {
  const [match, params] = useRoute("/artisan/:id");
  const artisanId = params?.id ? parseInt(params.id) : null;

  const { data: artisan, isLoading } = trpc.artisans.getById.useQuery(
    { id: artisanId! },
    { enabled: !!artisanId }
  );

  const { data: portfolio } = trpc.portfolio.getByArtisan.useQuery(
    { artisanId: artisanId! },
    { enabled: !!artisanId }
  );

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");

  const reportMutation = trpc.reports.create.useMutation({
    onSuccess: () => {
      setReportOpen(false);
      setReportReason("");
      setReportDescription("");
      setReporterName("");
      setReporterPhone("");
    },
  });
  const contactMutation = trpc.artisans.getContact.useMutation();

  const handleReport = () => {
    if (!reportReason || !reporterName || !reporterPhone) {
      alert("Please fill in all required fields");
      return;
    }
    reportMutation.mutate({
      reportedArtisanId: artisanId!,
      reporterName,
      reporterPhone,
      reason: reportReason,
      description: reportDescription,
    });
  };

  const handleContact = async (eventType: "call" | "whatsapp") => {
    if (!artisanId) return;

    try {
      const contact = await contactMutation.mutateAsync({
        id: artisanId,
        eventType,
      });

      const href =
        eventType === "whatsapp"
          ? getWhatsAppHref(contact.whatsappNumber || contact.phone)
          : getTelHref(contact.phone);

      if (!href) {
        toast.error("Unable to establish contact");
        return;
      }

      window.open(
        href,
        eventType === "whatsapp" ? "_blank" : "_self",
        "noopener,noreferrer"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to contact artisan";
      toast.error(message);
    }
  };

  if (!match) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!artisan) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border bg-card shadow-sm">
          <div className="container py-4">
            <Link href="/">
              <a className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-accent to-orange-500" />
                <span className="text-xl font-bold text-foreground">
                  Artisan Connect
                </span>
              </a>
            </Link>
          </div>
        </nav>
        <div className="container flex items-center justify-center py-20">
          <Card className="card-elevated text-center">
            <h2 className="text-2xl font-bold">Artisan Not Found</h2>
            <p className="mt-2 text-muted-foreground">
              The artisan profile you're looking for doesn't exist.
            </p>
            <Link href="/">
              <Button className="btn-primary mt-4">Back to Home</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <Link href="/">
            <a className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-accent to-orange-500" />
              <span className="text-xl font-bold text-foreground">
                Artisan Connect
              </span>
            </a>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/search">
              <a className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Search</span>
              </a>
            </Link>
            <AuthNavActions />
          </div>
        </div>
      </nav>

      <div className="container py-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Profile Header */}
            <Card className="card-elevated mb-8 overflow-hidden p-0">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="relative min-h-72 overflow-hidden">
                  <img
                    src={artisan.profilePhotoUrl || fallbackProfileImage}
                    alt={artisan.businessName}
                    className="h-full min-h-72 w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/55 to-transparent" />
                </div>

                <div className="p-6 md:pl-0">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                        Public profile
                      </p>
                      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
                        {artisan.businessName}
                      </h1>
                      <p className="mt-2 text-lg text-muted-foreground">
                        {artisan.yearsExperience} years of experience
                      </p>
                    </div>
                    {artisan.verificationStatus === "verified" && (
                      <span className="badge-success">
                        <Star className="mr-1 h-4 w-4" />
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="mb-6 space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {artisan.area && `${artisan.area}, `}
                        {artisan.city}, {artisan.lga}, {artisan.state}
                      </span>
                    </div>
                  </div>

                  {artisan.startingPrice && (
                    <p className="mb-6 text-2xl font-bold text-accent">
                      From ₦{artisan.startingPrice.toLocaleString()}
                    </p>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={() => handleContact("call")}
                      disabled={contactMutation.isPending}
                      className="btn-primary flex-1 rounded-xl shadow-lg shadow-primary/20"
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Call Now
                    </Button>
                    <Button
                      onClick={() => handleContact("whatsapp")}
                      disabled={contactMutation.isPending}
                      className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-center font-semibold text-white transition-all hover:bg-green-700"
                    >
                      <MessageCircle className="mr-2 inline h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* About Section */}
            <Card className="card-elevated mb-8">
              <h2 className="mb-4 text-2xl font-bold">About</h2>
              <p className="mb-6 whitespace-pre-wrap text-muted-foreground">
                {artisan.bio || "No bio provided"}
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold">Service Areas</h3>
                  <p className="text-muted-foreground">
                    {artisan.serviceAreas ||
                      `${artisan.city} and surrounding areas`}
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">Years of Experience</h3>
                  <p className="text-muted-foreground">
                    {artisan.yearsExperience || "Not specified"} years
                  </p>
                </div>
              </div>
            </Card>

            {/* Portfolio Section */}
            {portfolio && portfolio.length > 0 && (
              <Card className="card-elevated">
                <h2 className="mb-6 text-2xl font-bold">Portfolio</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {portfolio.map((image: any) => (
                    <div key={image.id} className="overflow-hidden rounded-xl">
                      <img
                        src={image.imageUrl}
                        alt={image.caption || "Portfolio"}
                        className="h-48 w-full object-cover"
                      />
                      {image.caption && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {image.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Quick Contact Card */}
            <Card className="card-elevated sticky top-20 mb-6">
              <h3 className="mb-4 font-bold">Quick Contact</h3>
              <div className="space-y-3">
                <Button
                  onClick={() => handleContact("call")}
                  disabled={contactMutation.isPending}
                  className="w-full rounded-xl"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Call Artisan
                </Button>
                <Button
                  onClick={() => handleContact("whatsapp")}
                  disabled={contactMutation.isPending}
                  className="w-full rounded-xl bg-green-600 text-white hover:bg-green-700"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                <p className="text-xs text-muted-foreground">
                  Contact details are revealed only when you choose to connect.
                </p>
              </div>
            </Card>

            {/* Report Profile Card */}
            <Card className="card-elevated">
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full rounded-xl">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Report Profile
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Report Profile</DialogTitle>
                    <DialogDescription>
                      Help us maintain a safe community by reporting suspicious
                      or problematic profiles.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Your Name
                      </label>
                      <Input
                        value={reporterName}
                        onChange={e => setReporterName(e.target.value)}
                        placeholder="Your name"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Your Phone
                      </label>
                      <Input
                        value={reporterPhone}
                        onChange={e => setReporterPhone(e.target.value)}
                        placeholder="Your phone number"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Reason
                      </label>
                      <select
                        value={reportReason}
                        onChange={e => setReportReason(e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select a reason</option>
                        <option value="fake-profile">Fake Profile</option>
                        <option value="poor-service">Poor Service</option>
                        <option value="fraud">Fraud</option>
                        <option value="harassment">Harassment</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Details
                      </label>
                      <Textarea
                        value={reportDescription}
                        onChange={e => setReportDescription(e.target.value)}
                        placeholder="Describe the issue..."
                        rows={4}
                        className="input-field"
                      />
                    </div>

                    <Button
                      onClick={handleReport}
                      disabled={reportMutation.isPending}
                      className="w-full rounded-xl"
                    >
                      {reportMutation.isPending
                        ? "Submitting..."
                        : "Submit Report"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
