const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

export async function fetchWithRetry<T = unknown>(url: string, options: RequestInit = {}, retries = 0): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await new Promise(res => setTimeout(res, RETRY_DELAY * (retries + 1)));
      return fetchWithRetry<T>(url, options, retries + 1);
    }
    if (error instanceof Error) {
      throw new Error(`API failed after ${MAX_RETRIES} attempts: ${error.message}`);
    }
    throw error;
  }
}
