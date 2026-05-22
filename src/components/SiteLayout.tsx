import { type ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppFab } from "./WhatsAppFab";
import { MobileBottomNav } from "./MobileBottomNav";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <WhatsAppFab />
      <MobileBottomNav />
    </div>
  );
}
