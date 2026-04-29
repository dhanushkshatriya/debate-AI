from fastapi import APIRouter
from models.schemas import DebateRequest
from services.ai_engine import ai_counter

router = APIRouter()

@router.post("/debate")
async def debate(req: DebateRequest):
    result = await ai_counter(req.text, req.topic, req.history, req.format)
    if not result:
        claim = req.text.split('.')[0][:80]
        result = {
            "counter_argument": f'I respectfully disagree with "{claim}". This position fails to account for critical factors. Multiple studies show contradictory results, and the argument conflates correlation with causation.',
            "strength": "Strong",
            "approach": "Evidence-based rebuttal",
            "status": "ongoing",
            "reasoning": "Fallback response used."
        }
    return result
