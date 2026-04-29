from fastapi import APIRouter
router = APIRouter()

@router.post("/report")
async def report(data: dict):
    return {"status": "ok", "message": "Report generated", "data": data}
