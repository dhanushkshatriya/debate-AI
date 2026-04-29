from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from db import supabase
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
        res = supabase.table("users").select("*").eq("email", email).execute()
        if len(res.data) == 0:
            return {"success": False, "error": "User not found."}
        return {"success": True, "profile": res.data[0]}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.put("/data/profile")
async def update_profile(req: ProfileUpdate):
    try:
        # Get current user
        res = supabase.table("users").select("*").eq("email", req.email).execute()
        if len(res.data) == 0:
            return {"success": False, "error": "User not found."}
            
        user = res.data[0]
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
            supabase.table("users").update(updates).eq("email", req.email).execute()
            
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/data/debates/sync")
async def get_debates(req: dict):
    email = req.get("email")
    try:
        res = supabase.table("debates").select("*").eq("user_email", email).order("created_at", desc=True).execute()
        return {"success": True, "debates": res.data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/data/debates")
async def add_debate(req: DebateCreate):
    try:
        new_debate = {
            "user_email": req.email,
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
        res = supabase.table("debates").insert(new_debate).execute()
        return {"success": True, "debate": res.data[0]}
    except Exception as e:
        return {"success": False, "error": str(e)}
