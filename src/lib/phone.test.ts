import { describe, expect, it } from "vitest";
import {
  formatE164Display,
  formatUSInput,
  isValidPhone,
  normalizeToE164,
  toTelHref,
  toWhatsAppNumber,
} from "./phone";

describe("normalizeToE164 (US)", () => {
  it.each([
    ["(667) 361-9136", "+16673619136"],
    ["667-361-9136", "+16673619136"],
    ["6673619136", "+16673619136"],
    ["16673619136", "+16673619136"],
    ["+1 667 361 9136", "+16673619136"],
    ["  +1.667.361.9136  ", "+16673619136"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeToE164(input)).toBe(expected);
  });

  it.each([
    "",
    null,
    undefined,
    "abc",
    "123",
    "066-361-9136", // area code starts with 0
    "167-361-9136", // area code starts with 1
    "667-061-9136", // exchange starts with 0
    "66736191360", // 11 digits not starting with 1
    "+44 20 7946 0958", // non-US dial
  ])("rejects %s", (input) => {
    expect(normalizeToE164(input as string | null | undefined)).toBeNull();
  });
});

describe("isValidPhone", () => {
  it("returns true for valid", () => {
    expect(isValidPhone("(667) 361-9136")).toBe(true);
  });
  it("returns false for invalid", () => {
    expect(isValidPhone("123")).toBe(false);
  });
});

describe("formatUSInput", () => {
  it("formats progressively", () => {
    expect(formatUSInput("")).toBe("");
    expect(formatUSInput("6")).toBe("(6");
    expect(formatUSInput("667")).toBe("(667");
    expect(formatUSInput("6673")).toBe("(667) 3");
    expect(formatUSInput("667361")).toBe("(667) 361");
    expect(formatUSInput("6673619136")).toBe("(667) 361-9136");
  });
  it("ignores non-digits and caps at 10", () => {
    expect(formatUSInput("+1 (667) 361-9136 ext 22")).toBe("(667) 361-9136");
  });
});

describe("formatE164Display", () => {
  it("formats E.164 → pretty US", () => {
    expect(formatE164Display("+16673619136")).toBe("+1 (667) 361-9136");
  });
  it("returns empty for nullish", () => {
    expect(formatE164Display(null)).toBe("");
  });
});

describe("toWhatsAppNumber / toTelHref", () => {
  it("strips the plus for wa.me", () => {
    expect(toWhatsAppNumber("(667) 361-9136")).toBe("16673619136");
  });
  it("builds tel: href", () => {
    expect(toTelHref("(667) 361-9136")).toBe("tel:+16673619136");
  });
  it("returns null when invalid", () => {
    expect(toWhatsAppNumber("123")).toBeNull();
    expect(toTelHref("123")).toBeNull();
  });
});
