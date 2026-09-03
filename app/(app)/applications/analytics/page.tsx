import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplicationAnalytics } from "@/modules/applications/service";
import { ApplicationStatusBadge } from "@/modules/applications/components/application-status-badge";
import type { ApplicationStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Application Analytics",
};

export default async function ApplicationAnalyticsPage() {
  const analytics = await getApplicationAnalytics();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Application Analytics"
        breadcrumbs={[
          { label: "Applications", href: "/applications" },
          { label: "Analytics" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/applications">
              <ArrowLeft aria-hidden="true" />
              Back to applications
            </Link>
          </Button>
        }
      />

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <FileText className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{analytics.totalApplications}</p>
              <p className="text-xs text-muted-foreground">Total applications</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-warning/10">
              <Clock className="size-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{analytics.activeApplications}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <CheckCircle2 className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{analytics.completedApplications}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-destructive/10">
              <XCircle className="size-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{analytics.rejectedApplications}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents card */}
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary/10">
            <BarChart3 className="size-5 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{analytics.totalDocuments}</p>
            <p className="text-xs text-muted-foreground">Documents uploaded across all applications</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-secondary" aria-hidden="true" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentActivity.map((item) => (
                <Link
                  key={item.id}
                  href={`/applications/${item.reference}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/25"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.serviceName}</p>
                    <p className="text-xs text-muted-foreground">{item.reference}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {item.updatedAt.toLocaleDateString()}
                    </span>
                    <ApplicationStatusBadge status={item.status as ApplicationStatus} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No applications yet.{" "}
              <Link href="/find-a-service" className="text-primary hover:underline">
                Find a service
              </Link>{" "}
              to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
