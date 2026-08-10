import { Link } from "@tanstack/react-router";
import logoSrc from "@/assets/logo.jpg";

export function Logo({
  className = "",
  size = "md",
  glow = false,
  blend = false,
  linked = true,
  wordmark = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  glow?: boolean;
  blend?: boolean;
  linked?: boolean;
  wordmark?: boolean;
}) {
  void blend;
  const sizes = {
    sm: "h-8",
    md: "h-11",
    lg: "h-20 sm:h-24",
    xl: "h-40 sm:h-48",
    "2xl": "h-52 sm:h-60",
  };
  const pads = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2",
    xl: "p-3",
    "2xl": "p-3",
  };
  const fx = glow ? "glow-logo" : "";
  const img = (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-ink ${pads[size]} ${glow ? "shadow-[0_10px_30px_-14px_oklch(0.2_0.02_155/0.45)]" : ""}`}
    >
      <img
        src={logoSrc}
        alt="DiGiFaMaR"
        width={512}
        height={512}
        className={`${sizes[size]} w-auto object-contain ${fx}`}
      />
    </span>
  );
  const content = wordmark ? (
    <>
      {img}
      <span className="hidden text-lg font-extrabold tracking-tight text-foreground sm:inline">
        DiGiFaMaR
      </span>
    </>
  ) : (
    img
  );
  if (!linked) return <span className={`inline-flex items-center gap-2.5 ${className}`}>{content}</span>;
  return (
    <Link
      to="/"
      aria-label="DiGiFaMaR — home"
      className={`flex items-center gap-2.5 ${className}`}
    >
      {content}
    </Link>
  );
}


