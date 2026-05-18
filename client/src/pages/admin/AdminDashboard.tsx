import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Building2, CalendarCheck, DollarSign, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const { data: propertiesData } = trpc.admin.listProperties.useQuery();
  const { data: bookingsData } = trpc.admin.listBookings.useQuery();

  const totalProperties = propertiesData?.length ?? 0;
  const activeProperties = propertiesData?.filter((p) => p.active === 1).length ?? 0;
  const totalBookings = bookingsData?.length ?? 0;
  const paidBookings = bookingsData?.filter((b) => b.status === "paid" || b.status === "confirmed") ?? [];
  const totalRevenue = paidBookings.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);

  const recentBookings = bookingsData?.slice(0, 5) ?? [];

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back. Here's an overview of Rose City Stays.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Properties",
              value: totalProperties,
              sub: `${activeProperties} active`,
              icon: Building2,
              color: "text-blue-500",
              bg: "bg-blue-50 dark:bg-blue-950/30",
            },
            {
              label: "Total Bookings",
              value: totalBookings,
              sub: `${paidBookings.length} confirmed`,
              icon: CalendarCheck,
              color: "text-green-500",
              bg: "bg-green-50 dark:bg-green-950/30",
            },
            {
              label: "Total Revenue",
              value: `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
              sub: "from direct bookings",
              icon: DollarSign,
              color: "text-emerald-500",
              bg: "bg-emerald-50 dark:bg-emerald-950/30",
            },
            {
              label: "Avg. Booking Value",
              value: paidBookings.length > 0
                ? `$${(totalRevenue / paidBookings.length).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : "—",
              sub: "per confirmed booking",
              icon: TrendingUp,
              color: "text-purple-500",
              bg: "bg-purple-50 dark:bg-purple-950/30",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-background rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent bookings */}
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Recent Bookings</h2>
              <Link href="/admin/bookings" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
            {recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-foreground">{b.guestName}</p>
                      <p className="text-xs text-muted-foreground">{b.propertyId} · {b.nights} nights</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">${parseFloat(b.totalAmount).toFixed(0)}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        b.status === "confirmed" || b.status === "paid"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : b.status === "cancelled"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}>{b.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Properties quick list */}
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Properties</h2>
              <Link href="/admin/properties" className="text-xs text-primary hover:underline">Manage →</Link>
            </div>
            {(propertiesData ?? []).slice(0, 6).map((p) => (
              <Link key={p.id} href={`/admin/properties/${p.id}`}>
                <div className="flex items-center justify-between py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 cursor-pointer transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.shortName}</p>
                    <p className="text-xs text-muted-foreground">{p.bedrooms}BR · {p.guests} guests</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.active === 1
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {p.active === 1 ? "Active" : "Hidden"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
