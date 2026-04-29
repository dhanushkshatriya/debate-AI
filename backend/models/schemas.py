from pydantic import BaseModel
from typing import List, Optional

class AnalyzeRequest(BaseModel):
    text: str
    format: str = "casual"

class DebateRequest(BaseModel):
    text: str
    topic: str = "General"
    format: str = "casual"
    history: list = []

class SpeechRequest(BaseModel):
    transcript: str
    duration: float = 60

class FallacyItem(BaseModel):
    name: str
    description: str
    icon: str = "⚠️"
    severity: str = "medium"
    fix: str = ""

class AnalysisResponse(BaseModel):
    score: int
    claim: str
    evidence: str
    reasoning: str
    fallacies: List[FallacyItem]
    missing_points: List[str]
    counter_argument: str
    suggestions: List[str]
    tone: str
    clarity: int
    persuasion: int
    logic: int
    evidence_score: int
    structure: int

class CounterResponse(BaseModel):
    counter_argument: str
    strength: str
    approach: str

class SpeechResponse(BaseModel):
    words_per_minute: int
    words_per_second: float
    total_words: int
    filler_words: dict
    total_fillers: int
    filler_rate: str
    confidence: int
    pace: str
    tone: str
    suggestions: List[str]
