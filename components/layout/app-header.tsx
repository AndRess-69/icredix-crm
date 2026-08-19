"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/components/layout/page-title";

export function AppHeader() {
  const { title, description } = usePageTitle();

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-white/80 px-4 backdrop-blur-sm md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div>
        {title ? (
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
        ) : (
          <Skeleton className="h-4 w-32" />
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </header>
  );
}
