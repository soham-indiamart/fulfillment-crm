const LOCALE = 'en-IN';

export const formatCount = (n: number) => n.toLocaleString(LOCALE);

/** Labels for 'YYYY-MM-DD' days, read as calendar dates (no timezone shift). */
export const formatDay = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(LOCALE, { ...options, timeZone: 'UTC' });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** n as a percentage of d, or null when there is nothing to divide by. */
export const ratio = (n: number, d: number) => (d ? (n / d) * 100 : null);
