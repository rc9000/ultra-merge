# ultra-merge

ultra-merge is a trustworthy tool to merge multiple documents into a single PDF online. It uses `pdfunite` under the hood, supports drag-and-drop uploads (up to 42 files), and can insert blank pages between pages before downloading the merged result.

Supports various inputs:

 * pdf
 * jpeg
 * png
 * txt

## Requirements

- Node.js 24+
- `pdfunite` (from `poppler-utils`)
- `ghostscript` (for blank-page generation)
- `img2pdf` (for JPEG/PNG inputs)
- `enscript` (for TXT inputs)

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
