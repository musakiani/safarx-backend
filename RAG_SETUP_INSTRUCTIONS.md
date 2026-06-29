# SafarX RAG Chatbot Setup Instructions

## Overview
This guide will help you set up the complete RAG (Retrieval-Augmented Generation) chatbot system for SafarX. The chatbot uses:
- **ChromaDB**: Vector database for storing knowledge base embeddings
- **Xenova Transformers**: Local embedding model (all-MiniLM-L6-v2)
- **Groq API**: LLM for generating responses (llama-3.3-70b-versatile)

## Prerequisites

### Required:
1. **Node.js** (v18 or higher)
2. **Groq API Key** (free from https://console.groq.com)
3. **ChromaDB** (via Docker or Python)

### Optional:
- Docker Desktop (easiest way to run ChromaDB on Windows)

---

## Step-by-Step Setup

### Step 1: Install Dependencies

From the server directory:

```bash
cd d:\safar\server
npm install
```

This will install all required packages including:
- `@xenova/transformers` - Local embedding model
- `chromadb` - Vector database client
- `groq-sdk` - Groq API client
- `pdf-parse` - PDF parsing for knowledge base

---

### Step 2: Get Groq API Key

1. Visit https://console.groq.com
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `gsk_...`)

---

### Step 3: Configure Environment Variables

Edit your `.env` file in the server directory:

```bash
# Required for RAG chatbot
GROQ_API_KEY=gsk_your_actual_key_here

# ChromaDB configuration (defaults shown)
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

**Important**: Replace `gsk_your_actual_key_here` with your actual Groq API key!

---

### Step 4: Start ChromaDB

You need to run ChromaDB in a separate terminal/process. Choose ONE of these options:

#### Option A: Using Docker (Recommended for Windows)

```bash
docker pull chromadb/chroma
docker run -p 8000:8000 chromadb/chroma
```

Keep this terminal running!

#### Option B: Using Python pip

```bash
pip install chromadb
chroma run --host localhost --port 8000
```

Keep this terminal running!

---

### Step 5: Ingest Knowledge Base into ChromaDB

**Run this ONCE** after ChromaDB is running:

```bash
cd d:\safar\server
npm run rag:ingest
```

This script will:
1. Read the knowledge base from `integrations/rag-chatbot/backend/safarx_knowledge_base.txt`
2. Split it into semantic chunks (around 800 characters each)
3. Generate embeddings for each chunk using the Xenova model
4. Store embeddings in ChromaDB collection named `safarx_kb`

**Expected Output:**
```
Reading TXT: ...safarx_knowledge_base.txt
Extracted 45000+ characters from TXT
Created 85 semantic chunks
Loading embedding model: Xenova/all-MiniLM-L6-v2
(First run will download ~100MB model, then cached)

Generating embeddings...
  Progress: 10/85 chunks
  Progress: 20/85 chunks
  ...
  Progress: 85/85 chunks

Connecting to ChromaDB at http://localhost:8000
Created new safarx_kb collection

✅ SUCCESS! Added 85 chunks to ChromaDB

Next steps:
1. Keep ChromaDB running
2. Start your server
3. Test the chatbot in the app
```

**First Run Notes:**
- The first time takes longer (~2-3 minutes) because it downloads the embedding model
- The model (~100MB) is cached in `~/.cache/huggingface/` for future use
- Subsequent runs are much faster (< 30 seconds)

---

### Step 6: Start the Server

```bash
cd d:\safar\server
npm run dev
```

The server will:
- Connect to MongoDB
- Initialize the RAG system
- Check ChromaDB status
- Preload the embedding model
- Start listening on port 5000

**Expected Output:**
```
MongoDB connected
SafarX server running on http://0.0.0.0:5000
[RAG] Initializing RAG system...
[RAG] ✓ ChromaDB is ready with knowledge base
[RAG] Loading embedding model (first time only)...
[RAG] ✓ Embedding model preloaded
[RAG] Initialization complete
```

---

### Step 7: Test the Chatbot

1. Start your mobile app/frontend
2. Navigate to Profile → SafarX Assistant (or the chat icon)
3. Ask questions like:
   - "How do I complete KYC?"
   - "How do I post a parcel?"
   - "How does payment work?"
   - "How do I track my package?"
   - "What is the cancellation policy?"

The chatbot should respond with accurate information from the knowledge base!

---

## Running Terminals Summary

You need **TWO terminals running simultaneously**:

### Terminal 1: ChromaDB
```bash
docker run -p 8000:8000 chromadb/chroma
```

### Terminal 2: SafarX Server
```bash
cd d:\safar\server
npm run dev
```

---

## Troubleshooting

### Error: "ChromaDB is not available"

**Problem**: Server can't connect to ChromaDB

**Solutions**:
1. Make sure ChromaDB is running (check Terminal 1)
2. Verify it's on port 8000: `curl http://localhost:8000`
3. Check firewall settings
4. Verify CHROMA_HOST and CHROMA_PORT in `.env`

---

### Error: "Knowledge base has not been initialized"

**Problem**: ChromaDB is running but has no data

**Solution**: Run the ingestion script:
```bash
npm run rag:ingest
```

---

### Error: "Groq API key is not configured"

**Problem**: GROQ_API_KEY not set in `.env`

**Solution**: 
1. Get API key from https://console.groq.com
2. Add to `.env`: `GROQ_API_KEY=gsk_your_key_here`
3. Restart server

---

### Error: "Failed to load embedding model"

**Problem**: Network issue or missing transformers package

