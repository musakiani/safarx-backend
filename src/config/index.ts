import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safarx',
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  platformCommissionRate: parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.10'),
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  ragChatbotUrl: process.env.RAG_CHATBOT_URL || 'http://localhost:7000',
  groqApiKey: process.env.GROQ_API_KEY || '',
  chromaHost: process.env.CHROMA_HOST || 'localhost',
  chromaPort: parseInt(process.env.CHROMA_PORT || '8000', 10),
  chromaUrl: `http://${process.env.CHROMA_HOST || 'localhost'}:${process.env.CHROMA_PORT || '8000'}`,
  ragKnowledgePdf: process.env.RAG_KNOWLEDGE_PDF || path.resolve(__dirname, '../../integrations/rag-chatbot/backend/safarx_knowledge_base_en.pdf'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:8081',
  uploadDir: path.resolve(__dirname, '../uploads'),
  isEmailConfigured: Boolean(process.env.EMAIL_USER),
};
