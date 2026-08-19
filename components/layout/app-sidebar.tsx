"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { logoutAction } from "@/lib/actions/auth";
import { logoutNavItem, mainNavItems } from "@/lib/constants/navigation";

interface AppSidebarProps {
  userName?: string;
}

export function AppSidebar({ userName }: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 items-center rounded-lg bg-white px-1.5">
            <Image
              src="/logo-icredix.png"
              alt="iCredix"
              width={1274}
              height={832}
              className="h-7 w-auto object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground">
              iCredix
            </p>
            <p className="text-xs text-sidebar-foreground/60">CRM</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {userName && (
          <p className="mb-2 truncate px-2 text-xs text-sidebar-foreground/60">
            {userName}
          </p>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={logoutAction}>
              <SidebarMenuButton type="submit" tooltip={logoutNavItem.title}>
                <logoutNavItem.icon className="h-4 w-4" />
                <span>{logoutNavItem.title}</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
