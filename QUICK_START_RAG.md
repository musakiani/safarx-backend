# Quick Start: RAG Chatbot (5 Minutes)

Follow these steps to get the SafarX Assistant chatbot working in 5 minutes.

## Step 1: Get Groq API Key (2 minutes)

1. Go to https://console.groq.com
2. Sign up (free)
3. Create API key
4. Copy it (starts with `gsk_...`)

## Step 2: Configure Environment (30 seconds)

Edit `server\.env`:

```env
GROQ_API_KEY=gsk_paste_your_key_here
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

## Step 3: Start ChromaDB (1 minute)

**Open Terminal 1** and run:

```bash
docker run -p 8000:8000 chromadb/chroma
```

Leave this running!

*Don't have Docker? Install from: https://www.docker.com/products/docker-desktop/*

## Step 4: Install Dependencies (1 minute)

**Open Terminal 2**:

```bash
cd d:\safar\server
npm install
```

## Step 5: Ingest Knowledge Base (1 minute)

Still in Terminal 2:

```bash
npm run rag:ingest
```

Wait for success message!

## Step 6: Start Server (30 seconds)

Still in Terminal 2:

```bash
npm run dev
```

Server should show:
```
[RAG] ✓ ChromaDB is ready with knowledge base
[RAG] ✓ Embedding model preloaded
```

## Step 7: Test the Chatbot!

1. Open the SafarX app
2. Go to Profile → SafarX Assistant (or chat icon)
3. Ask: **"How do I complete KYC?"**
4. Should get a detailed answer about KYC process!

---

## Troubleshooting (if something fails)

### "ChromaDB is not available"
- Make sure Terminal 1 is still running ChromaDB
- Check: http://localhost:8000 in browser (should show text)

### "GROQ_API_KEY not configured"
- Check `.env` file has the correct key
- Restart server after editing `.env`

### "Knowledge base has not been initialized"
- Run: `npm run rag:ingest` again
- Make sure ChromaDB is running first

### Still not working?
- Read full guide: `RAG_SETUP_INSTRUCTIONS.md`
- Check server logs for errors
- Ensure both terminals are running

---

## What Questions Can I Ask?

Try these:
- "How do I complete KYC?"
- "How do I post a parcel?"
- "How does payment work?"
- "How do I track my package?"
- "What is the cancellation policy?"
- "How do reviews work?"
- "How do I withdraw money?"
- "What is SafarX?"

The chatbot knows everything in the knowledge base!

---

## Daily Usage

Once set up, you only need:

1. **Start ChromaDB** (Terminal 1):
   ```bash
   docker run -p 8000:8000 chromadb/chroma
   ```

2. **Start Server** (Terminal 2):
   ```bash
   cd d:\safar\server
   npm run dev
   ```

That's it! Knowledge base is already ingested (unless you update it).

---

## Success Checklist

✅ Groq API key added to .env  
✅ ChromaDB running (Terminal 1)  
✅ Knowledge base ingested (ran npm run rag:ingest)  
✅ Server running (Terminal 2)  
✅ Chatbot responds with real information (not "unavailable")  

**All done? You're ready to go! 🚀**
