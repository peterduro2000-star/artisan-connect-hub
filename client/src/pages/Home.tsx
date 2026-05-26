import { AuthNavActions } from "@/components/AuthNavActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTelHref } from "@/lib/contact";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Brush,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Hammer,
  MapPin,
  MessageCircle,
  Paintbrush,
  Phone,
  Plug,
  Scissors,
  Search,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Star,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

type CategoryCard = {
  id: number;
  name: string;
  slug: string;
  description: string;
  Icon: LucideIcon;
};

const FALLBACK_CATEGORIES: CategoryCard[] = [
  {
    id: 1,
    name: "Plumbing",
    slug: "plumbing",
    description: "Leaks, installations, water systems, and emergency repairs.",
    Icon: Wrench,
  },
  {
    id: 2,
    name: "Electrical",
    slug: "electrical",
    description: "Wiring, lighting, sockets, inspections, and fault finding.",
    Icon: Plug,
  },
  {
    id: 3,
    name: "Carpentry",
    slug: "carpentry",
    description: "Furniture, fittings, doors, cabinets, and wood repairs.",
    Icon: Hammer,
  },
  {
    id: 4,
    name: "Tailoring",
    slug: "tailoring",
    description: "Alterations, custom outfits, uniforms, and fittings.",
    Icon: Scissors,
  },
  {
    id: 5,
    name: "Painting",
    slug: "painting",
    description: "Interior, exterior, decorative finishes, and touch-ups.",
    Icon: Paintbrush,
  },
  {
    id: 6,
    name: "Mechanics",
    slug: "mechanics",
    description: "Vehicle diagnostics, servicing, repairs, and inspections.",
    Icon: BriefcaseBusiness,
  },
  {
    id: 7,
    name: "AC Repair",
    slug: "ac-repair",
    description: "Cooling faults, installation, servicing, and maintenance.",
    Icon: Snowflake,
  },
  {
    id: 8,
    name: "Generator Repair",
    slug: "generator-repair",
    description: "Generator servicing, troubleshooting, and part replacement.",
    Icon: Zap,
  },
];

const categoryIcons = new Map(
  FALLBACK_CATEGORIES.map(category => [category.slug, category.Icon])
);

const popularSearches = [
  { label: "Plumber in Abuja", href: "/search?category=plumbing&state=FCT" },
  {
    label: "Electrician in Lagos",
    href: "/search?category=electrical&state=Lagos",
  },
  { label: "Tailor in Kano", href: "/search?category=tailoring&state=Kano" },
  { label: "AC repair nearby", href: "/search?category=ac-repair" },
];

const navLinks = [
  { label: "Search Artisans", href: "/search" },
  { label: "Browse Services", href: "#services" },
  { label: "Request Service", href: "/service-request" },
  { label: "Register as Artisan", href: "/artisan/register" },
];

