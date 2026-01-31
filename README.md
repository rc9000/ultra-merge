# ultra-merge

ultra-merge is a trustworthy tool to merge PDFs online. It uses `pdfunite` under the hood, supports drag-and-drop uploads (up to 42 files), and can insert blank pages between PDFs before downloading the merged result.

## Requirements

- Node.js 24+
- `pdfunite` (from `poppler-utils`)
- `ghostscript` (for blank-page generation)

## Local development

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Docker

Build and run locally:

```bash
docker build -t ultra-merge:local .
docker run --rm -p 3000:3000 ultra-merge:local
```

Run tests inside the image:

```bash
docker run --rm ultra-merge:local npm test
```

## Tests

```bash
npm test
```
