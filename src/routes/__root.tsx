import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  Link,
  useRouter,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { SmoothScroll } from "@/components/SmoothScroll";
import { SplashScreen } from "@/components/SplashScreen";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { initAnalytics } from "@/lib/analytics/posthog";
import { BRAND } from "@/lib/brand";


import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "DiGiFaMaR — From American Farms, Direct To You" },
      {
        name: "description",
        content:
          "DiGiFaMaR connects verified American farmers directly with buyers for fresh produce, dairy, meat, and artisan goods. Escrow-protected checkout, 24-48 hour delivery, all 50 states.",
      },
      { property: "og:title", content: "DiGiFaMaR — From American Farms, Direct To You" },
      {
        property: "og:description",
        content:
          "Skip the middleman. Farmers receive 90% of every sale on a flat 10% platform fee. Verified farms, escrow-protected checkout, all 50 states.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "DiGiFaMaR" },
      {
        property: "og:image",
        content: BRAND.og.default,
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "DiGiFaMaR — From American Farms, Direct To You" },
      {
        name: "twitter:description",
        content:
          "Skip the middleman. Farmers receive 90% of every sale on a flat 10% platform fee. Verified farms, escrow-protected checkout, all 50 states.",
      },
      {
        name: "twitter:image",
        content: BRAND.og.default,
      },
      { name: "theme-color", content: "#0F2C1A" },
      { name: "apple-mobile-web-app-title", content: "DiGiFaMaR" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
      },

      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "DiGiFaMaR",
              url: "https://app.digifamar.com",
              logo: BRAND.logoAbsoluteUrl,
            },
            {
              "@type": "WebSite",
              name: "DiGiFaMaR",
              url: "https://app.digifamar.com",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    initAnalytics();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <SplashScreen />
      <AuthSync />
      
      <SmoothScroll>
        <div className="pb-16 md:pb-0">
          <Outlet />
        </div>
      </SmoothScroll>
      <MobileBottomNav />
      <Toaster />
    </QueryClientProvider>
  );
}

function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold text-primary">404</h1>
        <h2 className="mt-3 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for isn't in this barn.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Refresh the page or head back home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a href="/" className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
