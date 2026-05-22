import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

const INITIAL_CATEGORIES = [
  { id: 1, name: "Plumbing", slug: "plumbing" },
  { id: 2, name: "Electrical", slug: "electrical" },
  { id: 3, name: "Carpentry", slug: "carpentry" },
  { id: 4, name: "Tailoring", slug: "tailoring" },
  { id: 5, name: "Painting", slug: "painting" },
  { id: 6, name: "Mechanics", slug: "mechanics" },
  { id: 7, name: "AC Repair", slug: "ac-repair" },
  { id: 8, name: "Generator Repair", slug: "generator-repair" },
];

export default function ArtisanRegister() {
  const { user, loading } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [serviceAreas, setServiceAreas] = useState("");
  const [startingPrice, setStartingPrice] = useState("");

  const { data: locations } = trpc.locations.getAll.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const utils = trpc.useUtils();
  const categoryOptions = categories?.length ? categories : INITIAL_CATEGORIES;

  const registerMutation = trpc.artisans.register.useMutation({
    onSuccess: async () => {
      toast.success("Profile created successfully! Awaiting admin approval.");
      await utils.auth.me.invalidate();
      await utils.artisans.getProfile.invalidate();
      setTimeout(() => {
        window.location.href = "/artisan/dashboard";
      }, 1500);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create profile");
    },
  });

  const states = locations ? [...new Set(locations.map((l) => l.state))].sort() : [];
  const lgas = state
    ? [...new Set(locations?.filter((l) => l.state === state).map((l) => l.lga) || [])].sort()
    : [];
  const cities = lga
    ? [...new Set(
        locations?.filter((l) => l.state === state && l.lga === lga).map((l) => l.city) || []
      )].sort()
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName || !category || !state || !lga || !city) {
      toast.error("Please fill in all required fields");
      return;
    }

    const categoryId = categoryOptions.find((c) => c.slug === category)?.id;

    if (!categoryId) {
      toast.error("Please select a valid service category");
      return;
    }

    registerMutation.mutate({
      businessName,
      categoryId,
      bio,
      yearsExperience: yearsExperience ? parseInt(yearsExperience) : undefined,
      state,
      lga,
      city,
      area: area || undefined,
      serviceAreas: serviceAreas || undefined,
      startingPrice: startingPrice ? parseFloat(startingPrice) : undefined,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border bg-card shadow-sm">
          <div className="container py-4">
            <Link href="/">
              <a className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-accent to-orange-500" />
                <span className="text-xl font-bold text-foreground">Artisan Connect</span>
              </a>
            </Link>
          </div>
        </nav>

        <div className="container flex items-center justify-center py-20">
          <Card className="card-elevated text-center">
            <h2 className="text-2xl font-bold">Sign In Required</h2>
            <p className="mt-2 text-muted-foreground">
              Please sign in to register as an artisan.
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
        <div className="container py-4">
          <Link href="/">
            <a className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-accent to-orange-500" />
              <span className="text-xl font-bold text-foreground">Artisan Connect</span>
            </a>
          </Link>
        </div>
      </nav>

      <div className="container py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold">Register as an Artisan</h1>
            <p className="text-lg text-muted-foreground">
              Create your professional profile and start getting discovered by clients.
            </p>
          </div>

          <Card className="card-elevated">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Information */}
              <div>
                <h3 className="mb-4 text-lg font-bold">Business Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Business Name *</label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g., Musa Plumbing Services"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">Service Category *</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="input-field">
                        <SelectValue placeholder="Select your primary service" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">About Your Business</label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell clients about your experience, specialties, and what makes you unique..."
                      rows={4}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">Years of Experience</label>
                    <Input
                      type="number"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      placeholder="e.g., 5"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="mb-4 text-lg font-bold">Location</h3>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">State *</label>
                      <Select value={state} onValueChange={(val) => {
                        setState(val);
                        setLga("");
                        setCity("");
                      }}>
                        <SelectTrigger className="input-field">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">LGA *</label>
                      <Select value={lga} onValueChange={(val) => {
                        setLga(val);
                        setCity("");
                      }}>
                        <SelectTrigger className="input-field">
                          <SelectValue placeholder="Select LGA" />
                        </SelectTrigger>
                        <SelectContent>
                          {lgas.map((l) => (
                            <SelectItem key={l} value={l}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">City *</label>
                      <Select value={city} onValueChange={setCity}>
                        <SelectTrigger className="input-field">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">Area/Neighborhood</label>
                      <Input
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        placeholder="e.g., Kubwa"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">Service Areas</label>
                    <Textarea
                      value={serviceAreas}
                      onChange={(e) => setServiceAreas(e.target.value)}
                      placeholder="Areas you serve, e.g., Kubwa, Gwarinpa, Dutse, Bwari"
                      rows={2}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="mb-4 text-lg font-bold">Pricing</h3>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Starting Price (₦)</label>
                  <Input
                    type="number"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    placeholder="e.g., 5000"
                    className="input-field"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    This is your minimum service charge. Clients will see this on your profile.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Link href="/">
                  <Button variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {registerMutation.isPending ? "Creating Profile..." : "Create Profile"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Your profile will be reviewed by our team before appearing to clients. This usually takes 24-48 hours.
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
