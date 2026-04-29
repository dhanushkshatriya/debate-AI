# 🎯 DEBATE AI – Real-Time AI Debate Coach

An AI-powered debate coaching platform that analyzes arguments in real-time, detects logical fallacies, evaluates persuasion and clarity, provides AI-generated counterarguments, and tracks user improvement over time.

## ✨ Features

- **Argument Analysis Engine** — Score arguments 0-100, detect 10+ fallacies, extract Claim/Evidence/Reasoning
- **AI Counterargument System** — Generate strong counterpoints in Casual, Parliamentary, and MUN formats
- **Voice & Speech Analysis** — Live speech-to-text, WPM tracking, filler word detection, confidence scoring
- **Real-Time Feedback** — Instant scoring with animated SVG gauges and radar charts
- **Analytics Dashboard** — Radar charts, performance trends, debate history
- **Gamification** — XP system, 6 levels (Novice → Grand Master), 12 achievements

## 🚀 Quick Start

### 1. Start the Backend (Python FastAPI)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 2. Open the App

Visit **http://localhost:8000** in your browser (Chrome recommended for voice features).

### 3. (Optional) Enable AI-Powered Analysis

Set your Gemini API key for enhanced AI analysis:

```bash
# Create backend/.env file
GEMINI_API_KEY=your_api_key_here
```

Without the API key, the app uses intelligent client-side analysis (still fully functional).

## 📁 Project Structure

```
├── index.html          # Single-page app (all 5 views)
├── css/
│   └── style.css       # Complete design system
├── js/
│   ├── app.js          # Main controller & page rendering
│   ├── api.js          # API service + client-side fallback
│   ├── speech.js       # Web Speech API integration
│   ├── gamification.js # XP, levels, achievements
│   ├── store.js        # localStorage persistence
│   └── charts.js       # Chart.js radar & line charts
├── backend/
│   ├── main.py         # FastAPI server
│   ├── routers/        # API endpoints
│   │   ├── analyze.py  # /api/analyze
│   │   ├── debate.py   # /api/debate
│   │   ├── speech.py   # /api/speech
│   │   └── report.py   # /api/report
│   ├── services/
│   │   └── ai_engine.py # Gemini AI integration
│   ├── models/
│   │   └── schemas.py  # Pydantic models
│   └── requirements.txt
└── README.md
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python, FastAPI |
| AI | Google Gemini API |
| Charts | Chart.js |
| Icons | Lucide Icons |
| Voice | Web Speech API |
| Storage | localStorage |

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Analyze argument, detect fallacies, score |
| `/api/debate` | POST | Generate AI counterargument |
| `/api/speech` | POST | Analyze speech transcript |
| `/api/report` | POST | Generate debate report |

## 🏆 Hackathon Demo Flow

1. Visit landing page → Click "Start Debating"
2. Choose a debate format (Casual / Parliamentary / MUN)
3. Pick a topic or shuffle for a random one
4. Type or speak your argument using voice input
5. Click "Analyze Argument" → See instant AI analysis
6. View score gauges, fallacy alerts, AI counterargument, and suggestions
7. Check Dashboard for radar chart, trends, and achievements
8. Visit Profile for stats and debate history
