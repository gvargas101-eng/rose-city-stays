import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Settings,
  Percent,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  DollarSign,
  X,
  Check,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  PenLine,
  BookOpen,
  ExternalLink,
  EyeOff as EyeOffIcon,
  Eye as EyeIcon,
} from "lucide-react";

type FeeType = "flat" | "percent";

interface FeeFormState {
  name: string;
  description: string;
  type: FeeType;
  amount: string;
}

const emptyFeeForm = (): FeeFormState => ({
  name: "",
  description: "",
  type: "flat",
  amount: "",
});

export default function AdminSettings() {
  const utils = trpc.useUtils();

  // ── Hostaway Sync ──────────────────────────────────────────────────────────
  const [syncResult, setSyncResult] = useState<{ total: number; created: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const syncHostaway = trpc.admin.syncHostaway.useMutation({
    onSuccess: (data) => {
      setSyncResult(data);
      utils.admin.listProperties.invalidate();
      if (data.errors.length === 0) {
        toast.success(`Sync complete — ${data.created} new, ${data.updated} updated out of ${data.total} listings.`);
      } else {
        toast.warning(`Sync finished with ${data.errors.length} error(s). See details below.`);
      }
    },
    onError: (e) => toast.error(`Sync failed: ${e.message}`),
  });

  // ── Blog Auto-Writer ──────────────────────────────────────────────────────
  const [blogTopic, setBlogTopic] = useState("");
  const [blogResult, setBlogResult] = useState<{ success: boolean; title?: string; slug?: string; error?: string } | null>(null);
  const { data: blogPosts = [], isLoading: blogPostsLoading, refetch: refetchBlogPosts } = trpc.admin.listBlogPosts.useQuery();

  const generateBlogPost = trpc.admin.generateBlogPost.useMutation({
    onSuccess: (data) => {
      setBlogResult(data);
      refetchBlogPosts();
      if (data.success) {
        toast.success(`Blog post published: "${data.title}"`);
      } else {
        toast.error(`Blog generation failed: ${data.error}`);
      }
    },
    onError: (e) => toast.error(`Blog generation failed: ${e.message}`),
  });

  const toggleBlogPost = trpc.admin.toggleBlogPost.useMutation({
    onSuccess: () => { refetchBlogPosts(); toast.success("Post updated."); },
    onError: (e) => toast.error(e.message),
  });

  const deleteBlogPost = trpc.admin.deleteBlogPost.useMutation({
    onSuccess: () => { refetchBlogPosts(); toast.success("Post deleted."); },
    onError: (e) => toast.error(e.message),
  });

  const [confirmDeleteBlogId, setConfirmDeleteBlogId] = useState<number | null>(null);

  // ── Tax Rate ──────────────────────────────────────────────────────────────
  const { data: settings, isLoading: settingsLoading } = trpc.admin.getSettings.useQuery();
  const updateSetting = trpc.admin.updateSetting.useMutation({
    onSuccess: () => {
      toast.success("Tax rate saved!");
      utils.admin.getSettings.invalidate();
      utils.settings.getTaxRate.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [taxRateInput, setTaxRateInput] = useState<string>("");
  const [taxDirty, setTaxDirty] = useState(false);

  const dbTaxRate = settings?.taxRate ? parseFloat(settings.taxRate) : 0.09;
  const displayedTaxRate = taxDirty ? taxRateInput : String(Math.round(dbTaxRate * 10000) / 100);

  const handleTaxSave = () => {
    const pct = parseFloat(taxRateInput);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Enter a valid percentage between 0 and 100");
      return;
    }
    updateSetting.mutate({ key: "taxRate", value: String(pct / 100) });
    setTaxDirty(false);
  };

  // ── Custom Fees ───────────────────────────────────────────────────────────
  const { data: fees = [], isLoading: feesLoading } = trpc.admin.listCustomFees.useQuery();
  const createFee = trpc.admin.createCustomFee.useMutation({
    onSuccess: () => { toast.success("Fee added!"); utils.admin.listCustomFees.invalidate(); setShowAddForm(false); setAddForm(emptyFeeForm()); },
    onError: (e) => toast.error(e.message),
  });
  const updateFee = trpc.admin.updateCustomFee.useMutation({
    onSuccess: () => { toast.success("Fee updated!"); utils.admin.listCustomFees.invalidate(); setEditingId(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteFee = trpc.admin.deleteCustomFee.useMutation({
    onSuccess: () => { toast.success("Fee deleted."); utils.admin.listCustomFees.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<FeeFormState>(emptyFeeForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FeeFormState>(emptyFeeForm());
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const startEdit = (fee: typeof fees[0]) => {
    setEditingId(fee.id);
    setEditForm({
      name: fee.name,
      description: fee.description ?? "",
      type: fee.type as FeeType,
      amount: fee.amount,
    });
  };

  const handleAddSubmit = () => {
    if (!addForm.name.trim()) { toast.error("Fee name is required"); return; }
    const amt = parseFloat(addForm.amount);
    if (isNaN(amt) || amt < 0) { toast.error("Enter a valid amount"); return; }
    createFee.mutate({
      name: addForm.name.trim(),
      description: addForm.description.trim() || undefined,
      type: addForm.type,
      amount: String(amt),
      active: 1,
    });
  };

  const handleEditSubmit = (id: number) => {
    if (!editForm.name.trim()) { toast.error("Fee name is required"); return; }
    const amt = parseFloat(editForm.amount);
    if (isNaN(amt) || amt < 0) { toast.error("Enter a valid amount"); return; }
    updateFee.mutate({
      id,
      name: editForm.name.trim(),
      description: editForm.description.trim() || undefined,
      type: editForm.type,
      amount: String(amt),
    });
  };

  const toggleActive = (fee: typeof fees[0]) => {
    updateFee.mutate({ id: fee.id, active: fee.active === 1 ? 0 : 1 });
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Site Settings</h1>
        </div>

        <div className="space-y-8">
          {/* ── Tax Rate ── */}
          <section className="bg-background rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Hotel Occupancy Tax Rate</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Applied to the nightly subtotal only (not the cleaning fee). Tyler, TX rate is currently 9%.
              This rate is shown to guests in the booking quote and used to calculate the total charge.
            </p>

            {settingsLoading ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label htmlFor="taxRate" className="text-sm mb-1.5 block">Tax Rate (%)</Label>
                  <div className="relative">
                    <Input
                      id="taxRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={displayedTaxRate}
                      onChange={(e) => { setTaxRateInput(e.target.value); setTaxDirty(true); }}
                      className="pr-8"
                      placeholder="9"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current stored rate: {Math.round(dbTaxRate * 10000) / 100}%
                    {" "}(${(dbTaxRate * 100).toFixed(0)} on a $100/night stay)
                  </p>
                </div>
                <Button
                  onClick={handleTaxSave}
                  disabled={!taxDirty || updateSetting.isPending}
                  className="shrink-0"
                >
                  Save
                </Button>
              </div>
            )}
          </section>

          {/* ── Custom Fees ── */}
          <section className="bg-background rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Additional Fee Line Items</h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowAddForm(!showAddForm); setAddForm(emptyFeeForm()); }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Fee
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              These fees appear as itemized line items in the guest booking quote. Toggle the eye icon to show/hide each fee without deleting it.
              Use <strong>Flat</strong> for fixed dollar amounts (e.g. $50 extra cleaning) or <strong>%</strong> for a percentage of the nightly subtotal.
            </p>

            {/* Add form */}
            {showAddForm && (
              <div className="mb-4 p-4 bg-muted/40 rounded-lg border border-border space-y-3">
                <p className="text-sm font-medium text-foreground">New Fee</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Fee Name *</Label>
                    <Input
                      placeholder="e.g. Extra Guest Fee, Pet Fee, Late Check-out"
                      value={addForm.name}
                      onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Type</Label>
                    <div className="flex rounded-md border border-border overflow-hidden">
                      {(["flat", "percent"] as FeeType[]).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAddForm(f => ({ ...f, type: t }))}
                          className={`flex-1 py-2 text-xs font-medium transition-colors ${addForm.type === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                        >
                          {t === "flat" ? "$ Flat" : "% Percent"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Amount {addForm.type === "flat" ? "($)" : "(%)"}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={addForm.type === "flat" ? "50.00" : "5"}
                      value={addForm.amount}
                      onChange={(e) => setAddForm(f => ({ ...f, amount: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Description (shown to guest, optional)</Label>
                    <Textarea
                      placeholder="e.g. Applies when more than 4 guests"
                      value={addForm.description}
                      onChange={(e) => setAddForm(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddSubmit} disabled={createFee.isPending}>
                    <Check className="w-4 h-4 mr-1" /> Add Fee
                  </Button>
                </div>
              </div>
            )}

            {/* Fee list */}
            {feesLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-md" />)}
              </div>
            ) : fees.length === 0 && !showAddForm ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No custom fees yet. Click <strong>Add Fee</strong> to create your first one.
              </div>
            ) : (
              <div className="space-y-2">
                {fees.map(fee => (
                  <div key={fee.id} className={`rounded-lg border p-3 transition-opacity ${fee.active === 0 ? "opacity-50 border-dashed" : "border-border"}`}>
                    {editingId === fee.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <Label className="text-xs mb-1 block">Fee Name *</Label>
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">Type</Label>
                            <div className="flex rounded-md border border-border overflow-hidden">
                              {(["flat", "percent"] as FeeType[]).map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setEditForm(f => ({ ...f, type: t }))}
                                  className={`flex-1 py-2 text-xs font-medium transition-colors ${editForm.type === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                                >
                                  {t === "flat" ? "$ Flat" : "% Percent"}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">Amount {editForm.type === "flat" ? "($)" : "(%)"}</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editForm.amount}
                              onChange={(e) => setEditForm(f => ({ ...f, amount: e.target.value }))}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs mb-1 block">Description (optional)</Label>
                            <Textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                              rows={2}
                              className="resize-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleEditSubmit(fee.id)} disabled={updateFee.isPending}>
                            <Check className="w-4 h-4 mr-1" /> Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{fee.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${fee.type === "flat" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"}`}>
                              {fee.type === "flat" ? `$${parseFloat(fee.amount).toFixed(2)}` : `${parseFloat(fee.amount)}%`}
                            </span>
                            {fee.active === 0 && (
                              <span className="text-xs text-muted-foreground italic">hidden</span>
                            )}
                          </div>
                          {fee.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{fee.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleActive(fee)}
                            title={fee.active === 1 ? "Hide from quote" : "Show in quote"}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            {fee.active === 1 ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => startEdit(fee)}
                            title="Edit fee"
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {confirmDeleteId === fee.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-600 font-medium">Delete?</span>
                              <button
                                onClick={() => { deleteFee.mutate({ id: fee.id }); setConfirmDeleteId(null); }}
                                className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700"
                              >Yes</button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-xs px-2 py-0.5 bg-muted text-foreground rounded hover:bg-muted/80"
                              >No</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(fee.id)}
                              title="Delete fee"
                              className="p-1.5 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Hostaway Sync ── */}
          <section className="bg-background rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Hostaway Sync</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Pull all active listings from Hostaway and update this site’s property database.
              New listings are added automatically; existing ones are updated with the latest
              name, description, photos, and amenities.
              Admin-managed fields (short name, cleaning fee, sort order) are never overwritten.
              Auto-sync also runs every night at 2 AM CT.
            </p>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => { setSyncResult(null); syncHostaway.mutate(); }}
                disabled={syncHostaway.isPending}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncHostaway.isPending ? "animate-spin" : ""}`} />
                {syncHostaway.isPending ? "Syncing…" : "Sync Now"}
              </Button>
            </div>

            {syncResult && (
              <div className={`rounded-lg border p-4 text-sm space-y-2 ${
                syncResult.errors.length === 0
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
              }`}>
                <div className="flex items-center gap-2 font-medium">
                  {syncResult.errors.length === 0
                    ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                    : <AlertCircle className="w-4 h-4 text-yellow-600" />}
                  <span>Sync Result</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-background/60 rounded p-2">
                    <div className="text-lg font-bold text-foreground">{syncResult.total}</div>
                    <div className="text-xs text-muted-foreground">Total listings</div>
                  </div>
                  <div className="bg-background/60 rounded p-2">
                    <div className="text-lg font-bold text-green-600">{syncResult.created}</div>
                    <div className="text-xs text-muted-foreground">New</div>
                  </div>
                  <div className="bg-background/60 rounded p-2">
                    <div className="text-lg font-bold text-blue-600">{syncResult.updated}</div>
                    <div className="text-xs text-muted-foreground">Updated</div>
                  </div>
                </div>
                {syncResult.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-medium text-yellow-700 dark:text-yellow-400">Errors ({syncResult.errors.length}):</p>
                    {syncResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400 font-mono">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Blog Auto-Writer ── */}
          <section className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <PenLine className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Blog Auto-Writer</h2>
                <p className="text-sm text-muted-foreground">AI writes a new SEO blog post about Tyler, TX every 2 weeks automatically. You can also generate one now.</p>
              </div>
            </div>

            {/* Generate Now */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Topic (optional — leave blank to auto-pick)</Label>
                <Input
                  placeholder="e.g. Tyler TX restaurants, Rose Festival, medical travel..."
                  value={blogTopic}
                  onChange={(e) => setBlogTopic(e.target.value)}
                  disabled={generateBlogPost.isPending}
                />
              </div>
              <Button
                onClick={() => { setBlogResult(null); generateBlogPost.mutate({ topic: blogTopic || undefined }); }}
                disabled={generateBlogPost.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
              >
                {generateBlogPost.isPending ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Writing...(~30s)</>
                ) : (
                  <><PenLine className="w-4 h-4 mr-2" /> Generate Post</>
                )}
              </Button>
            </div>

            {/* Result card */}
            {blogResult && (
              <div className={`rounded-lg p-4 border text-sm space-y-2 ${
                blogResult.success ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
              }`}>
                {blogResult.success ? (
                  <>
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Post published successfully!
                    </div>
                    <p className="text-foreground font-medium">{blogResult.title}</p>
                    <Link href={`/blog/${blogResult.slug}`} className="text-primary underline underline-offset-2 flex items-center gap-1">
                      View post <ExternalLink className="w-3 h-3" />
                    </Link>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    {blogResult.error}
                  </div>
                )}
              </div>
            )}

            {/* Blog post list */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">All Blog Posts ({blogPosts.length})</span>
              </div>
              {blogPostsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : blogPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No posts yet. Generate your first one above.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {blogPosts.map((post) => (
                    <div key={post.id} className="flex items-center gap-3 p-3 bg-background/60 border border-border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{post.title}</span>
                          {post.aiGenerated === 1 && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded shrink-0">AI</span>
                          )}
                          {post.published === 0 && (
                            <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded shrink-0">Draft</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {post.category} · {new Date(post.publishedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/blog/${post.slug}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleBlogPost.mutate({ id: post.id, published: post.published === 1 ? 0 : 1 })}
                          title={post.published === 1 ? "Unpublish" : "Publish"}
                        >
                          {post.published === 1 ? <EyeOffIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                        </Button>
                        {confirmDeleteBlogId === post.id ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => { deleteBlogPost.mutate({ id: post.id }); setConfirmDeleteBlogId(null); }}>
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmDeleteBlogId(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => setConfirmDeleteBlogId(post.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground border-t border-border pt-3">
              ⏰ Auto-generates a new post every 2 weeks. Posts are published immediately and appear on the public blog.
            </p>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
