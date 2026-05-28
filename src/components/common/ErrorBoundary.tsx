import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type State = { error: Error | null };

/**
 * Generic React error boundary for client-side render errors.
 * Route-level errors should still use TanStack Router's `errorComponent`;
 * use this for isolating widgets (charts, embeds, third-party views) so a
 * single failure does not blank the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
      >
        <p className="font-semibold text-destructive">Something went wrong</p>
        <p className="mt-1 text-muted-foreground">{error.message}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={this.reset}>
          Try again
        </Button>
      </div>
    );
  }
}
