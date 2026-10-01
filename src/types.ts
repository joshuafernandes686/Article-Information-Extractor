export type Theme = 'light' | 'dark';

export interface ArticleData {
  title: string;
  sections: string[];
  url: string;
  domain: string;
  wordCount: number;
  readingTime: number;
  imageCount: number;
  linkCount: number;
  metaDescription: string;
  source: 'wikipedia' | 'web';
  extractedAt: number;
}

export interface ErrorState {
  message: string;
  type: 'validation' | 'network' | 'content' | 'unsupported' | 'cors';
}

export interface HistoryItem {
  url: string;
  title: string;
  domain: string;
  timestamp: number;
}
