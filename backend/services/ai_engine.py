import os
import json
import re
import asyncio
import time
from typing import Optional

try:
    import google.generativeai as genai
    GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
    if GEMINI_KEY:
        genai.configure(api_key=GEMINI_KEY)
        # We'll create models on the fly in the call function
    else:
        genai = None
except Exception:
    genai = None

# Timeout for each AI call (seconds)
AI_TIMEOUT = 25

# Rate-limit cooldown tracking
_last_rate_limit_time = 0
_RATE_LIMIT_COOLDOWN = 60  # Skip AI for 60 seconds after a rate limit hit

ANALYSIS_PROMPT = """Analyze this argument concisely. Return JSON with keys: score(0-100), claim(string), evidence(string), reasoning(string), fallacies(array of {name,description,icon,severity,fix}), missing_points(string array), counter_argument(1 sentence), suggestions(short string array), tone(Aggressive/Diplomatic/Assertive/Moderate/Neutral), clarity(0-100), persuasion(0-100), logic(0-100), evidence_score(0-100), structure(0-100).

Format: {format}
Argument: {text}

Return ONLY valid JSON."""

COUNTER_PROMPT = """You are participating in a live debate against a human user. Respond directly to them in a natural, conversational, and human-like tone. DO NOT be robotic. Push back firmly but politely. Keep it to 2-3 short sentences.
CRITICAL RULE on "status":
- return "ongoing" if the debate should continue.
- return "user_win" if the user has completely destroyed your argument or made an undeniable point.
- return "ai_win" if the user explicitly agrees with you (e.g., "I agree", "you are right", "you win", "I give up") or if their argument is entirely nonsensical. If they agree with you, return "ai_win" and gracefully accept their agreement.

Format: {format} | Topic: {topic}
History: {history}
User's Latest Argument: {text}

Return JSON: {"counter_argument":"your human-sounding response","strength":"Strong/Medium/Weak","approach":"...","status":"ongoing/ai_win/user_win","reasoning":"..."}"""

DEBATE_EVAL_PROMPT = """Act as a supportive but highly analytical Debate Mentor. Evaluate the debate and provide a comprehensive report for the user. Do not just decide the winner; give constructive feedback on their debate style, logic, and persuasion. The overall score (0-100) must accurately reflect their performance based on logic, consistency, and strength of arguments.

Topic: {topic}
History: {history}

Return ONLY valid JSON with exactly these keys:
{
  "winner": "user/ai/none",
  "score": 0,
  "summary": "...",
  "mentor_advice": "...",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "key_points_missed": ["..."]
}"""


def _is_rate_limited():
    global _last_rate_limit_time
    if time.time() - _last_rate_limit_time < _RATE_LIMIT_COOLDOWN:
        return True
    return False


async def _call_gemini(prompt: str) -> Optional[dict]:
    global _last_rate_limit_time
    
    if not genai or _is_rate_limited():
        return None
        
    models_to_try = ["gemini-1.5-flash", "gemini-1.5-pro"]
    
    for model_id in models_to_try:
        try:
            model = genai.GenerativeModel(model_id)
            
            # Use run_in_executor to make the synchronous SDK call somewhat async
            def _generate():
                return model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        candidate_count=1,
                        max_output_tokens=800,
                        temperature=0.7,
                        response_mime_type="application/json"
                    )
                )
            
            response = await asyncio.get_event_loop().run_in_executor(None, _generate)
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```\w*\n?", "", raw)
                raw = re.sub(r"\n?```$", "", raw)
            return json.loads(raw)
            
        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "quota" in err_str:
                print(f"Model {model_id} rate limited (429)")
                continue
            else:
                print(f"AI call error with {model_id}: {e}")
                continue
                
    return None


async def ai_analyze(text: str, fmt: str = "casual") -> Optional[dict]:
    prompt = ANALYSIS_PROMPT.replace("{text}", text).replace("{format}", fmt)
    return await _call_gemini(prompt)


async def ai_counter(text: str, topic: str, history: list, fmt: str = "casual") -> Optional[dict]:
    recent = history[-4:] if len(history) > 4 else history
    hist_str = "\n".join([f"{m['role']}: {m['content'][:200]}" for m in recent])
    prompt = COUNTER_PROMPT.replace("{text}", text).replace("{format}", fmt).replace("{topic}", topic).replace("{history}", hist_str)
    return await _call_gemini(prompt)


async def ai_evaluate_debate(topic: str, history: list) -> Optional[dict]:
    recent = history[-6:] if len(history) > 6 else history
    hist_str = "\n".join([f"{m['role']}: {m['content'][:200]}" for m in recent])
    prompt = DEBATE_EVAL_PROMPT.replace("{topic}", topic).replace("{history}", hist_str)
    return await _call_gemini(prompt)
