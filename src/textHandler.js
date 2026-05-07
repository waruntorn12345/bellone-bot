const { GoogleGenerativeAI } = require('@google/generative-ai');

async function fetchConcertNews(type = 'general') {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = type === 'kpop'
    ? `สรุปข่าวคอนเสิร์ต K-pop / วงเกาหลีที่น่าสนใจในปี 2025-2026 ทั้งในไทยและต่างประเทศ เช่น BTS, BLACKPINK, aespa, NewJeans, Stray Kids, SEVENTEEN ฯลฯ รวมถึงข่าว tour ใหม่ วันจำหน่ายตั๋ว จัดรูปแบบให้อ่านง่าย ใช้ emoji สวยงาม ภาษาไทย`
    : `สรุปข่าวคอนเสิร์ตที่น่าสนใจในปี 2025-2026 ทั้งไทยและต่างประเทศ เน้น K-pop และศิลปินดังๆ จัดรูปแบบให้อ่านง่าย ใช้ emoji สวยงาม ภาษาไทย`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Concert news error:', error.message);
    return `❌ เกิดข้อผิดพลาดในการค้นหาข่าว กรุณาลองใหม่อีกครั้งนะคะ`;
  }
}

module.exports = { fetchConcertNews };
module.exports = { handleTextMessage };
