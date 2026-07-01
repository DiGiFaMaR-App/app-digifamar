import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";

type Role = "buyer" | "farmer";

export function GoogleAuthButton({
  className = "",
  defaultRole: _defaultRole,
  label = "Continue with Google",
}: {
  className?: string;
  defaultRole?: Role;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed", { description: result.error.message });
        setLoading(false);
        return;
      }
      // If redirected, browser handles navigation. If tokens returned inline,
      // the root onAuthStateChange listener triggers re-render.
    } catch (e) {
      toast.error("Google sign-in failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        className ||
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card/40 text-sm font-semibold text-foreground transition hover:bg-card hover:border-primary/30 disabled:opacity-60"
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-5 w-5" />}
      {label}
    </button>
  );
}

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
