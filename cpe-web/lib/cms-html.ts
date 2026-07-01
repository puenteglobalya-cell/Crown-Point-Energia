/**
 * Sanitize an admin-authored CMS string before rendering via dangerouslySetInnerHTML.
 * Escapes ALL HTML, then re-allows only <br>/<br/> line breaks. This neutralizes
 * stored XSS (script tags, inline event handlers, etc.) while preserving the line
 * breaks these CMS headings legitimately use.
 */
export function cmsLineBreaks(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br/>')
}
