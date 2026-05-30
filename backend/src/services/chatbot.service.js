'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

const SYSTEM_INSTRUCTION = `You are Hirftna's assistant, a helpful guide for an Algerian handcraft marketplace.
Your role:
- Help users find products and understand categories
- Explain how the custom order process works (client requests → seller accepts/rejects → marks ready → client confirms → both rate)
- Answer questions about the platform features (wishlist, reviews, ratings, notifications)
- Be friendly, concise, and helpful
- Respond in the same language the user writes in (Arabic, French, or English)

You must NOT:
- Negotiate prices between buyers and sellers
- Place orders on behalf of users
- Share personal information about other users
- Discuss topics unrelated to the platform or Algerian handicrafts
- Make up information about specific products or sellers`;

let genAI = null;

function getClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || global.process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      logger.error('⚠️ CONFIGURATION CRITICAL: GEMINI_API_KEY could not be read from process.env.');
      throw new AppError('Chatbot configuration is missing from environmental variables.', 503);
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function buildCombinedContents(history = [], currentMessage) {
  const contents = [];

  if (Array.isArray(history) && history.length > 0) {
    history.forEach((turn) => {
      if (turn.content && turn.content.trim() !== '') {
        contents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content.trim() }]
        });
      }
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: currentMessage.trim() }]
  });

  return contents;
}

const sendMessage = async ({ message, conversation_history }) => {
  try {
    const client = getClient();
    
    const model = client.getGenerativeModel({
     model: 'gemini-3.5-flash', 
    });

    const structuredContents = buildCombinedContents(conversation_history, message);

    const result = await model.generateContent({
      contents: structuredContents,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const response = await result.response;
    const reply = response.text();

    if (!reply || reply.trim() === '') {
      throw new Error('Google Gemini API returned an empty text token payload.');
    }

    logger.info({ message: 'Chatbot message processed successfully.', length: message.length });
    return reply;

  } catch (err) {
    if (err instanceof AppError) throw err;

    logger.error({ message: 'Chatbot error', error: err.message });

    if (err.message?.includes('location is not supported')) {
      throw new AppError(
        'The AI service is temporarily unavailable in this region. Please try again later.',
        503
      );
    }

    throw new AppError('Could not process your message. Please try again.', 500);
  }
};

module.exports = { sendMessage };