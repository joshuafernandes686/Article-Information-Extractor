import { getDomain, getSafeArticleTitle, isWikipediaUrl, isValidHttpUrl, normalizeUrl } from './urlValidation';
import type { ArticleData } from '../types';

const MAX_HEADINGS = 40;

function cleanText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function getWordCount(text: string): number {
  const words = cleanText(text).match(/\S+/g);
  return words ? words.length : 0;
}

function extractMetricsFromDocument(document: Document): {
  wordCount: number;
  imageCount: number;
  linkCount: number;
  metaDescription: string;
} {
  const text = cleanText(document.body?.textContent ?? '');
  const wordCount = getWordCount(text);
  const imageCount = document.querySelectorAll('img').length;
  const linkCount = document.querySelectorAll('a[href]').length;
  const metaDescription = cleanText(document.querySelector('meta[name="description"]')?.getAttribute('content'));

  return {
    wordCount,
    imageCount,
    linkCount,
    metaDescription,
  };
}

function collectHeadings(document: Document): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();

  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((element) => {
    const heading = cleanText(element.textContent);

    if (!heading || heading.length > 160) {
      return;
    }

    const normalized = heading.replace(/^\d+\s*[-.:]?\s*/, '');
    const key = normalized.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(normalized);
    }
  });

  return unique.slice(0, MAX_HEADINGS);
}

async function readHtmlFromProxy(url: string): Promise<string> {
  const parsed = new URL(url);
  const target = `${parsed.host}${parsed.pathname}${parsed.search}`;
  const candidates = [
    `https://r.jina.ai/http://${target}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        continue;
      }

      if (candidate.includes('allorigins.win')) {
        const payload = await response.json();
        const html = typeof payload?.contents === 'string' ? payload.contents : '';
        if (html.trim()) {
          return html;
        }
      } else {
        const html = await response.text();
        if (html.trim()) {
          return html;
        }
      }
    } catch {
      continue;
    }
  }

  throw new Error('The page could not be fetched from the browser because it is blocked or unavailable.');
}

async function fetchWikipediaArticle(rawUrl: string): Promise<ArticleData> {
  const url = new URL(rawUrl);
  const wikiSlug = decodeURIComponent((url.pathname.match(/\/wiki\/(.+)$/)?.[1] ?? url.pathname.split('/').pop() ?? '')).replace(/_/g, ' ');
  const language = url.hostname.split('.')[0] || 'en';
  const apiBase = `https://${language}.wikipedia.org/w/api.php`;
  const pageName = encodeURIComponent(wikiSlug || 'Wikipedia');
  const apiUrl = `${apiBase}?action=parse&format=json&page=${pageName}&prop=sections|text&origin=*`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error('Wikipedia is unavailable right now. Please try a different article.');
  }

  const payload = await response.json();
  const parseInfo = payload?.parse;

  if (!parseInfo || payload?.error) {
    throw new Error('The requested Wikipedia page could not be found.');
  }

  const htmlContent = parseInfo.text?.['*'] ?? '';
  const document = new DOMParser().parseFromString(htmlContent, 'text/html');
  const title = getSafeArticleTitle(parseInfo.title ?? wikiSlug ?? 'Wikipedia article');

  return {
    title,
    sections: collectHeadings(document),
    url: rawUrl,
    domain: getDomain(rawUrl),
    wordCount: getWordCount(document.body?.textContent ?? ''),
    readingTime: Math.max(1, Math.ceil((document.body?.textContent?.trim().split(/\s+/).filter(Boolean).length ?? 0) / 200)),
    imageCount: document.querySelectorAll('img').length,
    linkCount: document.querySelectorAll('a[href]').length,
    metaDescription: cleanText(document.querySelector('meta[name="description"]')?.getAttribute('content')) || `Wikipedia article: ${title}`,
    source: 'wikipedia',
    extractedAt: Date.now(),
  };
}

async function fetchWebArticle(rawUrl: string): Promise<ArticleData> {
  const html = await readHtmlFromProxy(rawUrl);
  const document = new DOMParser().parseFromString(html, 'text/html');
  const title = getSafeArticleTitle(
    document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.querySelector('title')?.textContent ||
      document.querySelector('h1')?.textContent ||
      'Untitled article',
  );

  const metrics = extractMetricsFromDocument(document);
  const sections = collectHeadings(document);

  if (!sections.length) {
    const fallbackText = cleanText(document.body?.textContent ?? '');
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map((paragraph) => cleanText(paragraph.textContent))
      .filter((paragraph) => paragraph && paragraph.length > 50)
      .slice(0, 8);

    if (!paragraphs.length && !fallbackText) {
      throw new Error('No readable article content was found on this page.');
    }
  }

  return {
    title,
    sections: sections.length ? sections : ['Overview'],
    url: rawUrl,
    domain: getDomain(rawUrl),
    wordCount: metrics.wordCount,
    readingTime: Math.max(1, Math.ceil(metrics.wordCount / 200)),
    imageCount: metrics.imageCount,
    linkCount: metrics.linkCount,
    metaDescription: metrics.metaDescription || `Article from ${getDomain(rawUrl)}.`,
    source: 'web',
    extractedAt: Date.now(),
  };
}

export async function extractArticle(rawUrl: string): Promise<ArticleData> {
  const url = normalizeUrl(rawUrl);

  if (!isValidHttpUrl(url)) {
    throw new Error('Please enter a valid URL beginning with http:// or https://.');
  }

  if (isWikipediaUrl(url)) {
    return fetchWikipediaArticle(url);
  }

  return fetchWebArticle(url);
}
