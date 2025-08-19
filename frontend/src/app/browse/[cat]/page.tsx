import BrowseClient, { BrowseCat } from './BrowseClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const VALID: BrowseCat[] = ['movie','tv','game','book','anime'];

export default async function BrowsePage({ params }: { params: Promise<{ cat: string }> }) {
  const { cat } = await params;
  if (!cat || !VALID.includes(cat as BrowseCat)) return notFound();
  return <BrowseClient cat={cat as BrowseCat} />;
}
