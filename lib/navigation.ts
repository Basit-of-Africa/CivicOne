import {
  Bell,
  FileText,
  Files,
  Fingerprint,
  FolderOpen,
  HelpCircle,
  History,
  LayoutDashboard,
  Lock,
  Search,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Application navigation. Sections that land in later phases are present in
 * the architecture now — pages render as polished placeholders.
 */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Services", href: "/services/my", icon: Files },
  { label: "Applications", href: "/applications", icon: FileText },
  { label: "Documents", href: "/documents", icon: FolderOpen },
  { label: "Timeline", href: "/timeline", icon: History },
  { label: "Find a Service", href: "/find-a-service", icon: Search },
];

export const SECONDARY_NAV: NavItem[] = [
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Identity", href: "/profile/identity", icon: Fingerprint },
  { label: "Privacy", href: "/privacy", icon: Shield },
  { label: "Security", href: "/security", icon: Lock },
  { label: "Help", href: "/help", icon: HelpCircle },
];

export const MOBILE_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Services", href: "/services/my", icon: Files },
  { label: "Applications", href: "/applications", icon: FileText },
  { label: "Documents", href: "/documents", icon: FolderOpen },
  { label: "Profile", href: "/profile", icon: User },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
