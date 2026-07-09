"use client";

import {
  Award,
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";
import PwaInstallButton from "@/components/ui/PwaInstallButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard",      mobileLabel: "Home",   icon: LayoutDashboard, mobile: true },
  { href: "/lessons",   label: "Lezioni",         mobileLabel: "Lezioni",icon: ListChecks,      mobile: true },
  { href: "/piano",     label: "Piano di Studi",  mobileLabel: "Piano",  icon: GraduationCap,   mobile: true },
  { href: "/esami",     label: "Esami",            mobileLabel: "Esami",  icon: Award,           mobile: true },
  { href: "/calendar",  label: "Calendario",       mobileLabel: "Cal.",   icon: CalendarDays,    mobile: false },
  { href: "/subjects",  label: "Materie",          mobileLabel: "Materie",icon: BookOpen,        mobile: false },
  { href: "/settings",  label: "Impostazioni",     mobileLabel: "Imp.",   icon: Settings,        mobile: true },
] as const;

const MOBILE_NAV = NAV_ITEMS.filter((i) => i.mobile);

type NavItem = {
  href: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  mobile: boolean;
};

export default function AppNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const currentItem = NAV_ITEMS.find((item) => isActive(item.href));

  return (
    <>
      <nav
        aria-label="Navigazione principale"
        className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-background-soft px-3 py-5 shadow-inset lg:flex"
      >
        <div className="mb-7 flex items-center gap-3 px-2">
          <div className="grid size-10 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent shadow-glow">
            <BookOpen className="size-5" aria-hidden="true" />
          </div>
          <div>
            <span className="block text-sm font-semibold text-primary">
              Lesson Tracker
            </span>
            <span className="text-xs text-muted">Planner lezioni</span>
          </div>
        </div>

        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <DesktopNavItem
              key={item.href}
              item={item}
              active={isActive(item.href)}
            />
          ))}
        </div>

        <div className="mt-auto space-y-2">
          <PwaInstallButton />
          <div className="rounded-card border border-border bg-surface/60 p-3 text-xs text-muted">
            <div className="mb-2 flex items-center gap-2 text-secondary">
              <span className="size-2 rounded-full bg-success" />
              Sistema locale
            </div>
            Dati e calendario restano sul dispositivo.
          </div>
        </div>
      </nav>

      <header className="fixed inset-x-0 top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent">
              <BookOpen className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Lesson Tracker</p>
              <p className="text-xs text-muted">{currentItem?.label ?? "Dashboard"}</p>
            </div>
          </div>
        </div>
      </header>

      <nav
        aria-label="Navigazione mobile"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
      >
        <div className="grid grid-cols-5 gap-1">
          {MOBILE_NAV.map((item) => (
            <MobileNavItem
              key={item.href}
              item={item}
              active={isActive(item.href)}
            />
          ))}
        </div>
      </nav>
    </>
  );
}

function DesktopNavItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-surface-elevated text-primary shadow-inset"
          : "text-secondary hover:bg-surface-hover hover:text-primary"
      )}
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-full transition",
          active
            ? "bg-accent text-background"
            : "bg-surface-muted text-muted group-hover:text-primary"
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

function MobileNavItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium leading-none transition",
        active
          ? "bg-surface-elevated text-primary"
          : "text-muted hover:bg-surface-hover hover:text-secondary"
      )}
    >
      <Icon
        className={cn("size-5", active ? "text-accent" : "text-muted")}
        aria-hidden="true"
      />
      <span aria-hidden="true" className="max-w-full whitespace-nowrap">
        {item.mobileLabel}
      </span>
    </Link>
  );
}
