const Groq = require('groq-sdk');
const { appendToSheet } = require('./sheetsHelper');

async function handleImageMessage(event, lineClient, genAI, getGoogleAuth, conversationHistory) {
  const userId = event.source.userId;
  const messageId = event.message.id;
  const replyToken = event.replyToken;

  await lineClient.replyMessage(replyToken, {
    type: 'text',
    text: '📸 ได้รับรูปแล้ว กำลังวิเคราะห์รูปค่า รอแป๊บนะคะ...',
  });

  // Get image from LINE
  const stream = await lineClient.getMessageContent(messageId);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const imageBuffer = Buffer.concat(chunks);
  const base64Image = imageBuffer.toString('base64');

  // Analyze with Groq Vision (updated model)
  let imageDescription = 'รูปภาพ';
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          { type: 'text', text: 'อธิบายรูปนี้ภาษาไทยสั้นๆ ใน 1-2 ประโยค' },
        ],
      }],
      max_tokens: 300,
    });
    imageDescription = completion.choices[0].message.content;
  } catch (e) {
    console.error('Vision error:', e.message);
    imageDescription = 'ไม่สามารถวิเคราะห์รูปได้';
  }

  // Save to Sheets (without Drive upload)
  const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  try {
    const auth = getGoogleAuth();
    await appendToSheet(auth, 'Images', [[timestamp, messageId, '-', imageDescription, userId]]);
  } catch (e) {
    console.error('Sheets error:', e.message);
  }

  await lineClient.pushMessage(userId, {
    type: 'text',
    text: `✅ บันทึกรูปสำเร็จ!\n\n🖼️ ${imageDescription}\n\n📊 บันทึกลง Google Sheets แล้วค่า`,
  });
}

module.exports = { handleImageMessage };
