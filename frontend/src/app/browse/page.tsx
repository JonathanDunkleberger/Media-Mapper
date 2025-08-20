import BrowseClient from './BrowseClient';

export default function Page({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const cat = searchParams.cat ?? 'movie';
  const mode = searchParams.mode ?? 'popular';
  return <BrowseClient cat={cat} mode={mode} />;
}
