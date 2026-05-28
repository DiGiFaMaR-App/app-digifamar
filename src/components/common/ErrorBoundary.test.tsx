import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom({ when }: { when: boolean }) {
  if (when) throw new Error("kaboom");
  return <p>safe</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs the caught error; silence it for cleaner test output.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Boom when={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe")).toBeInTheDocument();
  });

  it("shows the default fallback when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom when={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByText("kaboom")).toBeInTheDocument();
  });

  it("clears the error when the user clicks Try again", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;
    function Toggle() {
      if (shouldThrow) {
        shouldThrow = false;
        throw new Error("once");
      }
      return <p>recovered</p>;
    }
    render(
      <ErrorBoundary>
        <Toggle />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("recovered")).toBeInTheDocument();
  });

  it("uses a custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={(e) => <p>custom: {e.message}</p>}>
        <Boom when={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("custom: kaboom")).toBeInTheDocument();
  });
});
