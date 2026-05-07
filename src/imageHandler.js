const Groq = require('groq-sdk');
const { appendToSheet } = require('./sheetsHelper');

// Track users who requested analysis
const analyzeRequests = new Set();

async function handleImageMessage(event, lineClient, genAI, getGoogleAuth, conversationHistory) {
  const userId = event.source.userId;
  const messageId = event.message.id;
  const replyToken = event.replyToken;

  // Get image from LINE
  const stream = await lineClient.getMessageContent(messageId);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const imageBuffer = Buffer.concat(chunks);

  const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const shouldAnalyze = analyzeRequests.has(userId);

  if (shouldAnalyze) {
    // Remove from analyze queue
    analyzeRequests.delete(userId);

    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '🔍 กำลังวิเคราะห์รูปค่า รอแป๊บนะคะ...',
    });

    // Analyze with Groq Vision
    let imageDescription = 'ไม่สามารถวิเคราะห์รูปได้';
    try {
      const base64Image = imageBuffer.toString('base64');
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
            { type: 'text', text: 'อธิบายรูปนี้ภาษาไทยละเอียดหน่อยนะคะ' },
          ],
        }],
        max_tokens: 500,
      });
      imageDescription = completion.choices[0].message.content;
    } catch (e) {
      console.error('Vision error:', e.message);
    }

    // Save to Sheets with description
    try {
      const auth = getGoogleAuth();
      await appendToSheet(auth, 'Images', [[timestamp, messageId, 'analyzed', imageDescription, userId]]);
    } catch (e) {
      console.error('Sheets error:', e.message);
    }

    await lineClient.pushMessage(userId, {
      type: 'text',
      text: `🖼️ ผลการวิเคราะห์รูป:\n\n${imageDescription}\n\n📊 บันทึกลง Sheets แล้วค่า`,
    });

  } else {
    // Just save without analysis
    try {
      const auth = getGoogleAuth();
      await appendToSheet(auth, 'Images', [[timestamp, messageId, '-', 'ยังไม่ได้วิเคราะห์', userId]]);
    } catch (e) {
      console.error('Sheets error:', e.message);
    }

    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: `✅ บันทึกรูปลง Sheets แล้วค่า!\n\n💡 ถ้าอยากวิเคราะห์รูป พิมพ์ /analyze แล้วส่งรูปได้เลยนะคะ`,
    });
  }
}

module.exports = { handleImageMessage, analyzeRequests };
