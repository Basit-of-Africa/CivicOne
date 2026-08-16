"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Settings, UserRound } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerCloseButton,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { NavList } from "@/components/shell/desktop-sidebar";
import { logoutAction } from "@/modules/auth/actions";

export interface MobileHeaderProps {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

/**
 * Mobile top bar: logo, navigation drawer trigger and account menu.
 * Visible below lg breakpoint only.
 */
export function MobileHeader({ firstName, lastName, email }: MobileHeaderProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);

  const fullName =
    firstName || lastName
      ? `${firstName ?? ""} ${lastName ?? ""}`.trim()
      : "CivicOne User";

  async function handleLogout() {
    setPending(true);
    await logoutAction();
    setPending(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
      <div className="flex items-center gap-1">
        <Drawer open={navOpen} onOpenChange={setNavOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label="Open navigation menu"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </DrawerTrigger>
          <DrawerContent side="left">
            <DrawerHeader className="border-b border-border">
              <DrawerTitle className="sr-only">Navigation</DrawerTitle>
              <Logo href="/dashboard" size="sm" />
              <DrawerCloseButton />
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto py-4">
              <NavList onNavigate={() => setNavOpen(false)} />
            </div>
          </DrawerContent>
        </Drawer>
        <Logo href="/dashboard" size="sm" />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="rounded-full transition-opacity hover:opacity-80"
          >
            <Avatar name={fullName} size="sm" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block truncate text-sm font-semibold">{fullName}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {email ?? "Account"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/profile">
              <UserRound aria-hidden="true" />
              Profile
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/security">
              <Settings aria-hidden="true" />
              Security
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onSelect={(event) => {
              event.preventDefault();
              void handleLogout();
            }}
          >
            <LogOut aria-hidden="true" />
            {pending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
