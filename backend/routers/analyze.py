import re
from fastapi import APIRouter
from models.schemas import AnalyzeRequest
from services.ai_engine import ai_analyze

router = APIRouter()

FALLACY_PATTERNS = [
    {"name": "Ad Hominem", "pattern": r"you(?:'re| are)\s+(?:stupid|idiot|dumb|wrong|ignorant)", "desc": "Attacking the person rather than the argument", "icon": "🎯", "severity": "high", "fix": "Focus on the argument's logic, not the person."},
    {"name": "Strawman", "pattern": r"so you(?:'re| are) saying|what you really mean", "desc": "Misrepresenting the opponent's argument", "icon": "🌾", "severity": "high", "fix": "Address the actual argument being made."},
    {"name": "Appeal to Authority", "pattern": r"experts say|scientists believe|everyone knows|studies show", "desc": "Relying on authority without specific evidence", "icon": "👑", "severity": "medium", "fix": "Cite specific studies or data."},
    {"name": "False Dichotomy", "pattern": r"either\s+.+\s+or\s+", "desc": "Presenting only two options when more exist", "icon": "⚖️", "severity": "medium", "fix": "Acknowledge multiple options."},
    {"name": "Slippery Slope", "pattern": r"if we allow|next thing|lead to|inevitably", "desc": "Assuming one event causes extreme consequences", "icon": "🏔️", "severity": "medium", "fix": "Provide evidence for each causal step."},
    {"name": "Red Herring", "pattern": r"but what about|the real issue", "desc": "Introducing irrelevant topic", "icon": "🐟", "severity": "medium", "fix": "Stay focused on the topic."},
    {"name": "Appeal to Emotion", "pattern": r"think of the children|imagine if|how would you feel", "desc": "Using emotions instead of logic", "icon": "💔", "severity": "low", "fix": "Support emotional appeals with facts."},
    {"name": "Hasty Generalization", "pattern": r"all\s+\w+\s+are|every\s+\w+\s+is|always|never", "desc": "Broad conclusions from limited examples", "icon": "🏃", "severity": "medium", "fix": "Use representative samples."},
    {"name": "Circular Reasoning", "pattern": r"because it(?:'s| is)\s+(?:true|right|correct)", "desc": "Using the conclusion as a premise", "icon": "🔄", "severity": "high", "fix": "Provide independent evidence."},
    {"name": "Bandwagon", "pattern": r"everyone (?:does|thinks|believes)|most people|majority", "desc": "Appealing to popularity", "icon": "🚂", "severity": "low", "fix": "Evaluate on merits, not popularity."},
]

EVIDENCE_KW = ["study", "research", "data", "evidence", "statistic", "percent", "report", "survey", "found that", "according to"]
REASONING_KW = ["because", "therefore", "thus", "hence", "consequently", "as a result", "this means"]


def fallback_analyze(text: str) -> dict:
    words = text.split()
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    wc = len(words)
    fallacies = []
    for f in FALLACY_PATTERNS:
        if re.search(f["pattern"], text, re.IGNORECASE):
            fallacies.append({"name": f["name"], "description": f["desc"], "icon": f["icon"], "severity": f["severity"], "fix": f["fix"]})
    lower = text.lower()
    has_ev = any(k in lower for k in EVIDENCE_KW)
    has_re = any(k in lower for k in REASONING_KW)
    claim = sentences[0] if sentences else text[:100]
    ev_score = 25 if has_ev else 8
    re_score = 25 if has_re else 8
    str_score = 25 if len(sentences) >= 3 else len(sentences) * 8
    len_score = min(wc / 2, 25)
    penalty = len(fallacies) * 10
    score = max(10, min(100, round(len_score + ev_score + re_score + str_score - penalty)))
    logic = max(15, min(100, round(re_score * 3 + (20 if has_ev else 0) - penalty)))
    clarity = max(15, min(100, round(70 + (15 if len(sentences) >= 3 else 0) - (15 if wc > 200 else 0))))
    persuasion = max(15, min(100, round(score * 0.8 + (15 if has_ev else 0))))
    suggestions = []
    if not has_ev: suggestions.append("Add specific data or statistics")
    if not has_re: suggestions.append("Use logical connectors (because, therefore)")
    if fallacies: suggestions.append(f"Avoid: {', '.join(f['name'] for f in fallacies)}")
    if wc < 30: suggestions.append("Expand with more detail")
    if not suggestions: suggestions.append("Strong argument! Add a preemptive counter.")
    tone_val = "Aggressive" if re.search(r'!{2,}', text) else "Diplomatic" if re.search(r'please|might|perhaps', lower) else "Assertive" if re.search(r'must|clearly|obviously', lower) else "Neutral"
    return {"score": score, "claim": claim, "evidence": " ".join(s for s in sentences if any(k in s.lower() for k in EVIDENCE_KW)) or "No specific evidence cited", "reasoning": " ".join(s for s in sentences if any(k in s.lower() for k in REASONING_KW)) or "No explicit reasoning chain", "fallacies": fallacies, "missing_points": (["Quantitative evidence"] if not has_ev else []) + (["Opposing viewpoints"] if "however" not in lower else []), "counter_argument": f'While "{claim[:50]}..." raises points, it overlooks critical factors.', "suggestions": suggestions, "tone": tone_val, "clarity": clarity, "persuasion": persuasion, "logic": logic, "evidence_score": ev_score * 4, "structure": str_score * 4}


@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    result = await ai_analyze(req.text, req.topic, req.history, req.format)
    if not result:
        result = fallback_analyze(req.text)
    return result
