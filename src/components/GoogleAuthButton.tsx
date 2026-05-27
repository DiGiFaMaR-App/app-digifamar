import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShoppingBasket, Tractor, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Role = "buyer" | "farmer";
type Step = "role" | "connecting" | "success";

const MOCK_GOOGLE_USER = {
  name: "Alex Morgan",
  email: "alex.morgan@gmail.com",
  avatar: "https://lh3.googleusercontent.com/a/default-user=s96-c",
};

export function setAuthSession(role: Role) {
  try {
    localStorage.setItem(
      "digifamar.auth",
      JSON.stringify({
        provider: "google",
        role,
        user: MOCK_GOOGLE_USER,
        signedInAt: new Date().toISOString(),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function GoogleAuthButton({
  className = "",
  defaultRole,
  label = "Continue with Google",
}: {
  className?: string;
  defaultRole?: Role;
  label?: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role>(defaultRole ?? "buyer");

  const handleOpen = () => {
    if (defaultRole) {
      // Skip role picker — go straight to connecting
      setRole(defaultRole);
      setStep("connecting");
      setOpen(true);
      runMockOAuth(defaultRole);
    } else {
      setStep("role");
      setOpen(true);
    }
  };

  const runMockOAuth = (chosen: Role) => {
    setRole(chosen);
    setStep("connecting");
    // Simulated Google OAuth round-trip
    window.setTimeout(() => {
      setAuthSession(chosen);
      setStep("success");
      window.setTimeout(() => {
        setOpen(false);
        navigate({
          to: chosen === "farmer" ? "/dashboard/farmer" : "/dashboard/buyer",
        });
      }, 700);
    }, 1100);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          className ||
          "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card/40 text-sm font-semibold text-foreground transition hover:bg-card hover:border-primary/30"
        }
      >
        <GoogleIcon className="h-5 w-5" />
        {label}
      </button>

      <Dialog open={open} onOpenChange={(o) => !o && step !== "connecting" && setOpen(false)}>
        <DialogContent className="max-w-sm border-border bg-card/95 backdrop-blur">
          {step === "role" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GoogleIcon className="h-5 w-5" /> Continue with Google
                </DialogTitle>
                <DialogDescription>
                  Choose how you'll use DiGiFaMaR. You can change this later.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <RoleCard
                  active={role === "buyer"}
                  onClick={() => runMockOAuth("buyer")}
                  icon={ShoppingBasket}
                  label="Buyer"
                  hint="Shop farms"
                />
                <RoleCard
                  active={role === "farmer"}
                  onClick={() => runMockOAuth("farmer")}
                  icon={Tractor}
                  label="Farmer"
                  hint="Sell produce"
                />
              </div>
            </>
          )}

          {step === "connecting" && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse-glow rounded-full bg-primary/30 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background">
                  <GoogleIcon className="h-7 w-7" />
                </div>
              </div>
              <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Connecting to Google…
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Signing you in as a {role}
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <p className="mt-3 text-base font-bold">Welcome, {MOCK_GOOGLE_USER.name.split(" ")[0]}!</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Taking you to your {role} dashboard…
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RoleCard({
  active,
  onClick,
  icon: Icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition hover:border-primary hover:bg-primary/5 ${
        active ? "border-primary bg-primary/10" : "border-border bg-card/40"
      }`}
    >
      <Icon className="h-6 w-6 text-primary" />
      <span className="text-sm font-bold">{label}</span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </button>
  );
}

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"/>
    </svg>
  );
}
