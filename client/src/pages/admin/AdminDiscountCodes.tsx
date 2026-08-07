/**
 * AdminDiscountCodes — manage loyalty/promo discount codes.
 *
 * Features:
 *  - List all codes with status, usage count, and expiry
 *  - Create new codes (percent or flat, per-guest limit, expiry, notes)
 *  - Edit existing codes
 *  - Toggle active/inactive
 *  - Delete codes with 0 uses
 *  - Reset a specific guest's use count (so they can use the code again)
 */

import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit2,
  X,
  RefreshCw,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type FormState = {
  code: string;
  label: string;
  discountType: "percent" | "fixed";
  discountValue: string;
  maxTotalUses: string;
  maxUsesPerGuest: string;
  expiresAt: string; // date string yyyy-MM-dd or ""
  adminNotes: string;
};

const INITIAL_FORM: FormState = {
  code: "",
  label: "",
  discountType: "percent",
  discountValue: "",
  maxTotalUses: "",
  maxUsesPerGuest: "3",
  expiresAt: "",
  adminNotes: "",
};

export default function AdminDiscountCodes() {
  const utils = trpc.useUtils();
  const { data: codes, isLoading } = trpc.discountCodes.list.useQuery();

  const createMutation = trpc.discountCodes.create.useMutation({
    onSuccess: () => { utils.discountCodes.list.invalidate(); toast.success("Discount code created!"); setShowForm(false); setForm(INITIAL_FORM); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.discountCodes.update.useMutation({
    onSuccess: () => { utils.discountCodes.list.invalidate(); toast.success("Code updated!"); setEditId(null); setForm(INITIAL_FORM); },
    onError: (e) => toast.error(e.message),
  });
  const toggleMutation = trpc.discountCodes.toggle.useMutation({
    onSuccess: () => { utils.discountCodes.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.discountCodes.delete.useMutation({
    onSuccess: () => { utils.discountCodes.list.invalidate(); toast.success("Code deleted."); },
    onError: (e) => toast.error(e.message),
  });
  const resetGuestMutation = trpc.discountCodes.setGuestLimit.useMutation({
    onSuccess: (data) => { toast.success(data.message); setResetEmail(""); setResetCodeId(null); },
    onError: (e) => toast.error(e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [resetCodeId, setResetCodeId] = useState<number | null>(null);
  const [resetEmail, setResetEmail] = useState("");

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const startEdit = (code: any) => {
    setEditId(code.id);
    setShowForm(true);
    setForm({
      code: code.code,
      label: code.label,
      discountType: code.discountType,
      discountValue: String(code.discountValue),
      maxTotalUses: code.maxTotalUses != null ? String(code.maxTotalUses) : "",
      maxUsesPerGuest: String(code.maxUsesPerGuest),
      expiresAt: code.expiresAt ? new Date(code.expiresAt).toISOString().split("T")[0] : "",
      adminNotes: code.adminNotes ?? "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: form.code.trim().toUpperCase(),
      label: form.label.trim(),
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue),
      maxTotalUses: form.maxTotalUses ? parseInt(form.maxTotalUses) : null,
      maxUsesPerGuest: parseInt(form.maxUsesPerGuest) || 3,
      expiresAt: form.expiresAt ? new Date(form.expiresAt + "T23:59:59").getTime() : null,
      propertyRestrictions: [],
      adminNotes: form.adminNotes || undefined,
    };
    if (!payload.code || !payload.label || isNaN(payload.discountValue)) {
      toast.error("Code, label, and discount value are required.");
      return;
    }
    if (editId !== null) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Discount Codes</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage loyalty and promo codes for returning guests.
            </p>
          </div>
          <Button
            onClick={() => { setShowForm(!showForm); setEditId(null); setForm(INITIAL_FORM); }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Code
          </Button>
        </div>

        {/* Create / Edit Form */}
        {showForm && (
          <div className="bg-background border border-border rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">
                {editId !== null ? "Edit Code" : "Create New Discount Code"}
              </h2>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm(INITIAL_FORM); }}>
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Code *</label>
                <Input
                  value={form.code}
                  onChange={e => set("code", e.target.value.toUpperCase())}
                  placeholder="WELCOMEBACK10"
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground mt-1">Guests type this at checkout. Stored uppercase.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Label (shown to guest) *</label>
                <Input
                  value={form.label}
                  onChange={e => set("label", e.target.value)}
                  placeholder="Welcome Back 10%"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Discount Type *</label>
                <select
                  value={form.discountType}
                  onChange={e => set("discountType", e.target.value as "percent" | "fixed")}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="percent">Percent (% off nightly subtotal)</option>
                  <option value="fixed">Fixed ($ off nightly subtotal)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {form.discountType === "percent" ? "Percent Off *" : "Dollar Amount Off *"}
                </label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.discountValue}
                  onChange={e => set("discountValue", e.target.value)}
                  placeholder={form.discountType === "percent" ? "10" : "25.00"}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.discountType === "percent" ? "e.g. 10 = 10% off nightly rate × nights" : "e.g. 25 = $25 off nightly subtotal"}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Uses Per Guest Email</label>
                <Input
                  type="number"
                  min="1"
                  value={form.maxUsesPerGuest}
                  onChange={e => set("maxUsesPerGuest", e.target.value)}
                  placeholder="3"
                />
                <p className="text-xs text-muted-foreground mt-1">Default 3. Use the "Reset Guest" tool below to give a specific guest more uses.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Total Uses (all guests)</label>
                <Input
                  type="number"
                  min="1"
                  value={form.maxTotalUses}
                  onChange={e => set("maxTotalUses", e.target.value)}
                  placeholder="Unlimited"
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank for unlimited total uses.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Expiration Date</label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={e => set("expiresAt", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank = never expires.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Admin Notes (internal)</label>
                <Input
                  value={form.adminNotes}
                  onChange={e => set("adminNotes", e.target.value)}
                  placeholder="e.g. Hostaway code: WELCOMEBACK10"
                />
              </div>
              <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(null); setForm(INITIAL_FORM); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editId !== null ? "Save Changes" : "Create Code"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Code List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : !codes?.length ? (
          <div className="bg-background border border-border rounded-xl p-12 text-center">
            <Tag className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No discount codes yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map(code => (
              <div key={code.id} className="bg-background border border-border rounded-xl overflow-hidden">
                {/* Row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-foreground text-sm">{code.code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${code.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {code.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {code.discountType === "percent" ? `${code.discountValue}% off` : `$${code.discountValue} off`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {code.totalUses} use{code.totalUses !== 1 ? "s" : ""}
                        {code.maxTotalUses ? ` / ${code.maxTotalUses} max` : ""}
                      </span>
                      {code.expiresAt && (
                        <span className={`text-xs ${Date.now() > code.expiresAt ? "text-red-500" : "text-muted-foreground"}`}>
                          Expires {new Date(code.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{code.label} · {code.maxUsesPerGuest} use{code.maxUsesPerGuest !== 1 ? "s" : ""}/guest</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate({ id: code.id, isActive: !code.isActive })}
                      title={code.isActive ? "Deactivate" : "Activate"}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {code.isActive ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => startEdit(code)} title="Edit" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete ${code.code}? This cannot be undone.`)) deleteMutation.mutate({ id: code.id }); }}
                      title="Delete"
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpanded(expanded === code.id ? null : code.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expanded === code.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded: reset guest uses */}
                {expanded === code.id && (
                  <div className="px-5 pb-4 border-t border-border bg-muted/20 pt-4">
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground mb-2">Reset Uses for a Specific Guest</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Enter a guest's email to reset their use count for this code back to 0, allowing them to use it again (up to the per-guest limit).
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            value={resetCodeId === code.id ? resetEmail : ""}
                            onChange={e => { setResetCodeId(code.id); setResetEmail(e.target.value); }}
                            placeholder="guest@example.com"
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!resetEmail.trim()) return;
                              resetGuestMutation.mutate({ codeId: code.id, guestEmail: resetEmail.trim(), newLimit: code.maxUsesPerGuest });
                            }}
                            disabled={resetGuestMutation.isPending}
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
                          </Button>
                        </div>
                        {code.adminNotes && (
                          <p className="text-xs text-muted-foreground mt-3 italic">Note: {code.adminNotes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
