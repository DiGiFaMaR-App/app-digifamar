import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route } from "./chat.$productId";
import { setRouterMockState } from "@/test/router-state";

const Page = (Route as unknown as { component: () => React.ReactElement }).component;

// Smoke tests for the realtime (Supabase-backed) chat room. The earlier
// client-side price-negotiation chat was replaced by the in-app-chat feature,
// so these assert the new composer/header shell renders rather than the old
// negotiation behavior.
describe("ChatRoom route", () => {
  it("renders the chat composer, header, and quick replies", () => {
    setRouterMockState({ params: { productId: "conv-123" } });
    render(<Page />);

    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to messages/i }),
    ).toBeInTheDocument();
    // One of the canned quick-reply chips.
    expect(screen.getByText(/minimum order/i)).toBeInTheDocument();
  });
});
