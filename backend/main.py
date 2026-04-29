import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

# Add backend dir to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from routers import analyze, debate, speech, report

app = FastAPI(title="DEBATE AI API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(debate.router, prefix="/api/debate", tags=["debate"])
app.include_router(speech.router, prefix="/api/speech", tags=["speech"])
app.include_router(report.router, prefix="/api/report", tags=["report"])

# Serve frontend static files
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..")
app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")

@app.get("/")
async def root():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/health")
async def health():
    return {"status": "ok", "ai_available": bool(os.getenv("GEMINI_API_KEY"))}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
