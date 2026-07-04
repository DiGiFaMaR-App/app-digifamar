import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantService, type AssistantUserContext } from "./service.server";

const USER: AssistantUserContext = {
  fullName: "Ada Grower",
  role: "farmer",
  farmName: "Sunrise Acres",
  products: ["tomatoes", "okra"],
  location: "Fresno, CA",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AssistantService.ask", () => {
  it("degrades to the deterministic engine when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await AssistantService.ask({
      user: USER,
      messages: [{ role: "user", content: "How does escrow work?" }],
    });
    expect(res.degraded).toBe(true);
    // Offline fallback answers with a real escrow explanation, not a "not configured" stub.
    expect(res.reply).toContain("6-digit code");
    expect(res.reply).not.toContain("ANTHROPIC_API_KEY");
  });

  it("runs product search offline against the last user turn", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await AssistantService.ask({
      user: USER,
      messages: [{ role: "user", content: "find organic tomatoes under $6" }],
    });
    expect(res.degraded).toBe(true);
    expect(res.reply.toLowerCase()).toContain("tomato");
    expect(res.reply).toMatch(/\$\d/);
  });
});
