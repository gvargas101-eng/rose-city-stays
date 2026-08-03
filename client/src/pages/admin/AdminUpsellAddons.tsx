/**
 * AdminUpsellAddons — manage optional paid add-ons shown to guests at checkout.
 * Examples: Early Check-In ($50), Late Checkout ($50), Mid-Stay Cleaning ($75).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, GripVertical, Tag } from "lucide-react";

interface AddonForm {
  name: string;
  description: string;
  price: string;
  active: boolean;
  sortOrder: string;
}

const emptyForm = (): AddonForm => ({
  name: "",
  description: "",
  price: "",
  active: true,
  sortOrder: "0",
});

export default function AdminUpsellAddons() {
  const utils = trpc.useUtils();
  const { data: addons = [], isLoading } = trpc.admin.listUpsellAddons.useQuery();

  const createAddon = trpc.admin.createUpsellAddon.useMutation({
    onSuccess: () => {
      utils.admin.listUpsellAddons.invalidate();
      utils.settings.getActiveUpsellAddons.invalidate();
      setShowForm(false);
      setForm(emptyForm());
      toast.success("Add-on created");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateAddon = trpc.admin.updateUpsellAddon.useMutation({
    onSuccess: () => {
      utils.admin.listUpsellAddons.invalidate();
      utils.settings.getActiveUpsellAddons.invalidate();
      setEditingId(null);
      setForm(emptyForm());
      toast.success("Add-on updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAddon = trpc.admin.deleteUpsellAddon.useMutation({
    onSuccess: () => {
      utils.admin.listUpsellAddons.invalidate();
      utils.settings.getActiveUpsellAddons.invalidate();
      toast.success("Add-on deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AddonForm>(emptyForm());

  const startEdit = (addon: typeof addons[0]) => {
    setEditingId(addon.id);
    setShowForm(false);
    setForm({
      name: addon.name,
      description: addon.description ?? "",
      price: String(parseFloat(String(addon.price))),
      active: addon.active === 1,
      sortOrder: String(addon.sortOrder),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setForm(emptyForm());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }
    if (editingId !== null) {
      updateAddon.mutate({
        id: editingId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price,
        active: form.active,
        sortOrder: parseInt(form.sortOrder) || 0,
      });
    } else {
      createAddon.mutate({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price,
        active: form.active,
        sortOrder: parseInt(form.sortOrder) || 0,
      });
    }
  };

  const toggleActive = (addon: typeof addons[0]) => {
    updateAddon.mutate({ id: addon.id, active: addon.active !== 1 });
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Upsell Add-Ons</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Optional paid upgrades shown to guests during the booking checkout flow.
            </p>
          </div>
          {!showForm && editingId === null && (
            <Button
              onClick={() => { setShowForm(true); setForm(emptyForm()); }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Add-On
            </Button>
          )}
        </div>

        {/* Create / Edit form */}
        {(showForm || editingId !== null) && (
          <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground mb-4">
              {editingId !== null ? "Edit Add-On" : "New Add-On"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Early Check-In"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Price (USD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="50.00"
                      required
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description (shown to guest)</label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Check in as early as 10:00 AM (subject to availability)"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Sort Order</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    {form.active ? (
                      <ToggleRight className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                    )}
                    {form.active ? "Active (shown at checkout)" : "Inactive (hidden)"}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={createAddon.isPending || updateAddon.isPending}
                >
                  {editingId !== null ? "Save Changes" : "Create Add-On"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Add-ons list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
        ) : addons.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No add-ons yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first upsell (e.g. Early Check-In, Late Checkout) to start offering it at checkout.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {addons.map(addon => (
              <div
                key={addon.id}
                className={`bg-card border rounded-xl p-4 flex items-start gap-4 shadow-sm transition-opacity ${
                  addon.active !== 1 ? "opacity-60" : ""
                } ${editingId === addon.id ? "border-primary ring-1 ring-primary" : "border-border"}`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0 cursor-grab" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-sm">{addon.name}</span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                      +${parseFloat(String(addon.price)).toFixed(2)}
                    </span>
                    {addon.active !== 1 && (
                      <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">Inactive</span>
                    )}
                  </div>
                  {addon.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{addon.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(addon)}
                    title={addon.active === 1 ? "Deactivate" : "Activate"}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    {addon.active === 1 ? (
                      <ToggleRight className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(addon)}
                    title="Edit"
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${addon.name}"?`)) deleteAddon.mutate({ id: addon.id });
                    }}
                    title="Delete"
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {addons.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Active add-ons are shown to guests in the booking checkout modal. Inactive add-ons are hidden but not deleted.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