const formatPrice = (value: unknown) => {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : null;

  if (!amount || Number.isNaN(amount)) return null;

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function Home() {
  const [searchCategory, setSearchCategory] = useState("");
  const [searchState, setSearchState] = useState("");

  const categoriesQuery = trpc.categories.list.useQuery();
  const locationsQuery = trpc.locations.getAll.useQuery();
  const featuredQuery = trpc.artisans.getFeatured.useQuery({});

  const categories = useMemo(() => {
    const dbCategories = categoriesQuery.data;
    if (!dbCategories?.length) return FALLBACK_CATEGORIES;

    return dbCategories.slice(0, 8).map(category => {
      const fallback = FALLBACK_CATEGORIES.find(
        item => item.slug === category.slug
      );

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description:
          category.description ||
          fallback?.description ||
          `Find verified ${category.name.toLowerCase()} professionals near you.`,
        Icon: categoryIcons.get(category.slug) || Brush,
      };
    });
  }, [categoriesQuery.data]);

  const states = useMemo(
    () =>
      locationsQuery.data
        ? [
            ...new Set(locationsQuery.data.map(location => location.state)),
          ].sort()
        : [],
    [locationsQuery.data]
  );

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchCategory) params.set("category", searchCategory);
    if (searchState) params.set("state", searchState);
    window.location.href = `/search${params.toString() ? `?${params}` : ""}`;
  };

  const featuredArtisans = featuredQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/">
            <a className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Hammer className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight">
                Artisan Connect
              </span>
            </a>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <AuthNavActions />
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(35_38%_96%))]">
          <div className="container grid gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                Verified local professionals, web-first
              </div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Find Trusted Artisans Near You
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Search verified artisans for home, office, and personal services
                without installing an app. Compare profiles, request help, and
                contact professionals directly.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ["Verified profiles", ShieldCheck],
                  ["Direct contact", Phone],
                  ["Local coverage", MapPin],
                ].map(([label, Icon]) => (
                  <div
                    key={label as string}
                    className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {label as string}
                  </div>
                ))}
              </div>
            </div>

            <Card className="gap-0 rounded-2xl border-border/80 bg-white p-5 shadow-xl shadow-slate-950/10 sm:p-6">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                  Start your search
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  What service do you need?
                </h2>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                <Select
                  value={searchCategory}
                  onValueChange={setSearchCategory}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl border-border bg-background px-4 shadow-none">
                    <SelectValue placeholder="Service category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.slug}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={searchState} onValueChange={setSearchState}>
                  <SelectTrigger className="h-12 w-full rounded-xl border-border bg-background px-4 shadow-none">
                    <SelectValue
                      placeholder={
                        locationsQuery.isLoading ? "Loading locations" : "State"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map(state => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleSearch}
                  className="h-12 rounded-xl px-6 font-semibold shadow-lg shadow-primary/20"
                >
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {popularSearches.map(searchItem => (
                  <a
                    key={searchItem.label}
                    href={searchItem.href}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {searchItem.label}
                  </a>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section id="services" className="py-14 lg:py-20">
          <div className="container">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                  Browse by service
                </p>
                <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                  Get the right professional for the job
                </h2>
              </div>
              <Link href="/search">
                <a className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  View all artisans
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map(category => (
                <Link
                  key={category.id}
                  href={`/search?category=${category.slug}`}
                >
                  <a className="group block h-full">
                    <Card className="h-full gap-4 rounded-2xl border-border/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-slate-950/10">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <category.Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{category.name}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                      <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
                        Find artisans
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-white py-14 lg:py-20">
          <div className="container">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                  Featured artisans
                </p>
                <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                  Professionals ready to help
                </h2>
              </div>
              <Link href="/search">
                <Button variant="outline" className="rounded-full">
                  Search directory
                </Button>
              </Link>
            </div>

            {featuredQuery.isLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[0, 1, 2].map(item => (
                  <Card
                    key={item}
                    className="h-52 animate-pulse rounded-2xl border-border bg-muted/40"
                  />
                ))}
              </div>
            ) : featuredArtisans.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {featuredArtisans.map((item: any) => {
                  const artisan = item.artisan;
                  const price = formatPrice(artisan.startingPrice);

                  return (
                    <Card
                      key={artisan.id}
                      className="gap-0 overflow-hidden rounded-2xl border-border/80 bg-background p-0 shadow-sm"
                    >
                      <div className="flex h-36 items-center justify-center bg-gradient-to-br from-primary/12 to-secondary">
                        {artisan.profilePhotoUrl ? (
                          <img
                            src={artisan.profilePhotoUrl}
                            alt={artisan.businessName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <BriefcaseBusiness className="h-12 w-12 text-primary" />
                        )}
                      </div>
                      <div className="p-5">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold">
                              {artisan.businessName}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {artisan.yearsExperience || 1}+ years experience
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            <Star className="h-3.5 w-3.5" />
                            Featured
                          </span>
                        </div>

                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary" />
                          {artisan.city}, {artisan.state}
                        </p>

                        {price && (
                          <p className="mt-3 text-sm font-semibold text-foreground">
                            Starts from {price}
                          </p>
                        )}

                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <Link href={`/artisan/${artisan.id}`}>
                            <Button
                              variant="outline"
                              className="w-full rounded-xl"
                            >
                              Profile
                            </Button>
                          </Link>
                          <Button asChild className="w-full rounded-xl">
                            <a href={getTelHref(artisan.phone)}>
                              <Phone className="h-4 w-4" />
                              Call
                            </a>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="items-center gap-4 rounded-2xl border-dashed border-border bg-background p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    Featured artisans will appear here
                  </h3>
                  <p className="mt-2 max-w-xl text-muted-foreground">
                    Verified professionals can be promoted from the admin
                    dashboard. Clients can still browse the full artisan
                    directory now.
                  </p>
                </div>
                <Link href="/search">
                  <Button className="rounded-full px-6">Browse artisans</Button>
                </Link>
              </Card>
            )}
          </div>
        </section>

        <section className="py-14 lg:py-20">
          <div className="container">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                How it works
              </p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                From search to contact in minutes
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Search",
                  description:
                    "Choose the service you need and narrow results by state or city.",
                  Icon: Search,
                },
                {
                  title: "Compare",
                  description:
                    "Review experience, location, pricing signals, and verification status.",
                  Icon: ClipboardCheck,
                },
                {
                  title: "Contact",
                  description:
                    "Call, message, or submit a service request from your browser.",
                  Icon: MessageCircle,
                },
              ].map((step, index) => (
                <Card
                  key={step.title}
                  className="rounded-2xl border-border/80 bg-white p-6 shadow-sm"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <step.Icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-4 pb-14 lg:pb-20">
          <div className="container">
            <div className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-950/15">
              <div className="grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center lg:p-10">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/85">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    Built for verified artisans
                  </div>
                  <h2 className="max-w-2xl text-3xl font-bold text-white sm:text-4xl">
                    Grow your service business with clients already looking for
                    your skills.
                  </h2>
                  <p className="mt-4 max-w-2xl text-white/70">
                    Create a profile, show your service areas, add portfolio
                    proof, and make it easier for clients to trust and contact
                    you.
                  </p>
                </div>
                <Link href="/artisan/register">
                  <Button className="h-12 rounded-full bg-white px-6 font-semibold text-slate-950 hover:bg-white/90">
                    Register as Artisan
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white">
        <div className="container grid gap-8 py-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Hammer className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold">Artisan Connect</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              A web-first marketplace helping clients find verified artisans
              across Nigeria.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Trust, location, and direct contact first.
            </div>
          </div>

          {[
            {
              title: "Clients",
              links: [
                ["Search Artisans", "/search"],
                ["Browse Services", "#services"],
                ["Request Service", "/service-request"],
              ],
            },
            {
              title: "Artisans",
              links: [
                ["Register", "/artisan/register"],
                ["Dashboard", "/artisan/dashboard"],
                ["Get Featured", "/artisan/register"],
              ],
            },
            {
              title: "Support",
              links: [
                ["Help Center", "/"],
                ["Safety", "/"],
                ["Terms", "/"],
              ],
            },
          ].map(column => (
            <div key={column.title}>
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {column.links.map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="transition-colors hover:text-primary"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border py-5">
          <div className="container flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Artisan Connect Hub. All rights reserved.</p>
            <p>Built for clients, artisans, and local trust.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
