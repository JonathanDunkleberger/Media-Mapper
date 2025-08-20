import { fetchJSON } from '@/lib/upstream';
import { env } from '@/lib/env.server';


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const take = Number(searchParams.get('take') ?? 60);
  const page = Number(searchParams.get('page') ?? 1);
  const mode = searchParams.get('mode') ?? 'popular';
  const genres = searchParams.get('genres') ?? undefined;
  const subject = searchParams.get('subject') ?? undefined;
  const genresParam = genres || subject || 'fiction';
  const startIndex = (page - 1) * take;
  const order = mode === 'newest' ? 'newest' : 'relevance';
  const key = env.GOOGLE_BOOKS_API_KEY;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(genresParam)}&maxResults=${take}&startIndex=${startIndex}&orderBy=${order}&key=${key}`;
  const data = await fetchJSON(url, {}, 'google_books');
  if (!data.ok) return Response.json(data, { status: data.status ?? 500 });
  return Response.json(data.data?.items ?? []);
}

export const runtime = "nodejs";
export const revalidate = 0;
