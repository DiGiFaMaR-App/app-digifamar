import { describe, expect, it } from "vitest";
import { validateKycUpload, formatBytes, MAX_UPLOAD_BYTES } from "../validate";

const file = (over: Partial<{ name: string; size: number; type: string }> = {}) => ({
  name: "id.pdf",
  size: 1024,
  type: "application/pdf",
  ...over,
});

describe("validateKycUpload", () => {
  it("accepts a valid pdf", () => {
    expect(validateKycUpload({ docType: "government_id", file: file() })).toEqual({ ok: true });
  });

  it("accepts an image with an empty MIME type", () => {
    expect(
      validateKycUpload({ docType: "other", file: file({ name: "scan.JPG", type: "" }) }),
    ).toEqual({ ok: true });
  });

  it("requires a document type", () => {
    const r = validateKycUpload({ docType: "", file: file() });
    expect(r.ok).toBe(false);
  });

  it("rejects unknown document types", () => {
    expect(validateKycUpload({ docType: "passport_scan", file: file() }).ok).toBe(false);
  });

  it("requires a file", () => {
    expect(validateKycUpload({ docType: "government_id", file: null }).ok).toBe(false);
  });

  it("rejects unsupported file types", () => {
    const r = validateKycUpload({
      docType: "government_id",
      file: file({ name: "notes.docx", type: "application/msword" }),
    });
    expect(r.ok).toBe(false);
  });

  it("rejects empty files", () => {
    expect(validateKycUpload({ docType: "government_id", file: file({ size: 0 }) }).ok).toBe(false);
  });

  it("rejects oversized files", () => {
    const r = validateKycUpload({
      docType: "government_id",
      file: file({ size: MAX_UPLOAD_BYTES + 1 }),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("10MB");
  });
});

describe("formatBytes", () => {
  it("formats units", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
