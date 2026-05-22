import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertCircle, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedArtisan, setSelectedArtisan] = useState<number | null>(null);

  const { data: pendingArtisans, refetch: refetchPending } = trpc.admin.getPendingArtisans.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: allArtisans } = trpc.admin.getAllArtisans.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: reports } = trpc.reports.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: serviceRequests } = trpc.serviceRequests.listForAdmin.useQuery(undefined, {
    enabled: !!user,
  });

  const approveMutation = trpc.admin.approveArtisan.useMutation({
    onSuccess: () => {
      toast.success("Artisan approved!");
      refetchPending();
      setSelectedArtisan(null);
    },
  });

  const rejectMutation = trpc.admin.rejectArtisan.useMutation({
    onSuccess: () => {
      toast.success("Artisan rejected!");
      refetchPending();
      setSelectedArtisan(null);
      setRejectionReason("");
    },
  });

  const verifyMutation = trpc.admin.verifyArtisan.useMutation({
    onSuccess: () => {
      toast.success("Artisan verified!");
      refetchPending();
    },
  });

  const featureMutation = trpc.featured.add.useMutation({
    onSuccess: () => {
      toast.success("Artisan featured!");
    },
  });

  const unfeaturedMutation = trpc.featured.remove.useMutation({
    onSuccess: () => {
      toast.success("Artisan removed from featured!");
    },
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
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
              This page is only for administrators.
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
              <span className="text-xl font-bold text-foreground">Artisan Connect</span>
            </a>
          </Link>
          <div className="flex items-center gap-4">
            <Shield className="h-5 w-5 text-accent" />
            <span className="text-sm font-semibold">Admin Panel</span>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-lg text-muted-foreground">Manage artisans, approvals, and platform content</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              Pending ({pendingArtisans?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="all">All Artisans</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
          </TabsList>

          {/* Pending Approvals */}
          <TabsContent value="pending" className="space-y-4">
            {pendingArtisans && pendingArtisans.length > 0 ? (
              <div className="grid gap-4">
                {pendingArtisans.map((artisan: any) => (
                  <Card key={artisan.id} className="card-elevated">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <h3 className="mb-2 font-bold">{artisan.businessName}</h3>
                        <p className="text-sm text-muted-foreground">{artisan.city}, {artisan.state}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Submitted: {new Date(artisan.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Bio</p>
                        <p className="line-clamp-3 text-sm">{artisan.bio || "No bio provided"}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => approveMutation.mutate({ artisanId: artisan.id })}
                          disabled={approveMutation.isPending}
                          className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => setSelectedArtisan(artisan.id)}
                          variant="outline"
                          className="flex items-center justify-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="card-elevated text-center py-12">
                <p className="text-muted-foreground">No pending artisans to review</p>
              </Card>
            )}
          </TabsContent>

          {/* All Artisans */}
          <TabsContent value="all" className="space-y-4">
            {allArtisans && allArtisans.length > 0 ? (
              <div className="grid gap-4">
                {allArtisans.map((artisan: any) => (
                  <Card key={artisan.id} className="card-elevated">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div>
                        <h3 className="mb-2 font-bold">{artisan.businessName}</h3>
                        <div className="flex gap-2">
                          {artisan.approvalStatus === "approved" && (
                            <span className="badge-success">Approved</span>
                          )}
                          {artisan.verificationStatus === "verified" && (
                            <span className="badge-success">Verified</span>
                          )}
                          {artisan.isFeatured && (
                            <span className="badge-accent">Featured</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Location</p>
                        <p className="text-sm">{artisan.city}, {artisan.state}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Status</p>
                        <p className="text-sm">{artisan.approvalStatus}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {artisan.approvalStatus === "approved" && artisan.verificationStatus !== "verified" && (
                          <Button
                            onClick={() => verifyMutation.mutate({ artisanId: artisan.id })}
                            size="sm"
                            variant="outline"
                          >
                            Verify
                          </Button>
                        )}
                        {!artisan.isFeatured && (
                          <Button
                            onClick={() => featureMutation.mutate({ artisanId: artisan.id })}
                            size="sm"
                            variant="outline"
                          >
                            Feature
                          </Button>
                        )}
                        {artisan.isFeatured && (
                          <Button
                            onClick={() => unfeaturedMutation.mutate({ artisanId: artisan.id })}
                            size="sm"
                            variant="outline"
                          >
                            Unfeature
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="card-elevated text-center py-12">
                <p className="text-muted-foreground">No artisans found</p>
              </Card>
            )}
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="space-y-4">
            {reports && reports.length > 0 ? (
              <div className="grid gap-4">
                {reports.map((report: any) => (
                  <Card key={report.id} className="card-elevated">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <h3 className="mb-2 font-bold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          {report.reason}
                        </h3>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Reporter</p>
                        <p className="text-sm">{report.reporterName}</p>
                        <p className="text-xs text-muted-foreground">{report.reporterPhone}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Status</p>
                        <p className="text-sm">{report.status}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="card-elevated text-center py-12">
                <p className="text-muted-foreground">No reports</p>
              </Card>
            )}
          </TabsContent>

          {/* Service Requests */}
          <TabsContent value="requests" className="space-y-4">
            {serviceRequests && serviceRequests.length > 0 ? (
              <div className="grid gap-4">
                {serviceRequests.map((request: any) => (
                  <Card key={request.id} className="card-elevated">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <h3 className="mb-2 font-bold">{request.clientName}</h3>
                        <p className="text-sm text-muted-foreground">{request.description}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Location</p>
                        <p className="text-sm">{request.city}, {request.state}</p>
                        <p className="text-xs font-semibold text-muted-foreground mt-2">Urgency</p>
                        <p className="text-sm">{request.urgency}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Contact</p>
                        <p className="text-sm">{request.clientPhone}</p>
                        {request.budgetRange && (
                          <>
                            <p className="text-xs font-semibold text-muted-foreground mt-2">Budget</p>
                            <p className="text-sm">₦{request.budgetRange}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="card-elevated text-center py-12">
                <p className="text-muted-foreground">No service requests</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Rejection Dialog */}
        {selectedArtisan && (
          <Card className="card-elevated fixed inset-4 z-50 mx-auto my-auto max-w-md">
            <h3 className="mb-4 text-lg font-bold">Reject Artisan</h3>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={4}
              className="input-field mb-4"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedArtisan(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!rejectionReason) {
                    toast.error("Please provide a reason");
                    return;
                  }
                  rejectMutation.mutate({
                    artisanId: selectedArtisan,
                    reason: rejectionReason,
                  });
                }}
                disabled={rejectMutation.isPending}
                className="btn-primary flex-1"
              >
                {rejectMutation.isPending ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
