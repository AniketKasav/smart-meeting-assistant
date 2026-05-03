<div align="center">

# 🎙️ Smart Meeting Assistant

**An AI-powered, full-stack meeting management platform with real-time transcription, voice control, and intelligent analytics.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-333333?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org)
[![Groq](https://img.shields.io/badge/Groq-AI-F55036?style=for-the-badge)](https://groq.com)

</div>

---

## 📌 Overview

Smart Meeting Assistant transforms how teams collaborate. It combines **WebRTC peer-to-peer video calling**, **browser-native multilingual transcription**, and a **locally-hosted AI chatbot** into one unified platform — so your meetings are not just recorded, but understood, summarized, and acted upon automatically.

> Built with the **MERN stack** + WebRTC + Groq + Ollama + Socket.IO

---

## ✨ Key Features

### 🎥 Real-Time P2P Video Calling
- WebRTC (`simple-peer`) for direct browser-to-browser video/audio — **no server relay**, ultra-low latency
- Socket.IO handles signaling (SDP offer/answer & ICE candidate exchange)
- Supports multi-participant mesh network rooms

### 📝 Multilingual Live Transcription
- **Browser-native Web Speech API** for zero-latency speech-to-text
- Supports **English**, **Hindi (`hi-IN`)**, and **Marathi (`mr-IN`)** natively
- Live subtitles broadcast to all room participants via Socket.IO in real time
- **AssemblyAI** cloud engine integrated as high-accuracy fallback

### 🤖 Context-Aware AI Chatbot (RAG System)
- Ask natural questions: *"What are my pending tasks?"*, *"What did we decide last Tuesday?"*
- **RAG (Retrieval-Augmented Generation):** Searches your actual meeting database before answering — no hallucinations
- Powered by **Ollama (llama3.2)** running **100% locally** — your data never leaves your machine
- Responses streamed word-by-word via **SSE (Server-Sent Events)** for a ChatGPT-like experience

### 🗣️ "FRIDAY" Voice Assistant
- Always-on **wake-word detection** using `@ricky0123/vad-web` (local VAD — nothing is recorded until you say "Friday")
- Custom **`micLock` mutex** prevents the assistant and meeting mic from conflicting
- Regex + LLM intent matching → executes commands like navigation, scheduling, and search
- **Text-to-Speech** confirmation using the browser's Web Speech Synthesis API

### 📊 AI Meeting Summarization & Analytics
- Post-meeting: **Groq (`llama-3.1-8b-instant`)** generates structured JSON with `summary`, `key_points`, `action_items`, and `sentiment`
- **Meeting Analytics Hub**: Frequency charts, sentiment trends, duration breakdowns
- **Participant Leaderboard**: Performance Score calculated from speaking contribution + task completion rate 🥇🥈🥉
- Export reports as **PDF / CSV** downloads

### ✅ Smart Task Management & Proof of Work
- AI auto-generates action items from transcripts; hosts can manually assign, prioritize, and deadline them
- Assignees submit **"Proof of Work"** (notes / links) when completing a task
- **Automated email notifications** (Nodemailer) fire the moment a task is marked done — full accountability chain

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                    │
│  MeetingRoom ─► WebRTC (simple-peer)  ─► P2P Video/Audio       │
│  Web Speech API ─► Live Transcript ─► Socket.IO emit           │
│  FRIDAY Wake Word (VAD) ─► Intent Matcher ─► Action Executor   │
│  Chatbot UI ─► SSE Stream ─► AI Response                       │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTP / Socket.IO / SSE
┌────────────────────────▼────────────────────────────────────────┐
│                   BACKEND  (Node.js + Express)                  │
│  Socket.IO Server ─► Signaling + Transcript Sync               │
│  REST API ─► Auth (JWT) · Meetings · Tasks · Analytics          │
│  AI Services:                                                   │
│    Groq API  ─► Summarize · Translate · Extract Action Items    │
│    Ollama    ─► Local LLM Chatbot (RAG) — data stays local      │
│    AssemblyAI ─► Cloud STT fallback                             │
│  Nodemailer  ─► Task completion email notifications             │
└────────────────────────┬────────────────────────────────────────┘
                         │  Mongoose ODM
┌────────────────────────▼────────────────────────────────────────┐
│                      MongoDB (Local / Atlas)                    │
│  Collections: Users · Meetings · Transcripts · ActionItems      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide Icons, Recharts |
| **Backend** | Node.js, Express 5, Socket.IO |
| **Database** | MongoDB, Mongoose |
| **Real-Time** | WebRTC (`simple-peer`), Socket.IO |
| **AI — Fast** | Groq (`llama-3.1-8b-instant`) — Summarization, Translation |
| **AI — Private** | Ollama (`llama3.2`) — Local RAG Chatbot |
| **Speech** | Web Speech API (STT + TTS), AssemblyAI, VAD Web |
| **Auth** | JWT (Access + Refresh Tokens), bcryptjs |
| **Email** | Nodemailer |
| **Media** | FFmpeg, Multer |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB running locally (or Atlas URI)
- [Ollama](https://ollama.com/) installed and `llama3.2` model pulled:
  ```bash
  ollama pull llama3.2
  ```
- API keys for **Groq**, **AssemblyAI**, and **Google OAuth** (optional)

---

### 1. Clone the Repository

```bash
git clone https://github.com/AniketKasav/smart-meeting-assistant.git
cd smart-meeting-assistant
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create your `.env` file from the example:

```bash
cp .env.example .env
```

Fill in the required variables:

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/smart-meeting-assistant
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

GROQ_API_KEY=your_groq_key
ASSEMBLYAI_API_KEY=your_assemblyai_key
GEMINI_API_KEY=your_gemini_key          # optional

EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:5173

GOOGLE_CLIENT_ID=your_google_client_id  # optional
GOOGLE_CLIENT_SECRET=your_google_secret # optional
```

Start the backend:

```bash
node server.js
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**

---

### 4. Start Ollama (for AI Chatbot)

```bash
ollama serve
```

Make sure `llama3.2` is available. The chatbot will connect automatically.

---

## 📂 Project Structure

```
smart-meeting-assistant/
├── backend/
│   ├── config/            # DB & environment config
│   ├── middleware/         # Auth guards, rate limiting
│   ├── models/             # Mongoose schemas (User, Meeting, Transcript, ActionItem)
│   ├── routes/             # REST API endpoints
│   ├── services/           # AI services (Groq, Ollama RAG, AssemblyAI, email)
│   ├── utils/              # Helpers & utilities
│   └── server.js           # Express + Socket.IO entry point
│
└── frontend/
    └── src/
        ├── components/     # Reusable UI (VoiceButton, AssistantBubble, etc.)
        ├── contexts/       # VoiceCommandContext, AuthContext
        ├── hooks/          # useWakeWord, useSpeechRecognition
        ├── pages/          # MeetingRoom, Dashboard, ActionItems, Performance, Reports
        ├── services/       # Axios API layer
        └── utils/          # micLock, intentMatcher, actionExecutor
```

---

## 🌟 What Makes This Different from Zoom / Teams?

| Feature | Smart Meeting Assistant | Zoom / Teams |
|---|---|---|
| Hands-free AI voice control | ✅ **FRIDAY** wake-word assistant | ❌ |
| 100% local AI (private data) | ✅ Ollama runs on-device | ❌ Cloud-only |
| Proof of Work task system | ✅ Built-in + email alerts | ❌ |
| Real-time multilingual subtitles | ✅ English, Hindi, Marathi | ⚠️ English-primary |
| Participant performance scoring | ✅ Automated leaderboard | ❌ |
| AI post-meeting summaries | ✅ Groq (instant) | ⚠️ Premium only |

---

## 🔭 Roadmap

- [ ] **Google Calendar & Gmail Integration** — auto-send action item emails post-meeting
- [ ] **Real-Time AI Fact-Checking** — inline claim verification during meetings
- [ ] **AI Slide Deck Generator** — auto-generate PPT/PDF from transcript
- [ ] **Voice-Controlled Screen Sharing** — *"Friday, share my screen"*
- [ ] **Burnout Prediction Analytics** — 6-month sentiment trend analysis per user

---

## 👨‍💻 Author

**Aniket Kasav**  
BE — Artificial Intelligence & Data Science  
[![GitHub](https://img.shields.io/badge/GitHub-AniketKasav-181717?style=flat&logo=github)](https://github.com/AniketKasav)

---

## 📜 License

© 2026 Aniket Kasav — All rights reserved.
