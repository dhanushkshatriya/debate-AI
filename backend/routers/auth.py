from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import db, auth as firebase_auth

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
        # Create user in Firebase Auth
        user = firebase_auth.create_user(
            email=req.email,
            password=req.password,
            display_name=req.name
        )
        
        # Insert new user profile in Firestore
        new_user = {
            "email": req.email,
            "name": req.name,
            "xp": 0,
            "achievements": [],
            "total_debates": 0
        }
        db.collection("users").document(req.email).set(new_user)
        return {"success": True, "name": req.name}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/auth/login")
async def login(req: LoginRequest):
    # Note: With Firebase, login is typically handled client-side.
    # This endpoint is mostly a placeholder if you need custom token generation.
    try:
        user = firebase_auth.get_user_by_email(req.email)
        # We cannot verify passwords server-side using Firebase Admin SDK easily.
        # It's highly recommended to use the client SDK for login.
        return {"success": True, "name": user.display_name}
    except Exception as e:
        return {"success": False, "error": str(e)}
