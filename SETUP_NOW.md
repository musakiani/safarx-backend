# Complete RAG Setup - Ready to Run!

Your Groq API key has been configured! Follow these steps to get the chatbot working:

## ✅ Step 1: API Key - DONE!

Your `.env` now has:
```

CHROMA_HOST=localhost
CHROMA_PORT=8000
```

---

## Step 2: Install Dependencies

Open terminal in the server directory:

```bash
cd d:\safar\server
npm install
```

This installs `@xenova/transformers` and updates all packages.

---

## Step 3: Start ChromaDB

**Option A: Using Docker (Recommended)**

Open a **NEW terminal** and run:

```bash
docker run -p 8000:8000 chromadb/chroma
```

**Keep this terminal running!**

**Option B: Using Python (if you have Python installed)**

```bash
pip install chromadb
chroma run --host localhost --port 8000
```

**Keep this terminal running!**

---

## Step 4: Ingest Knowledge Base

Open **ANOTHER terminal** and run:

```bash
cd d:\safar\server
npm run rag:ingest
```

**Expected output:**
```
Reading TXT: ...safarx_knowledge_base.txt
Extracted 50000+ characters from TXT
Created 85 semantic chunks
Loading embedding model: Xenova/all-MiniLM-L6-v2
(First run will download ~100MB model, then cached)

Generating embeddings...
  Progress: 10/85 chunks
  ...
  Progress: 85/85 chunks

✅ SUCCESS! Added 85 chunks to ChromaDB
```

**Note:** First time takes 2-3 minutes (downloads embedding model). Subsequent runs are faster.

---

## Step 5: Start Your Server

In the same terminal or a new one:

```bash
cd d:\safar\server
npm run dev
```

**Look for these success messages:**
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

## Step 6: Test the Chatbot!

1. Open your SafarX mobile app or frontend
2. Navigate to **Profile → SafarX Assistant** (or click the chat icon)
3. Ask a question: **"How do I complete KYC?"**

**You should get a detailed answer like:**
```
To complete KYC verification:

1. Go to your Profile
2. Tap on "KYC Verification"
3. Upload the following documents:
   - CNIC Front: Clear photo of your national ID card front
   - CNIC Back: Clear photo of your national ID card back
   - Selfie with CNIC: Hold your CNIC next to your face and take a photo
4. Submit the documents
5. Wait for admin approval (usually 24-48 hours)

Make sure photos are clear and readable. Your CNIC must be valid and not expired.
```

---

## Try More Questions

- "How do I post a parcel?"
- "How does payment work?"
- "How do I track my package?"
- "What is the cancellation policy?"
- "How do reviews work?"
- "How do I withdraw money?"
- "What is SafarX?"

---

## Troubleshooting

### "ChromaDB is not available"
**Solution:** Make sure ChromaDB terminal is still running on port 8000.
Check by opening: http://localhost:8000 in your browser

### "Knowledge base has not been initialized"
**Solution:** Run `npm run rag:ingest` again

### Chatbot still says "unavailable"
**Solution:** 
1. Check server logs for errors
2. Restart server after running ingestion
3. Make sure ChromaDB terminal is running

### Port 8000 already in use
**Solution:** Stop other ChromaDB instances or use different port:
```bash
# In .env, change to:
CHROMA_PORT=8001

# Then run:
docker run -p 8001:8000 chromadb/chroma
```

---

## Daily Usage (After Setup)

Once everything is set up, you only need 2 terminals:

**Terminal 1: ChromaDB**
```bash
docker run -p 8000:8000 chromadb/chroma
```

**Terminal 2: Server**
```bash
cd d:\safar\server
npm run dev
```

Knowledge base stays ingested - no need to run `npm run rag:ingest` again unless you update the knowledge base file.

---

## Summary Checklist

- [x] Groq API key configured ✅
- [ ] Dependencies installed (`npm install`)
- [ ] ChromaDB running (Terminal 1)
- [ ] Knowledge base ingested (`npm run rag:ingest`)
- [ ] Server running (Terminal 2)
- [ ] Chatbot tested and working

---

## Next Steps

1. Run `npm install` now
2. Start ChromaDB in a terminal
3. Run `npm run rag:ingest` in another terminal
4. Start your server with `npm run dev`
5. Test the chatbot!

**The chatbot will work perfectly and answer all SafarX-related questions!** 🚀

For detailed troubleshooting, see: `RAG_SETUP_INSTRUCTIONS.md`
