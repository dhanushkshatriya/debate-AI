# DEBATE AI – Project Documentation

## 🚀 Overview
DEBATE AI is a next-generation AI-powered debate coach designed to help users sharpen their rhetorical skills. It provides real-time analysis of arguments, detects logical fallacies, and simulates a multi-turn debate environment where users can test their positions against a sophisticated AI opponent.

## 🏗️ Architecture & Structure

The project follows a modern Full-Stack architecture:

### 1. Frontend (Logic & UI)
- **Framework**: Vanilla HTML5, CSS3, and Javascript (ES6+).
- **State Management**: `js/store.js` – Handles local state and synchronizes with Supabase.
- **AI Integration**: `js/api.js` – Communicates with the FastAPI backend.
- **Multilingual System**: `js/i18n.js` – A custom lightweight internationalization system supporting English, Spanish, and Hindi.
- **Visuals**: Lucide Icons for iconography, Chart.js for analytics, and custom CSS animations for a premium feel.

### 2. Backend (Intelligence & API)
- **Framework**: **FastAPI** (Python) for high-performance API handling.
- **AI Engine**: **Google Gemini 2.0 Flash** – Powers the deep analysis, fallacy detection, and counter-argument generation.
- **Real-time Processing**: Asynchronous endpoints for speech-to-text analysis and debate evaluation.

### 3. Database (Persistence)
- **Supabase**: Used for secure user authentication and persistent storage of debate history and user profiles.
- **Schema**: Structured tables for `users` and `debates` with JSONB support for complex AI analysis data.

## 🔄 Workflow Explanation

1.  **Entry**: The user starts on a cinematic landing page and logs in via Supabase (Email/Password or Google OAuth).
2.  **Configuration**: The user selects a debate format (Casual, Parliamentary, or Model UN) and a topic.
3.  **The Debate Loop**:
    - **Input**: The user provides an argument via text or **Voice Input** (real-time transcription).
    - **Analysis**: The AI analyzes the argument for:
        - **Scoring**: Overall quality, logic, clarity, and persuasion.
        - **Fallacies**: Detects Ad Hominem, Strawman, etc.
        - **Evidence**: Checks for data-backed claims.
    - **Counter-Attack**: The AI generates a contextual rebuttal based on the **entire conversation history**.
    - **Outcome**: The AI evaluates if the user or AI has won based on logical consistency and strength of arguments.
4.  **Feedback**: Users get detailed reports and skill radar charts on their dashboard to track improvement over time.

## ✨ Key Features for Judges
- **Multi-turn Logic**: Unlike simple chatbots, this AI remembers previous turns and debates until a winner is declared.
- **Real-time Voice Analysis**: Analyzes speech pace (WPM), confidence, and filler word usage.
- **Logical Fallacy Engine**: Advanced detection of 10+ common logical fallacies with suggestions on how to fix them.
- **Global Reach**: Instant translation between languages.
- **Supabase Integration**: Real data persistence, ensuring the platform is "real" and ready for production.

---
**Developed for the Hackathon 2026**
