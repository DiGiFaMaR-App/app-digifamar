import { type ReactNode, useEffect } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

/**
 * Wraps protected page content.
 * If the visitor is not authenticated, they are redirected to
 * /auth?tab=signin&next=<current-path> so they return after login.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    if (loading || isAuthenticated) return;
    const next = router.state.location.pathname;
    // Use imperative navigation so the URL doesn't flash the protected page.
    navigate({
      to: "/auth",
      // @ts-expect-error — `next` is added to auth search schema below
      search: { tab: "signin", next },
      replace: true,
    });
  }, [isAuthenticated, loading, navigate, router.state.location.pathname]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "#060F06" }}
      >
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#4ADE80", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  // Return null while the redirect fires — prevents a content flash.
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
