const { validationResult } = require('express-validator');
const Groq = require('groq-sdk');
const { ChromaClient } = require('chromadb');
const { pipeline } = require('@xenova/transformers');

// Initialize Groq client
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// Initialize ChromaDB client
const chromaClient = new ChromaClient({ path: 'http://localhost:8000' });

// Lazy loader for embedder (loads on first request)
let embedder = null;
async function getEmbedder() {
  if (!embedder) {
    console.log('Loading embedding model: Xenova/all-MiniLM-L6-v2...');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Embedding model loaded successfully!');
  }
  return embedder;
}

const normalizeMessages = (messages) => messages
  .filter((message) => message && typeof message === 'object')
  .map((message) => ({
    role: ['system', 'user', 'assistant'].includes(message.role) ? message.role : 'user',
    content: typeof message.content === 'string' ? message.content.trim() : ''
  }))
  .filter((message) => message.content.length > 0);

exports.chat = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: errors.array()
      });
    }

    if (!groq) {
      return res.status(500).json({
        error: 'Groq API key is not configured'
      });
    }

    const { messages } = req.body;

    // Validate messages is a non-empty array
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'messages must be a non-empty array'
      });
    }

    const chatMessages = normalizeMessages(messages);

    if (chatMessages.length === 0) {
      return res.status(400).json({
        error: 'messages must contain at least one valid message'
      });
    }

    // Extract the latest user message
    const latestUserMessage = chatMessages[chatMessages.length - 1].content;
    
    // Get embedder (lazy loaded)
    const model = await getEmbedder();

    // Generate embedding for the user message
    const output = await model(latestUserMessage, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(output.data);

    // Get ChromaDB collection and query for relevant chunks
    let contextChunks = [];
    try {
      const collection = await chromaClient.getCollection({ name: 'safarx_kb' });
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: 3
      });

      if (results.documents && results.documents[0] && results.documents[0].length > 0) {
        contextChunks = results.documents[0];
      }
    } catch (chromaError) {
      console.warn('ChromaDB query failed:', chromaError.message);
      contextChunks = [];
    }

    // Build system prompt
    let contextText;
    if (contextChunks.length > 0) {
      contextText = contextChunks.join('\n---\n');
    } else {
      contextText = 'No specific information found. Advise user to contact support.';
    }

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

    // Call Groq API
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatMessages
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const reply = completion?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(500).json({
        error: 'Something went wrong. Please try again.'
      });
    }

    return res.json({
      reply
    });

  } catch (error) {
    console.error('Chat Error:', error);
    console.error('Error details:', error.response?.data || error.message);

    return res.status(500).json({
      error: 'Something went wrong. Please try again.'
    });
  }
};
