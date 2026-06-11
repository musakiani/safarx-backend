# SafarX RAG Chatbot — Setup Guide

## First Time Setup (Run Once)

### Terminal 1 — Start ChromaDB
```bash
npx chromadb@latest
```

### Terminal 2 — Load the PDF Knowledge Base (only once)
Place `safarx_knowledge_base_en.pdf` in the backend root folder, then run:
```bash
npm run ingest
```

### Terminal 3 — Start the Backend Server
```bash
npm run dev
```

## Every Time After That

### Terminal 1
```bash
npx chromadb@latest
```

### Terminal 2
```bash
npm run dev
```

## Troubleshooting

- **If chatbot says "I don't have that information" for everything:**
  ChromaDB is not running or ingest was not done. Run steps above again.

- **If ingest fails:** 
  Make sure the PDF file is in the backend root folder.

- **If Groq returns an error:** 
  Check your GROQ_API_KEY in the .env file.
