import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageTitleProvider } from "@/components/layout/page-title";
import { RouteProgress } from "@/components/ui/route-progress";
import { getCurrentProfile } from "@/lib/actions/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <SidebarProvider>
      <AppSidebar userName={profile.full_name} />
      <SidebarInset className="bg-[#F9FAFB]">
        <PageTitleProvider>
          <RouteProgress />
          <AppHeader />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </PageTitleProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
