const { handleTextMessage } = require('./textHandler');
const { handleImageMessage, analyzeRequests } = require('./imageHandler');

const conversationHistory = {};

async function handleMessage(event, lineClient, genAI, getGoogleAuth) {
  if (event.type !== 'message') return;
  const userId = event.source.userId;
  if (!conversationHistory[userId]) conversationHistory[userId] = [];

  try {
    if (event.message.type === 'text') {
      // Check if user typed /analyze
      if (event.message.text.trim() === '/analyze') {
        analyzeRequests.add(userId);
        return lineClient.replyMessage(event.replyToken, {
          type: 'text',
          text: '🔍 พร้อมวิเคราะห์รูปแล้วค่า! ส่งรูปมาได้เลยนะคะ 📸',
        });
      }
      await handleTextMessage(event, lineClient, genAI, getGoogleAuth, conversationHistory);
    } else if (event.message.type === 'image') {
      await handleImageMessage(event, lineClient, genAI, getGoogleAuth, conversationHistory);
    }
  } catch (error) {
    console.error('Error:', error);
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งนะคะ 🙏',
    });
  }
}

module.exports = { handleMessage };
