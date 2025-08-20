import { NextRequest, NextResponse } from 'next/server';

/**
 * Generates a placeholder SVG image.
 * This is used as a fallback when an upstream image cannot be fetched.
 * @param host - Optional hostname of the failed image source to display in the SVG.
 * @returns A string containing the SVG markup.
 */
const generatePlaceholderSvg = (host?: string) => {
  const title = 'No Image';
  const hostDisplay = host ? `<text x="50%" y="75%" font-family="sans-serif" font-size="10" fill="#666" text-anchor="middle">${host}</text>` : '';
  
  return `
<svg width="200" height="300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" preserveAspectRatio="xMidYMid meet">
  <rect width="100%" height="100%" fill="#1a1a1a" />
  <text x="50%" y="50%" font-family="sans-serif" font-size="18" fill="#444" text-anchor="middle" dominant-baseline="middle">${title}</text>
  ${hostDisplay}
</svg>`.trim();
};

const CACHE_CONTROL_HEADER = 'public, max-age=60, stale-while-revalidate=600';

/**
 * API route for proxying and caching external images.
 * It accepts an upstream image URL via the `u` query parameter.
 * If the upstream image is fetched successfully, it's streamed back to the client.
 * On any failure (invalid URL, fetch error, timeout, non-image content),
 * it returns a placeholder SVG. This route is designed to be highly resilient.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const upstreamUrl = searchParams.get('u');

  const placeholderResponse = (host?: string) => {
    return new Response(generatePlaceholderSvg(host), {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': CACHE_CONTROL_HEADER,
      },
    });
  };

  if (!upstreamUrl) {
    return placeholderResponse();
  }

  let url: URL;
  try {
    // Ensure the URL is valid and upgrade to HTTPS
    const fixedUrl = upstreamUrl.startsWith('http://') ? upstreamUrl.replace('http://', 'https://') : upstreamUrl;
    url = new URL(fixedUrl);
  } catch (e) {
    return placeholderResponse(); // Invalid URL format
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'image/*' },
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('Content-Type');

    if (response.ok && contentType && contentType.startsWith('image/')) {
      // Stream the image back to the client
      const readableStream = response.body;
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', CACHE_CONTROL_HEADER);

      return new Response(readableStream, {
        status: 200,
        headers,
      });
    }

    // Upstream failed (e.g., 404, 500, or not an image)
    return placeholderResponse(url.hostname);

  } catch (error) {
    // Fetch error (e.g., timeout, DNS error, network issue)
    return placeholderResponse(url.hostname);
  }
}
