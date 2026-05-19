'use strict';

const { z } = require('zod');

const chatbotMessageSchema = z.object({
  message: z
    .string({ 
      required_error: 'Message is required',
      invalid_type_error: 'Message must be a text string' 
    })
    .trim()
    .min(1, { message: 'Message cannot be empty' })
    .max(1000, { message: 'Message cannot exceed 1000 characters' }),

  conversation_history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant'], { 
          errorMap: () => ({ message: 'Role must be "user" or "assistant"' }) 
        }),
        content: z
          .string({ required_error: 'Content is required' })
          .trim()
          .min(1, { message: 'History content cannot be empty' })
          .max(2000, { message: 'Message content too long' }),
      })
    )
    .max(20, { message: 'Conversation history cannot exceed 20 messages' })
    .optional()
    .default([]),
});

module.exports = { chatbotMessageSchema };