export function normalizeUrl(value: string): string {
  return value.trim();
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function isWikipediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname.endsWith('wikipedia.org') && /\/wiki\//i.test(url.pathname);
  } catch {
    return false;
  }
}

export function getDomain(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./i, '');
  } catch {
    return 'unknown domain';
  }
}

export function getSafeArticleTitle(value: string): string {
  return value.replace(/\s+/g, ' ').trim() || 'Untitled article';
}
