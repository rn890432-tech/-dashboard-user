const express = require('express');
const router = express.Router();

// Simulate AI chef assistant
router.post('/ai/chef-chat', (req, res) => {
  const { message, context } = req.body;
  // Context-aware reply logic (stub)
  let reply = '';
  if (context === 'recipe') {
    reply = 'Start by boiling pasta. While that cooks, sauté garlic and chicken...';
  } else if (context === 'mealplan') {
    reply = 'Let me help you plan your meals for the week!';
  } else if (context === 'general') {
    reply = 'I can help with cooking tips, nutrition, and more!';
  } else {
    reply = 'How can I assist you in the kitchen?';
  }
  res.json({ reply });
});

// Chat history (stub)
const chatHistory = [
  { sender: 'user', text: 'How do I cook chicken pasta?' },
  { sender: 'chef', text: 'Start by boiling pasta. While that cooks, sauté garlic and chicken...' }
];

router.get('/ai/chat-history', (req, res) => {
  res.json({ history: chatHistory });
});

module.exports = router;
