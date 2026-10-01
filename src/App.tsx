import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Moon,
  RotateCcw,
  Search,
  Sun,
} from 'lucide-react';
import { extractArticle } from './lib/articleExtractor';
import { getDomain, isValidHttpUrl } from './lib/urlValidation';
import type { ArticleData, ErrorState, HistoryItem, Theme } from './types';

const STORAGE_KEY = 'article-extractor-history';

function App() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('article-extractor-theme') as Theme | null;
    const savedHistory = localStorage.getItem(STORAGE_KEY);

    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }

    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory) as HistoryItem[];
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('article-extractor-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const addToHistory = (item: ArticleData) => {
    const next = [{ url: item.url, title: item.title, domain: item.domain, timestamp: item.extractedAt }, ...history.filter((entry) => entry.url !== item.url)].slice(0, 8);
    setHistory(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const handleLoad = async (candidate: string) => {
    const trimmed = candidate.trim();
    if (!trimmed) {
      setError({ message: 'Please paste a URL before submitting.', type: 'validation' });
      return;
    }

    if (!isValidHttpUrl(trimmed)) {
      setError({ message: 'Please enter a valid URL beginning with http:// or https://.', type: 'validation' });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await extractArticle(trimmed);
      setArticleData(data);
      setUrl(data.url);
      addToHistory(data);
    } catch (errorValue) {
      const message = errorValue instanceof Error ? errorValue.message : 'An unexpected error occurred while extracting the article.';
      const type: ErrorState['type'] =
        message.includes('valid URL')
          ? 'validation'
          : message.includes('blocked') || message.includes('CORS') || message.includes('unavailable')
            ? 'cors'
            : message.includes('could not be found') || message.includes('No readable article')
              ? 'content'
              : 'network';

      setError({ message, type });
      setArticleData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleLoad(url);
  };

  const handleHistoryClick = async (item: HistoryItem) => {
    setUrl(item.url);
    await handleLoad(item.url);
  };

  const handleReset = () => {
    setUrl('');
    setArticleData(null);
    setError(null);
    setSearchTerm('');
  };

  const filteredSections = articleData?.sections.filter((section) => section.toLowerCase().includes(searchTerm.toLowerCase())) ?? [];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-50' : 'bg-slate-100 text-slate-900'}`}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/30">
              <Globe className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Joshua</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Article Information Extractor</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition hover:scale-[1.02] ${
              theme === 'dark' ? 'border-slate-700 bg-slate-900 text-amber-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>

        {!articleData && !error && (
          <section className={`rounded-3xl border p-6 shadow-sm sm:p-8 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="article-url" className={`mb-2 block text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                  Article URL
                </label>
                <div className="relative">
                  <Search className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`} />
                  <input
                    id="article-url"
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://en.wikipedia.org/wiki/Example or https://example.com/article"
                    className={`w-full rounded-2xl border bg-transparent py-4 pl-12 pr-4 text-base outline-none transition focus:border-sky-500 ${
                      theme === 'dark' ? 'border-slate-700 bg-slate-950 text-slate-50 placeholder:text-slate-500' : 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>

              {history.length > 0 && (
                <div className="space-y-3">
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Recent pages</p>
                  <div className="flex flex-wrap gap-2">
                    {history.map((item) => (
                      <button
                        key={`${item.url}-${item.timestamp}`}
                        type="button"
                        onClick={() => void handleHistoryClick(item)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                          theme === 'dark' ? 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Extracting...
                  </>
                ) : (
                  <>
                    Extract information
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {error && (
          <section className={`rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm ${theme === 'dark' ? 'border-red-900/80 bg-slate-900 text-red-100' : 'bg-red-50 text-red-900'}`}>
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-950 dark:text-red-300">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">Unable to extract this article</h2>
                <p className="mt-2 text-sm leading-6 opacity-90">{error.message}</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Try another URL
                </button>
              </div>
            </div>
          </section>
        )}

        {articleData && (
          <main className="space-y-8">
            <section className={`rounded-3xl border p-6 shadow-sm sm:p-8 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'}`}>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-sky-300' : 'text-sky-700'}`}>
                      {articleData.source === 'wikipedia' ? 'Wikipedia article' : 'Web article'}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{articleData.title}</h2>
                    <div className={`mt-3 flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>
                      <Globe className="h-4 w-4" />
                      <span>{getDomain(articleData.url)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(articleData.url)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${theme === 'dark' ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    <Copy className="h-4 w-4" />
                    Copy URL
                  </button>
                  <a href={articleData.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500">
                    Open
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Words" value={articleData.wordCount.toLocaleString()} theme={theme} tone="sky" />
                <StatCard label="Reading time" value={`${articleData.readingTime} min`} theme={theme} tone="emerald" />
                <StatCard label="Images" value={articleData.imageCount.toString()} theme={theme} tone="violet" />
                <StatCard label="Links" value={articleData.linkCount.toString()} theme={theme} tone="amber" />
              </div>

              {articleData.metaDescription && (
                <div className={`mt-6 rounded-2xl border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-950/60' : 'border-sky-100 bg-sky-50'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-sky-300' : 'text-sky-700'}`}>Summary</p>
                  <p className={`mt-2 text-sm leading-6 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{articleData.metaDescription}</p>
                </div>
              )}
            </section>

            <section className={`rounded-3xl border p-6 shadow-sm sm:p-8 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'}`}>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-violet-300' : 'text-violet-700'}`}>Extracted structure</p>
                  <h3 className="mt-2 text-xl font-semibold">Headings and topics</h3>
                </div>

                <label className="relative block w-full max-w-sm">
                  <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Filter headings"
                    className={`w-full rounded-xl border bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-sky-500 ${
                      theme === 'dark' ? 'border-slate-700 text-slate-50 placeholder:text-slate-500' : 'border-slate-300 text-slate-800 placeholder:text-slate-400'
                    }`}
                  />
                </label>
              </div>

              {filteredSections.length === 0 ? (
                <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>No headings matched this filter.</p>
              ) : (
                <div className="grid gap-3">
                  {filteredSections.map((section, index) => (
                    <div key={`${section}-${index}`} className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${theme === 'dark' ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-xs font-semibold text-white">{index + 1}</span>
                        <span className={`truncate text-sm font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{section}</span>
                      </div>
                      <button type="button" onClick={() => void navigator.clipboard.writeText(section)} className={`rounded-lg p-2 transition ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-200'}`} aria-label={`Copy heading ${section}`}>
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button type="button" onClick={handleReset} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110">
                <RotateCcw className="h-5 w-5" />
                Analyze another article
              </button>

              <button
                type="button"
                onClick={() => {
                  const csv = ['Title,URL,Domain,WordCount,ReadTime,Images,Links,Sections', `"${articleData.title}","${articleData.url}","${articleData.domain}",${articleData.wordCount},${articleData.readingTime},${articleData.imageCount},${articleData.linkCount},"${articleData.sections.join('; ')}"`].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  const objectUrl = URL.createObjectURL(blob);
                  link.href = objectUrl;
                  link.download = `${articleData.title.replace(/\W+/g, '-').toLowerCase() || 'article'}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(objectUrl);
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 font-semibold ${theme === 'dark' ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
              >
                <Download className="h-5 w-5" />
                Export CSV
              </button>
            </div>
          </main>
        )}

        <footer className={`mt-14 border-t pt-6 text-center text-sm ${theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
          Joshua Article Information Extractor • Structured extraction for public web pages
        </footer>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, theme }: { label: string; value: string; tone: 'sky' | 'emerald' | 'violet' | 'amber'; theme: Theme }) {
  const palette = {
    sky: 'from-sky-500 to-cyan-500',
    emerald: 'from-emerald-500 to-teal-500',
    violet: 'from-violet-500 to-purple-500',
    amber: 'from-amber-500 to-orange-500',
  } as const;

  return (
    <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
      <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-r ${palette[tone]} p-2 text-white`}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default App;