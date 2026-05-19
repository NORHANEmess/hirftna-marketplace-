'use strict';

const chatbotService = require('../services/chatbot.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess } = require('../utils/response');

const sendMessage = asyncHandler(async (req, res) => {
  // Extracting data safely from req.validated.body set by your validation middleware
  const { message, conversation_history } = req.validated.body;

  const reply = await chatbotService.sendMessage({ message, conversation_history });

  return sendSuccess(res, { reply }, 'Message sent successfully');
});

module.exports = { sendMessage };