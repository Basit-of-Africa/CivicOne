"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Upload,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { reportApplicationProgress } from "@/modules/applications/actions";

export interface ProgressUpdate {
  id: string;
  status: string;
  note: string | null;
  documentName: string | null;
  createdAt: Date;
}

/**
 * Phase 6B — User-Reported Progress Tracker
 * Lets users report manual progress updates for their application.
 */
export function ProgressTracker({
  applicationId,
  currentStatus,
  updates,
}: {
  applicationId: string;
  currentStatus: string;
  updates?: ProgressUpdate[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState(false);
  const [status, setStatus] = React.useState("SUBMITTED");
  const [note, setNote] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const statusOptions = [
    { value: "SUBMITTED", label: "Submitted", icon: FileText },
    { value: "UNDER_REVIEW", label: "Under review", icon: Clock },
    { value: "ACTION_REQUIRED", label: "Action needed", icon: MessageSquare },
    { value: "APPROVED", label: "Approved", icon: CheckCircle2 },
    { value: "REJECTED", label: "Rejected", icon: XCircle },
    { value: "COMPLETED", label: "Completed", icon: CheckCircle2 },
  ];

  async function handleSubmit() {
    setPending(true);
    try {
      const result = await reportApplicationProgress(applicationId, status, note || undefined);
      if (result.ok) {
        toast.success("Progress updated.");
        setShowForm(false);
        setNote("");
        router.refresh();
      } else {
        toast.error(result.error?.message ?? "Unable to update progress.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-secondary" aria-hidden="true" />
            Progress Updates
          </CardTitle>
          {!showForm && !["APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(currentStatus) ? (
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <Upload className="size-4" aria-hidden="true" />
              Report update
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Report form */}
        {showForm ? (
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                What happened?
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {statusOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                        status === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-foreground/25"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label htmlFor="progress-note" className="text-xs font-medium text-muted-foreground">
                Notes (optional)
              </label>
              <textarea
                id="progress-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Received email asking for additional documents"
                className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={pending} onClick={handleSubmit}>
                {pending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                )}
                Save update
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {/* Updates list */}
        {updates && updates.length > 0 ? (
          <div className="space-y-3">
            {updates.map((update) => (
              <div
                key={update.id}
                className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-3"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{update.status.replace(/_/g, " ")}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(update.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {update.note ? (
                    <p className="mt-1 text-sm text-muted-foreground">{update.note}</p>
                  ) : null}
                  {update.documentName ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="size-3" aria-hidden="true" />
                      Attached: {update.documentName}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground">
            No progress updates yet. Report updates as you go through the process.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
