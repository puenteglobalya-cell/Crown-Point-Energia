// Maps a validated file extension to its safe MIME type, to pass explicitly
// as `contentType` on Supabase Storage uploads. Never trust the client's own
// `File.type` for this — it's just a request header the uploader controls,
// so a file named "evidencia.jpg" could be uploaded with
// `Content-Type: text/html` and, if stored as-is, get served back (and
// rendered) as HTML when a staff member opens the "evidence" link.
const EXT_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export function safeContentType(ext: string): string {
  return EXT_TO_MIME[ext.toLowerCase()] ?? 'application/octet-stream'
}
