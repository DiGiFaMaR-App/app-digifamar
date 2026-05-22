import { MessageCircle } from "lucide-react";

export function WhatsAppFab() {
  const message = encodeURIComponent(
    "Hi, I'd like help with DiGiFaMaR"
  );
  return (
    <a
      href={`https://wa.me/19294919491?text=${message}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[oklch(0.65_0.16_150)] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 md:bottom-6"
    >
      <MessageCircle className="h-7 w-7" fill="currentColor" strokeWidth={0} />
      <span className="absolute right-0 top-0 h-3 w-3 animate-pulse rounded-full bg-secondary" />
    </a>
  );
}
