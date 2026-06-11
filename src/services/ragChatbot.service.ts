import Groq from 'groq-sdk';
import { ChromaClient } from 'chromadb';
import { pipeline } from '@xenova/transformers';
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

type Embedder = Awaited<ReturnType<typeof pipeline>>;

let groqClient: Groq | null = null;
let chromaClient: ChromaClient | null = null;
let embedder: Embedder | null = null;

function getGroq(): Groq | null {
  if (!config.groqApiKey) return null;
  if (!groqClient) groqClient = new Groq({ apiKey: config.groqApiKey });
  return groqClient;
}

function getChroma(): ChromaClient {
  if (!chromaClient) {
    chromaClient = new ChromaClient({ path: config.chromaUrl });
  }
  return chromaClient;
}

async function getEmbedder(): Promise<Embedder> {
  if (!embedder) {
    console.log('[RAG] Loading embedding model Xenova/all-MiniLM-L6-v2...');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[RAG] Embedding model ready');
  }
  return embedder;
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

async function askEmbeddedRag(params: AskRagParams): Promise<ChatbotResponse> {
  const groq = getGroq();
  if (!groq) {
    return { success: false, message: 'Groq API key is not configured (set GROQ_API_KEY in server/.env)' };
  }

  const history = params.history || [];
  const chatMessages = normalizeMessages([
    ...history,
    { role: 'user' as const, content: params.message },
  ]);

  if (chatMessages.length === 0) {
    return { success: false, message: 'Empty message' };
  }

  const latestUserMessage = chatMessages[chatMessages.length - 1].content;
  const model = await getEmbedder();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = await (model as any)(latestUserMessage, { pooling: 'mean', normalize: true });
  const queryEmbedding = Array.from(output.data as Float32Array);

  let contextChunks: string[] = [];
  try {
    const collection = await getChroma().getCollection({ name: 'safarx_kb' });
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 3,
    });
    if (results.documents?.[0]?.length) {
      contextChunks = results.documents[0].filter(Boolean) as string[];
    }
  } catch (chromaError) {
    console.warn('[RAG] ChromaDB query failed:', (chromaError as Error).message);
  }

  const contextText =
    contextChunks.length > 0
      ? contextChunks.join('\n---\n')
      : 'No specific information found. Advise user to contact support.';

  const systemPrompt = `You are a helpful and friendly customer support assistant for SafarX — Pakistan's AI-powered peer-to-peer intercity courier delivery platform that connects senders with verified travelers for safe, fast, and affordable parcel delivery across Pakistan.

Use ONLY the following knowledge base to answer the user's question:

[CONTEXT START]
${contextText}
[CONTEXT END]

Important rules you must follow:
- Answer ONLY using the information in the context above
- If the context does not contain the answer, say exactly: "I don't have that information right now. Please contact our support team at support@safarx.pk or call 0300-7232799."
- Never make up or guess any information
- Answer in the same language the user is writing in (English or Urdu)
- Keep answers short, clear, and friendly
- Do not mention that you are using a knowledge base or context`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: systemPrompt }, ...chatMessages],
    max_tokens: 500,
    temperature: 0.7,
  });

  const reply = completion?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return { success: false, message: 'Empty response from chatbot' };
  }

  return {
    success: true,
    answer: reply,
    sources: contextChunks,
    conversationId: params.conversationId,
  };
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
  return askExternalRag(params);
}
