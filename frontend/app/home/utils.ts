import { fetchJsonSafe, getErrorMessage } from '@/lib/http';

export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export async function fetchJson<T>(url: string): Promise<T> {
  const result = await fetchJsonSafe<T>(url);
  if (!result.ok || result.data === null) {
    throw new Error(getErrorMessage(result, 'API request failed'));
  }
  return result.data;
}
