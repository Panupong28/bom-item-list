// Turn an arbitrary string into a safe filename fragment: replace characters
// that are illegal in Windows/most filesystems with '_', collapse whitespace
// runs to a single '_', and fall back to 'BOM' for empty/nullish input.
export function safeFilename(s) {
  return String(s || 'BOM')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');
}
