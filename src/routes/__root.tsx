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
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
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
            "Skip the middleman. Farmers keep 80-92% of every sale. Verified farms, escrow checkout, all 50 states.",
        },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "DiGiFaMaR" },
        { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/82c65f51-ec86-4f20-91c0-912ac1f81a5b" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "DiGiFaMaR — From American Farms, Direct To You" },
        { name: "twitter:description", content: "Skip the middleman. Farmers keep 80-92% of every sale. Verified farms, escrow checkout, all 50 states." },
        { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/82c65f51-ec86-4f20-91c0-912ac1f81a5b" },
      ],
      links: [{ rel: "stylesheet", href: appCss }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                name: "DiGiFaMaR",
                url: "https://farmer-forward.lovable.app",
                logo: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/82c65f51-ec86-4f20-91c0-912ac1f81a5b",
              },
              {
                "@type": "WebSite",
                name: "DiGiFaMaR",
                url: "https://farmer-forward.lovable.app",
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
  }
);

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
  return (
    <QueryClientProvider client={queryClient}>
      <SplashScreen />
      <AuthSync />
      <SmoothScroll>
        <Outlet />
      </SmoothScroll>
      <Toaster />
    </QueryClientProvider>
  );
}

function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
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
        <p className="mt-2 text-sm text-muted-foreground">
          Refresh the page or head back home.
        </p>
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
          <a
            href="/"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
