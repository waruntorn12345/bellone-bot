const Groq = require('groq-sdk');
const { google } = require('googleapis');
const { appendToSheet } = require('./sheetsHelper');
const { Readable } = require('stream');

const analyzeRequests = new Set();

async function handleImageMessage(event, lineClient, genAI, getGoogleAuth, conversationHistory) {
  const userId = event.source.userId;
  const messageId = event.message.id;
  const replyToken = event.replyToken;

  const shouldAnalyze = analyzeRequests.has(userId);

  if (shouldAnalyze) {
    analyzeRequests.delete(userId);

    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '🔍 กำลังวิเคราะห์และบันทึกรูปค่า รอแป๊บนะคะ...',
    });

    // Get image
    const stream = await lineClient.getMessageContent(messageId);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const imageBuffer = Buffer.concat(chunks);
    const base64Image = imageBuffer.toString('base64');

    // Analyze with Groq Vision
    let imageDescription = 'ไม่สามารถวิเคราะห์รูปได้';
    try {
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

    // Upload to Google Drive folder
    let driveUrl = '-';
    try {
      const auth = getGoogleAuth();
      const drive = google.drive({ version: 'v3', auth: await auth.getClient() });
      const fileName = `bellone_${Date.now()}.jpg`;

      const readable = new Readable();
      readable.push(imageBuffer);
      readable.push(null);

      const driveResponse = await drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: 'image/jpeg',
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        },
        media: { mimeType: 'image/jpeg', body: readable },
        fields: 'id, webViewLink',
      });

      await drive.permissions.create({
        fileId: driveResponse.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      driveUrl = driveResponse.data.webViewLink;
    } catch (e) {
      console.error('Drive error:', e.message);
    }

    // Save to Sheets
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    try {
      const auth = getGoogleAuth();
      await appendToSheet(auth, 'Images', [[timestamp, messageId, driveUrl, imageDescription, userId]]);
    } catch (e) {
      console.error('Sheets error:', e.message);
    }

    await lineClient.pushMessage(userId, {
      type: 'text',
      text: `🖼️ ผลการวิเคราะห์รูป:\n\n${imageDescription}\n\n📁 ลิงก์รูป:\n${driveUrl}\n\n📊 บันทึกลง Sheets แล้วค่า`,
    });

  } else {
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text: `💡 ถ้าอยากวิเคราะห์และบันทึกรูป พิมพ์ /analyze แล้วส่งรูปได้เลยนะคะ 📸`,
    });
  }
}

module.exports = { handleImageMessage, analyzeRequests };
