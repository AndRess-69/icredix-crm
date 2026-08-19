/**
 * Utilidades para archivos subidos a Supabase Storage.
 */

export function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  return base.length > 80 ? base.slice(0, 80) : base;
}

export function isImageType(type: string | null | undefined): boolean {
  return !!type && type.startsWith("image/");
}

export function isPdfType(type: string | null | undefined): boolean {
  return type === "application/pdf";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
