import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { getWhatsAppWebUrl } from "@/components/WhatsAppFab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact DiGiFaMaR" },
      { name: "description", content: "Get in touch — chat, email, or WhatsApp our support team." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: Contact,
});

function Contact() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Get in touch</h1>
        <p className="mt-3 text-muted-foreground">We answer every message — usually within an hour.</p>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={5} required />
            </div>
            <Button type="submit" className="w-full">Send message</Button>
          </form>

          <div className="space-y-3">
            <a href={getWhatsAppWebUrl()} target="_top" rel="noreferrer" className="card-lift flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <MessageCircle className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">WhatsApp</p>
                <p className="text-xs text-muted-foreground">+1 (929) 491-9491</p>
              </div>
            </a>
            <a href="mailto:hello@digifamar.com" className="card-lift flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <Mail className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">Email</p>
                <p className="text-xs text-muted-foreground">hello@digifamar.com</p>
              </div>
            </a>
            <a href="tel:+16673619136" className="card-lift flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <Phone className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">Phone</p>
                <p className="text-xs text-muted-foreground">+1 (929) 491-9491</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
