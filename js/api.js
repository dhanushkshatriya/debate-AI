// API service with client-side fallback analysis
const API_BASE = '/api';

const FALLACY_PATTERNS = [
  { name: 'Ad Hominem', pattern: /you('re| are)\s+(stupid|idiot|dumb|wrong|ignorant)/i, desc: 'Attacking the person rather than the argument', icon: '🎯', severity: 'high', fix: 'Focus on the argument\'s logic, not the person.' },
  { name: 'Strawman', pattern: /so you('re| are) saying|what you really mean/i, desc: 'Misrepresenting the opponent\'s argument', icon: '🌾', severity: 'high', fix: 'Address the actual argument being made.' },
  { name: 'Appeal to Authority', pattern: /experts say|scientists believe|everyone knows|studies show/i, desc: 'Relying on authority without specific evidence', icon: '👑', severity: 'medium', fix: 'Cite specific studies or data in the relevant field.' },
  { name: 'False Dichotomy', pattern: /either\s+.+\s+or\s+/i, desc: 'Presenting only two options when more exist', icon: '⚖️', severity: 'medium', fix: 'Acknowledge multiple options or middle grounds.' },
  { name: 'Slippery Slope', pattern: /if we allow|next thing|lead to|inevitably/i, desc: 'Assuming one event causes extreme consequences', icon: '🏔️', severity: 'medium', fix: 'Provide evidence for each step in the causal chain.' },
  { name: 'Red Herring', pattern: /but what about|the real issue/i, desc: 'Introducing an irrelevant topic to divert attention', icon: '🐟', severity: 'medium', fix: 'Stay focused on the topic at hand.' },
  { name: 'Appeal to Emotion', pattern: /think of the children|imagine if|how would you feel/i, desc: 'Using emotions instead of logic', icon: '💔', severity: 'low', fix: 'Support emotional appeals with facts.' },
  { name: 'Hasty Generalization', pattern: /all\s+\w+\s+are|every\s+\w+\s+is|always|never/i, desc: 'Drawing broad conclusions from limited examples', icon: '🏃', severity: 'medium', fix: 'Use representative samples; avoid "all" or "never".' },
  { name: 'Circular Reasoning', pattern: /because it('s| is)\s+(true|right|correct)/i, desc: 'Using the conclusion as a premise', icon: '🔄', severity: 'high', fix: 'Provide independent evidence.' },
  { name: 'Bandwagon', pattern: /everyone (does|thinks|believes)|most people|majority/i, desc: 'Arguing something is true because many believe it', icon: '🚂', severity: 'low', fix: 'Evaluate the argument on its own merits.' },
];

const EVIDENCE_KW = ['study', 'research', 'data', 'evidence', 'statistic', 'percent', 'report', 'survey', 'found that', 'according to', 'source', 'published'];
const REASONING_KW = ['because', 'therefore', 'thus', 'hence', 'consequently', 'as a result', 'this means', 'which leads to'];

async function analyzeArgument(text, format) {
  try {
    const res = await fetch(`${API_BASE}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, format }) });
    if (res.ok) return await res.json();
  } catch (e) {}
  return clientAnalysis(text);
}

async function getCounterArgument(text, format, history, topic) {
  try {
    const res = await fetch(`${API_BASE}/debate`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ text, format, history, topic }) 
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return clientCounter(text);
}

async function analyzeSpeechAPI(transcript, duration) {
  try {
    const res = await fetch(`${API_BASE}/speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript, duration }) });
    if (res.ok) return await res.json();
  } catch (e) {}
  return clientSpeechAnalysis(transcript, duration);
}

function clientAnalysis(text) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const wc = words.length;
  const fallacies = FALLACY_PATTERNS.filter(f => f.pattern.test(text)).map(f => ({ name: f.name, description: f.desc, icon: f.icon, severity: f.severity, fix: f.fix }));
  const hasEvidence = EVIDENCE_KW.some(k => text.toLowerCase().includes(k));
  const hasReasoning = REASONING_KW.some(k => text.toLowerCase().includes(k));
  const claim = sentences[0]?.trim() || text.substring(0, 100);
  const evSentences = sentences.filter(s => EVIDENCE_KW.some(k => s.toLowerCase().includes(k)));
  const reSentences = sentences.filter(s => REASONING_KW.some(k => s.toLowerCase().includes(k)));
  const lenScore = Math.min(wc / 2, 25), evScore = hasEvidence ? 25 : 8, reScore = hasReasoning ? 25 : 8;
  const strScore = sentences.length >= 3 ? 25 : sentences.length * 8;
  const penalty = fallacies.length * 10;
  const score = Math.max(10, Math.min(100, Math.round(lenScore + evScore + reScore + strScore - penalty)));
  const logic = Math.max(15, Math.min(100, Math.round(reScore * 3 + (hasEvidence ? 20 : 0) - penalty)));
  const clarity = Math.max(15, Math.min(100, Math.round(70 + (sentences.length >= 3 ? 15 : 0) - (wc > 200 ? 15 : 0))));
  const persuasion = Math.max(15, Math.min(100, Math.round(score * 0.8 + (hasEvidence ? 15 : 0))));
  const suggestions = [];
  if (!hasEvidence) suggestions.push('Add specific data, studies, or statistics to support your claims');
  if (!hasReasoning) suggestions.push('Use logical connectors (because, therefore) to strengthen reasoning');
  if (fallacies.length) suggestions.push('Avoid ' + fallacies.map(f => f.name).join(', '));
  if (wc < 30) suggestions.push('Expand your argument with more detail and supporting points');
  if (sentences.length < 3) suggestions.push('Structure into clear claim, evidence, and reasoning sections');
  if (!suggestions.length) suggestions.push('Strong argument! Consider adding a preemptive counter to opposing views');
  const missing = [];
  if (!hasEvidence) missing.push('Quantitative or qualitative evidence');
  if (!text.toLowerCase().includes('however') && !text.toLowerCase().includes('although')) missing.push('Acknowledgment of opposing viewpoints');
  const counters = [
    `While "${claim.substring(0, 50)}..." raises valid points, it overlooks critical factors. The evidence lacks specificity and the reasoning fails to account for alternative explanations.`,
    `This perspective relies on assumptions that don't hold under scrutiny. The opposite position has substantial empirical support.`,
    `The claim conflates correlation with causation. More rigorous analysis would require controlling for confounding variables.`
  ];
  const tone = /!{2,}/.test(text) || (text === text.toUpperCase() && text.length > 10) ? 'Aggressive' : /please|might|perhaps/i.test(text) ? 'Diplomatic' : /must|clearly|obviously/i.test(text) ? 'Assertive' : /i think|i believe/i.test(text) ? 'Moderate' : 'Neutral';
  return { score, claim, evidence: evSentences.join('. ') || 'No specific evidence cited', reasoning: reSentences.join('. ') || 'No explicit reasoning chain detected', fallacies, missing_points: missing, counter_argument: counters[Math.floor(Math.random() * counters.length)], suggestions, tone, clarity, persuasion, logic, evidence_score: evScore * 4, structure: strScore * 4 };
}

