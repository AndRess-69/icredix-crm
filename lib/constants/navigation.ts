import type { LucideIcon } from "lucide-react";
import {
  Ban,
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Smartphone,
  Users,
  Wallet,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Clientes",
    href: "/clientes",
    icon: Users,
  },
  {
    title: "Créditos",
    href: "/creditos",
    icon: CreditCard,
  },
  {
    title: "Pagos",
    href: "/pagos",
    icon: Wallet,
  },
  {
    title: "Equipos",
    href: "/equipos",
    icon: Smartphone,
  },
  {
    title: "Bloqueos",
    href: "/bloqueos",
    icon: Ban,
  },
  {
    title: "Documentos",
    href: "/documentos",
    icon: FileText,
  },
  {
    title: "Reportes",
    href: "/reportes",
    icon: BarChart3,
  },
  {
    title: "Configuración",
    href: "/configuracion",
    icon: Settings,
  },
];

export const logoutNavItem: NavItem = {
  title: "Cerrar sesión",
  href: "/logout",
  icon: LogOut,
};
