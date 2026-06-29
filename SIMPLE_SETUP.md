# Simple 2-Step Setup (No Docker/Python Needed!)

I've updated the system to use **persistent file storage** instead of a ChromaDB server. This means:
- ✅ No Docker needed
- ✅ No Python needed
- ✅ No separate ChromaDB server
- ✅ Just 2 commands!

---

## Step 1: Ingest Knowledge Base

```bash
cd d:\safar\server
npm run rag:ingest
```

**Expected output:**
```
Reading TXT: ...safarx_knowledge_base.txt
Extracted 20286 characters from TXT
Created 65 semantic chunks
Loading embedding model: Xenova/all-MiniLM-L6-v2
(First run will download ~100MB model, then cached)

Generating embeddings...
  Progress: 10/65 chunks
  ...
  Progress: 65/65 chunks

Connecting to ChromaDB (persistent storage)...
Created new safarx_kb collection

✅ SUCCESS! Added 65 chunks to ChromaDB

Data stored in: D:\safar\server\chroma_data
```

**Note:** First run takes 2-3 minutes to download the embedding model (~100MB). It's cached for future use.

---

## Step 2: Start Server

```bash
npm run dev
```

**Expected output:**
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

## Step 3: Test!

1. Open SafarX app
2. Go to **Profile → SafarX Assistant**
3. Ask: **"How do I complete KYC?"**
4. Get detailed answer!

---

## That's It!

The knowledge base is stored in `d:\safar\server\chroma_data\` and persists between runs.

**You only need to run `npm run rag:ingest` once** (or when you update the knowledge base).

Daily usage: Just run `npm run dev` - that's it!

---

## Troubleshooting

### Still getting errors?

1. **Delete chroma_data folder and try again:**
   ```bash
   rmdir /s /q d:\safar\server\chroma_data
   npm run rag:ingest
   ```

2. **Check you have npm packages:**
   ```bash
   npm install
   ```

3. **Look for specific error in logs**

---

## What Changed?

Before: Required Docker/Python + ChromaDB server running  
Now: Uses persistent file storage (no server needed!)

The chatbot works exactly the same, just easier to set up! 🚀
