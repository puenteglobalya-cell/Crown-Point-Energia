// Safely coerce an unknown JSON value to a trimmed string, regardless of what
// the client actually sent (array, number, object, null…). Public form
// endpoints parse arbitrary request bodies — `body.field?.trim()` throws if
// `field` isn't a string, turning a malformed request into a raw 500 instead
// of a clean 400.
export function str(value: unknown, maxLen = 2000): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLen)
}
