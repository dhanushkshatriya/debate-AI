import os
import json
import re
from typing import Optional

try:
    import google.generativeai as genai
    GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
    if GEMINI_KEY:
        genai.configure(api_key=GEMINI_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")
    else:
        model = None
except Exception:
    model = None

ANALYSIS_PROMPT = """You are an expert debate coach and argument analyst. Analyze the following argument and return a JSON object.

CONTEXT:
Topic: {topic}
Debate Format: {format}
History: {history}

CURRENT ARGUMENT:
{text}

REQUIRED JSON KEYS:
- score (int 0-100): overall argument quality
- claim (string): the main claim being made
- evidence (string): evidence cited or "No specific evidence cited"
- reasoning (string): logical reasoning chain
- fallacies (array of objects): {name, description, icon, severity, fix}
- missing_points (array of strings)
- counter_argument (string): A strong, direct rebuttal to the current argument.
- counter_reasoning (string): Why this rebuttal is strong.
- status (string): "ongoing", "ai_win", or "user_win"
- suggestions (array of strings)
- tone (string): Aggressive/Diplomatic/Assertive/Neutral
- clarity (int 0-100)
- persuasion (int 0-100)
- logic (int 0-100)
- evidence_score (int 0-100)
- structure (int 0-100)

Return ONLY valid JSON."""

COUNTER_PROMPT = """You are a skilled debater. Generate a strong, evidence-based counterargument to the following position. 
You are in a multi-turn debate. Analyze the conversation history and provide a rebuttal that directly addresses the opponent's last point while reinforcing your own stance.

If the opponent has conceded or if you have logically defeated their core premise, declare yourself the winner.
If you have been proven wrong or have no more valid counter-arguments, declare the opponent the winner.

Format: {format}
Topic: {topic}
History: {history}
Latest Argument: {text}

Return ONLY a JSON object: 
{
  "counter_argument": "...", 
  "strength": "Strong/Medium/Weak", 
  "approach": "...",
  "status": "ongoing/ai_win/user_win",
  "reasoning": "Brief explanation of why the debate ended or why this counter is strong"
}"""

DEBATE_EVAL_PROMPT = """Analyze the overall debate performance and decide if there is a winner.
Topic: {topic}
History: {history}

Return a JSON object:
{
  "winner": "user/ai/none",
  "score": 0-100,
  "summary": "...",
  "key_points_missed": [...]
}"""


async def ai_analyze(text: str, topic: str = "General", history: list = None, fmt: str = "casual") -> Optional[dict]:
    if not model:
        return None
    try:
        hist_str = "\n".join([f"{m['role']}: {m['content']}" for m in (history or [])])
        prompt = ANALYSIS_PROMPT.replace("{text}", text).replace("{format}", fmt).replace("{topic}", topic).replace("{history}", hist_str)
        response = model.generate_content(prompt)
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```\w*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
        return json.loads(raw)
    except Exception as e:
        print(f"AI analyze error: {e}")
        return None


async def ai_counter(text: str, topic: str, history: list, fmt: str = "casual") -> Optional[dict]:
    if not model:
        return None
    try:
        hist_str = "\n".join([f"{m['role']}: {m['content']}" for m in history])
        prompt = COUNTER_PROMPT.replace("{text}", text).replace("{format}", fmt).replace("{topic}", topic).replace("{history}", hist_str)
        response = model.generate_content(prompt)
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```\w*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
        return json.loads(raw)
    except Exception as e:
        print(f"AI counter error: {e}")
        return None


async def ai_evaluate_debate(topic: str, history: list) -> Optional[dict]:
    if not model:
        return None
    try:
        hist_str = "\n".join([f"{m['role']}: {m['content']}" for m in history])
        prompt = DEBATE_EVAL_PROMPT.replace("{topic}", topic).replace("{history}", hist_str)
        response = model.generate_content(prompt)
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```\w*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
        return json.loads(raw)
    except Exception as e:
        print(f"AI eval error: {e}")
        return None
