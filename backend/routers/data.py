from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from db import db
from datetime import datetime

router = APIRouter()

class ProfileUpdate(BaseModel):
    email: str
    xp: Optional[int] = None
    achievement: Optional[str] = None
    debates_completed: Optional[int] = None

class DebateCreate(BaseModel):
    email: str
    topic: str
    format: str
    argument: str
    analysis: Dict[str, Any]
    counter: str

@router.post("/data/profile")
async def get_profile(req: dict):
    email = req.get("email")
    try:
        doc = db.collection("users").document(email).get()
        if not doc.exists:
            return {"success": False, "error": "User not found."}
        return {"success": True, "profile": doc.to_dict()}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.put("/data/profile")
async def update_profile(req: ProfileUpdate):
    try:
        doc_ref = db.collection("users").document(req.email)
        doc = doc_ref.get()
        if not doc.exists:
            return {"success": False, "error": "User not found."}
            
        user = doc.to_dict()
        updates = {}
        if req.xp is not None:
            updates["xp"] = user.get("xp", 0) + req.xp
        if req.achievement is not None:
            achievements = user.get("achievements", [])
            if req.achievement not in achievements:
                achievements.append(req.achievement)
                updates["achievements"] = achievements
        if req.debates_completed is not None:
            updates["total_debates"] = user.get("total_debates", 0) + 1
            
        if updates:
            doc_ref.update(updates)
            
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/data/debates/sync")
async def get_debates(req: dict):
    email = req.get("email")
    try:
        debates = []
        docs = db.collection("users").document(email).collection("debates").order_by("created_at", direction="DESCENDING").stream()
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            debates.append(d)
        return {"success": True, "debates": debates}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/data/debates")
async def add_debate(req: DebateCreate):
    try:
        new_debate = {
            "topic": req.topic,
            "format": req.format,
            "argument": req.argument,
            "score": req.analysis.get("score", 0),
            "logic": req.analysis.get("logic", 0),
            "clarity": req.analysis.get("clarity", 0),
            "persuasion": req.analysis.get("persuasion", 0),
            "evidence": req.analysis.get("evidence_score", 0),
            "analysis_json": req.analysis,
            "counter_argument": req.counter,
            "created_at": datetime.utcnow().isoformat()
        }
        db.collection("users").document(req.email).collection("debates").add(new_debate)
        return {"success": True, "debate": new_debate}
    except Exception as e:
        return {"success": False, "error": str(e)}
