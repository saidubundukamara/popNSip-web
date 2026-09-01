import {
  BarChart3,
  Bike,
  BookOpen,
  ChefHat,
  CreditCard,
  LayoutDashboard,
  ListOrdered,
  MessageCircle,
  Settings,
  Store,
  Tag,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { StaffRole } from "@/lib/api-client";
import { roleAtLeast } from "@/lib/roles";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  minRole: StaffRole;
  /** Shown in the collapsed rail's tooltip and read by screen readers. */
  hint?: string;
};

export type NavGroup = { label?: string; items: NavItem[] };

/**
 * Twelve destinations would be a wall. They are grouped so no group exceeds
 * five (working memory holds about four), and filtered by role so a cashier is
 * never shown a door the API will slam.
 *
 * A cashier sees four items and no group headings at all. The server remains
 * the only place authorisation is decided; this just stops teaching people
 * that the app breaks when you tap things.
 */
const GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, minRole: "MANAGER" },
    ],
  },
  {
    label: "Service",
    items: [
      { href: "/dashboard/queue", label: "Queue", icon: ListOrdered, minRole: "STAFF", hint: "Live orders" },
      { href: "/dashboard/pos", label: "POS", icon: Store, minRole: "STAFF", hint: "Take an order" },
      { href: "/dashboard/kitchen", label: "Kitchen", icon: ChefHat, minRole: "STAFF", hint: "Cooking screen" },
      { href: "/dashboard/delivery", label: "Delivery", icon: Bike, minRole: "STAFF", hint: "Orders going out" },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/dashboard/orders", label: "Orders", icon: BookOpen, minRole: "MANAGER", hint: "Search past orders" },
      { href: "/dashboard/menu", label: "Menu", icon: Tag, minRole: "MANAGER" },
      { href: "/dashboard/customers", label: "Customers", icon: Users, minRole: "MANAGER" },
      { href: "/dashboard/payments", label: "Payments", icon: CreditCard, minRole: "MANAGER" },
      { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageCircle, minRole: "MANAGER", hint: "Chats needing a reply" },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/dashboard/reports", label: "Reports", icon: BarChart3, minRole: "MANAGER" },
      { href: "/dashboard/promotions", label: "Promotions", icon: Tag, minRole: "MANAGER" },
      { href: "/dashboard/staff", label: "Staff", icon: UsersRound, minRole: "OWNER" },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, minRole: "MANAGER" },
    ],
  },
];

export function navFor(role: StaffRole): NavGroup[] {
  return GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => roleAtLeast(role, item.minRole)),
  })).filter((group) => group.items.length > 0);
}

/** The phone bar. Five is the ceiling; everything else lives behind "More". */
export function primaryFor(role: StaffRole): NavItem[] {
  return navFor(role)
    .flatMap((group) => group.items)
    .slice(0, 4);
}

/** Longest-prefix match, so /dashboard/orders/abc still lights up Orders. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
