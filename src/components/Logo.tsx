import { Link } from "@tanstack/react-router";
import { Leaf, MapPin } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Leaf className="h-5 w-5" strokeWidth={2.4} />
        <MapPin
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 text-secondary"
          fill="currentColor"
          strokeWidth={1.5}
        />
      </span>
      <span className="text-lg font-extrabold tracking-tight">
        DiGi<span className="text-primary">Fa</span>MaR
      </span>
    </Link>
  );
}
