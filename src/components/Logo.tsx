import { Link } from "@tanstack/react-router";
import logoSrc from "@/assets/logo.jpg";

export function Logo({
  className = "",
  size = "md",
  glow = false,
  linked = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
  linked?: boolean;
}) {
  const sizes = {
    sm: "h-8",
    md: "h-10 sm:h-12",
    lg: "h-20 sm:h-24",
    xl: "h-40 sm:h-48",
  };
  const img = (
    <img
      src={logoSrc}
      alt="DiGiFaMaR"
      width={512}
      height={512}
      className={`${sizes[size]} w-auto object-contain ${glow ? "glow-logo" : ""}`}
    />
  );
  if (!linked) return <span className={`inline-flex items-center ${className}`}>{img}</span>;
  return (
    <Link to="/" aria-label="DiGiFaMaR — home" className={`flex items-center ${className}`}>
      {img}
    </Link>
  );
}
