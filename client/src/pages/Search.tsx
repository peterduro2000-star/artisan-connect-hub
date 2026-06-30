import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { AuthNavActions } from "@/components/AuthNavActions";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  BriefcaseBusiness,
  Filter,
  Eye,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { getTelHref, getWhatsAppHref } from "@/lib/contact";

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

const ALL_VALUE = "__all__";
const fallbackArtisanImage =
  "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80";

export default function Search() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1]);

  const [categoryFilter, setCategoryFilter] = useState(
    params.get("category") || ""
  );
  const [stateFilter, setStateFilter] = useState(params.get("state") || "");
  const [lgaFilter, setLgaFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const { data: locations } = trpc.locations.getAll.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const categoryOptions = categories?.length ? categories : INITIAL_CATEGORIES;
  const { data: artisans, isLoading } = trpc.artisans.search.useQuery({
    categoryId: categoryFilter
      ? categoryOptions.find(c => c.slug === categoryFilter)?.id
      : undefined,
    state: stateFilter || undefined,
    lga: lgaFilter || undefined,
    city: cityFilter || undefined,
  });
  const contactMutation = trpc.artisans.getContact.useMutation();

  const handleContact = async (
    artisanId: number,
    eventType: "call" | "whatsapp"
  ) => {
    const contact = await contactMutation.mutateAsync({
      id: artisanId,
      eventType,
    });
    const href =
      eventType === "whatsapp"
        ? getWhatsAppHref(contact.whatsappNumber || contact.phone)
        : getTelHref(contact.phone);

    if (href) {
      window.open(
        href,
        eventType === "whatsapp" ? "_blank" : "_self",
        "noopener,noreferrer"
      );
    }
  };

  const states = locations
    ? [...new Set(locations.map(l => l.state))].sort()
    : [];
  const lgas = stateFilter
    ? [
        ...new Set(
          locations?.filter(l => l.state === stateFilter).map(l => l.lga) || []
        ),
      ].sort()
    : [];
  const cities = lgaFilter
    ? [
        ...new Set(
          locations
            ?.filter(l => l.state === stateFilter && l.lga === lgaFilter)
            .map(l => l.city) || []
        ),
      ].sort()
    : [];

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
          <AuthNavActions />
        </div>
      </nav>

      <div className="container py-8 lg:py-10">
        <div className="mb-8 rounded-3xl border border-border/80 bg-white px-5 py-7 shadow-sm sm:px-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                Artisan directory
              </p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                Search trusted local artisans
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Filter by service and location, then call or message approved
                professionals directly.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
              <ShieldCheck className="h-4 w-4" />
              Approved profiles only
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="card-elevated sticky top-20">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Filter className="h-4 w-4" />
                Filters
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Service
                  </label>
                  <Select
                    value={categoryFilter || ALL_VALUE}
                    onValueChange={value =>
                      setCategoryFilter(value === ALL_VALUE ? "" : value)
                    }
                  >
                    <SelectTrigger className="input-field">
                      <SelectValue placeholder="All services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>All services</SelectItem>
                      {categoryOptions.map(cat => (
                        <SelectItem key={cat.id} value={cat.slug}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    State
                  </label>
                  <Select
                    value={stateFilter || ALL_VALUE}
                    onValueChange={val => {
                      setStateFilter(val === ALL_VALUE ? "" : val);
                      setLgaFilter("");
                      setCityFilter("");
                    }}
                  >
                    <SelectTrigger className="input-field">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>All states</SelectItem>
                      {states.map(state => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {stateFilter && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      LGA
                    </label>
                    <Select
                      value={lgaFilter || ALL_VALUE}
                      onValueChange={val => {
                        setLgaFilter(val === ALL_VALUE ? "" : val);
                        setCityFilter("");
                      }}
                    >
                      <SelectTrigger className="input-field">
                        <SelectValue placeholder="Select LGA" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>All LGAs</SelectItem>
                        {lgas.map(lga => (
                          <SelectItem key={lga} value={lga}>
                            {lga}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {lgaFilter && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      City
                    </label>
                    <Select
                      value={cityFilter || ALL_VALUE}
                      onValueChange={val =>
                        setCityFilter(val === ALL_VALUE ? "" : val)
                      }
                    >
                      <SelectTrigger className="input-field">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>All cities</SelectItem>
                        {cities.map(city => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => {
                    setCategoryFilter("");
                    setStateFilter("");
                    setLgaFilter("");
                    setCityFilter("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[0, 1, 2, 3].map(item => (
                  <Card
                    key={item}
                    className="h-80 animate-pulse rounded-2xl border-border/80 bg-muted/40"
                  />
                ))}
              </div>
            ) : artisans && artisans.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {artisans.map((artisan: any) => {
                  return (
                    <Card
                      key={artisan.id}
                      className="h-full overflow-hidden rounded-2xl border-border/80 bg-white p-0 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/10"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={artisan.profilePhotoUrl || fallbackArtisanImage}
                          alt={artisan.businessName}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/50 to-transparent" />
                        {artisan.verificationStatus === "verified" && (
                          <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-green-700 shadow-sm">
                            <Star className="h-3 w-3 fill-green-600 text-green-600" />
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-foreground">
                              {artisan.businessName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {artisan.yearsExperience || 0} years experience
                            </p>
                          </div>
                          <BriefcaseBusiness className="mt-1 h-4 w-4 text-primary" />
                        </div>

                        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                          {artisan.bio || "No bio provided."}
                        </p>

                        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {artisan.city}, {artisan.state}
                        </div>

                        {artisan.startingPrice && (
                          <p className="mb-4 text-sm font-semibold text-accent">
                            From ₦
                            {Number(artisan.startingPrice).toLocaleString()}
                          </p>
                        )}

                        <div className="grid gap-2 sm:grid-cols-3">
                          <Link href={`/artisan/${artisan.id}`}>
                            <Button
                              variant="outline"
                              className="w-full rounded-lg"
                            >
                              <Eye className="h-4 w-4" />
                              Profile
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            onClick={() => handleContact(artisan.id, "call")}
                            disabled={contactMutation.isPending}
                            className="w-full rounded-lg"
                          >
                            <Phone className="h-4 w-4" />
                            Call
                          </Button>
                          <Button
                            onClick={() =>
                              handleContact(artisan.id, "whatsapp")
                            }
                            disabled={contactMutation.isPending}
                            className="w-full rounded-lg bg-green-600 text-white hover:bg-green-700"
                          >
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="card-elevated py-12 text-center">
                <Filter className="mx-auto h-10 w-10 text-primary" />
                <p className="mt-4 text-lg font-semibold">
                  No artisans found matching your criteria.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try adjusting your filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
