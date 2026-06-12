import { useAuth } from "@/_core/hooks/useAuth";
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
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  FileWarning,
  Flag,
  Hammer,
  Inbox,
  Shield,
  Star,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type ReportStatus = "open" | "investigating" | "resolved" | "dismissed";

const reportStatuses: ReportStatus[] = [
  "open",
  "investigating",
  "resolved",
  "dismissed",
];

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
};

const formatMoney = (value: unknown) => {
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

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRejectId, setSelectedRejectId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingArtisanId, setPendingArtisanId] = useState<number | null>(null);
  const [pendingReportId, setPendingReportId] = useState<number | null>(null);

  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const pendingQuery = trpc.admin.getPendingArtisans.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });
  const allArtisansQuery = trpc.admin.getAllArtisans.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });
  const reportsQuery = trpc.reports.list.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });
  const serviceRequestsQuery = trpc.serviceRequests.listForAdmin.useQuery(
    undefined,
    {
      enabled: isAdmin,
      retry: false,
    }
  );
  const categoriesQuery = trpc.categories.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  const invalidateAdminData = async () => {
    await Promise.all([
      utils.admin.getPendingArtisans.invalidate(),
      utils.admin.getAllArtisans.invalidate(),
      utils.artisans.getFeatured.invalidate(),
      utils.artisans.search.invalidate(),
      utils.artisans.getById.invalidate(),
      utils.reports.list.invalidate(),
      utils.serviceRequests.listForAdmin.invalidate(),
    ]);
  };

  const approveMutation = trpc.admin.approveArtisan.useMutation({
    onMutate: ({ artisanId }) => setPendingArtisanId(artisanId),
    onSuccess: async () => {
      toast.success("Artisan approved");
      await invalidateAdminData();
    },
    onError: error => toast.error(error.message),
    onSettled: () => setPendingArtisanId(null),
  });

  const rejectMutation = trpc.admin.rejectArtisan.useMutation({
    onMutate: ({ artisanId }) => setPendingArtisanId(artisanId),
    onSuccess: async () => {
      toast.success("Artisan rejected");
      setSelectedRejectId(null);
      setRejectionReason("");
      await invalidateAdminData();
    },
    onError: error => toast.error(error.message),
    onSettled: () => setPendingArtisanId(null),
  });

  const verifyMutation = trpc.admin.verifyArtisan.useMutation({
    onMutate: ({ artisanId }) => setPendingArtisanId(artisanId),
    onSuccess: async () => {
      toast.success("Artisan verified");
      await invalidateAdminData();
    },
    onError: error => toast.error(error.message),
    onSettled: () => setPendingArtisanId(null),
  });

  const featureMutation = trpc.featured.add.useMutation({
    onMutate: ({ artisanId }) => setPendingArtisanId(artisanId),
    onSuccess: async () => {
      toast.success("Artisan featured");
      await invalidateAdminData();
    },
    onError: error => toast.error(error.message),
    onSettled: () => setPendingArtisanId(null),
  });

  const unfeatureMutation = trpc.featured.remove.useMutation({
    onMutate: ({ artisanId }) => setPendingArtisanId(artisanId),
    onSuccess: async () => {
      toast.success("Artisan removed from featured");
      await invalidateAdminData();
    },
    onError: error => toast.error(error.message),
    onSettled: () => setPendingArtisanId(null),
  });

  const updateReportMutation = trpc.reports.updateStatus.useMutation({
    onMutate: ({ reportId }) => setPendingReportId(reportId),
    onSuccess: async () => {
      toast.success("Report status updated");
      await utils.reports.list.invalidate();
    },
    onError: async error => {
      toast.error(error.message || "Unable to update report status");
      await utils.reports.list.invalidate();
    },
    onSettled: () => setPendingReportId(null),
  });

  const allArtisans = allArtisansQuery.data ?? [];
  const pendingArtisans = pendingQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const serviceRequests = serviceRequestsQuery.data ?? [];

  const categoryById = useMemo(
    () =>
      new Map((categoriesQuery.data ?? []).map(item => [item.id, item.name])),
    [categoriesQuery.data]
  );

  const stats = [
    {
      label: "Pending artisans",
      value: pendingArtisans.length,
      Icon: Clock,
      tone: "text-amber-700 bg-amber-50",
    },
    {
      label: "All artisans",
      value: allArtisans.length,
      Icon: Hammer,
      tone: "text-slate-700 bg-slate-100",
    },
    {
      label: "Service requests",
      value: serviceRequests.length,
      Icon: Inbox,
      tone: "text-blue-700 bg-blue-50",
    },
    {
      label: "Open reports",
      value: reports.filter(report => report.status !== "resolved").length,
      Icon: FileWarning,
      tone: "text-red-700 bg-red-50",
    },
  ];

  const isInitialLoading =
    loading ||
    (isAdmin &&
      (pendingQuery.isLoading ||
        allArtisansQuery.isLoading ||
        reportsQuery.isLoading ||
        serviceRequestsQuery.isLoading));

  const firstError =
    pendingQuery.error ||
    allArtisansQuery.error ||
    reportsQuery.error ||
    serviceRequestsQuery.error;

  if (isInitialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <AdminNotice
        title="Access denied"
        description="This dashboard is only available to administrator accounts."
      />
    );
  }

  if (firstError) {
    return (
      <AdminNotice
        title="Unable to load admin dashboard"
        description={firstError.message}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Shield className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold">Artisan Connect Admin</span>
            </a>
          </Link>
          <AuthNavActions />
        </div>
      </header>

      <main className="container py-8 lg:py-10">
        <div className="mb-8 rounded-3xl border border-border/80 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                Admin dashboard
              </p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                Platform management
              </h1>
              <p className="mt-2 text-muted-foreground">
                Review artisan applications, manage visibility, handle reports,
                and monitor marketplace activity.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(stat => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-border/80 bg-white p-1 shadow-sm md:grid-cols-5">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="artisans">Artisans</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <SectionHeader
              title="Pending artisan profiles"
              description="Approve or reject new artisan submissions."
            />
            {pendingArtisans.length ? (
              <div className="grid gap-4">
                {pendingArtisans.map(artisan => (
                  <ArtisanCard
                    key={artisan.id}
                    artisan={artisan}
                    category={categoryById.get(artisan.categoryId)}
                    onApprove={() =>
                      approveMutation.mutate({ artisanId: artisan.id })
                    }
                    onReject={() => setSelectedRejectId(artisan.id)}
                    onVerify={() =>
                      verifyMutation.mutate({ artisanId: artisan.id })
                    }
                    onFeature={() =>
                      featureMutation.mutate({
                        artisanId: artisan.id,
                        categoryId: artisan.categoryId,
                      })
                    }
                    onUnfeature={() =>
                      unfeatureMutation.mutate({ artisanId: artisan.id })
                    }
                    busy={pendingArtisanId === artisan.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No pending artisan profiles to review." />
            )}
          </TabsContent>

          <TabsContent value="artisans" className="space-y-4">
            <SectionHeader
              title="All artisans"
              description="Manage approval, verification, and listing visibility."
            />
            {allArtisans.length ? (
              <div className="grid gap-4">
                {allArtisans.map(artisan => (
                  <ArtisanCard
                    key={artisan.id}
                    artisan={artisan}
                    category={categoryById.get(artisan.categoryId)}
                    onApprove={() =>
                      approveMutation.mutate({ artisanId: artisan.id })
                    }
                    onReject={() => setSelectedRejectId(artisan.id)}
                    onVerify={() =>
                      verifyMutation.mutate({ artisanId: artisan.id })
                    }
                    onFeature={() =>
                      featureMutation.mutate({
                        artisanId: artisan.id,
                        categoryId: artisan.categoryId,
                      })
                    }
                    onUnfeature={() =>
                      unfeatureMutation.mutate({ artisanId: artisan.id })
                    }
                    busy={pendingArtisanId === artisan.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No artisan profiles found." />
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <SectionHeader
              title="Service requests"
              description="View client requests submitted through the public form."
            />
            {serviceRequests.length ? (
              <div className="grid gap-4">
                {serviceRequests.map(request => (
                  <Card
                    key={request.id}
                    className="rounded-2xl border-border/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-slate-950/10"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
                      <div>
                        <h3 className="text-lg font-bold">
                          {request.clientName}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {request.description}
                        </p>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold">Location</p>
                        <p className="text-muted-foreground">
                          {request.area ? `${request.area}, ` : ""}
                          {request.city}, {request.lga}, {request.state}
                        </p>
                        <p className="pt-2 font-semibold">Urgency</p>
                        <StatusBadge value={request.urgency} />
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold">Contact</p>
                        <p className="text-muted-foreground">
                          {request.clientPhone}
                        </p>
                        <p className="pt-2 font-semibold">Budget</p>
                        <p className="text-muted-foreground">
                          {request.budgetRange || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState message="No service requests have been submitted yet." />
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <SectionHeader
              title="Reports"
              description="Review client reports and update investigation status."
            />
            {reports.length ? (
              <div className="grid gap-4">
                {reports.map(report => (
                  <Card
                    key={report.id}
                    className="rounded-2xl border-border/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-slate-950/10"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_220px]">
                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold">
                          <Flag className="h-4 w-4 text-red-600" />
                          {report.reason}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {report.description ||
                            "No extra description provided."}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Created {formatDate(report.createdAt)}
                        </p>
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold">Reporter</p>
                        <p className="text-muted-foreground">
                          {report.reporterName}
                        </p>
                        <p className="text-muted-foreground">
                          {report.reporterPhone}
                        </p>
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-semibold">Status</p>
                        <Select
                          value={report.status}
                          disabled={pendingReportId === report.id}
                          onValueChange={value =>
                            value === report.status
                              ? undefined
                              : updateReportMutation.mutate({
                                  reportId: report.id,
                                  status: value as ReportStatus,
                                })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {reportStatuses.map(status => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState message="No reports have been submitted." />
            )}
          </TabsContent>

          <TabsContent value="featured" className="space-y-4">
            <SectionHeader
              title="Featured artisans controls"
              description="Promote approved artisans on the public homepage."
            />
            {allArtisans.length ? (
              <div className="grid gap-4">
                {allArtisans.map(artisan => (
                  <Card
                    key={artisan.id}
                    className="rounded-2xl border-border/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-slate-950/10"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div>
                        <h3 className="text-lg font-bold">
                          {artisan.businessName}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {categoryById.get(artisan.categoryId) ||
                            "Unknown category"}{" "}
                          · {artisan.city}, {artisan.state}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusBadge value={artisan.approvalStatus} />
                          <StatusBadge value={artisan.verificationStatus} />
                          {artisan.isFeatured && (
                            <StatusBadge value="featured" />
                          )}
                        </div>
                      </div>
                      {artisan.isFeatured ? (
                        <Button
                          variant="outline"
                          className="rounded-full"
                          disabled={unfeatureMutation.isPending}
                          onClick={() =>
                            unfeatureMutation.mutate({ artisanId: artisan.id })
                          }
                        >
                          Remove Featured
                        </Button>
                      ) : (
                        <Button
                          className="rounded-full"
                          disabled={
                            featureMutation.isPending ||
                            artisan.approvalStatus !== "approved" ||
                            artisan.verificationStatus !== "verified"
                          }
                          onClick={() =>
                            featureMutation.mutate({
                              artisanId: artisan.id,
                              categoryId: artisan.categoryId,
                            })
                          }
                        >
                          <Star className="h-4 w-4" />
                          Feature
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState message="No artisans available to feature." />
            )}
          </TabsContent>
        </Tabs>

        {selectedRejectId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
            <Card className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold">Reject artisan profile</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add a short reason so the artisan understands what needs to be
                improved.
              </p>
              <Textarea
                value={rejectionReason}
                onChange={event => setRejectionReason(event.target.value)}
                placeholder="Reason for rejection"
                rows={4}
                className="mt-4"
              />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRejectId(null);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={rejectMutation.isPending}
                  onClick={() => {
                    if (!rejectionReason.trim()) {
                      toast.error("Please provide a rejection reason");
                      return;
                    }
                    rejectMutation.mutate({
                      artisanId: selectedRejectId,
                      reason: rejectionReason.trim(),
                    });
                  }}
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function AdminNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container flex min-h-screen items-center justify-center">
        <Card className="max-w-md items-center rounded-2xl bg-white p-8 text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
          <Link href="/">
            <Button className="mt-6 rounded-full px-6">Back to Home</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card className="rounded-2xl border-border/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="items-center rounded-2xl border-dashed bg-white p-10 text-center shadow-sm">
      <Inbox className="h-10 w-10 text-muted-foreground" />
      <p className="mt-3 text-muted-foreground">{message}</p>
    </Card>
  );
}

function ArtisanCard({
  artisan,
  category,
  onApprove,
  onReject,
  onVerify,
  onFeature,
  onUnfeature,
  busy,
}: {
  artisan: {
    id: number;
    businessName: string;
    categoryId: number;
    bio: string | null;
    yearsExperience: number | null;
    state: string;
    lga: string;
    city: string;
    area: string | null;
    startingPrice: string | null;
    approvalStatus: "pending" | "approved" | "rejected";
    verificationStatus: "pending" | "verified" | "rejected";
    isFeatured: boolean;
    rejectionReason: string | null;
    createdAt: Date;
  };
  category?: string;
  onApprove: () => void;
  onReject: () => void;
  onVerify: () => void;
  onFeature: () => void;
  onUnfeature: () => void;
  busy: boolean;
}) {
  return (
    <Card className="rounded-2xl border-border/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-slate-950/10">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_240px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{artisan.businessName}</h3>
            {artisan.isFeatured && <StatusBadge value="featured" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {category || "Unknown category"} · {artisan.yearsExperience || 0}{" "}
            years experience
          </p>
          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
            {artisan.bio || "No business bio provided."}
          </p>
          {artisan.rejectionReason && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              Rejection reason: {artisan.rejectionReason}
            </p>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold">Location</p>
          <p className="text-muted-foreground">
            {artisan.area ? `${artisan.area}, ` : ""}
            {artisan.city}, {artisan.lga}, {artisan.state}
          </p>
          <p className="pt-2 font-semibold">Starting price</p>
          <p className="text-muted-foreground">
            {formatMoney(artisan.startingPrice)}
          </p>
          <p className="pt-2 text-xs text-muted-foreground">
            Submitted {formatDate(artisan.createdAt)}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={artisan.approvalStatus} />
            <StatusBadge value={artisan.verificationStatus} />
          </div>
          <div className="grid gap-2">
            {artisan.approvalStatus !== "approved" && (
              <Button
                disabled={busy}
                onClick={onApprove}
                className="rounded-xl"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
            )}
            {artisan.approvalStatus !== "rejected" && (
              <Button
                disabled={busy}
                onClick={onReject}
                variant="outline"
                className="rounded-xl"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            )}
            {artisan.verificationStatus !== "verified" && (
              <Button
                disabled={busy || artisan.approvalStatus !== "approved"}
                onClick={onVerify}
                variant="outline"
                className="rounded-xl"
              >
                <BadgeCheck className="h-4 w-4" />
                Verify
              </Button>
            )}
            {artisan.isFeatured ? (
              <Button
                disabled={busy}
                onClick={onUnfeature}
                variant="outline"
                className="rounded-xl"
              >
                Remove Featured
              </Button>
            ) : (
              <Button
                disabled={
                  busy ||
                  artisan.approvalStatus !== "approved" ||
                  artisan.verificationStatus !== "verified"
                }
                onClick={onFeature}
                variant="outline"
                className="rounded-xl"
              >
                <Star className="h-4 w-4" />
                Feature
              </Button>
            )}
            <Link href={`/artisan/${artisan.id}`}>
              <Button variant="ghost" className="w-full rounded-xl">
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const className =
    normalized === "approved" ||
    normalized === "verified" ||
    normalized === "resolved"
      ? "border-green-200 bg-green-50 text-green-700"
      : normalized === "rejected" ||
          normalized === "dismissed" ||
          normalized === "urgent"
        ? "border-red-200 bg-red-50 text-red-700"
        : normalized === "featured"
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${className}`}
    >
      {value}
    </span>
  );
}
