from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import supabase

router = APIRouter()

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/auth/register")
async def register(req: RegisterRequest):
    try:
        # Check if user exists
        existing = supabase.table("users").select("*").eq("email", req.email).execute()
        if len(existing.data) > 0:
            return {"success": False, "error": "Email already registered."}
        
        # Insert new user
        new_user = {
            "email": req.email,
            "password": req.password, # Plaintext for hackathon demo
            "name": req.name,
            "xp": 0,
            "achievements": [],
            "total_debates": 0
        }
        res = supabase.table("users").insert(new_user).execute()
        return {"success": True, "name": req.name}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/auth/login")
async def login(req: LoginRequest):
    try:
        res = supabase.table("users").select("*").eq("email", req.email).execute()
        if len(res.data) == 0:
            return {"success": False, "error": "User not found."}
            
        user = res.data[0]
        if user.get("password") != req.password:
            return {"success": False, "error": "Incorrect password."}
            
        return {"success": True, "name": user.get("name")}
    except Exception as e:
        return {"success": False, "error": str(e)}
