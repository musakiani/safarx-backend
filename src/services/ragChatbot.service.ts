import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { ChatMessage, ChatbotResponse } from '../types';

interface AskRagParams {
  userId?: string;
  role?: string;
  activeRole?: string;
  message: string;
  conversationId?: string;
  history?: ChatMessage[];
}

interface VectorDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    source: string;
    chunk_index: number;
    length: number;
  };
}

interface VectorStore {
  version: string;
  created: string;
  count: number;
  documents: VectorDocument[];
}

let groqClient: Groq | null = null;
let vectorStore: VectorStore | null = null;

const VECTOR_STORE_PATH = path.resolve(__dirname, '../../knowledge_store.json');

function getGroq(): Groq | null {
  if (!config.groqApiKey) return null;
  if (!groqClient) groqClient = new Groq({ apiKey: config.groqApiKey });
  return groqClient;
}

function loadVectorStore(): VectorStore | null {
  if (vectorStore) return vectorStore;
  
  try {
    if (!fs.existsSync(VECTOR_STORE_PATH)) {
      return null;
    }
    const data = fs.readFileSync(VECTOR_STORE_PATH, 'utf-8');
    vectorStore = JSON.parse(data);
    return vectorStore;
  } catch (error) {
    console.error('[RAG] Failed to load vector store:', error);
    return null;
  }
}

/**
 * Generate embedding vector from text
 */
