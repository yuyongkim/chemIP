export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

export function firstLine(items?: string[]): string {
  if (!items || items.length === 0) return '';
  return stripHtml(items[0] || '');
}
