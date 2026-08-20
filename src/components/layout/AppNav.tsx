"use client";

import { useEffect, useRef, useState, type MouseEventHandler } from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MoreHorizontal,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard",      mobileLabel: "Home",    icon: LayoutDashboard, mobile: true },
  { href: "/lessons",   label: "Lezioni",         mobileLabel: "Lezioni", icon: ListChecks,      mobile: true },
  { href: "/piano",     label: "Piano di studi",  mobileLabel: "Piano",   icon: GraduationCap,   mobile: true },
  { href: "/esami",     label: "Esami",            mobileLabel: "Esami",   icon: Award,           mobile: true },
  { href: "/materie",   label: "Materie",          mobileLabel: "Materie", icon: BookOpen,        mobile: true },
  { href: "/calendar",  label: "Calendario",       mobileLabel: "Cal.",    icon: CalendarDays,    mobile: false },
  { href: "/settings",  label: "Impostazioni",     mobileLabel: "Imp.",    icon: Settings,        mobile: false },
] as const;

const MOBILE_NAV = NAV_ITEMS.filter((i) => i.mobile && i.href !== "/materie");
const MORE_NAV_ITEMS = NAV_ITEMS.filter((i) => ["/materie", "/calendar", "/settings"].includes(i.href));

type NavItem = {
  href: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  mobile: boolean;
};

export default function AppNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const currentItem = NAV_ITEMS.find((item) => isActive(item.href));
  const moreActive = MORE_NAV_ITEMS.some((item) => isActive(item.href));

  return (
    <>
      <nav
        aria-label="Navigazione principale"
        className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-background-soft px-3 py-5 lg:flex"
      >
        <Link
          href="/dashboard"
          className="mb-6 flex items-center gap-2.5 rounded-control px-2 py-1.5 transition hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <span className="grid size-8 place-items-center rounded-control bg-accent/12 text-accent">
            <BookOpen className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-primary">Poliplanner</span>
        </Link>

        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <DesktopNavItem
              key={item.href}
              item={item}
              active={isActive(item.href)}
            />
          ))}
        </div>
      </nav>

      <header className="fixed inset-x-0 top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl lg:hidden">
        {/* Solo il marchio: il titolo della pagina è l'h1 subito sotto, e la barra
            in basso indica già dove ci si trova. */}
        <div className="flex h-14 items-center gap-2.5 px-4">
          <span className="grid size-7 place-items-center rounded-control bg-accent/12 text-accent">
            <BookOpen className="size-3.5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-primary">Poliplanner</span>
        </div>
      </header>

      <nav
        aria-label="Navigazione mobile"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden"
      >
        <div className="grid grid-cols-5 gap-0.5">
          {MOBILE_NAV.map((item) => (
            <MobileNavItem
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onClick={() => setMoreOpen(false)}
            />
          ))}
          <MobileMoreMenu
            open={moreOpen}
            active={moreActive}
            currentItem={moreActive ? currentItem : undefined}
            onToggle={() => setMoreOpen((value) => !value)}
            onClose={() => setMoreOpen(false)}
          />
        </div>
      </nav>
    </>
  );
}

function MobileMoreMenu({
  open,
  active,
  currentItem,
  onToggle,
  onClose,
}: {
  open: boolean;
  active: boolean;
  currentItem?: NavItem;
  onToggle: () => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const CurrentIcon = currentItem?.icon ?? MoreHorizontal;

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => {
      const current = menuRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
      (current ?? first)?.focus();
    }, 0);

    function dismiss(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      onClose();
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <div ref={containerRef} className="relative">
      {open && (
        <div
          ref={menuRef}
          id="mobile-more-menu"
          role="menu"
          className="animate-panel-open absolute bottom-full right-0 z-40 mb-2 w-56 rounded-card border border-border-strong bg-surface-elevated p-1.5 shadow-elevated"
        >
          {MORE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCurrent = currentItem?.href === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={isCurrent ? "page" : undefined}
                onClick={onClose}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-control px-3 text-sm transition hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                  isCurrent ? "bg-surface-hover font-medium text-primary" : "text-secondary"
                )}
              >
                <Icon className={cn("size-4", isCurrent ? "text-accent" : "text-muted")} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        aria-label={currentItem ? `${currentItem.label}, apri altre destinazioni` : "Altre destinazioni"}
        aria-current={active ? "page" : undefined}
        aria-expanded={open}
        aria-controls="mobile-more-menu"
        className={cn(
          "relative flex min-h-13 w-full flex-col items-center justify-center gap-1 rounded-control px-1 py-1.5 text-[11px] leading-none transition",
          active || open ? "text-accent" : "text-muted hover:text-secondary"
        )}
      >
        {active && <span aria-hidden="true" className="absolute inset-x-2.5 top-0 h-0.5 rounded-full bg-accent" />}
        <CurrentIcon className="size-5" aria-hidden="true" />
        <span aria-hidden="true" className="max-w-full truncate">{currentItem?.mobileLabel ?? "Altro"}</span>
      </button>
    </div>
  );
}

function DesktopNavItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-control px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        active
          ? "bg-surface-elevated font-medium text-primary"
          : "text-secondary hover:bg-surface-hover hover:text-primary"
      )}
    >
      {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
      <Icon
        className={cn("size-4 shrink-0", active ? "text-accent" : "text-muted")}
        aria-hidden="true"
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function MobileNavItem({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-13 flex-col items-center justify-center gap-1 rounded-control px-1 py-1.5 text-[11px] leading-none transition",
        active ? "text-accent" : "text-muted hover:text-secondary"
      )}
    >
      {active && <span aria-hidden="true" className="absolute inset-x-2.5 top-0 h-0.5 rounded-full bg-accent" />}
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span aria-hidden="true" className="max-w-full whitespace-nowrap">
        {item.mobileLabel}
      </span>
    </Link>
  );
}