function clientCounter(text) {
  const s = text.split(/[.!?]+/)[0]?.trim() || text.substring(0, 80);
  return {
    counter_argument: `I respectfully disagree with "${s}". While this position has surface-level appeal, it fails to account for critical factors. Multiple peer-reviewed studies have found contradictory results. This argument commits a common logical error by assuming correlation implies causation. A more nuanced view would acknowledge the complexity and consider alternative frameworks.`,
    strength: 'Strong', approach: 'Evidence-based rebuttal with logical analysis'
  };
}

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'honestly', 'right', 'sort of', 'kind of', 'i mean'];

function clientSpeechAnalysis(transcript, duration) {
  const words = transcript.split(/\s+/).filter(w => w.length > 0);
  const wc = words.length, dur = duration || 60;
  const wpm = Math.round((wc / dur) * 60);
  const fillerCount = {};
  let totalFillers = 0;
  FILLER_WORDS.forEach(f => { const m = transcript.match(new RegExp(`\\b${f}\\b`, 'gi')); if (m) { fillerCount[f] = m.length; totalFillers += m.length; } });
  const fillerRate = ((totalFillers / wc) * 100).toFixed(1);
  const confidence = Math.max(20, Math.min(100, Math.round(80 - fillerRate * 5 + (wpm > 120 && wpm < 160 ? 15 : 0) - (wpm > 180 ? 10 : 0))));
  return { words_per_minute: wpm, words_per_second: +(wc / dur).toFixed(1), total_words: wc, filler_words: fillerCount, total_fillers: totalFillers, filler_rate: fillerRate + '%', confidence, pace: wpm < 100 ? 'Slow' : wpm < 140 ? 'Moderate' : wpm < 170 ? 'Good' : 'Fast', tone: 'Neutral', suggestions: [ totalFillers > 3 ? `Reduce filler words (found ${totalFillers}). Try pausing instead.` : 'Great job minimizing filler words!', wpm < 100 ? 'Speak slightly faster for engagement' : wpm > 170 ? 'Slow down for clarity' : 'Excellent speaking pace' ] };
}