function embed(text: string): number[] {
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
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Search for most similar documents
 */
function searchSimilar(query: string, topK = 5): string[] {
  const store = loadVectorStore();
  if (!store || store.documents.length === 0) {
    return [];
  }
  
  const queryEmbedding = embed(query);
  
  // Calculate similarities
  const results = store.documents.map(doc => ({
    text: doc.text,
    similarity: cosineSimilarity(queryEmbedding, doc.embedding)
  }));
  
  // Sort by similarity and take top K
  results.sort((a, b) => b.similarity - a.similarity);
  
  return results.slice(0, topK).map(r => r.text);
}

function normalizeMessages(messages: ChatMessage[]) {
  return messages
    .filter((m) => m && typeof m.content === 'string')
    .map((m) => ({
      role: (['system', 'user', 'assistant'].includes(m.role) ? m.role : 'user') as
        | 'system'
        | 'user'
        | 'assistant',
      content: m.content.trim(),
    }))
    .filter((m) => m.content.length > 0);
}

async function checkVectorStore(): Promise<{ available: boolean; hasData: boolean }> {
  try {
    const store = loadVectorStore();
    return {
      available: store !== null,
      hasData: store !== null && store.documents.length > 0
    };
  } catch {
    return { available: false, hasData: false };
  }
}

async function askEmbeddedRag(params: AskRagParams): Promise<ChatbotResponse> {
  const groq = getGroq();
  if (!groq) {
    return {
      success: false,
      message: 'Chatbot is not configured. Please set GROQ_API_KEY in environment variables.',
    };
  }

  // Check vector store availability
  const storeStatus = await checkVectorStore();
  if (!storeStatus.available) {
    console.warn('[RAG] Vector store is not available. Run: npm run rag:ingest');
    return {
      success: false,
      message:
        'Knowledge base is not available. Please run npm run rag:ingest or contact support at support@safarx.pk',
    };
  }

  if (!storeStatus.hasData) {
    console.warn('[RAG] Vector store is empty. Run: npm run rag:ingest');
    return {
      success: false,
      message:
        'Knowledge base has not been initialized. Please run the ingestion script or contact support.',
    };
  }

  const history = params.history || [];
  const chatMessages = normalizeMessages([
    ...history,
    { role: 'user' as const, content: params.message },
  ]);

  if (chatMessages.length === 0) {
    return { success: false, message: 'Empty message received' };
  }

  const latestUserMessage = chatMessages[chatMessages.length - 1].content;

  // Search for similar documents
  let contextChunks: string[] = [];
  try {
    contextChunks = searchSimilar(latestUserMessage, 5);
    console.log(`[RAG] Retrieved ${contextChunks.length} relevant chunks for query: "${latestUserMessage.substring(0, 50)}..."`);
  } catch (searchError) {
    console.error('[RAG] Search failed:', (searchError as Error).message);
    return {
      success: false,
      message: 'Failed to search knowledge base. Please try again.',
    };
  }

  // Build context for LLM
  const hasContext = contextChunks.length > 0;
  const contextText = hasContext
    ? contextChunks.join('\n\n---\n\n')
    : 'No specific information found in knowledge base.';

  const systemPrompt = `You are the SafarX Assistant, a helpful customer support chatbot for SafarX - Pakistan's AI-powered peer-to-peer intercity courier delivery platform.

${
  hasContext
    ? `Use ONLY the following knowledge base information to answer the user's question:\n\n[KNOWLEDGE BASE]\n${contextText}\n[END KNOWLEDGE BASE]`
    : 'The knowledge base did not return relevant information for this query.'
}

IMPORTANT RULES:
1. Answer ONLY using information from the knowledge base above
2. If the knowledge base does not contain the answer, say: "I don't have that specific information in my knowledge base. Please contact our support team at support@safarx.pk or call 0300-7232799 for assistance."
3. NEVER make up information or guess
4. Be conversational, friendly, and helpful
5. Keep answers clear, concise, and to the point
6. If asked about multiple things, address each point
7. Use the same language the user is writing in (English or Urdu)
8. Do not mention that you are using a "knowledge base" or "context" - just answer naturally`;

  // Generate response using Groq
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, ...chatMessages],
      max_tokens: 600,
      temperature: 0.7,
    });

    const reply = completion?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      console.error('[RAG] Empty response from Groq');
      return { success: false, message: 'Failed to generate response. Please try again.' };
    }

    console.log(`[RAG] Generated response successfully (${reply.length} chars, ${contextChunks.length} sources)`);

    return {
      success: true,
      answer: reply,
      sources: hasContext ? contextChunks.map((chunk) => chunk.substring(0, 200) + '...') : [],
      conversationId: params.conversationId || `conv_${Date.now()}`,
    };
  } catch (groqError) {
    console.error('[RAG] Groq API error:', (groqError as Error).message);
    return {
      success: false,
      message: 'AI service is temporarily unavailable. Please try again in a moment.',
    };
  }
}

/** Fallback: proxy to external RAG service when GROQ_API_KEY is not set. */
async function askExternalRag(params: AskRagParams): Promise<ChatbotResponse> {
  const ragUrl = config.ragChatbotUrl.replace(/\/$/, '');
  try {
    const response = await fetch(`${ragUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: normalizeMessages([
          ...(params.history || []),
          { role: 'user', content: params.message },
        ]),
      }),
    });

    if (!response.ok) {
      console.error('[RAG] External service error:', response.status, await response.text());
      return { success: false, message: 'Chatbot service unavailable' };
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      success: true,
      answer: (data.reply as string) || (data.answer as string) || (data.response as string) || '',
      sources: (data.sources as unknown[]) || [],
      conversationId: params.conversationId,
    };
  } catch (err) {
    console.error('[RAG] External service unreachable:', err);
    return { success: false, message: 'Chatbot service unavailable' };
  }
}

export async function askRagChatbot(params: AskRagParams): Promise<ChatbotResponse> {
  if (config.groqApiKey) {
    return askEmbeddedRag(params);
  }
  console.warn('[RAG] GROQ_API_KEY not set, falling back to external service');
  return askExternalRag(params);
}

// Initialize RAG system on server start
export async function initializeRagSystem() {
  if (!config.groqApiKey) {
    console.log('[RAG] Skipping initialization - GROQ_API_KEY not configured');
    return;
  }

  console.log('[RAG] Initializing RAG system...');
  
  // Check vector store
  const storeStatus = await checkVectorStore();
  if (!storeStatus.available) {
    console.warn('[RAG] ⚠️  Vector store not found. Run: npm run rag:ingest');
  } else if (!storeStatus.hasData) {
    console.warn('[RAG] ⚠️  Vector store is empty. Run: npm run rag:ingest');
  } else {
    const store = loadVectorStore();
    console.log(`[RAG] ✓ Vector store ready with ${store?.documents.length} chunks`);
  }

  console.log('[RAG] ✓ Using simple embedding algorithm (no external dependencies)');
  console.log('[RAG] Initialization complete\n');
}
