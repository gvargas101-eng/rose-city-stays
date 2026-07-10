import { useState } from "react";
import { useParams, Link } from "wouter";
import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, ArrowLeft, GripVertical, ExternalLink, Upload, ImagePlus, PawPrint } from "lucide-react";
import { useRef, useState as useStateAlias } from "react";

export default function AdminPropertyEdit() {
  const params = useParams<{ id: string }>();
  const propertyId = parseInt(params.id ?? "0");

  const { data, refetch, isLoading } = trpc.admin.getProperty.useQuery({ id: propertyId });
  const updateProp = trpc.admin.updateProperty.useMutation({
    onSuccess: () => { toast.success("Property updated!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const addPhoto = trpc.admin.addPhoto.useMutation({
    onSuccess: () => { setNewPhotoUrl(""); refetch(); toast.success("Photo added!"); },
    onError: (e) => toast.error(e.message),
  });
  const deletePhoto = trpc.admin.deletePhoto.useMutation({
    onSuccess: () => { refetch(); toast.success("Photo deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const reorderPhotos = trpc.admin.reorderPhotos.useMutation({
    onSuccess: () => { refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const movePhoto = (idx: number, direction: "up" | "down") => {
    if (!data?.photos) return;
    const photos = [...data.photos];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= photos.length) return;
    const reordered = photos.map((p, i) => {
      if (i === idx) return { id: p.id, sortOrder: swapIdx };
      if (i === swapIdx) return { id: p.id, sortOrder: idx };
      return { id: p.id, sortOrder: i };
    });
    reorderPhotos.mutate({ photos: reordered });
  };
  const addAmenity = trpc.admin.addAmenity.useMutation({
    onSuccess: () => { setNewAmenity(""); refetch(); toast.success("Amenity added!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteAmenity = trpc.admin.deleteAmenity.useMutation({
    onSuccess: () => { refetch(); toast.success("Amenity removed"); },
    onError: (e) => toast.error(e.message),
  });

  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newAmenity, setNewAmenity] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useStateAlias(false);
  const [uploadingFiles, setUploadingFiles] = useStateAlias<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPhoto = trpc.admin.uploadPhoto.useMutation({
    onSuccess: () => { refetch(); toast.success("Photo uploaded!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleFileUpload = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const file of arr) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} is not an image`); continue; }
      if (file.size > 16 * 1024 * 1024) { toast.error(`${file.name} exceeds 16 MB`); continue; }
      setUploadingFiles(prev => [...prev, file.name]);
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await uploadPhoto.mutateAsync({ propertyId, fileName: file.name, fileBase64: base64, mimeType: file.type });
      } catch {
        // error already shown by onError
      } finally {
        setUploadingFiles(prev => prev.filter(n => n !== file.name));
      }
    }
  };

  // Local form state
  const [form, setForm] = useState<Record<string, string | number>>({});
  const [dirty, setDirty] = useState(false);

  const getValue = (field: string, fallback: string | number = "") => {
    if (field in form) return form[field];
    if (!data) return fallback;
    return (data as Record<string, unknown>)[field] as string | number ?? fallback;
  };

  const setField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    const updates: Record<string, string | number> = { id: propertyId };
    for (const [k, v] of Object.entries(form)) {
      updates[k] = v;
    }
    updateProp.mutate(updates as Parameters<typeof updateProp.mutate>[0]);
    setDirty(false);
    setForm({});
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="p-8">
          <p className="text-muted-foreground">Property not found.</p>
          <Link href="/admin/properties" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to properties</Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/properties">
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{data.shortName}</h1>
            <p className="text-muted-foreground text-sm">{data.neighborhood} · Hostaway ID: {data.hostawayListingId}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <a
              href={`/property/${data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                View listing
              </Button>
            </a>
            {dirty && (
              <Button size="sm" onClick={handleSave} disabled={updateProp.isPending}>
                {updateProp.isPending ? "Saving..." : "Save changes"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Details */}
          <section className="bg-background rounded-xl border border-border p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Basic Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Full Name</Label>
                <Input
                  value={getValue("name") as string}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Property full name"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Short Name</Label>
                <Input
                  value={getValue("shortName") as string}
                  onChange={(e) => setField("shortName", e.target.value)}
                  placeholder="Short display name"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Type</Label>
                <Input
                  value={getValue("type") as string}
                  onChange={(e) => setField("type", e.target.value)}
                  placeholder="House, Townhouse, Condo..."
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Neighborhood</Label>
                <Input
                  value={getValue("neighborhood") as string}
                  onChange={(e) => setField("neighborhood", e.target.value)}
                  placeholder="Neighborhood"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Max Guests</Label>
                <Input
                  type="number"
                  min={1}
                  value={getValue("guests") as number}
                  onChange={(e) => setField("guests", parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Bedrooms</Label>
                <Input
                  type="number"
                  min={0}
                  value={getValue("bedrooms") as number}
                  onChange={(e) => setField("bedrooms", parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Bathrooms</Label>
                <Input
                  value={getValue("bathrooms") as string}
                  onChange={(e) => setField("bathrooms", e.target.value)}
                  placeholder="e.g. 2.0 or 1.5"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Cleaning Fee ($)</Label>
                <Input
                  value={getValue("cleaningFee") as string}
                  onChange={(e) => setField("cleaningFee", e.target.value)}
                  placeholder="e.g. 125.00"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Check-in Time</Label>
                <Input
                  value={getValue("checkInTime") as string}
                  onChange={(e) => setField("checkInTime", e.target.value)}
                  placeholder="e.g. 3:00 PM"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Check-out Time</Label>
                <Input
                  value={getValue("checkOutTime") as string}
                  onChange={(e) => setField("checkOutTime", e.target.value)}
                  placeholder="e.g. 11:00 AM"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                  <PawPrint className="w-3.5 h-3.5" /> Pets Policy
                </Label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setField("petsAllowed", getValue("petsAllowed", 0) === 1 ? 0 : 1)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      getValue("petsAllowed", 0) === 1 ? "bg-green-500" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        getValue("petsAllowed", 0) === 1 ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-medium ${
                    getValue("petsAllowed", 0) === 1 ? "text-green-600" : "text-muted-foreground"
                  }`}>
                    {getValue("petsAllowed", 0) === 1 ? "Pets allowed" : "No pets"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Description */}
          <section className="bg-background rounded-xl border border-border p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Description</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Short Description (shown on cards)</Label>
                <Textarea
                  value={getValue("shortDescription") as string}
                  onChange={(e) => setField("shortDescription", e.target.value)}
                  rows={2}
                  placeholder="One-line summary shown on property cards"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Full Description</Label>
                <Textarea
                  value={getValue("description") as string}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={6}
                  placeholder="Full property description shown on the listing page"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Cancellation Policy</Label>
                <Textarea
                  value={getValue("cancellationPolicy") as string}
                  onChange={(e) => setField("cancellationPolicy", e.target.value)}
                  rows={2}
                  placeholder="Cancellation policy text"
                />
              </div>
            </div>
          </section>

          {/* Photos */}
          <section className="bg-background rounded-xl border border-border p-6">
            <h2 className="text-base font-semibold text-foreground mb-1">Photos</h2>
            <p className="text-xs text-muted-foreground mb-4">{data.photos.length} photos · First photo is the cover image</p>

            {/* Photo grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {data.photos.map((photo, idx) => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-[4/3] bg-muted">
                  <img
                    src={photo.url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {idx === 0 && (
                    <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      Cover
                    </div>
                  )}
                  {/* Reorder buttons */}
                  <div className="absolute bottom-1.5 left-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {idx > 0 && (
                      <button
                        onClick={() => movePhoto(idx, "up")}
                        className="bg-black/70 text-white rounded w-5 h-5 flex items-center justify-center text-xs"
                        title="Move left"
                      >←</button>
                    )}
                    {idx < data.photos.length - 1 && (
                      <button
                        onClick={() => movePhoto(idx, "down")}
                        className="bg-black/70 text-white rounded w-5 h-5 flex items-center justify-center text-xs"
                        title="Move right"
                      >→</button>
                    )}
                  </div>
                  <button
                    onClick={() => deletePhoto.mutate({ photoId: photo.id })}
                    className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Drag-and-drop upload zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDraggingOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) handleFileUpload(e.target.files); e.target.value = ""; }}
              />
              <ImagePlus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Drop photos here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP up to 16 MB · Multiple files supported</p>
              {uploadingFiles.length > 0 && (
                <div className="mt-3 text-xs text-primary">
                  Uploading: {uploadingFiles.join(", ")}…
                </div>
              )}
            </div>

            {/* URL fallback */}
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground">Or paste a URL instead</summary>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={() => { if (!newPhotoUrl.trim()) return; addPhoto.mutate({ propertyId, url: newPhotoUrl.trim() }); }}
                  disabled={!newPhotoUrl.trim() || addPhoto.isPending}
                  size="sm"
                  className="gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
            </details>
          </section>

          {/* Amenities */}
          <section className="bg-background rounded-xl border border-border p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Amenities</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {data.amenities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-sm text-foreground"
                >
                  {a.amenity}
                  <button
                    onClick={() => deleteAmenity.mutate({ amenityId: a.id })}
                    className="text-muted-foreground hover:text-red-500 transition-colors ml-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {data.amenities.length === 0 && (
                <p className="text-sm text-muted-foreground">No amenities added yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                placeholder="e.g. Free WiFi (500+ Mbps)"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newAmenity.trim()) {
                    addAmenity.mutate({ propertyId, amenity: newAmenity.trim() });
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (!newAmenity.trim()) return;
                  addAmenity.mutate({ propertyId, amenity: newAmenity.trim() });
                }}
                disabled={!newAmenity.trim() || addAmenity.isPending}
                size="sm"
                className="gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
            </div>
          </section>

          {/* Save button at bottom */}
          {dirty && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateProp.isPending} className="px-8">
                {updateProp.isPending ? "Saving..." : "Save all changes"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
