from fastapi import APIRouter
from models.schemas import DebateRequest
from services.ai_engine import ai_counter

router = APIRouter()

@router.post("/debate")
async def debate(req: DebateRequest):
    result = await ai_counter(req.text, req.topic, req.history, req.format)
    if not result:
        claim = req.text.split('.')[0][:80]
        import random
        intros = [
            "That's an interesting point, but ",
            "I see where you're coming from. However, ",
            "You make a fair point, but I'd argue that ",
            "I have to disagree. Here's why: ",
            "While that sounds good in theory, "
        ]
        conclusions = [
            "What do you think about the opposite side of that?",
            "Don't you think the risks outweigh those benefits?",
            "We also have to consider the long-term consequences.",
            "Have you considered the exceptions to that rule?"
        ]
        
        is_short = len(req.text.split()) < 8
        is_question = "?" in req.text
        
        response = random.choice(intros)
        if is_question:
            response = "That's a good question. My perspective is that we can't ignore the realities on the ground. "
        elif is_short:
            response += "that claim feels a bit oversimplified. "
        else:
            response += "if we look at the broader picture, there are significant drawbacks you haven't mentioned. "
            
        response += random.choice(conclusions)
        
        result = {
            "counter_argument": response,
            "strength": "Medium",
            "approach": "Conversational fallback",
            "status": "ongoing",
            "reasoning": "Fallback response used."
        }
    return result
