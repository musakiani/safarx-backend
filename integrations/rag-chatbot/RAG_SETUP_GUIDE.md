# SafarX RAG Chatbot Setup Guide

## Overview
This guide explains how to set up and run the RAG (Retrieval Augmented Generation) chatbot for SafarX using ChromaDB, Groq API, and transformers.

## Prerequisites
- Node.js installed
- Python installed (for ChromaDB via pip)
- OR Docker installed (alternative to Python)
- PDF file: `safarx_knowledge_base_en.pdf` in backend root

## Step 1: Install Dependencies
Already installed! ✓
- chromadb
- @xenova/transformers
- pdf-parse
- groq-sdk

## Step 2: Configure Environment Variables

Edit `backend/.env`:
```env
# Set to 'true' to enable RAG, 'false' to use basic chat
USE_RAG=true

# Groq API Key (already configured)
GROQ_API_KEY=your_key_here
```

## Step 3: Start ChromaDB

### Option A: Using Docker (Recommended for Windows)
```bash
docker pull chromadb/chroma
docker run -p 8000:8000 chromadb/chroma
```

### Option B: Using Python pip
```bash
pip install chromadb
chroma run --host localhost --port 8000
```

**Note:** ChromaDB npm package doesn't support Windows x64, so use Docker or pip.

## Step 4: Ingest PDF into ChromaDB

**Run this ONLY ONCE** after ChromaDB is running:

```bash
cd backend
npm run ingest
```

This will:
- Read `safarx_knowledge_base_en.pdf`
- Extract and chunk the text
- Generate embeddings
- Store in ChromaDB collection 'safarx_kb'

Expected output:
```
Reading PDF: safarx_knowledge_base_en.pdf
Extracted XXX characters from PDF
Created XX chunks
Loading embedding model: Xenova/all-MiniLM-L6-v2
Generated embeddings for XX/XX chunks
✓ Success!
Total chunks added: XX
```

## Step 5: Start Backend Server

```bash
cd backend
npm run dev
```

The server will:
- Connect to ChromaDB at http://localhost:8000
- Load the embedding model
- Enable RAG mode if `USE_RAG=true`

## Step 6: Test the Chatbot

1. Start your frontend: `cd frontend && npm start`
2. Open the website
3. Click the chat button
4. Ask questions like:
   - "How does SafarX work?"
   - "What are the pricing options?"
   - "How do I track my package?"

## Running Terminals

You need **2 terminals running simultaneously**:

### Terminal 1: ChromaDB
```bash
docker run -p 8000:8000 chromadb/chroma
```
OR
```bash
chroma run --host localhost --port 8000
```

### Terminal 2: Backend Server
```bash
cd backend
npm run dev
```

## Troubleshooting

### ChromaDB Connection Error
- Make sure ChromaDB is running on port 8000
- Check if port 8000 is not being used by another service
- Verify firewall settings

### "No chunks found" Error
- Run `npm run ingest` again
- Check if `safarx_knowledge_base_en.pdf` exists in backend folder
- Ensure PDF has readable text (not scanned images)

### Embedding Model Loading Issues
- First run will download the model (~100MB)
- Requires stable internet connection
- Model is cached after first download

### Disable RAG Mode
If you want to use the chatbot without RAG:
1. Edit `backend/.env`
2. Set `USE_RAG=false`
3. Restart backend server
4. ChatDB not required in this mode

## How RAG Works

1. **User sends message** → Full conversation history sent to `/api/chat`
2. **Extract latest message** → Get the most recent user question
3. **Generate embedding** → Convert question to vector using transformers
4. **Query ChromaDB** → Find top 3 most relevant chunks from PDF
5. **Build context prompt** → Combine SafarX info + retrieved chunks
6. **Call Groq API** → Send prompt + conversation to LLM
7. **Return response** → Send AI reply back to frontend

## Architecture

```
Frontend (React)
    ↓
    POST /api/chat
    { messages: [...] }
    ↓
Backend (Express)
    ↓
    1. Extract latest user message
    2. Generate embedding (@xenova/transformers)
    ↓
ChromaDB (Vector DB)
    ↓
    3. Query top 3 chunks
    4. Return relevant context
    ↓
Backend
    ↓
    5. Build system prompt with context
    6. Call Groq API (llama-3.3-70b-versatile)
    ↓
Groq API (LLM)
    ↓
    7. Generate response
    ↓
Backend → Frontend
    { reply: "..." }
```

## Performance Notes

- **First request**: Slower (~3-5 seconds) - loads embedding model
- **Subsequent requests**: Fast (~1-2 seconds)
- **Model caching**: Embedder loaded once at module level
- **ChromaDB**: In-memory, very fast lookups

## Files Created/Modified

### Created:
- ✓ `scripts/ingestPDF.js` - PDF ingestion script
- ✓ `RAG_SETUP_GUIDE.md` - This guide

### Modified:
- ✓ `backend/controllers/ChatController.js` - RAG implementation
- ✓ `backend/.env` - Added `USE_RAG` flag
- ✓ `backend/package.json` - Added scripts
- ✓ `frontend/src/components/FloatingChatbot/FloatingChatbot.js` - Updated logic
- ✓ `frontend/src/components/FloatingChatbot/FloatingChatbot.css` - Added typing dots

## Next Steps

1. Start ChromaDB
2. Run ingestion (once)
3. Start backend server
4. Test chatbot
5. Monitor logs for any issues

## Support

If you encounter issues:
- Check all terminals for error messages
- Verify environment variables in `.env`
- Ensure all services are running
- Check ChromaDB connection at http://localhost:8000
