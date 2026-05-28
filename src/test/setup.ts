import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { resetRouterMockState, routerMockState } from "./router-state";

afterEach(() => {
  cleanup();
  resetRouterMockState();
});

// ---------- @tanstack/react-router ----------
// Routes register at import time via createFileRoute. The real registration
// requires routeTree.gen.ts wiring; in tests we just return a route-shaped
// object so callers can read `Route.component`, `Route.useParams()`, etc.
vi.mock("@tanstack/react-router", () => {
  type AnyProps = Record<string, unknown> & { children?: ReactNode };

  const Link = ({ to, params: _p, search: _s, activeProps: _a, ...rest }: AnyProps & {
    to?: string;
    params?: unknown;
    search?: unknown;
    activeProps?: unknown;
  }) => createElement("a", { href: typeof to === "string" ? to : "#", ...rest });

  const Outlet = () => createElement("div", { "data-testid": "outlet" });

  const useNavigate = () => routerMockState.navigate;
  const useRouter = () => ({
    invalidate: vi.fn(),
    navigate: routerMockState.navigate,
  });
  const useRouterState = (opts?: { select?: (s: unknown) => unknown }) => {
    const snapshot = { location: { pathname: routerMockState.pathname, search: routerMockState.search } };
    return opts?.select ? opts.select(snapshot) : snapshot;
  };

  const makeRouteApi = () => ({
    useParams: () => routerMockState.params,
    useSearch: () => routerMockState.search,
    useLoaderData: () => routerMockState.loaderData,
    useNavigate,
    useRouteContext: () => ({}),
  });

  const createFileRoute = (_path: string) => (opts: Record<string, unknown>) => ({
    ...opts,
    ...makeRouteApi(),
  });
  const createRootRoute = (opts: Record<string, unknown>) => ({ ...opts, ...makeRouteApi() });
  const createRootRouteWithContext = <_C,>() => createRootRoute;

  class RedirectError extends Error {
    isRedirect = true;
    constructor(public to: unknown) {
      super("redirect");
    }
  }
  const redirect = (to: unknown) => {
    throw new RedirectError(to);
  };
  const isRedirect = (e: unknown) => e instanceof RedirectError;

  return {
    Link,
    Outlet,
    useNavigate,
    useRouter,
    useRouterState,
    createFileRoute,
    createRootRoute,
    createRootRouteWithContext,
    redirect,
    isRedirect,
    Navigate: ({ to }: { to: string }) => createElement("a", { href: to, "data-testid": "navigate" }),
  };
});

// ---------- sonner ----------
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
  });
  return { toast, Toaster: () => null };
});

// ---------- Lovable auth wrapper ----------
vi.mock("@/integrations/lovable/index", () => ({
  lovable: {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ redirected: true }),
    },
  },
}));

// ---------- Supabase client (avoid env reads in tests) ----------
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(),
  },
}));

// ---------- GSAP (used by useReveal — animations off in jsdom) ----------
vi.mock("gsap", () => {
  const tween = { kill: vi.fn() };
  const ctx = (fn: () => void) => {
    fn();
    return { revert: vi.fn() };
  };
  return {
    default: {
      registerPlugin: vi.fn(),
      context: ctx,
      fromTo: vi.fn(() => tween),
      to: vi.fn(() => tween),
      from: vi.fn(() => tween),
      set: vi.fn(),
      timeline: vi.fn(() => ({ to: vi.fn(), from: vi.fn(), fromTo: vi.fn() })),
    },
  };
});
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: { create: vi.fn(), refresh: vi.fn() } }));

// ---------- jsdom: ResizeObserver / matchMedia / IntersectionObserver ----------
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const g = globalThis as unknown as {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
};
g.ResizeObserver = g.ResizeObserver ?? MockResizeObserver;
g.IntersectionObserver = g.IntersectionObserver ?? class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}

// jsdom doesn't implement Element.scrollTo
if (typeof Element !== "undefined" && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function () {};
}
