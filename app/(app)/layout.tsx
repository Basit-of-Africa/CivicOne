import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { getIdentityStatus } from "@/modules/identity/service";
import { getUnreadCount } from "@/modules/notifications/service";
import { DesktopSidebar } from "@/components/shell/desktop-sidebar";
import { MobileHeader } from "@/components/shell/mobile-header";
import { MobileNavigation } from "@/components/shell/mobile-navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    // Invalid or expired session despite the cookie — send back to sign in.
    redirect("/auth/login");
  }

  const [identityStatus, unreadNotifications] = await Promise.all([
    getIdentityStatus(),
    getUnreadCount(),
  ]);

  return (
    <div className="min-h-svh bg-background">
      <DesktopSidebar
        firstName={user.firstName}
        lastName={user.lastName}
        email={user.email}
        identityStatus={identityStatus}
        unreadNotifications={unreadNotifications}
      />
      <MobileHeader
        firstName={user.firstName}
        lastName={user.lastName}
        email={user.email}
        identityStatus={identityStatus}
        unreadNotifications={unreadNotifications}
      />
      <main id="main-content" className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
          {children}
        </div>
      </main>
      <MobileNavigation />
    </div>
  );
}
