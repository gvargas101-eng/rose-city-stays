import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star, Trash2, MessageSquare, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-4 h-4 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

export default function AdminReviews() {
  const utils = trpc.useUtils();
  const { data: reviews = [], isLoading } = trpc.reviews.adminList.useQuery();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const deleteMutation = trpc.reviews.adminDelete.useMutation({
    onSuccess: () => {
      toast.success("Review deleted.");
      setDeletingId(null);
      utils.reviews.adminList.invalidate();
    },
    onError: () => toast.error("Failed to delete review."),
  });

  const respondMutation = trpc.reviews.adminRespond.useMutation({
    onSuccess: () => {
      toast.success("Response saved and will appear publicly.");
      setRespondingId(null);
      setResponseText("");
      utils.reviews.adminList.invalidate();
    },
    onError: () => toast.error("Failed to save response."),
  });

  const toggleMutation = trpc.reviews.adminToggleVisibility.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.isVisible === 1 ? "Review is now visible." : "Review hidden from public.");
      utils.reviews.adminList.invalidate();
    },
    onError: () => toast.error("Failed to update visibility."),
  });

  if (isLoading) {
    return (
      <div className="p-8 text-muted-foreground text-sm">Loading reviews…</div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Guest Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {reviews.length} review{reviews.length !== 1 ? "s" : ""} total — manage visibility, respond, or delete.
        </p>
      </div>

      {reviews.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          No reviews yet. Share the <strong>/leave-a-review</strong> link with guests after their stay.
        </div>
      )}

      <div className="space-y-3">
        {reviews.map(review => {
          const isExpanded = expandedId === review.id;
          const isResponding = respondingId === review.id;
          const isDeleting = deletingId === review.id;

          return (
            <div
              key={review.id}
              className={`border rounded-xl bg-card transition-all ${review.isVisible ? "border-border" : "border-border/40 opacity-60"}`}
            >
              {/* Header row */}
              <div
                className="flex items-start gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : review.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{review.guestName}</span>
                    <StarRow rating={review.rating} />
                    <Badge variant="outline" className="text-xs">
                      {review.propertySlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </Badge>
                    {!review.isVisible && (
                      <Badge variant="secondary" className="text-xs">Hidden</Badge>
                    )}
                    {review.hostResponse && (
                      <Badge className="text-xs bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
                        Responded
                      </Badge>
                    )}
                  </div>
                  {review.title && (
                    <p className="text-sm font-medium text-foreground/80 truncate">{review.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(review.createdAt).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
                    })}
                    {review.guestEmail && ` · ${review.guestEmail}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-4">
                  {/* Review body */}
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{review.body}</p>

                  {/* Existing host response */}
                  {review.hostResponse && !isResponding && (
                    <div className="bg-muted/40 border border-border/50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Host Response</p>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{review.hostResponse}</p>
                    </div>
                  )}

                  {/* Respond form */}
                  {isResponding && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Write your response to this guest…"
                        value={responseText}
                        onChange={e => setResponseText(e.target.value)}
                        rows={4}
                        className="text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => respondMutation.mutate({ id: review.id, hostResponse: responseText })}
                          disabled={!responseText.trim() || respondMutation.isPending}
                        >
                          {respondMutation.isPending ? "Saving…" : "Save Response"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setRespondingId(null); setResponseText(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Delete confirmation */}
                  {isDeleting && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
                      <p className="text-sm text-destructive font-medium">Delete this review permanently?</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate({ id: review.id })}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? "Deleting…" : "Yes, Delete"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!isDeleting && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (isResponding) {
                            setRespondingId(null);
                            setResponseText("");
                          } else {
                            setRespondingId(review.id);
                            setResponseText(review.hostResponse ?? "");
                          }
                        }}
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                        {review.hostResponse ? "Edit Response" : "Respond"}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggleMutation.mutate({ id: review.id, isVisible: review.isVisible ? 0 : 1 })
                        }
                        disabled={toggleMutation.isPending}
                      >
                        {review.isVisible ? (
                          <><EyeOff className="w-3.5 h-3.5 mr-1.5" />Hide</>
                        ) : (
                          <><Eye className="w-3.5 h-3.5 mr-1.5" />Show</>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => setDeletingId(review.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
