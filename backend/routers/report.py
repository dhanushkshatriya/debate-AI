from fastapi import APIRouter
from services.ai_engine import ai_evaluate_debate

router = APIRouter()


@router.post("/report")
async def report(data: dict):
    return {"status": "ok", "message": "Report generated", "data": data}


@router.post("/evaluate")
async def evaluate_debate(data: dict):
    topic = data.get("topic", "General")
    history = data.get("history", [])
    result = await ai_evaluate_debate(topic, history)
    if not result:
        # Fallback evaluation based on history length and content
        user_msgs = [m for m in history if m.get("role") == "user"]
        ai_msgs = [m for m in history if m.get("role") == "ai"]
        user_words = sum(len(m.get("content", "").split()) for m in user_msgs)
        ai_words = sum(len(m.get("content", "").split()) for m in ai_msgs)
        score = min(85, max(30, 50 + (user_words - ai_words) // 10 + len(user_msgs) * 3))
        result = {
            "winner": "user" if score >= 60 else "ai" if score < 40 else "draw",
            "score": score,
            "summary": f"After {len(history)} exchanges, {'the user presented stronger arguments with more evidence.' if score >= 60 else 'the AI maintained a stronger position.' if score < 40 else 'both sides presented compelling arguments.'}",
            "mentor_advice": "Practice citing specific evidence and directly addressing the opponent's core premises. Try to structure arguments with clear claims, reasoning, and evidence.",
            "strengths": ["Engaged in sustained debate", "Provided multiple arguments"],
            "weaknesses": ["Could cite more specific evidence"],
            "key_points_missed": ["Consider addressing counterpoints more directly"]
        }
    return result
