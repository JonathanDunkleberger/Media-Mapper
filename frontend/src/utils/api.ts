const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

export async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 0): Promise<any> {
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
    return await response.json();
  } catch (error: any) {
    if (retries < MAX_RETRIES) {
      await new Promise(res => setTimeout(res, RETRY_DELAY * (retries + 1)));
      return fetchWithRetry(url, options, retries + 1);
    }
    throw new Error(`API failed after ${MAX_RETRIES} attempts: ${error.message}`);
  }
}
