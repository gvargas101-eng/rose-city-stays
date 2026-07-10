/**
 * AdminLayout — sidebar layout for all admin pages.
 * Uses standalone password-based admin session (independent of Manus OAuth).
 * Fully responsive: fixed sidebar on desktop, slide-in drawer on mobile.
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Building2,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Settings2,
  Menu,
  X,
  Briefcase,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import AdminLogin from "./AdminLogin";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/properties", label: "Properties", icon: Building2 },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/corporate-inquiries", label: "Corporate", icon: Briefcase },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
];

function SidebarContent({
  location,
  adminSession,
  onLogout,
  onNavClick,
}: {
  location: string;
  adminSession: { authenticated: boolean; username?: string };
  onLogout: () => void;
  onNavClick?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <Link href="/" onClick={onNavClick}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">RC</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Rose City Stays</div>
              <div className="text-xs text-muted-foreground">Admin Panel</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = item.exact
            ? location === item.href
            : location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={onNavClick}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
            {adminSession.username?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">
              {adminSession.username ?? "Admin"}
            </div>
            <div className="text-xs text-muted-foreground">Administrator</div>
          </div>
          <button
            onClick={onLogout}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <Link
          href="/"
          onClick={onNavClick}
          className="block mt-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← View site
        </Link>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const utils = trpc.useUtils();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Check standalone admin session
  const { data: adminSession, isLoading } = trpc.adminAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSuccess: () => {
      utils.adminAuth.me.invalidate();
      window.location.href = "/";
    },
    onError: () => {
      toast.error("Logout failed");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated — show the login page
  if (!adminSession?.authenticated) {
    return <AdminLogin />;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* ── DESKTOP SIDEBAR (hidden on mobile) ── */}
      <aside className="hidden md:flex w-60 shrink-0 bg-background border-r border-border flex-col">
        <SidebarContent
          location={location}
          adminSession={adminSession}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── MOBILE HEADER ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b border-border px-4 h-14 flex items-center justify-between">
        <Link href="/admin">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-[10px] font-bold">RC</span>
            </div>
            <span className="text-sm font-semibold text-foreground">Admin Panel</span>
          </div>
        </Link>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── MOBILE DRAWER OVERLAY ── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── MOBILE DRAWER ── */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-background border-r border-border flex flex-col transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer close button */}
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <SidebarContent
          location={location}
          adminSession={adminSession}
          onLogout={handleLogout}
          onNavClick={() => setDrawerOpen(false)}
        />
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 min-w-0 overflow-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}
