const Groq = require('groq-sdk');
const { appendToSheet } = require('./sheetsHelper');
const { fetchConcertNews } = require('./concertNews');

const SYSTEM_PROMPT = `คุณคือ Bellone ผู้ช่วย AI ส่วนตัวที่น่ารักและฉลาด พูดภาษาไทยเป็นหลัก
คุณมีความสามารถดังนี้:
1. คุยและช่วยคิดเรื่องต่างๆ ได้ทุกเรื่อง
2. บันทึกข้อมูลลง Google Sheets เมื่อถูกขอ
3. ค้นหาข่าวคอนเสิร์ตทั้งไทยและต่างประเทศ โดยเน้น K-pop วงเกาหลี

ตอบสั้นกระชับ น่ารัก และเป็นมิตร ใช้ emoji เหมาะสมบ้าง`;

function getReplyTarget(event, lineClient) {
  // ส่ง reply กลับไปที่ที่มาเสมอ (กลุ่มหรือแชทส่วนตัว)
  return (text) => lineClient.replyMessage(event.replyToken, { type: 'text', text });
}

async function handleTextMessage(event, lineClient, genAI, getGoogleAuth, conversationHistory) {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const isGroup = event.source.type === 'group' || event.source.type === 'room';
  const reply = getReplyTarget(event, lineClient);
  let text = event.message.text.trim();

  // ถ้าอยู่ในกลุ่ม ต้อง mention @Bellone ก่อน
  if (isGroup) {
    const mentionPattern = /^@Bellone\s*/i;
    if (!mentionPattern.test(text)) return;
    text = text.replace(mentionPattern, '').trim();
    if (!text) return;
  }

  // Help
  if (text === '/help' || text === 'help') {
    return reply(`🐱 Bellone Bot - คำสั่งที่ใช้ได้\n\n📰 ข่าวคอนเสิร์ต:\n• /concert - ข่าวคอนเสิร์ตทั้งหมด\n• /kpop - ข่าว K-pop Concert\n\n📝 บันทึกข้อมูล:\n• /save [ข้อความ] - บันทึกโน้ตลง Sheets\n\n💬 อื่นๆ:\n• พิมพ์อะไรก็ได้ = คุยกับ AI\n• /help - แสดงคำสั่งนี้${isGroup ? '\n\n👥 ในกลุ่ม: @Bellone [คำสั่ง]' : ''}`);
  }

  // Concert news
  if (text.startsWith('/concert') || text.includes('ข่าวคอนเสิร์ต')) {
    await reply('🔍 กำลังค้นหาข่าวคอนเสิร์ตล่าสุด รอแป๊บนึงนะคะ...');
    const news = await fetchConcertNews('general');
    return lineClient.replyMessage(replyToken, { type: 'text', text: news });
  }

  if (text.startsWith('/kpop') || text.toLowerCase().includes('kpop') || text.toLowerCase().includes('k-pop')) {
    await reply('🇰🇷 กำลังค้นหาข่าว K-pop Concert รอแป๊บนึงนะคะ...');
    const news = await fetchConcertNews('kpop');
    return lineClient.replyMessage(replyToken, { type: 'text', text: news });
  }

  // Save note
  if (text.startsWith('/save ')) {
    const note = text.replace('/save ', '').trim();
    const auth = getGoogleAuth();
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    await appendToSheet(auth, 'Notes', [[timestamp, 'note', note, userId]]);
    return reply(`✅ บันทึกแล้วค่า!\n📝 "${note}"\n🕐 ${timestamp}`);
  }

  // AI Chat with Groq
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const history = conversationHistory[userId];

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(msg => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content })),
    { role: 'user', content: text },
  ];

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    max_tokens: 1024,
  });

  const replyText = completion.choices[0].message.content;

  history.push({ role: 'user', content: text });
  history.push({ role: 'assistant', content: replyText });
  if (history.length > 20) history.splice(0, history.length - 20);

  return reply(replyText);
}

module.exports = { handleTextMessage };
