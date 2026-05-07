const Groq = require('groq-sdk');

async function fetchConcertNews(type = 'general') {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = type === 'kpop'
    ? `สรุปข่าวคอนเสิร์ต K-pop / วงเกาหลีที่น่าสนใจในปี 2025-2026 ทั้งในไทยและต่างประเทศ เช่น BTS, BLACKPINK, aespa, NewJeans, Stray Kids, SEVENTEEN ฯลฯ รวมถึงข่าว tour ใหม่ วันจำหน่ายตั๋ว จัดรูปแบบให้อ่านง่าย ใช้ emoji สวยงาม ภาษาไทย`
    : `สรุปข่าวคอนเสิร์ตที่น่าสนใจในปี 2025-2026 ทั้งไทยและต่างประเทศ เน้น K-pop และศิลปินดังๆ จัดรูปแบบให้อ่านง่าย ใช้ emoji สวยงาม ภาษาไทย`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Concert news error:', error.message);
    return `❌ เกิดข้อผิดพลาดในการค้นหาข่าว กรุณาลองใหม่อีกครั้งนะคะ`;
  }
}

module.exports = { fetchConcertNews };
