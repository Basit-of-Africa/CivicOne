import { Clock, MapPin, Phone, Mail, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface OfficeLocationData {
  id: string;
  agency: string;
  name: string;
  state: string;
  lga: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
  isHeadquarters: boolean;
}

/**
 * Phase 6A — Office Locator
 * Shows government office locations for the selected service.
 */
export function OfficeLocator({
  providerName,
  offices,
  userState,
}: {
  providerName: string;
  offices: OfficeLocationData[];
  userState?: string | null;
}) {
  if (offices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4 text-secondary" aria-hidden="true" />
            Office Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Office locations are not available yet. Visit the{" "}
            {providerName} website or call their hotline to find the nearest
            office.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort: headquarters first, then user's state, then alphabetical
  const sorted = [...offices].sort((a, b) => {
    if (a.isHeadquarters && !b.isHeadquarters) return -1;
    if (!a.isHeadquarters && b.isHeadquarters) return 1;
    if (userState) {
      if (a.state === userState && b.state !== userState) return -1;
      if (a.state !== userState && b.state === userState) return 1;
    }
    return a.state.localeCompare(b.state);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="size-4 text-secondary" aria-hidden="true" />
          Office Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((office) => (
          <div
            key={office.id}
            className="rounded-md border border-border bg-card px-4 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {office.name}
                  </p>
                  {office.isHeadquarters ? (
                    <Badge variant="outline">
                      <Star className="size-3" aria-hidden="true" />
                      HQ
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {office.address}
                  {office.lga ? `, ${office.lga}` : ""}, {office.state}
                </p>
              </div>
              {office.latitude && office.longitude ? (
                <a
                  href={`https://www.google.com/maps?q=${office.latitude},${office.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  Map
                </a>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {office.hours ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" aria-hidden="true" />
                  {office.hours}
                </span>
              ) : null}
              {office.phone ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="size-3" aria-hidden="true" />
                  {office.phone}
                </span>
              ) : null}
              {office.email ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="size-3" aria-hidden="true" />
                  {office.email}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
