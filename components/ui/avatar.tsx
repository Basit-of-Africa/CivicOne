import * as React from "react";
import { cn } from "@/lib/utils";

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

const AVATAR_TONES = [
  "bg-primary/10 text-primary",
  "bg-secondary/10 text-secondary",
  "bg-accent/25 text-accent-foreground",
];

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
};

/**
 * Initials avatar. Supports an image src; falls back to initials.
 */
export function Avatar({
  name,
  src,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const showImage = !!src && !failed;
  const hash = React.useMemo(() => {
    let h = 0;
    const value = name ?? "?";
    for (let i = 0; i < value.length; i++) {
      h = (h * 31 + value.charCodeAt(i)) % AVATAR_TONES.length;
    }
    return h;
  }, [name]);

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        SIZE_CLASSES[size],
        !showImage && AVATAR_TONES[hash],
        className,
      )}
      aria-hidden={!name ? true : undefined}
      {...props}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initialsOf(name)}</span>
      )}
    </div>
  );
}
