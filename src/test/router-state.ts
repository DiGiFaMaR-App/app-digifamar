// Mutable per-test "router state" consumed by the @tanstack/react-router
// mock in src/test/setup.ts. Test files set this before rendering route
// components so Route.useParams() / Route.useSearch() return predictable
// values.

export type RouterMockState = {
  params: Record<string, string>;
  search: Record<string, unknown>;
  loaderData: unknown;
  pathname: string;
  navigate: (...args: unknown[]) => unknown;
};

export const routerMockState: RouterMockState = {
  params: {},
  search: {},
  loaderData: undefined,
  pathname: "/",
  navigate: () => {},
};

export function setRouterMockState(patch: Partial<RouterMockState>) {
  Object.assign(routerMockState, patch);
}

export function resetRouterMockState() {
  routerMockState.params = {};
  routerMockState.search = {};
  routerMockState.loaderData = undefined;
  routerMockState.pathname = "/";
  routerMockState.navigate = () => {};
}
