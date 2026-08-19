import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "warning" | "danger" | "success";
}

const variantStyles = {
  default: "bg-white",
  primary: "bg-gradient-to-br from-[#0052FF]/5 to-[#7000FF]/5 border-[#0052FF]/20",
  warning: "bg-warning/5 border-warning/30",
  danger: "bg-destructive/5 border-destructive/20",
  success: "bg-success/5 border-success/30",
};

const iconVariantStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary text-white",
  warning: "bg-warning text-white",
  danger: "bg-destructive text-white",
  success: "bg-success text-white",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
}: StatCardProps) {
  return (
    <Card className={cn("border shadow-sm", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            iconVariantStyles[variant]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
