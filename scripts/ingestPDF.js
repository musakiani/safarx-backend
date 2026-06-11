/**
 * Ingest SafarX knowledge-base PDF into ChromaDB.
 * Run once after starting ChromaDB: npm run rag:ingest
 */
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { pipeline } = require('@xenova/transformers');
const { ChromaClient } = require('chromadb');

const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = process.env.CHROMA_PORT || '8000';
const DEFAULT_PDF = path.resolve(
  __dirname,
  '../integrations/rag-chatbot/backend/safarx_knowledge_base_en.pdf'
);

async function ingestPDF() {
  const pdfPath = process.argv[2] || process.env.RAG_KNOWLEDGE_PDF || DEFAULT_PDF;

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    console.error('Place safarx_knowledge_base_en.pdf in server/integrations/rag-chatbot/backend/');
    process.exit(1);
  }

  console.log(`Reading PDF: ${pdfPath}`);
  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfData = await pdf(dataBuffer);
  const text = pdfData.text;
  console.log(`Extracted ${text.length} characters`);

  const rawChunks = text.split('\n\n');
  const chunks = rawChunks.map((c) => c.trim()).filter((c) => c.length >= 50);
  console.log(`Created ${chunks.length} chunks`);

  if (chunks.length === 0) {
    console.error('No valid chunks found');
    process.exit(1);
  }

  console.log('Loading embedding model...');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  const embeddings = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Embedding chunk ${i + 1}/${chunks.length}`);
    const output = await extractor(chunks[i], { pooling: 'mean', normalize: true });
    embeddings.push(Array.from(output.data));
  }

  const chromaUrl = `http://${CHROMA_HOST}:${CHROMA_PORT}`;
  console.log(`Connecting to ChromaDB at ${chromaUrl}`);
  const client = new ChromaClient({ path: chromaUrl });

  try {
    await client.deleteCollection({ name: 'safarx_kb' });
    console.log('Deleted existing safarx_kb collection');
  } catch {
    console.log('No existing collection to delete');
  }

  const collection = await client.createCollection({ name: 'safarx_kb' });
  await collection.add({
    ids: chunks.map((_, i) => `chunk_${i}`),
    embeddings,
    documents: chunks,
    metadatas: chunks.map((chunk, i) => ({
      source: path.basename(pdfPath),
      chunk_index: i,
      length: chunk.length,
    })),
  });

  console.log(`Done! ${chunks.length} chunks added to safarx_kb`);
}

ingestPDF().catch((err) => {
  console.error(err);
  process.exit(1);
});
