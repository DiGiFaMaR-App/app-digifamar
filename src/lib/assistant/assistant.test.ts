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
  it("degrades gracefully (no throw) when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await AssistantService.ask({
      user: USER,
      messages: [{ role: "user", content: "How does escrow work?" }],
    });
    expect(res.degraded).toBe(true);
    expect(res.reply).toContain("ANTHROPIC_API_KEY");
  });
});
