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
import { Upload, Edit2, CheckCircle, Clock, AlertCircle } from "lucide-react";

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

export default function ArtisanDashboard() {
  const { user, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);

  const { data: profile, isLoading: profileLoading } = trpc.artisans.getProfile.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: portfolio } = trpc.portfolio.getMyPortfolio.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: locations } = trpc.locations.getAll.useQuery();

  const [businessName, setBusinessName] = useState(profile?.businessName || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [yearsExperience, setYearsExperience] = useState(profile?.yearsExperience?.toString() || "");
  const [state, setState] = useState(profile?.state || "");
  const [lga, setLga] = useState(profile?.lga || "");
  const [city, setCity] = useState(profile?.city || "");
  const [area, setArea] = useState(profile?.area || "");
  const [serviceAreas, setServiceAreas] = useState(profile?.serviceAreas || "");
  const [startingPrice, setStartingPrice] = useState(profile?.startingPrice?.toString() || "");

  const updateMutation = trpc.artisans.update.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const uploadMutation = trpc.portfolio.upload.useMutation({
    onSuccess: () => {
      toast.success("Portfolio image uploaded successfully!");
      setIsUploadingPortfolio(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload image");
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

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      businessName: businessName || undefined,
      bio: bio || undefined,
      yearsExperience: yearsExperience ? parseInt(yearsExperience) : undefined,
      state: state || undefined,
      lga: lga || undefined,
      city: city || undefined,
      area: area || undefined,
      serviceAreas: serviceAreas || undefined,
      startingPrice: startingPrice ? parseFloat(startingPrice) : undefined,
    });
  };

  const handlePortfolioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      uploadMutation.mutate({
        imageData: base64,
        fileName: file.name,
        caption: "",
      });
    };
    reader.readAsDataURL(file);
  };

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user || user.role !== "artisan") {
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
            <h2 className="text-2xl font-bold">Access Denied</h2>
            <p className="mt-2 text-muted-foreground">
              This page is only for registered artisans.
            </p>
            <Link href="/artisan/register">
              <Button className="btn-primary mt-4">Register as Artisan</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
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
            <h2 className="text-2xl font-bold">No Profile Found</h2>
            <p className="mt-2 text-muted-foreground">
              You haven't created an artisan profile yet.
            </p>
            <Link href="/artisan/register">
              <Button className="btn-primary mt-4">Create Profile</Button>
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
              <span className="text-xl font-bold text-foreground">Artisan Connect</span>
            </a>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">My Dashboard</h1>
          <p className="text-lg text-muted-foreground">Manage your professional profile</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card className="card-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="mb-2 font-bold">Profile Status</h3>
                  <div className="flex items-center gap-2">
                    {profile.approvalStatus === "approved" ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-green-600 font-semibold">Approved</span>
                      </>
                    ) : profile.approvalStatus === "rejected" ? (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="text-red-600 font-semibold">Rejected</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <span className="text-yellow-600 font-semibold">Pending Review</span>
                      </>
                    )}
                  </div>
                </div>
                {profile.verificationStatus === "verified" && (
                  <div className="badge-success">Verified</div>
                )}
              </div>
            </Card>

            {/* Profile Edit Form */}
            <Card className="card-elevated">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Profile Information</h2>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Business Name</label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">Bio</label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="input-field"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">Years of Experience</label>
                      <Input
                        type="number"
                        value={yearsExperience}
                        onChange={(e) => setYearsExperience(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold">Starting Price (₦)</label>
                      <Input
                        type="number"
                        value={startingPrice}
                        onChange={(e) => setStartingPrice(e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">State</label>
                      <Select value={state} onValueChange={setState}>
                        <SelectTrigger className="input-field">
                          <SelectValue />
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
                      <label className="mb-2 block text-sm font-semibold">LGA</label>
                      <Select value={lga} onValueChange={setLga}>
                        <SelectTrigger className="input-field">
                          <SelectValue />
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
                      <label className="mb-2 block text-sm font-semibold">City</label>
                      <Select value={city} onValueChange={setCity}>
                        <SelectTrigger className="input-field">
                          <SelectValue />
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
                      <label className="mb-2 block text-sm font-semibold">Area</label>
                      <Input
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">Service Areas</label>
                    <Textarea
                      value={serviceAreas}
                      onChange={(e) => setServiceAreas(e.target.value)}
                      rows={2}
                      className="input-field"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="btn-primary w-full"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Business Name</p>
                    <p className="text-lg font-semibold">{profile.businessName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Bio</p>
                    <p className="whitespace-pre-wrap">{profile.bio || "No bio provided"}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Experience</p>
                      <p>{profile.yearsExperience || "Not specified"} years</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Starting Price</p>
                      <p>₦{profile.startingPrice?.toLocaleString() || "Not specified"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Location</p>
                    <p>
                      {profile.area && `${profile.area}, `}
                      {profile.city}, {profile.lga}, {profile.state}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Portfolio Section */}
            <Card className="card-elevated">
              <h2 className="mb-6 text-2xl font-bold">Portfolio</h2>

              {portfolio && portfolio.length > 0 && (
                <div className="mb-6 grid gap-4 md:grid-cols-2">
                  {portfolio.map((image: any) => (
                    <div key={image.id} className="rounded-lg overflow-hidden">
                      <img
                        src={image.imageUrl}
                        alt="Portfolio"
                        className="h-40 w-full object-cover"
                      />
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">
                          Status: <span className="badge-accent">{image.status}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePortfolioUpload}
                    disabled={uploadMutation.isPending}
                    className="hidden"
                  />
                  <div>
                    <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="font-semibold">
                      {uploadMutation.isPending ? "Uploading..." : "Click to upload portfolio image"}
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                  </div>
                </label>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="card-elevated sticky top-4">
              <h3 className="mb-4 font-bold">Quick Links</h3>
              <div className="space-y-2">
                <Link href={`/artisan/${profile.id}`}>
                  <a className="block rounded-lg bg-accent/10 px-4 py-2 text-center font-semibold text-accent hover:bg-accent/20">
                    View My Profile
                  </a>
                </Link>
                <Link href="/service-request">
                  <a className="block rounded-lg border border-border px-4 py-2 text-center font-semibold hover:bg-muted">
                    View Requests
                  </a>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
