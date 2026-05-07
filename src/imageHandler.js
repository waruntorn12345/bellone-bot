const { google } = require('googleapis');
const { appendToSheet } = require('./sheetsHelper');
const { Readable } = require('stream');

async function handleImageMessage(event, lineClient, genAI, getGoogleAuth, conversationHistory) {
  const userId = event.source.userId;
  const messageId = event.message.id;
  const replyToken = event.replyToken;

  await lineClient.replyMessage(replyToken, {
    type: 'text',
    text: '📸 ได้รับรูปแล้ว กำลังบันทึกลง Google Drive รอแป๊บนะคะ...',
  });

  // Get image from LINE
  const stream = await lineClient.getMessageContent(messageId);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const imageBuffer = Buffer.concat(chunks);
  const base64Image = imageBuffer.toString('base64');

  // Analyze with Gemini Vision
  let imageDescription = 'รูปภาพ';
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent([
      { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
      'อธิบายรูปนี้ภาษาไทยสั้นๆ ใน 1-2 ประโยค',
    ]);
    imageDescription = result.response.text();
  } catch (e) {
    console.error('Vision error:', e.message);
  }

  // Upload to Google Drive
  let driveUrl = 'อัพโหลดไม่สำเร็จ';
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
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || 'root'],
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
    text: `✅ บันทึกรูปสำเร็จ!\n\n🖼️ ${imageDescription}\n\n📁 ลิงก์รูป:\n${driveUrl}\n\n📊 บันทึกลง Google Sheets แล้วค่า`,
  });
}

module.exports = { handleImageMessage };
