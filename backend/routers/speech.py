import re
from fastapi import APIRouter
from models.schemas import SpeechRequest

router = APIRouter()

FILLERS = ["um", "uh", "like", "you know", "basically", "actually", "literally", "honestly", "right", "sort of", "kind of", "i mean"]

@router.post("/speech")
async def speech(req: SpeechRequest):
    words = req.transcript.split()
    wc = len(words)
    dur = max(req.duration, 1)
    wpm = round((wc / dur) * 60)
    filler_count = {}
    total = 0
    for f in FILLERS:
        m = len(re.findall(rf'\b{f}\b', req.transcript, re.IGNORECASE))
        if m: filler_count[f] = m; total += m
    rate = round((total / max(wc, 1)) * 100, 1)
    confidence = max(20, min(100, round(80 - rate * 5 + (15 if 120 < wpm < 160 else 0) - (10 if wpm > 180 else 0))))
    pace = "Slow" if wpm < 100 else "Moderate" if wpm < 140 else "Good" if wpm < 170 else "Fast"
    return {"words_per_minute": wpm, "words_per_second": round(wc / dur, 1), "total_words": wc, "filler_words": filler_count, "total_fillers": total, "filler_rate": f"{rate}%", "confidence": confidence, "pace": pace, "tone": "Neutral", "suggestions": [f"Reduce fillers (found {total})" if total > 3 else "Great filler control!", "Slow down for clarity" if wpm > 170 else "Good pace" if wpm > 100 else "Speak faster"]}
