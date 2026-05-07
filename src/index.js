const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');
const { handleMessage } = require('./messageHandler');

const app = express();

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineClient = new Client(lineConfig);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getGoogleAuth = () => {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
};

app.post('/webhook', middleware(lineConfig), async (req, res) => {
  res.status(200).json({ status: 'ok' });
  const events = req.body.events;
  await Promise.all(
    events.map((event) => handleMessage(event, lineClient, genAI, getGoogleAuth))
  );
});

app.get('/', (req, res) => res.send('🐱 Bellone Bot is running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
