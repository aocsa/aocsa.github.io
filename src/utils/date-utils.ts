/**
 * Formats a date string (YYYY-MM-DD) for display without timezone shifts.
 * Using '-' in Date constructor often interprets as UTC, causing off-by-one errors 
 * when displayed in local time. Replacing '-' with '/' forces local time interpretation
 * in most browsers, keeping the date consistent with the input.
 */
export function formatDisplayDate(dateString: string): string {
  if (!dateString) return ''
  // Use '/' instead of '-' to ensure the date is interpreted as local time
  // rather than UTC, preventing off-by-one errors in negative timezone offsets.
  const date = new Date(dateString.replace(/-/g, '/'))

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Formats a date string with year for post detail views.
 */
export function formatFullDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString.replace(/-/g, '/'))

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
