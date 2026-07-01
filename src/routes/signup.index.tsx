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
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F0A] via-[#121A12] to-[#0A0F0A] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-10 flex justify-center">
          <Logo size="lg" glow />
        </div>
        <h1 className="text-4xl font-bold mb-2">Join DiGiFaMaR</h1>
        <p className="text-gray-400 mb-10">Choose how you want to participate</p>

        <div className="space-y-4">
          <button
            onClick={() => handleRoleSelect("farmer")}
            className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-black font-semibold py-6 rounded-3xl text-left px-6 flex items-center gap-4 transition-all active:scale-[0.98]"
          >
            <div className="bg-black/20 p-3 rounded-2xl">
              <Tractor className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xl font-semibold">I am a Farmer</div>
              <div className="text-sm opacity-75">Sell produce directly • Access lending</div>
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect("buyer")}
            className="w-full border border-white/30 hover:bg-white/10 py-6 rounded-3xl text-left px-6 flex items-center gap-4 transition-all active:scale-[0.98]"
          >
            <div className="bg-white/10 p-3 rounded-2xl">
              <User className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xl font-semibold">I am a Buyer</div>
              <div className="text-sm opacity-75">Get fresh local produce • Support farmers</div>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-12">Your role can be changed later in settings</p>
      </div>
    </div>
  );
}