**Solutions**:
1. Check internet connection (needed to download model first time)
2. Reinstall dependencies: `npm install`
3. Clear cache: `rm -rf ~/.cache/huggingface/`
4. Try again - model will redownload

---

### Chatbot returns "I don't have that information"

**Possible Causes**:
1. Question is not covered in knowledge base
2. Query embedding/retrieval failed
3. ChromaDB has no relevant chunks

**Solutions**:
1. Try rephrasing your question
2. Check server logs for RAG errors
3. Verify ChromaDB has data: `npm run rag:ingest` again
4. Contact support@safarx.pk for questions not in KB

---

### Slow First Response (3-5 seconds)

**Explanation**: This is normal! The first request loads the embedding model into memory.

**Solution**: Subsequent requests are much faster (< 2 seconds). The model stays loaded while server runs.

---

### Port 8000 Already in Use

**Problem**: Another process is using port 8000

**Solutions**:
1. Stop other ChromaDB instances
2. Use a different port:
   ```bash
   # In .env
   CHROMA_PORT=8001
   
   # Run ChromaDB on different port
   docker run -p 8001:8000 chromadb/chroma
   ```
3. Find and stop the conflicting process (Windows: `netstat -ano | findstr :8000`)

---

## How the RAG System Works

### Request Flow:

```
1. User asks question in app
   ↓
2. Question sent to /api/chatbot/message
   ↓
3. Server generates embedding for question (using Xenova model)
   ↓
4. Query ChromaDB for top 5 most relevant chunks
   ↓
5. Build context from retrieved chunks
   ↓
6. Send context + question to Groq LLM
   ↓
7. LLM generates response using ONLY the context
   ↓
8. Response sent back to user
```

### Why This Works:

- **Retrieval**: Finds relevant information from knowledge base
- **Augmentation**: Provides context to LLM
- **Generation**: LLM answers using retrieved context
- **Accuracy**: LLM can't hallucinate because it's restricted to context

---

## Performance Metrics

- **First Request**: 3-5 seconds (model loading)
- **Subsequent Requests**: 1-2 seconds
- **Embedding Generation**: ~100ms per query
- **ChromaDB Query**: ~50ms
- **LLM Response**: 500-1000ms
- **Total**: ~1.5 seconds average

---

## Maintenance

### Updating Knowledge Base

When you update `safarx_knowledge_base.txt`:

1. Keep ChromaDB running
2. Run ingestion again:
   ```bash
   npm run rag:ingest
   ```
3. This will delete old collection and create new one
4. Restart not needed - changes take effect immediately

### Monitoring

Check server logs for RAG activity:
```
[RAG] Retrieved 5 relevant chunks for query: "How do I..."
[RAG] Generated response successfully (245 chars, 5 sources)
```

### Clearing ChromaDB

To start fresh:
```bash
npm run rag:ingest
```
This automatically deletes existing collection before creating new one.

---

## Production Deployment

### Recommended Setup:

1. **ChromaDB**: Run as a persistent Docker container
   ```bash
   docker run -d --name safarx-chromadb --restart unless-stopped -p 8000:8000 chromadb/chroma
   ```

2. **Environment Variables**: Use production Groq API key

3. **Knowledge Base**: Keep updated with latest FAQs and docs

4. **Monitoring**: Set up logging and alerts for RAG failures

5. **Backups**: ChromaDB data is in container - consider volume mount for persistence

---

## Advanced Configuration

### Adjusting Retrieval

Edit `src/services/ragChatbot.service.ts`:

```typescript
// Retrieve more chunks (default is 5)
const results = await collection.query({
  queryEmbeddings: [queryEmbedding],
  nResults: 10, // Increase this
});
```

### Adjusting Chunk Size

Edit `scripts/ingestPDF.js`:

```javascript
// Make chunks larger or smaller
function intelligentChunk(text, maxChunkSize = 1200, overlap = 150)
```

### Changing LLM Model

Edit `src/services/ragChatbot.service.ts`:

```typescript
const completion = await groq.chat.completions.create({
  model: 'mixtral-8x7b-32768', // Or another Groq model
  // ...
});
```

---

## Support

If you encounter issues not covered here:

1. Check server logs for detailed error messages
2. Verify all steps were completed
3. Test ChromaDB separately: `curl http://localhost:8000`
4. Contact dev team with error logs

---

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Start ChromaDB (Docker)
docker run -p 8000:8000 chromadb/chroma

# Ingest knowledge base (run once, or when KB changes)
npm run rag:ingest

# Start server
npm run dev

# Test ChromaDB
curl http://localhost:8000

# Check ChromaDB collection
# (requires Python chromadb package)
python -c "from chromadb import HttpClient; print(HttpClient().get_collection('safarx_kb').count())"
```

---

## Files Modified/Created

**Created:**
- `integrations/rag-chatbot/backend/safarx_knowledge_base.txt` - Complete knowledge base
- `RAG_SETUP_INSTRUCTIONS.md` - This file

**Modified:**
- `src/services/ragChatbot.service.ts` - Complete RAG implementation
- `src/index.ts` - RAG system initialization
- `scripts/ingestPDF.js` - Improved ingestion with TXT support
- `package.json` - Added @xenova/transformers dependency

---

## Success Checklist

- [ ] ChromaDB running on port 8000
- [ ] GROQ_API_KEY set in .env
- [ ] Dependencies installed (npm install)
- [ ] Knowledge base ingested (npm run rag:ingest)
- [ ] Server started (npm run dev)
- [ ] Chatbot responds with actual information (not "unavailable")
- [ ] Responses are relevant to questions asked

---

**Last Updated**: 2024
**Version**: 1.0
**Contact**: support@safarx.pk
