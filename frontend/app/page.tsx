import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function buildQueryString(searchParams: SearchParams): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) params.append(key, item);
      }
      continue;
    }
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolved = (await searchParams) ?? {};
  redirect(`/chemip${buildQueryString(resolved)}`);
}
