import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { CheckCircle } from "lucide-react";
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

export default function ServiceRequest() {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [budgetRange, setBudgetRange] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: locations } = trpc.locations.getAll.useQuery();

  const createRequestMutation = trpc.serviceRequests.create.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Service request submitted successfully!");
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit request");
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

    if (!clientName || !clientPhone || !category || !state || !lga || !city || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    const categoryId = INITIAL_CATEGORIES.find((c) => c.slug === category)?.id;

if (!categoryId) {
  toast.error("Please select a valid service category");
  return;
}

createRequestMutation.mutate({
  clientName,
  clientPhone,
  clientWhatsapp: clientWhatsapp || clientPhone,
  categoryId,
  state,
  lga,
  city,
  area: area || "",
  description,
  urgency,
  budgetRange: budgetRange || "",
});
  };

  if (submitted) {
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
          <Card className="card-elevated max-w-md text-center">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600" />
            <h2 className="text-2xl font-bold">Request Submitted!</h2>
            <p className="mt-2 text-muted-foreground">
              Your service request has been received. Relevant artisans will be notified and may contact you soon.
            </p>
            <Link href="/">
              <Button className="btn-primary mt-6 w-full">Back to Home</Button>
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
            <h1 className="mb-2 text-4xl font-bold">Submit a Service Request</h1>
            <p className="text-lg text-muted-foreground">
              Tell us what you need, and we'll connect you with the right artisans.
            </p>
          </div>

          <Card className="card-elevated">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="mb-4 text-lg font-bold">Your Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Full Name *</label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Your full name"
                      className="input-field"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">Phone Number *</label>
                      <Input
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="Your phone number"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold">WhatsApp Number</label>
                      <Input
                        value={clientWhatsapp}
                        onChange={(e) => setClientWhatsapp(e.target.value)}
                        placeholder="WhatsApp number (optional)"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div>
                <h3 className="mb-4 text-lg font-bold">Service Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Service Category *</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="input-field">
                        <SelectValue placeholder="Select service category" />
                      </SelectTrigger>
                      <SelectContent>
                        {INITIAL_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">Description of Work *</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the work you need done..."
                      rows={5}
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
                        placeholder="Specific area (optional)"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <h3 className="mb-4 text-lg font-bold">Additional Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Urgency Level</label>
                    <Select
                      value={urgency}
                      onValueChange={(value) =>
                        setUrgency(value as "low" | "medium" | "high" | "urgent")
                      }
                    >
                      <SelectTrigger className="input-field">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Can wait</SelectItem>
                        <SelectItem value="medium">Medium - Within a week</SelectItem>
                        <SelectItem value="high">High - This week</SelectItem>
                        <SelectItem value="urgent">Urgent - Today/Tomorrow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">Budget Range</label>
                    <Input
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                      placeholder="e.g., 5000-15000"
                      className="input-field"
                    />
                  </div>
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
                  disabled={createRequestMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
