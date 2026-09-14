const ACCEPTED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const ACCEPTED_EXT = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const MAX_FILES = 12;

export function readFiles(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export function validateFiles(files: File[], label: string) {
  if (!files.length) throw new Error(`${label} is required.`);
  if (files.length > MAX_FILES) throw new Error(`Maximum ${MAX_FILES} files are allowed.`);

  let total = 0;
  for (const file of files) {
    total += file.size;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ACCEPTED_MIME.has(file.type) && !ACCEPTED_EXT.has(ext)) {
      throw new Error(`Unsupported file: ${file.name}`);
    }
  }

  if (total > MAX_TOTAL_BYTES) {
    throw new Error("Total upload size must be 50 MB or less.");
  }
}

export function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function isImage(file: File) {
  return file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
}
