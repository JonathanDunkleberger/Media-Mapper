import { redirect } from 'next/navigation';

interface LegacyParams { mediaType: string; id: string }

// Using loose typing here due to Next.js type inference quirk on redirect-only legacy page.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function LegacyDetailRedirect(props: any) {
  const { mediaType, id } = props.params;
  redirect(`/details/${mediaType}/${id}`);
}
