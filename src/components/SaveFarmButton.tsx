import { Heart, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useSavedFarmIds, useToggleSavedFarm } from "@/lib/saved-farms";
import { cn } from "@/lib/utils";

interface SaveFarmButtonProps {
  farmId: string;
  farmName?: string;
  className?: string;
  withLabel?: boolean;
}

/** Heart toggle that adds/removes a farm from the signed-in user's Saved list. */
export function SaveFarmButton({
  farmId,
  farmName,
  className,
  withLabel = false,
}: SaveFarmButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: savedIds } = useSavedFarmIds();
  const toggle = useToggleSavedFarm();

  const saved = savedIds?.has(farmId) ?? false;

  const onClick = () => {
    if (!user) {
      toast("Sign in to save farms");
      void navigate({ to: "/auth", search: { tab: "signin" } });
      return;
    }
    toggle.mutate(
      { farmId, saved },
      {
        onSuccess: (r) =>
          toast.success(r.saved ? `Saved ${farmName ?? "farm"}` : `Removed ${farmName ?? "farm"}`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
      },
    );
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={toggle.isPending}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${farmName ?? "farm"} from saved` : `Save ${farmName ?? "farm"}`}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent",
        saved && "border-primary/50 text-primary",
        className,
      )}
    >
      {toggle.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={cn("h-4 w-4", saved && "fill-primary")} />
      )}
      {withLabel && <span>{saved ? "Saved" : "Save farm"}</span>}
    </button>
  );
}
