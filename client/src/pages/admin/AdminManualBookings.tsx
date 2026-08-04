/**
 * AdminManualBookings — Create and manage manual booking payment links.
 *
 * The admin fills out a form with:
 *  - Property, dates, guest count
 *  - Custom nightly rate, cleaning fee, discount, extra guest fee, tax
 *  - Per-hard-stop bypass toggles (camera, guest count, T&C, ID upload)
 *  - Optional pre-filled guest name/email
 *  - Security deposit override (leave blank to use global setting)
 *  - Guest note (shown to guest on payment page)
 *  - Custom line items (arbitrary fees, e.g. pet fee, early check-in)
 *  - Link expiry (default 7 days)
 *
 * On submit, a secure token is generated and a shareable URL is displayed.
 * The admin copies the link and sends it to the guest.
 * The list below shows all past links with status and revoke option.
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Link2,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  Users,
  FileText,
  CreditCard,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  Shield,
  MessageSquare,
  DollarSign,
  X,
  Mail,
  Smartphone,
} from "lucide-react";
import { properties as staticProperties } from "@/lib/properties";
import AdminLayout from "./AdminLayout";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | string) {
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtDateTime(ms: number) {
  return new Date(ms).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function statusBadge(status: string, expiresAt: number) {
  const expired = status === "active" && Date.now() > expiresAt;
  const s = expired ? "expired" : status;
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    paid: "bg-blue-100 text-blue-800",
    expired: "bg-gray-100 text-gray-600",
    revoked: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${map[s] ?? "bg-muted text-muted-foreground"}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

interface CustomLineItem {
  label: string;
  amount: number;
}

interface FormState {
  propertySlug: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  nightlyRate: number;
  cleaningFee: number;
  discountAmount: number;
  extraGuestFee: number;
  taxRate: number;
  bypassCameraDisclosure: boolean;
  bypassGuestCount: boolean;
  bypassTermsAcceptance: boolean;
  bypassIdUpload: boolean;
  adminNotes: string;
  guestName: string;
  guestEmail: string;
  expiryDays: number;
  securityDepositOverride: string; // string so input can be empty
  guestNote: string;
  customLineItems: CustomLineItem[];
}

const INITIAL_FORM: FormState = {
  propertySlug: "",
  checkIn: "",
  checkOut: "",
  guestCount: 2,
  nightlyRate: 0,
  cleaningFee: 125,
  discountAmount: 0,
  extraGuestFee: 0,
  taxRate: 9,
  bypassCameraDisclosure: false,
  bypassGuestCount: false,
  bypassTermsAcceptance: false,
  bypassIdUpload: false,
  adminNotes: "",
  guestName: "",
  guestEmail: "",
  expiryDays: 7,
  securityDepositOverride: "",
  guestNote: "",
  customLineItems: [],
};

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminManualBookings() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generatedExpiry, setGeneratedExpiry] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch DB properties for the dropdown
  const { data: dbProperties } = trpc.admin.listProperties.useQuery();

  // List all manual booking links
  const { data: links, isLoading: linksLoading } = trpc.admin.listManualBookingLinks.useQuery();

  // ── Real-time availability check ──────────────────────────────────────────
  // Fires as soon as property + checkIn + checkOut are all filled in.
  // Uses the same calendar procedure the booking calendar uses, which overlays
  // both Hostaway data and recent DB bookings.
  const canCheckAvailability = !!(form.propertySlug && form.checkIn && form.checkOut && form.checkIn < form.checkOut);
  const { data: availData, isFetching: availFetching } = trpc.hostaway.calendar.useQuery(
    {
      propertyId: form.propertySlug,
      startDate: form.checkIn,
      endDate: form.checkOut,
    },
    { enabled: canCheckAvailability, staleTime: 30_000 }
  );

  const blockedStayDates = useMemo(() => {
    if (!availData?.days || !form.checkIn || !form.checkOut) return [];
    const stayDates = new Set<string>();
    let cur = form.checkIn;
    while (cur < form.checkOut) {
      stayDates.add(cur);
      const d = new Date(cur + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      cur = d.toISOString().slice(0, 10);
    }
    return availData.days.filter(
      (d: { date: string; isAvailable: boolean; status: string }) =>
        stayDates.has(d.date) && (!d.isAvailable || d.status !== "available")
    );
  }, [availData, form.checkIn, form.checkOut]);

  // Create mutation
  const createMutation = trpc.admin.createManualBookingLink.useMutation({
    onSuccess: (data) => {
      setGeneratedToken(data.token);
      setGeneratedExpiry(data.expiresAt);
      utils.admin.listManualBookingLinks.invalidate();
      toast.success("Booking link created!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create booking link");
    },
  });

  // Revoke mutation
  const revokeMutation = trpc.admin.revokeManualBookingLink.useMutation({
    onSuccess: () => {
      utils.admin.listManualBookingLinks.invalidate();
      toast.success("Link revoked");
    },
    onError: () => toast.error("Failed to revoke link"),
  });

  // ── Computed pricing ──────────────────────────────────────────────────────

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const diff = new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [form.checkIn, form.checkOut]);

  const subtotal = form.nightlyRate * nights;
  const customLineItemsTotal = form.customLineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const taxAmount = Math.round((subtotal - form.discountAmount) * (form.taxRate / 100) * 100) / 100;
  const total = Math.max(0,
    subtotal
    + form.cleaningFee
    + form.extraGuestFee
    + customLineItemsTotal
    - form.discountAmount
    + taxAmount
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handlePropertyChange(slug: string) {
    set("propertySlug", slug);
    // Auto-fill cleaning fee from DB or static
    const dbProp = dbProperties?.find(p => p.slug === slug);
    if (dbProp?.cleaningFee) {
      set("cleaningFee", Number(dbProp.cleaningFee));
    }
  }

  function addCustomLineItem() {
    setForm(prev => ({
      ...prev,
      customLineItems: [...prev.customLineItems, { label: "", amount: 0 }],
    }));
  }

  function updateCustomLineItem(index: number, field: keyof CustomLineItem, value: string | number) {
    setForm(prev => {
      const updated = [...prev.customLineItems];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, customLineItems: updated };
    });
  }

  function removeCustomLineItem(index: number) {
    setForm(prev => ({
      ...prev,
      customLineItems: prev.customLineItems.filter((_, i) => i !== index),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.propertySlug) return toast.error("Select a property");
    if (!form.checkIn || !form.checkOut) return toast.error("Select check-in and check-out dates");
    if (nights < 1) return toast.error("Check-out must be after check-in");
    if (form.nightlyRate <= 0) return toast.error("Enter a nightly rate");
    if (total <= 0) return toast.error("Total must be greater than $0");

    // Validate custom line items
    for (const item of form.customLineItems) {
      if (!item.label.trim()) return toast.error("All custom line items must have a label");
      if (item.amount <= 0) return toast.error("All custom line item amounts must be greater than $0");
    }

    const prop = staticProperties.find(p => p.id === form.propertySlug)
      || dbProperties?.find(p => p.slug === form.propertySlug);
    const propName = (prop as any)?.name || form.propertySlug;
    const rawHostawayId = dbProperties?.find(p => p.slug === form.propertySlug)?.hostawayListingId;
    const hostawayListingId = rawHostawayId != null ? Number(rawHostawayId) : undefined;

    const depositOverride = form.securityDepositOverride !== ""
      ? Number(form.securityDepositOverride)
      : undefined;

    createMutation.mutate({
      propertySlug: form.propertySlug,
      propertyName: propName,
      hostawayListingId,
      checkIn: new Date(form.checkIn).getTime(),
      checkOut: new Date(form.checkOut).getTime(),
      nights,
      guestCount: form.guestCount,
      nightlyRate: form.nightlyRate,
      cleaningFee: form.cleaningFee,
      discountAmount: form.discountAmount,
      extraGuestFee: form.extraGuestFee,
      taxAmount,
      totalAmount: total,
      bypassCameraDisclosure: form.bypassCameraDisclosure,
      bypassGuestCount: form.bypassGuestCount,
      bypassTermsAcceptance: form.bypassTermsAcceptance,
      bypassIdUpload: form.bypassIdUpload,
      adminNotes: form.adminNotes || undefined,
      guestName: form.guestName || undefined,
      guestEmail: form.guestEmail || undefined,
      expiryDays: form.expiryDays,
      securityDepositOverride: depositOverride,
      guestNote: form.guestNote || undefined,
      customLineItems: form.customLineItems.length > 0 ? form.customLineItems : undefined,
    });
  }

  function copyLink() {
    if (!generatedToken) return;
    const url = `${window.location.origin}/booking/pay/${generatedToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setGeneratedToken(null);
    setGeneratedExpiry(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const allProperties = useMemo(() => {
    const slugs = new Set<string>();
    const result: { slug: string; name: string }[] = [];
    (dbProperties ?? []).forEach(p => {
      if (!slugs.has(p.slug)) { slugs.add(p.slug); result.push({ slug: p.slug, name: p.name }); }
    });
    staticProperties.forEach(p => {
      const id = String(p.id);
      if (!slugs.has(id)) { slugs.add(id); result.push({ slug: id, name: p.name }); }
    });
    return result;
  }, [dbProperties]);

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Manual Booking Links
            </h1>
            <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "var(--font-body)" }}>
              Create a custom payment link to send directly to a guest. Set your own price, apply discounts, and choose which steps to require.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(f => !f)}
            className="gap-2"
          >
            {showForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Hide Form" : "New Link"}
          </Button>
        </div>

        {/* ── Create Form ── */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-background border border-border rounded-2xl p-6 space-y-6">
            <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "var(--font-body)" }}>
              Create Booking Link
            </h2>

            {/* Property + Dates + Guests */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Property *</label>
                <select
                  value={form.propertySlug}
                  onChange={e => handlePropertyChange(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                >
                  <option value="">Select a property…</option>
                  {allProperties.map(p => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Check-In *</label>
                <Input
                  type="date"
                  value={form.checkIn}
                  onChange={e => set("checkIn", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Check-Out *</label>
                <Input
                  type="date"
                  value={form.checkOut}
                  onChange={e => set("checkOut", e.target.value)}
                  min={form.checkIn || undefined}
                  required
                />
              </div>

            </div>

            {/* ── Availability Warning Banner ── */}
            {canCheckAvailability && (
              <div>
                {availFetching && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Checking availability in Hostaway…
                  </div>
                )}
                {!availFetching && blockedStayDates.length > 0 && (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <p className="font-semibold mb-1">⚠️ Dates have conflicts in Hostaway</p>
                    <p className="text-xs text-red-700 mb-2">
                      The following nights are already reserved or blocked. You can still generate the link, but the guest will be blocked from paying.
                    </p>
                    <ul className="text-xs space-y-0.5">
                      {blockedStayDates.map((d: { date: string; status: string }) => (
                        <li key={d.date}>
                          {new Date(d.date + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })}
                          {" "}<span className="opacity-70">({d.status})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!availFetching && blockedStayDates.length === 0 && availData?.days && (
                  <div className="flex items-center gap-2 text-xs text-green-700 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    All dates are available in Hostaway
                  </div>
                )}
              </div>
            )}

            {/* Guests + Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Guests *</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.guestCount}
                  onChange={e => set("guestCount", Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Link Expires In (days)</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={form.expiryDays}
                  onChange={e => set("expiryDays", Number(e.target.value))}
                />
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pricing</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nightly Rate ($) *</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.nightlyRate || ""}
                    onChange={e => set("nightlyRate", Number(e.target.value))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cleaning Fee ($)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.cleaningFee}
                    onChange={e => set("cleaningFee", Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Extra Guest Fee ($)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.extraGuestFee}
                    onChange={e => set("extraGuestFee", Number(e.target.value))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Discount ($)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.discountAmount}
                    onChange={e => set("discountAmount", Number(e.target.value))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tax Rate (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    step={0.01}
                    value={form.taxRate}
                    onChange={e => set("taxRate", Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Live price breakdown */}
              {nights > 0 && form.nightlyRate > 0 && (
                <div className="mt-4 p-4 bg-muted/40 rounded-xl space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{fmt(form.nightlyRate)} × {nights} night{nights !== 1 ? "s" : ""}</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                  {form.cleaningFee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Cleaning fee</span>
                      <span>{fmt(form.cleaningFee)}</span>
                    </div>
                  )}
                  {form.extraGuestFee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Extra guest fee</span>
                      <span>{fmt(form.extraGuestFee)}</span>
                    </div>
                  )}
                  {form.customLineItems.map((item, i) => item.amount > 0 && item.label && (
                    <div key={i} className="flex justify-between text-muted-foreground">
                      <span>{item.label}</span>
                      <span>{fmt(item.amount)}</span>
                    </div>
                  ))}
                  {form.discountAmount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Discount</span>
                      <span>−{fmt(form.discountAmount)}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax ({form.taxRate}%)</span>
                      <span>{fmt(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-foreground pt-1.5 border-t border-border">
                    <span>Total</span>
                    <span>{fmt(total)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Custom Line Items
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomLineItem}
                  className="gap-1.5 text-xs h-7"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </Button>
              </div>
              {form.customLineItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No custom items. Click "Add Item" to add a pet fee, early check-in, or any other charge.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.customLineItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={item.label}
                        onChange={e => updateCustomLineItem(i, "label", e.target.value)}
                        placeholder="e.g. Pet fee, Early check-in…"
                        className="flex-1"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.amount || ""}
                          onChange={e => updateCustomLineItem(i, "amount", Number(e.target.value))}
                          placeholder="0.00"
                          className="pl-7"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomLineItem(i)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security Deposit Override */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Security Deposit</h3>
              <div className="max-w-xs">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Deposit Override ($)
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.securityDepositOverride}
                    onChange={e => set("securityDepositOverride", e.target.value)}
                    placeholder="Leave blank to use global setting"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Override the security deposit hold for this booking only. Leave blank to use the global amount from Settings.
                </p>
              </div>
            </div>

            {/* Hard-stop bypass toggles */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Hard-Stop Bypass
              </h3>
              <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: "var(--font-body)" }}>
                Toggle off any steps you have already completed with this guest. Bypassed steps are skipped on the guest's payment page.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "bypassCameraDisclosure" as const, icon: Camera, label: "Camera Disclosure", desc: "Guest has already been informed about outdoor cameras" },
                  { key: "bypassGuestCount" as const, icon: Users, label: "Guest Count Acknowledgment", desc: "Guest count is verified and agreed upon" },
                  { key: "bypassTermsAcceptance" as const, icon: FileText, label: "Terms & Conditions / House Rules", desc: "Guest has already signed or accepted the agreement" },
                  { key: "bypassIdUpload" as const, icon: CreditCard, label: "Government ID Upload", desc: "You already have a copy of the guest's ID on file" },
                ].map(({ key, icon: Icon, label, desc }) => (
                  <label
                    key={key}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      form[key]
                        ? "border-primary/60 bg-primary/5"
                        : "border-border bg-muted/20 hover:border-primary/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={e => set(key, e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                        {label}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      {form[key] && (
                        <span className="inline-block mt-1 text-xs text-primary font-medium">✓ Bypassed — guest will skip this step</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Guest info (optional) */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Guest Info (Optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Guest Name</label>
                  <Input
                    value={form.guestName}
                    onChange={e => set("guestName", e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Guest Email</label>
                  <Input
                    type="email"
                    value={form.guestEmail}
                    onChange={e => set("guestEmail", e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Guest Note */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Guest Note (shown to guest on payment page)
              </label>
              <Textarea
                value={form.guestNote}
                onChange={e => set("guestNote", e.target.value)}
                placeholder="e.g. Early check-in approved at 1pm. Parking code is 4821. Please bring your ID."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">This message will appear in an amber info box on the guest's payment page.</p>
            </div>

            {/* Admin notes */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Admin Notes (internal, not shown to guest)</label>
              <Textarea
                value={form.adminNotes}
                onChange={e => set("adminNotes", e.target.value)}
                placeholder="e.g. Referred by John, corporate rate, returning guest…"
                rows={2}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="gap-2"
              >
                {createMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                Generate Booking Link
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Reset
              </Button>
            </div>
          </form>
        )}

        {/* ── Generated Link Banner ── */}
        {generatedToken && (() => {
          const bookingUrl = `${window.location.origin}/booking/pay/${generatedToken}`;
          const propertyLabel = allProperties.find(p => p.slug === form.propertySlug)?.name || form.propertySlug;
          const checkInLabel = form.checkIn ? new Date(form.checkIn).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }) : "";
          const checkOutLabel = form.checkOut ? new Date(form.checkOut).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }) : "";
          const emailSubject = encodeURIComponent(`Your booking link — ${propertyLabel}`);
          const emailBody = encodeURIComponent(
            `Hi${form.guestName ? ` ${form.guestName.split(" ")[0]}` : ""},\n\nHere is your secure payment link for ${propertyLabel}${checkInLabel ? ` (${checkInLabel} – ${checkOutLabel})` : ""}:\n\n${bookingUrl}\n\nThis link will expire on ${generatedExpiry ? fmtDateTime(generatedExpiry) : "the date shown on the page"}.\n\nPlease let me know if you have any questions.\n\nThank you!`
          );
          const smsBody = encodeURIComponent(
            `Hi${form.guestName ? ` ${form.guestName.split(" ")[0]}` : ""}! Here is your booking payment link for ${propertyLabel}${checkInLabel ? ` (${checkInLabel} – ${checkOutLabel})` : ""}: ${bookingUrl}`
          );
          const mailtoHref = `mailto:${form.guestEmail || ""}?subject=${emailSubject}&body=${emailBody}`;
          const smsHref = `sms:${""}&body=${smsBody}`;

          return (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Booking link created! Share it with your guest.
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-green-200 rounded-lg px-3 py-2 text-xs text-green-900 font-mono break-all">
                  {bookingUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyLink}
                  className="gap-1.5 shrink-0 border-green-300 text-green-800 hover:bg-green-100"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>

              {/* Share actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <a href={mailtoHref}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-green-300 text-green-800 hover:bg-green-100"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Send via Email
                  </Button>
                </a>
                <a href={smsHref}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-green-300 text-green-800 hover:bg-green-100"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Send via SMS
                  </Button>
                </a>
              </div>

              {generatedExpiry && (
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Expires {fmtDateTime(generatedExpiry)}
                </p>
              )}
              <Button size="sm" variant="outline" onClick={resetForm} className="gap-1.5">
                <Plus className="w-4 h-4" /> Create Another
              </Button>
            </div>
          );
        })()}

        {/* ── Links List ── */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4" style={{ fontFamily: "var(--font-body)" }}>
            All Booking Links
          </h2>

          {linksLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !links || links.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No manual booking links yet. Create one above.
            </div>
          ) : (
            <div className="space-y-3">
              {links.map(link => {
                const isExpanded = expandedId === link.id;
                const url = `${window.location.origin}/booking/pay/${link.token}`;
                const isActionable = link.status === "active" && Date.now() <= link.expiresAt;

                return (
                  <div key={link.id} className="bg-background border border-border rounded-xl overflow-hidden">
                    {/* Row header */}
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : link.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{link.propertyName}</span>
                          {statusBadge(link.status, link.expiresAt)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {fmtDate(link.checkIn)} → {fmtDate(link.checkOut)} · {link.guestCount} guest{link.guestCount !== 1 ? "s" : ""} · {fmt(link.totalAmount)}
                          {link.guestName && <span> · {link.guestName}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isActionable && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(url);
                              toast.success("Link copied!");
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Copy link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-border p-4 space-y-4 bg-muted/10">
                        {/* Pricing breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">Nightly Rate</div>
                            <div className="font-medium">{fmt(link.nightlyRate)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Nights</div>
                            <div className="font-medium">{link.nights}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Cleaning Fee</div>
                            <div className="font-medium">{fmt(link.cleaningFee)}</div>
                          </div>
                          {Number(link.discountAmount) > 0 && (
                            <div>
                              <div className="text-xs text-muted-foreground">Discount</div>
                              <div className="font-medium text-green-700">−{fmt(link.discountAmount)}</div>
                            </div>
                          )}
                          {Number(link.extraGuestFee) > 0 && (
                            <div>
                              <div className="text-xs text-muted-foreground">Extra Guest Fee</div>
                              <div className="font-medium">{fmt(link.extraGuestFee)}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-xs text-muted-foreground">Tax</div>
                            <div className="font-medium">{fmt(link.taxAmount)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground font-semibold">Total</div>
                            <div className="font-bold text-foreground">{fmt(link.totalAmount)}</div>
                          </div>
                        </div>

                        {/* Bypass flags */}
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hard-Stop Bypass</div>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { flag: link.bypassCameraDisclosure, label: "Camera Disclosure", icon: Camera },
                              { flag: link.bypassGuestCount, label: "Guest Count", icon: Users },
                              { flag: link.bypassTermsAcceptance, label: "T&C / House Rules", icon: FileText },
                              { flag: link.bypassIdUpload, label: "ID Upload", icon: CreditCard },
                            ].map(({ flag, label, icon: Icon }) => (
                              <span
                                key={label}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                  flag
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                <Icon className="w-3 h-3" />
                                {label}: {flag ? "Bypassed" : "Required"}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Guest info */}
                        {(link.guestName || link.guestEmail) && (
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Guest</div>
                            <div className="text-sm text-foreground">
                              {link.guestName && <span>{link.guestName}</span>}
                              {link.guestEmail && (
                                <a href={`mailto:${link.guestEmail}`} className="ml-2 text-primary hover:underline">
                                  {link.guestEmail}
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Admin notes */}
                        {link.adminNotes && (
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Admin Notes</div>
                            <p className="text-sm text-muted-foreground">{link.adminNotes}</p>
                          </div>
                        )}

                        {/* Expiry & Stripe */}
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Expires {fmtDateTime(link.expiresAt)}
                          </span>
                          {link.stripeCheckoutSessionId && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                              Stripe: {link.stripeCheckoutSessionId.slice(0, 20)}…
                            </span>
                          )}
                          {link.hostawayReservationId && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              Hostaway: #{link.hostawayReservationId}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {isActionable && (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="gap-1.5">
                                <ExternalLink className="w-3.5 h-3.5" />
                                Preview Guest Page
                              </Button>
                            </a>
                          )}
                          {isActionable && (() => {
                            const checkInLabel = new Date(link.checkIn).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
                            const checkOutLabel = new Date(link.checkOut).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
                            const emailSubject = encodeURIComponent(`Your booking link — ${link.propertyName}`);
                            const emailBody = encodeURIComponent(
                              `Hi${link.guestName ? ` ${link.guestName.split(" ")[0]}` : ""},\n\nHere is your secure payment link for ${link.propertyName} (${checkInLabel} – ${checkOutLabel}):\n\n${url}\n\nThis link expires on ${fmtDateTime(link.expiresAt)}.\n\nPlease let me know if you have any questions.\n\nThank you!`
                            );
                            const smsBody = encodeURIComponent(
                              `Hi${link.guestName ? ` ${link.guestName.split(" ")[0]}` : ""}! Here is your booking payment link for ${link.propertyName} (${checkInLabel} – ${checkOutLabel}): ${url}`
                            );
                            return (
                              <>
                                <a href={`mailto:${link.guestEmail || ""}?subject=${emailSubject}&body=${emailBody}`}>
                                  <Button size="sm" variant="outline" className="gap-1.5">
                                    <Mail className="w-3.5 h-3.5" />
                                    Email
                                  </Button>
                                </a>
                                <a href={`sms:${""}&body=${smsBody}`}>
                                  <Button size="sm" variant="outline" className="gap-1.5">
                                    <Smartphone className="w-3.5 h-3.5" />
                                    SMS
                                  </Button>
                                </a>
                              </>
                            );
                          })()}
                          {link.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => {
                                if (confirm("Revoke this link? The guest will no longer be able to pay.")) {
                                  revokeMutation.mutate({ id: link.id });
                                }
                              }}
                              disabled={revokeMutation.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
