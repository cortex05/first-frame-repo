/**
 * The browser's IANA timezone (e.g. "America/Chicago"), sent when a case is
 * created. Returns undefined when unavailable; the server then records 'UTC'.
 */
export const getBrowserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};
