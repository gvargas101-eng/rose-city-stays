import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Pencil, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminProperties() {
  const { data: props, refetch } = trpc.admin.listProperties.useQuery();
  const updateProp = trpc.admin.updateProperty.useMutation({
    onSuccess: () => { refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = (id: number, current: number) => {
    updateProp.mutate({ id, active: current === 1 ? 0 : 1 });
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Properties</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your rental properties — edit details, photos, and amenities.</p>
        </div>

        <div className="bg-background rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Property</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Capacity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Cleaning Fee</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(props ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-foreground">{p.shortName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.neighborhood}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground hidden md:table-cell">{p.type}</td>
                  <td className="px-4 py-4 text-muted-foreground hidden lg:table-cell">
                    {p.bedrooms} BR · {p.guests} guests
                  </td>
                  <td className="px-4 py-4 text-muted-foreground hidden lg:table-cell">
                    ${parseFloat(p.cleaningFee).toFixed(0)}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleActive(p.id, p.active)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors ${
                        p.active === 1
                          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {p.active === 1 ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {p.active === 1 ? "Active" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/admin/properties/${p.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
