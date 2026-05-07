# 🐱 Bellone Bot - คู่มือติดตั้งทีละขั้นตอน

## ภาพรวมระบบ
```
LINE → Webhook → Server (Render.com) → Claude AI
                                     → Google Sheets (บันทึกข้อมูล)
                                     → Google Drive (เก็บรูปภาพ)
```

---

## ขั้นตอนที่ 1: เตรียม LINE Bot

1. ไปที่ [developers.line.biz](https://developers.line.biz) เลือก Channel "Bellone"
2. ไปที่ Tab **"Messaging API"**
3. เลื่อนลงหา **"Channel access token"** → กด **Issue** → Copy เก็บไว้
4. กลับไปที่ Tab **"Basic settings"** → Copy **Channel secret** เก็บไว้
5. ใน Tab **"Messaging API"** ปิด **"Auto-reply messages"** และ **"Greeting messages"**

---

## ขั้นตอนที่ 2: เตรียม Google Sheets + Drive

### สร้าง Google Spreadsheet
1. ไปที่ [sheets.google.com](https://sheets.google.com) → สร้าง Spreadsheet ใหม่
2. ตั้งชื่อว่า "Bellone Bot Data"
3. Copy **Spreadsheet ID** จาก URL: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`

### สร้าง Service Account (สำหรับ Bot เข้าถึง Google)
1. ไปที่ [console.cloud.google.com](https://console.cloud.google.com)
2. สร้าง Project ใหม่ หรือเลือก Project ที่มีอยู่
3. ไปที่ **APIs & Services → Library**
   - ค้นหา "Google Sheets API" → Enable
   - ค้นหา "Google Drive API" → Enable
4. ไปที่ **APIs & Services → Credentials**
5. กด **Create Credentials → Service Account**
   - ตั้งชื่อ: `bellone-bot`
   - กด Create and Continue → Done
6. คลิกที่ Service Account ที่เพิ่งสร้าง
7. ไปที่ Tab **Keys** → Add Key → Create new key → **JSON** → Download
8. เปิดไฟล์ JSON ที่ดาวน์โหลด → Copy ทั้งหมด (จะเอาไปใส่ใน Env Variable)

### แชร์ Spreadsheet ให้ Service Account
1. เปิดไฟล์ JSON ที่ดาวน์โหลด → หา `client_email` (เช่น `bellone-bot@project.iam.gserviceaccount.com`)
2. เปิด Google Spreadsheet → กด Share
3. ใส่ `client_email` → ให้สิทธิ์ **Editor** → Send

---

## ขั้นตอนที่ 3: เตรียม Anthropic API Key

1. ไปที่ [console.anthropic.com](https://console.anthropic.com)
2. ไปที่ **API Keys** → Create Key
3. Copy เก็บไว้

---

## ขั้นตอนที่ 4: Upload โค้ดขึ้น GitHub

1. สร้าง Repository ใหม่ที่ [github.com](https://github.com) ชื่อ `bellone-bot`
2. Upload ไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้นไป (**ยกเว้น** ไฟล์ `.env`)

```bash
# ถ้ามี Git ในเครื่อง:
git init
git add .
git commit -m "Initial Bellone Bot"
git remote add origin https://github.com/YOUR_USERNAME/bellone-bot.git
git push -u origin main
```

---

## ขั้นตอนที่ 5: Deploy บน Render.com (ฟรี!)

1. ไปที่ [render.com](https://render.com) → Sign up ด้วย GitHub
2. กด **New → Web Service**
3. เลือก Repository `bellone-bot`
4. ตั้งค่า:
   - **Name**: `bellone-bot`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. เลื่อนลงหา **Environment Variables** → Add ทีละตัว:

| Key | Value |
|-----|-------|
| `LINE_CHANNEL_ACCESS_TOKEN` | จาก Step 1 |
| `LINE_CHANNEL_SECRET` | จาก Step 1 |
| `ANTHROPIC_API_KEY` | จาก Step 3 |
| `GOOGLE_SPREADSHEET_ID` | จาก Step 2 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | วาง JSON ทั้งก้อนจาก Step 2 |

6. กด **Create Web Service** → รอ Deploy (ประมาณ 3-5 นาที)
7. Copy URL ที่ได้ เช่น `https://bellone-bot.onrender.com`

---

## ขั้นตอนที่ 6: ตั้ง Webhook ใน LINE

1. กลับไปที่ LINE Developers → Channel Bellone → Tab **Messaging API**
2. หา **Webhook URL** → กด Edit
3. ใส่: `https://bellone-bot.onrender.com/webhook`
4. กด **Verify** → ต้องขึ้น Success ✅
5. เปิด **Use webhook** → ON

---

## ✅ ทดสอบ!

เพิ่ม Bellone เป็นเพื่อน LINE แล้วลองพิมพ์:
- `สวัสดี` - ทดสอบ AI
- `/help` - ดูคำสั่ง
- `/kpop` - ข่าว K-pop Concert
- `/save ทดสอบบันทึก` - ทดสอบ Sheets
- ส่งรูปภาพ - ทดสอบบันทึกรูป

---

## คำสั่งที่ใช้ได้

| คำสั่ง | ผลลัพธ์ |
|--------|---------|
| พิมพ์อะไรก็ได้ | คุยกับ AI Claude |
| `/concert` | ข่าวคอนเสิร์ตทั่วไป |
| `/kpop` | ข่าว K-pop Concert โดยเฉพาะ |
| `/save [ข้อความ]` | บันทึกโน้ตลง Sheets |
| ส่งรูปภาพ | บันทึกรูปลง Drive + Sheets |
| `/help` | แสดงคำสั่งทั้งหมด |

---

## ⚠️ หมายเหตุ Render Free Tier

- Server จะ **sleep** ถ้าไม่มีคนใช้นาน 15 นาที
- ครั้งแรกที่ส่งข้อความอาจช้า 30-50 วินาที (wake up)
- ถ้าอยากให้ตลอดเวลา ต้องอัพเกรดเป็น Paid ($7/เดือน)
- หรือใช้ [UptimeRobot](https://uptimerobot.com) ping ทุก 14 นาทีเพื่อป้องกัน sleep (ฟรี)
