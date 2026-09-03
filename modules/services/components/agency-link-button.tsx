"use client";

import * as React from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackServiceAction } from "@/modules/services/actions";

/**
 * Phase 6A — Agency Link Button
 * Opens the official agency portal in a new tab while tracking the click.
 */
export function AgencyLinkButton({
  serviceId,
  agencyUrl,
  agencyLabel,
}: {
  serviceId: string;
  agencyUrl: string;
  agencyLabel?: string | null;
}) {
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    try {
      // Track the click (fire-and-forget)
      await trackServiceAction(serviceId, "agency_click");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button asChild onClick={handleClick}>
      <a href={agencyUrl} target="_blank" rel="noreferrer">
        {pending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <ExternalLink aria-hidden="true" />
        )}
        {agencyLabel || "Open on Agency Portal"}
      </a>
    </Button>
  );
}
