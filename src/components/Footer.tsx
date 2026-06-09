import { Link } from "@tanstack/react-router";
import {
  Facebook,
  Instagram,
  Linkedin,
  Lock,
  Shield,
  Twitter,
  Youtube,
} from "lucide-react";
import { Logo } from "./Logo";
import { getWhatsAppWebUrl } from "./WhatsAppFab";

const buyerLinks = [
  { to: "/browse", label: "Browse Farms" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/buyer-protection", label: "Buyer Protection" },
];
const farmerLinks = [
  { to: "/signup/farmer", label: "Start Selling" },
  { to: "/lending", label: "Lending Program" },
  { to: "/pricing", label: "Farmer Pricing" },
  { to: "/how-it-works", label: "Success Stories" },
];
const companyLinks = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/about", label: "Mission" },
  { to: "/about", label: "Privacy" },
  { to: "/about", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              From American Farms, Direct To You.
            </p>
            <div className="mt-4 flex gap-3 text-muted-foreground">
              <Facebook className="h-5 w-5 cursor-pointer hover:text-primary" />
              <Instagram className="h-5 w-5 cursor-pointer hover:text-primary" />
              <Twitter className="h-5 w-5 cursor-pointer hover:text-primary" />
              <Linkedin className="h-5 w-5 cursor-pointer hover:text-primary" />
              <Youtube className="h-5 w-5 cursor-pointer hover:text-primary" />
            </div>
          </div>

          <FooterCol title="For Buyers" links={buyerLinks} />
          <FooterCol title="For Farmers" links={farmerLinks} />
          <FooterCol title="Company" links={companyLinks} />
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© 2026 DiGiFaMaR. Empowering American Farmers.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-4 w-4" /> USDA Compliant
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-4 w-4" /> SSL Secure
            </span>
            <a
              href={getWhatsAppWebUrl()}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary"
            >
              WhatsApp: +1 (929) 491-9491
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { to: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <ul className="space-y-2">
        {links.map((l, i) => (
          <li key={`${l.to}-${i}`}>
            <Link
              to={l.to}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
