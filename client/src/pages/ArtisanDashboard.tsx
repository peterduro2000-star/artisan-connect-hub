import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  MapPin,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const formatPrice = (value: unknown) => {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : null;

  if (!amount || Number.isNaN(amount)) return "Not specified";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
};

const statusStyles = {
  approved: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  verified: "bg-green-50 text-green-700 border-green-200",
} as const;

export default function ArtisanDashboard() {
  const { user, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const profileQuery = trpc.artisans.getProfile.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
  });
  const locationsQuery = trpc.locations.getAll.useQuery();
  const categoriesQuery = trpc.categories.list.useQuery();
  const utils = trpc.useUtils();

  const profile = profileQuery.data;
  const category = categoriesQuery.data?.find(
    (item) => item.id === profile?.categoryId
  );

  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [serviceAreas, setServiceAreas] = useState("");
  const [startingPrice, setStartingPrice] = useState("");

  useEffect(() => {
    if (!profile || isEditing) return;

    setBusinessName(profile.businessName ?? "");
    setBio(profile.bio ?? "");
    setYearsExperience(profile.yearsExperience?.toString() ?? "");
    setState(profile.state ?? "");
    setLga(profile.lga ?? "");
    setCity(profile.city ?? "");
    setArea(profile.area ?? "");
    setServiceAreas(profile.serviceAreas ?? "");
    setStartingPrice(profile.startingPrice?.toString() ?? "");
  }, [isEditing, profile]);

  const updateMutation = trpc.artisans.update.useMutation({
    onSuccess: async () => {
      toast.success("Profile updated successfully");
      await utils.artisans.getProfile.invalidate();
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const states = useMemo(
    () =>
      locationsQuery.data
        ? [...new Set(locationsQuery.data.map((location) => location.state))].sort()
        : [],
    [locationsQuery.data]
  );

  const lgas = useMemo(
    () =>
      state
        ? [
            ...new Set(
              locationsQuery.data
                ?.filter((location) => location.state === state)
                .map((location) => location.lga) || []
            ),
          ].sort()
        : [],
    [locationsQuery.data, state]
  );

  const cities = useMemo(
    () =>
      lga
        ? [
            ...new Set(
              locationsQuery.data
                ?.filter(
                  (location) => location.state === state && location.lga === lga
                )
                .map((location) => location.city) || []
            ),
          ].sort()
        : [],
    [lga, locationsQuery.data, state]
  );

  const completeness = useMemo(() => {
    if (!profile) return 0;

    const fields = [
      profile.businessName,
      profile.categoryId,
      profile.bio,
      profile.yearsExperience,
      profile.state,
      profile.lga,
      profile.city,
      profile.area,
      profile.serviceAreas,
      profile.startingPrice,
    ];
    const completed = fields.filter(Boolean).length;

    return Math.round((completed / fields.length) * 100);
  }, [profile]);

  const handleUpdate = (event: FormEvent) => {
    event.preventDefault();

    if (!businessName || !state || !lga || !city) {
      toast.error("Business name, state, LGA, and city are required");
      return;
    }

    updateMutation.mutate({
      businessName,
      bio: bio || undefined,
      yearsExperience: yearsExperience ? parseInt(yearsExperience, 10) : undefined,
      state,
      lga,
      city,
      area: area || undefined,
      serviceAreas: serviceAreas || undefined,
      startingPrice: startingPrice ? parseFloat(startingPrice) : undefined,
    });
  };

  if (loading || profileQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <DashboardNotice title="Sign in required" actionHref="/" actionLabel="Back to Home" />;
  }

  if (profileQuery.error) {
    return (
      <DashboardNotice
        title="Unable to load dashboard"
        description={profileQuery.error.message}
        actionHref="/"
        actionLabel="Back to Home"
      />
    );
  }

  if (!profile) {
    return (
      <DashboardNotice
        title="No artisan profile yet"
        description="Create your artisan profile before using the dashboard."
        actionHref="/artisan/register"
        actionLabel="Create Profile"
      />
    );
  }

  const approvalClass =
    statusStyles[profile.approvalStatus as keyof typeof statusStyles] ||
    statusStyles.pending;
  const verificationClass =
    statusStyles[profile.verificationStatus as keyof typeof statusStyles] ||
    statusStyles.pending;
  const isApproved = profile.approvalStatus === "approved";

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-white/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold">Artisan Connect</span>
            </a>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {user.name || "Artisan"}
            </span>
            <Link href="/">
              <Button variant="outline" size="sm" className="rounded-full">
                Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container py-8">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
              Artisan dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Manage your professional profile
            </h1>
            <p className="mt-2 text-muted-foreground">
              Keep your listing accurate while it moves through approval and
              verification.
            </p>
          </div>
          {isApproved && (
            <Link href={`/artisan/${profile.id}`}>
              <Button className="rounded-full">
                <Eye className="h-4 w-4" />
                Public Profile Preview
              </Button>
            </Link>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-bold">{profile.businessName}</h2>
                  <p className="mt-2 flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    {profile.area ? `${profile.area}, ` : ""}
                    {profile.city}, {profile.lga}, {profile.state}
                  </p>
                </div>
                <Button
                  variant={isEditing ? "secondary" : "outline"}
                  className="rounded-full"
                  onClick={() => setIsEditing((value) => !value)}
                >
                  <Edit2 className="h-4 w-4" />
                  {isEditing ? "Cancel Edit" : "Edit Profile"}
                </Button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <StatusPill
                  label="Approval"
                  value={profile.approvalStatus}
                  className={approvalClass}
                  Icon={profile.approvalStatus === "approved" ? CheckCircle2 : Clock}
                />
                <StatusPill
                  label="Verification"
                  value={profile.verificationStatus}
                  className={verificationClass}
                  Icon={
                    profile.verificationStatus === "verified"
                      ? BadgeCheck
                      : ShieldCheck
                  }
                />
              </div>
            </Card>

            <Card className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">Profile details</h2>
                <span className="text-sm font-semibold text-muted-foreground">
                  {completeness}% complete
                </span>
              </div>

              {isEditing ? (
                <form className="space-y-5" onSubmit={handleUpdate}>
                  <Field label="Business Name">
                    <Input
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                    />
                  </Field>
                  <Field label="Bio">
                    <Textarea
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      rows={4}
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Years of Experience">
                      <Input
                        type="number"
                        min="0"
                        value={yearsExperience}
                        onChange={(event) => setYearsExperience(event.target.value)}
                      />
                    </Field>
                    <Field label="Starting Price (NGN)">
                      <Input
                        type="number"
                        min="0"
                        value={startingPrice}
                        onChange={(event) => setStartingPrice(event.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="State">
                      <Select
                        value={state}
                        onValueChange={(value) => {
                          setState(value);
                          setLga("");
                          setCity("");
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="LGA">
                      <Select
                        value={lga}
                        onValueChange={(value) => {
                          setLga(value);
                          setCity("");
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select LGA" />
                        </SelectTrigger>
                        <SelectContent>
                          {lgas.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="City">
                      <Select value={city} onValueChange={setCity}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Area">
                      <Input
                        value={area}
                        onChange={(event) => setArea(event.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Service Areas">
                    <Textarea
                      value={serviceAreas}
                      onChange={(event) => setServiceAreas(event.target.value)}
                      rows={2}
                    />
                  </Field>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="w-full rounded-xl"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  <Detail label="Category" value={category?.name || "Not found"} />
                  <Detail
                    label="Starting Price"
                    value={formatPrice(profile.startingPrice)}
                  />
                  <Detail
                    label="Experience"
                    value={
                      profile.yearsExperience
                        ? `${profile.yearsExperience} years`
                        : "Not specified"
                    }
                  />
                  <Detail label="Service Areas" value={profile.serviceAreas || "Not specified"} />
                  <div className="md:col-span-2">
                    <Detail label="Bio" value={profile.bio || "No bio provided yet"} />
                  </div>
                </div>
              )}
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">Profile completeness</h2>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Add a bio, service areas, area, price, and experience to improve
                client confidence.
              </p>
            </Card>

            <Card className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">Public visibility</h2>
              <div className="mt-4 flex gap-3">
                {isApproved ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                )}
                <p className="text-sm text-muted-foreground">
                  {isApproved
                    ? "Your profile can be previewed publicly."
                    : "Your public profile preview becomes available after approval."}
                </p>
              </div>
              {isApproved ? (
                <Link href={`/artisan/${profile.id}`}>
                  <Button variant="outline" className="mt-5 w-full rounded-xl">
                    Preview Profile
                  </Button>
                </Link>
              ) : (
                <Button disabled variant="outline" className="mt-5 w-full rounded-xl">
                  Awaiting Approval
                </Button>
              )}
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

function DashboardNotice({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description?: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container flex min-h-screen items-center justify-center py-16">
        <Card className="max-w-md items-center rounded-2xl bg-white p-8 text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">{title}</h1>
          {description && (
            <p className="mt-2 text-muted-foreground">{description}</p>
          )}
          <Link href={actionHref}>
            <Button className="mt-6 rounded-full px-6">{actionLabel}</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function StatusPill({
  label,
  value,
  className,
  Icon,
}: {
  label: string;
  value: string;
  className: string;
  Icon: LucideIcon;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] opacity-80">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2 font-bold capitalize">
        <Icon className="h-4 w-4" />
        {value}
      </div>
    </div>
  );
}
