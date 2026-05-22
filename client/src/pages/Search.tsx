import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Phone, MessageCircle, MapPin, Star, Filter } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

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

export default function Search() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1]);

  const [categoryFilter, setCategoryFilter] = useState(params.get("category") || "");
  const [stateFilter, setStateFilter] = useState(params.get("state") || "");
  const [lgaFilter, setLgaFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const { data: locations } = trpc.locations.getAll.useQuery();
  const { data: artisans, isLoading } = trpc.artisans.search.useQuery({
    categoryId: categoryFilter ? INITIAL_CATEGORIES.find((c) => c.slug === categoryFilter)?.id : undefined,
    state: stateFilter || undefined,
    lga: lgaFilter || undefined,
    city: cityFilter || undefined,
  });

  const states = locations ? [...new Set(locations.map((l) => l.state))].sort() : [];
  const lgas = stateFilter
    ? [...new Set(locations?.filter((l) => l.state === stateFilter).map((l) => l.lga) || [])].sort()
    : [];
  const cities = lgaFilter
    ? [...new Set(
        locations?.filter((l) => l.state === stateFilter && l.lga === lgaFilter).map((l) => l.city) || []
      )].sort()
    : [];

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
        </div>
      </nav>

      <div className="container py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Search Artisans</h1>
          <p className="text-muted-foreground">Find the perfect professional for your needs</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="card-elevated sticky top-4">
              <h3 className="mb-4 flex items-center gap-2 font-bold">
                <Filter className="h-4 w-4" />
                Filters
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold">Service</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="input-field">
                      <SelectValue placeholder="All services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All services</SelectItem>
                      {INITIAL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.slug}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">State</label>
                  <Select value={stateFilter} onValueChange={(val) => {
                    setStateFilter(val);
                    setLgaFilter("");
                    setCityFilter("");
                  }}>
                    <SelectTrigger className="input-field">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All states</SelectItem>
                      {states.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {stateFilter && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold">LGA</label>
                    <Select value={lgaFilter} onValueChange={(val) => {
                      setLgaFilter(val);
                      setCityFilter("");
                    }}>
                      <SelectTrigger className="input-field">
                        <SelectValue placeholder="Select LGA" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All LGAs</SelectItem>
                        {lgas.map((lga) => (
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
                    <label className="mb-2 block text-sm font-semibold">City</label>
                    <Select value={cityFilter} onValueChange={setCityFilter}>
                      <SelectTrigger className="input-field">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All cities</SelectItem>
                        {cities.map((city) => (
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
                  className="w-full"
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
              <div className="flex items-center justify-center py-12">
                <Spinner />
              </div>
            ) : artisans && artisans.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {artisans.map((artisan: any) => (
                  <Link key={artisan.id} href={`/artisan/${artisan.id}`}>
                    <a>
                      <Card className="card-elevated group h-full cursor-pointer">
                        {artisan.profilePhotoUrl && (
                          <img
                            src={artisan.profilePhotoUrl}
                            alt={artisan.businessName}
                            className="mb-4 h-48 w-full rounded-lg object-cover"
                          />
                        )}

                        <div className="mb-3 flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-foreground">{artisan.businessName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {artisan.yearsExperience} years experience
                            </p>
                          </div>
                          {artisan.verificationStatus === "verified" && (
                            <span className="badge-success">
                              <Star className="h-3 w-3" />
                            </span>
                          )}
                        </div>

                        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{artisan.bio}</p>

                        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {artisan.city}, {artisan.state}
                        </div>

                        {artisan.startingPrice && (
                          <p className="mb-4 text-sm font-semibold text-accent">
                            From ₦{artisan.startingPrice.toLocaleString()}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <a
                            href={`tel:${artisan.phone}`}
                            className="flex-1 rounded-lg bg-accent/10 px-3 py-2 text-center text-sm font-semibold text-accent transition-all hover:bg-accent/20"
                            onClick={(e) => e.preventDefault()}
                          >
                            <Phone className="mr-1 inline h-4 w-4" />
                            Call
                          </a>
                          <a
                            href={`https://wa.me/${artisan.whatsappNumber || artisan.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 rounded-lg bg-green-100 px-3 py-2 text-center text-sm font-semibold text-green-700 transition-all hover:bg-green-200"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MessageCircle className="mr-1 inline h-4 w-4" />
                            WhatsApp
                          </a>
                        </div>
                      </Card>
                    </a>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card-elevated text-center py-12">
                <p className="text-lg text-muted-foreground">No artisans found matching your criteria.</p>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
