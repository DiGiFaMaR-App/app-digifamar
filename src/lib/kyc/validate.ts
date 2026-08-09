/**
 * Client-side validation for KYC document uploads.
 *
 * Runs before anything is sent to storage so the farmer gets an immediate,
 * plain-language reason instead of a failed upload.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

export const ALLOWED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
] as const;

export const ALLOWED_DOC_TYPES = [
  "government_id",
  "farm_registration",
  "proof_of_address",
  "certification",
  "other",
] as const;

export type KycValidationResult = { ok: true } | { ok: false; message: string };

export function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() ?? "") : "";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Validates the chosen document type and file before an upload is attempted. */
export function validateKycUpload(input: {
  docType: string | null | undefined;
  file: { name: string; size: number; type: string } | null | undefined;
}): KycValidationResult {
  const docType = input.docType?.trim();
  if (!docType) {
    return { ok: false, message: "Choose a document type before uploading." };
  }
  if (!(ALLOWED_DOC_TYPES as readonly string[]).includes(docType)) {
    return { ok: false, message: "That document type isn't supported. Pick one from the list." };
  }

  const file = input.file;
  if (!file) return { ok: false, message: "Choose a file to upload." };

  if (!file.name.trim()) {
    return { ok: false, message: "That file has no name — rename it and try again." };
  }

  const ext = extensionOf(file.name);
  const mimeOk = (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type);
  const extOk = (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
  // Some browsers report an empty MIME type, so fall back to the extension.
  if (!(mimeOk || (!file.type && extOk)) || (file.type && !mimeOk) || !extOk) {
    return {
      ok: false,
      message: "Unsupported file type. Upload a PDF or an image (JPG, PNG, WEBP, HEIC).",
    };
  }

  if (file.size <= 0) {
    return { ok: false, message: "That file is empty. Pick a file with content." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `File is ${formatBytes(file.size)} — the limit is 10MB. Compress it and try again.`,
    };
  }

  return { ok: true };
}
