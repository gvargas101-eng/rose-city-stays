import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Percent } from "lucide-react";

export default function AdminSettings() {
  const { data: settings, refetch, isLoading } = trpc.admin.getSettings.useQuery();
  const updateSetting = trpc.admin.updateSetting.useMutation({
    onSuccess: () => { toast.success("Setting saved!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Tax rate local state (stored as decimal e.g. 0.09 = 9%)
  const [taxRateInput, setTaxRateInput] = useState<string>("");
  const [taxDirty, setTaxDirty] = useState(false);

  // Populate input from DB once loaded
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

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Site Settings</h1>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading settings…</div>
        ) : (
          <div className="space-y-6">
            {/* Tax Rate */}
            <section className="bg-background rounded-xl border border-border p-6">
              <div className="flex items-center gap-2 mb-1">
                <Percent className="w-4 h-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Hotel Occupancy Tax Rate</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Applied to the nightly subtotal only (not the cleaning fee). Tyler, TX rate is currently 9%.
                This rate is shown to guests in the booking quote and used to calculate the total charge.
              </p>

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
            </section>

            {/* Future settings can be added here */}
            <p className="text-xs text-muted-foreground text-center pt-2">
              More settings will appear here as they are added.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
