import { Link } from "@tanstack/react-router";
import logoSrc from "@/assets/logo.jpg";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="DiGiFaMaR — home"
      className={`flex items-center ${className}`}
    >
      <img
        src={logoSrc}
        alt="DiGiFaMaR"
        width={160}
        height={160}
        className="h-10 w-auto object-contain sm:h-12"
      />
    </Link>
  );
}
