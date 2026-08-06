"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, CreditCard, Headphones, Settings, UsersRound } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";

const adminNavigation = [
  { label: "Dashboard", href: "/admin", icon: BarChart3 },
  { label: "Usuários", href: "/admin/users", icon: UsersRound },
  { label: "Planos", href: "/admin/plans", icon: CreditCard },
  { label: "Suporte", href: "/admin/support", icon: Headphones },
  { label: "Logs", href: "/admin/logs", icon: ClipboardList },
  { label: "Configurações", href: "/admin/settings", icon: Settings },
];

type AdminSidebarProps = {
  adminName: string;
  adminEmail: string;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AdminSidebar({ adminName, adminEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const initials = getInitials(adminName) || "AD";

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <BrandLogo inverse />
        <em>Admin</em>
      </div>

      <nav aria-label="Navegação administrativa">
        {adminNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/admin" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link key={item.href} href={item.href} className={isActive ? "active" : undefined} aria-current={isActive ? "page" : undefined}>
              <Icon size={21} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <footer className="admin-sidebar-footer">
        <span>{initials}</span>
        <div>
          <strong>{adminName}</strong>
          <small>{adminEmail}</small>
          <em>Administrador</em>
        </div>
      </footer>
    </aside>
  );
}
