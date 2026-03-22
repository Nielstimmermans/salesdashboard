"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Trophy,
  Gift,
  Settings,
  Headphones,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/use-role";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    label: "Sales",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Orders", href: "/orders", icon: ShoppingCart },
      { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
      { name: "Bonussen", href: "/bonuses", icon: Gift },
    ],
  },
  {
    label: "Customer Service",
    items: [
      { name: "CS Overview", href: "/cs", icon: Headphones },
      { name: "Kanalen", href: "/cs/channels", icon: Radio },
    ],
  },
  {
    label: "Beheer",
    items: [
      { name: "Instellingen", href: "/settings", icon: Settings, adminOnly: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin } = useRole();

  return (
    <aside className="hidden w-64 border-r bg-white lg:block">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-xl font-bold text-primary">Performance</span>
      </div>
      <nav className="mt-2 space-y-4 px-3">
        {navigation.map((section) => {
          const filteredItems = section.items.filter(
            (item) => !item.adminOnly || isAdmin
          );
          if (filteredItems.length === 0) return null;

          return (
            <div key={section.label}>
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {filteredItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
