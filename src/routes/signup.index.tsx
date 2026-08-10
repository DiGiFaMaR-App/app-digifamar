import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { User, Tractor } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/signup/")({
  head: () => ({
    meta: [
      { title: "Join DiGiFaMaR — Choose your role" },
      { name: "description", content: "Sign up as a farmer or buyer on DiGiFaMaR." },
    ],
  }),
  component: RoleSelection,
});

function RoleSelection() {
  const navigate = useNavigate();

  const handleRoleSelect = (role: "farmer" | "buyer") => {
    if (role === "farmer") {
      navigate({ to: "/signup/farmer" });
    } else {
      navigate({ to: "/signup/buyer" });
    }
  };

  return (
    <div className="min-h-screen bg-surface-1 text-foreground flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-10 flex justify-center">
          <Logo size="lg" glow />
        </div>
        <h1 className="text-4xl font-bold mb-2">Join DiGiFaMaR</h1>
        <p className="text-muted-foreground mb-10">Choose how you want to participate</p>

        <div className="space-y-4">
          <button
            onClick={() => handleRoleSelect("farmer")}
            className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold py-6 rounded-3xl text-left px-6 flex items-center gap-4 transition-all shadow-soft hover:shadow-lifted active:scale-[0.98]"
          >
            <div className="bg-primary-foreground/15 p-3 rounded-2xl">
              <Tractor className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xl font-semibold">I am a Farmer</div>
              <div className="text-sm opacity-75">Sell produce directly • Access lending</div>
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect("buyer")}
            className="w-full border border-border bg-card hover:bg-secondary py-6 rounded-3xl text-left px-6 flex items-center gap-4 transition-all shadow-soft active:scale-[0.98]"
          >
            <div className="bg-secondary p-3 rounded-2xl">
              <User className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xl font-semibold">I am a Buyer</div>
              <div className="text-sm opacity-75">Get fresh local produce • Support farmers</div>
            </div>
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-12">Your role can be changed later in settings</p>
      </div>
    </div>
  );
}
