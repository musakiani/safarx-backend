# SafarX RAG Chatbot — Integration Location

Place your RAG package files here:

```
server/integrations/rag-chatbot/
├── backend/
│   ├── safarx_knowledge_base_en.pdf   ← your knowledge-base PDF
│   └── controllers/ChatController.js  (reference copy)
├── frontend/                          (reference web UI — not used by mobile)
├── README.md
└── RAG_SETUP_GUIDE.md
```

The **SafarX Express server embeds RAG directly** in `server/src/services/ragChatbot.service.ts`.
The mobile app calls `POST /api/chatbot/message` — it never talks to ChromaDB or Groq directly.

## Setup (one-time)

### 1. Environment (`server/.env`)

```env
GROQ_API_KEY=your_groq_api_key
CHROMA_HOST=localhost
CHROMA_PORT=8000
# Optional — path to PDF if not in default location:
# RAG_KNOWLEDGE_PDF=e:/safar/server/integrations/rag-chatbot/backend/safarx_knowledge_base_en.pdf
```

### 2. Install server dependencies

```powershell
cd e:\safar\server
npm install
```

### 3. Start ChromaDB (separate terminal)

```powershell
pip install chromadb
chroma run --host localhost --port 8000
```

Or with Docker: `docker run -p 8000:8000 chromadb/chroma`

### 4. Put your PDF

Copy `safarx_knowledge_base_en.pdf` to:
`server/integrations/rag-chatbot/backend/safarx_knowledge_base_en.pdf`

### 5. Ingest knowledge base (run once, or when PDF changes)

```powershell
cd e:\safar\server
npm run rag:ingest
```

### 6. Start SafarX server

```powershell
npm run dev
```

## How it works

```
Mobile → POST /api/chatbot/message → ragChatbot.service.ts
  → ChromaDB (top 3 chunks) + Groq llama-3.3-70b → reply
```

If `GROQ_API_KEY` is empty, the server falls back to `RAG_CHATBOT_URL` (external service).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Chatbot unavailable" | Check `GROQ_API_KEY`, ChromaDB running, ingest completed |
| All answers "I don't have that information" | Run `npm run rag:ingest` again |
| First message slow (~5s) | Normal — embedding model loads on first request |
