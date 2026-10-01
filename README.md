# Article Information Extractor

A React + TypeScript app that extracts article metadata and readable section headings from a URL, including support for Wikipedia pages and general web articles.

## Features

- Paste any article URL and extract the article title, domain, and section headings
- Detect and handle Wikipedia articles with a dedicated extraction path
- Validate article URLs before processing
- Show loading, empty, and error states for a smoother user experience
- Keep recent searches in local storage
- Toggle between light and dark themes

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React

## Project Structure

```text
src/
  App.tsx
  main.tsx
  types.ts
  lib/
    articleExtractor.ts
    urlValidation.ts
```

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open the local URL shown in the terminal, typically:

```text
http://localhost:5173
```

## Available Scripts

```bash
npm run dev     # start the Vite dev server
npm run build   # create a production build
npm run preview # preview the production app locally
npm run lint    # run ESLint checks
```

## How It Works

The app validates the incoming URL and sends it through a content extraction pipeline:

- Wikipedia URLs use a Wikipedia API-based parser
- Other URLs are fetched through a proxy flow and parsed using the browser DOM
- The app extracts key details like title, metadata, reading time, section headings, and article metrics

## Notes

This project uses browser-based fetching and proxy fallback logic to work around CORS or blocked content restrictions on some sites.

## License

This project is for personal or educational use.
