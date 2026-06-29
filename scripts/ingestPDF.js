/**
 * Ingest SafarX knowledge-base into JSON-based vector store.
 * No external dependencies - just files!
 * Run: npm run rag:ingest
 */
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
require('dotenv').config();

const KNOWLEDGE_DIR = path.resolve(__dirname, '../integrations/rag-chatbot/backend');
const PDF_PATH = path.join(KNOWLEDGE_DIR, 'safarx_knowledge_base_en.pdf');
const TXT_PATH = path.join(KNOWLEDGE_DIR, 'safarx_knowledge_base.txt');
const VECTOR_STORE_PATH = path.resolve(__dirname, '../knowledge_store.json');

/**
 * Generate embedding vector from text
 */
function embed(text) {
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/).slice(0, 100);
  
  const embedding = new Array(384).fill(0);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j);
      const index = (charCode + i + j) % 384;
      embedding[index] += (charCode / 255);
    }
  }
  
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
}

/**
 * Split text into semantic chunks
 */
function intelligentChunk(text, maxChunkSize = 800) {
  const sections = text.split(/(?=^#{1,3}\s)/gm);
  const chunks = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxChunkSize) {
      chunks.push(trimmed);
    } else {
      const paragraphs = trimmed.split('\n\n');
      let currentChunk = '';

      for (const para of paragraphs) {
        if ((currentChunk + '\n\n' + para).length <= maxChunkSize) {
          currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = para;
        }
      }

      if (currentChunk) chunks.push(currentChunk.trim());
    }
  }

  return chunks.filter((c) => c.length >= 50);
}

async function extractText() {
  if (fs.existsSync(PDF_PATH)) {
    console.log(`Reading PDF: ${PDF_PATH}`);
    const dataBuffer = fs.readFileSync(PDF_PATH);
    const pdfData = await pdf(dataBuffer);
    return { text: pdfData.text, source: 'PDF' };
  }

  if (fs.existsSync(TXT_PATH)) {
    console.log(`Reading TXT: ${TXT_PATH}`);
    const text = fs.readFileSync(TXT_PATH, 'utf-8');
    return { text, source: 'TXT' };
  }

  throw new Error(`Knowledge base not found.`);
}

async function ingestKnowledgeBase() {
  try {
    // Check Groq API key
    if (!process.env.GROQ_API_KEY) {
      console.error('\n❌ GROQ_API_KEY not found in .env file');
      console.error('Please add your Groq API key to .env');
      process.exit(1);
    }

    const { text, source } = await extractText();
    console.log(`Extracted ${text.length} characters from ${source}`);

    const chunks = intelligentChunk(text);
    console.log(`Created ${chunks.length} semantic chunks`);

    if (chunks.length === 0) {
      console.error('No valid chunks found');
      process.exit(1);
    }

    console.log('\nGenerating embeddings...');
    const documents = chunks.map((chunk, i) => {
      const embedding = embed(chunk);
      if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
        console.log(`  Progress: ${i + 1}/${chunks.length} chunks`);
      }
      return {
        id: `chunk_${i}`,
        text: chunk,
        embedding: embedding,
        metadata: {
          source: source === 'PDF' ? 'safarx_knowledge_base_en.pdf' : 'safarx_knowledge_base.txt',
          chunk_index: i,
          length: chunk.length,
        }
      };
    });

    // Save to JSON file
    console.log(`\nSaving to ${VECTOR_STORE_PATH}...`);
    const vectorStore = {
      version: '1.0',
      created: new Date().toISOString(),
      count: documents.length,
      documents: documents
    };

    fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(vectorStore, null, 2), 'utf-8');

    console.log(`\n✅ SUCCESS! Added ${chunks.length} chunks to vector store`);
    console.log(`\nData stored in: ${VECTOR_STORE_PATH}`);
    console.log(`File size: ${(fs.statSync(VECTOR_STORE_PATH).size / 1024 / 1024).toFixed(2)} MB`);
    console.log('\n✓ Knowledge base is ready!');
    console.log('\nNext step: npm run dev\n');
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('\nFull error:', err);
    process.exit(1);
  }
}

ingestKnowledgeBase().catch((err) => {
  console.error(err);
  process.exit(1);
});
