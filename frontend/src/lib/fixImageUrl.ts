/**
 * Cleans and normalizes an image URL from various sources.
 * - Trims whitespace.
 * - Upgrades HTTP to HTTPS.
 * - Prepends TMDB base URL for relative paths.
 * @param raw - The raw URL string from an API.
 * @returns A cleaned, absolute URL string or null if the input is invalid.
 */
export function fixImageUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return null;
  }

  let url = raw.trim();

  // If it's a TMDB path, prepend the base URL.
  if (url.startsWith('/')) {
    // Basic check for TMDB paths. More specific regex could be used if needed.
    if (url.startsWith('/t/') || url.startsWith('/p/') || /^\/w\d+\//.test(url)) {
      url = `https://image.tmdb.org${url}`;
    } else {
      // It's a relative path we don't recognize, can't fix it.
      return null;
    }
  }

  // Upgrade HTTP to HTTPS.
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  // Ensure it's a valid https URL before returning.
  if (!url.startsWith('https://')) {
    return null;
  }

  return url;
}
