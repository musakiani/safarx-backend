# SafarX RAG Implementation Package

## 📦 What's Included

This package contains the complete RAG (Retrieval Augmented Generation) implementation for the SafarX chatbot system.

### Backend Files:
- `backend/controllers/ChatController.js` - Main RAG logic with ChromaDB integration
- `backend/scripts/ingestPDF.js` - PDF ingestion script for loading knowledge base
- `backend/routes/publicRoutes.js` - API routes (for reference)
- `backend/.env.example` - Environment variables template
- `backend/package.json` - Dependencies and scripts
- `backend/RAG_SETUP.md` - Detailed setup guide

### Frontend Files:
- `frontend/src/components/FloatingChatbot/FloatingChatbot.js` - Chat UI component
- `frontend/src/components/FloatingChatbot/FloatingChatbot.css` - Styling with typing animation
- `frontend/src/services/api.js` - API service layer

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install chromadb@3.4.3 @xenova/transformers@2.17.2 pdf-parse@1.1.1 groq-sdk@0.30.0 dotenv@16.6.1
```

### 2. Configure Environment

Rename `backend/.env.example` to `backend/.env` and add your Groq API key:
```env
GROQ_API_KEY=your_actual_groq_api_key_here
```

### 3. Place Your PDF

Put your knowledge base PDF file named `safarx_knowledge_base_en.pdf` in the `backend/` folder.

### 4. Start ChromaDB

**Option A: Using Python pip (Recommended for Windows)**
```bash
pip install chromadb
chroma run --host localhost --port 8000
```

**Option B: Using Docker**
```bash
docker run -p 8000:8000 chromadb/chroma
```

### 5. Ingest PDF (Run Once)

```bash
cd backend
npm run ingest
```

### 6. Start Backend Server

```bash
cd backend
npm run dev
```

## 📋 Integration Steps

### Backend Integration:

1. **Copy ChatController.js**
   - Replace your existing `backend/controllers/ChatController.js` with the one from this package
   - OR merge the RAG logic into your existing controller

2. **Copy ingestPDF.js**
   - Place `backend/scripts/ingestPDF.js` in your project's `backend/scripts/` folder

3. **Update package.json**
   - Add the scripts from this package's `backend/package.json`:
   ```json
   "scripts": {
     "ingest": "node scripts/ingestPDF.js ./safarx_knowledge_base_en.pdf",
     "start:chroma": "npx chromadb@latest"
   }
   ```

4. **Update .env**
   - Add ChromaDB configuration:
   ```env
   CHROMA_HOST=localhost
   CHROMA_PORT=8000
   GROQ_API_KEY=your_key_here
   ```

### Frontend Integration:

1. **Copy Chatbot Component**
   - Replace your existing `FloatingChatbot.js` and `FloatingChatbot.css`
   - OR review the changes and merge them into your existing component

2. **Verify API Service**
   - Check that your `api.js` has the `chatAPI.sendMessage()` function
   - It should POST to `/api/chat` with `{ messages: [...] }`

## 🔧 Key Features

- **Vector Search**: Uses ChromaDB for semantic search
- **Embeddings**: Xenova/all-MiniLM-L6-v2 model for generating embeddings
- **LLM**: Groq API with llama-3.3-70b-versatile model
- **Context-Aware**: Retrieves top 3 relevant chunks from knowledge base
- **Bilingual**: Supports English and Urdu responses
- **Real-time**: Animated typing indicators and smooth UX

## 📚 How It Works

```
User Question
    ↓
Generate Embedding
    ↓
Query ChromaDB (Top 3 Chunks)
    ↓
Build Context Prompt
    ↓
Call Groq API
    ↓
Return Response
```

## 🛠️ Dependencies

### Backend:
- `chromadb`: Vector database for storing embeddings
- `@xenova/transformers`: Generate embeddings from text
- `pdf-parse`: Extract text from PDF files
- `groq-sdk`: Call Groq LLM API
- `dotenv`: Load environment variables

### Frontend:
- No new dependencies needed (uses existing React setup)

## 📝 File Structure

```
RAG_Implementation_Package/
├── backend/
│   ├── controllers/
│   │   └── ChatController.js
│   ├── scripts/
│   │   └── ingestPDF.js
│   ├── routes/
│   │   └── publicRoutes.js
│   ├── .env.example
│   ├── package.json
│   └── RAG_SETUP.md
├── frontend/
│   └── src/
│       ├── components/
│       │   └── FloatingChatbot/
│       │       ├── FloatingChatbot.js
│       │       └── FloatingChatbot.css
│       └── services/
│           └── api.js
├── RAG_SETUP_GUIDE.md
└── README.md (this file)
```

## ⚠️ Important Notes

1. **ChromaDB on Windows**: The npm package doesn't work on Windows x64. Use Python pip or Docker instead.

2. **First Request**: The first chat request will be slower (~3-5 seconds) as it loads the embedding model. Subsequent requests are faster.

3. **PDF Ingestion**: Only run `npm run ingest` once, or when you update the PDF file.

4. **Model Version**: Using `llama-3.3-70b-versatile` as the older `llama3-8b-8192` was decommissioned.

5. **API Key**: Make sure to add your actual Groq API key to `.env` file.

## 🐛 Troubleshooting

**Chatbot says "I don't have that information" for everything:**
- ChromaDB is not running
- PDF ingestion wasn't completed
- Run the ingest script again

**Ingest fails:**
- Make sure PDF file is in backend root folder
- Check ChromaDB is running on port 8000
- Verify pdf-parse version is 1.1.1

**Groq API errors:**
- Check GROQ_API_KEY in .env file
- Verify your API key is valid
- Check rate limits

## 📞 Support

For detailed setup instructions, refer to:
- `RAG_SETUP_GUIDE.md` - Complete setup walkthrough
- `backend/RAG_SETUP.md` - Quick reference guide

## 📄 License

This implementation is part of the SafarX project.

---

**Built with:** Node.js, Express, React, ChromaDB, Groq API, Transformers.js
