# ExamAI

A complete Next.js app based on the supplied UI reference. It has one main upload area for question papers, answer sheets, and handwritten student sheets. The document type is detected automatically. When a handwritten student sheet is detected, the UI asks for the matching question paper before evaluation.

## Features

- One unified primary upload area
- PDF/JPG/JPEG/PNG/WEBP support, multiple pages/files, up to 50 MB total
- Automatic document detection
- Question paper -> model answers for every detected question
- Answer sheet -> correct/incorrect/partial evaluation, corrected answer, explanation, and mistakes
- Handwritten answer sheet + question paper -> question-number matching and evaluation
- Clean report UI with score and per-question feedback
- OpenAI API requests run only in server Route Handlers
- Temporary OpenAI-uploaded PDF files are deleted after each request
- No API-key/security card or decorative quote in the UI

## Run

1. Install Node.js 20+.
2. Install packages:

```bash
npm install
```

3. Create your local environment file:

```bash
cp .env.example .env.local
```

4. Put your OpenAI API key in `.env.local`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6-terra
OPENAI_DETECT_MODEL=gpt-5.6-luna
```

5. Start:

```bash
npm run dev
```

Open http://localhost:3000

## Production

```bash
npm run build
npm start
```

If your hosting provider has its own request-body size limit, configure that provider to allow the file size you want to accept.

## Report history and export

- The app keeps only the latest previous report in the browser (localStorage).
- A newly generated report and the single previous report can both be exported as PDF or printed.
- PDF export is built into the app without adding a heavy PDF package to the main interface.
