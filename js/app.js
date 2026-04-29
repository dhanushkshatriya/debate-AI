// Main application controller
let currentPage = 'landing';
let currentFormat = 'casual';
let currentDebateId = null;
let speechDuration = 0;
let currentHistory = [];
let debateStatus = 'ongoing'; // 'ongoing', 'ai_win', 'user_win'
let debateRound = 0;
let allAnalyses = []; // track per-round analysis for final scoring

// Navigation
function navigate(page, params) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) { el.classList.add('active'); currentPage = page; }
  
  // Hide nav links for login/landing pages
  document.querySelectorAll('.navbar').forEach(nav => {
    if (page === 'login' || page === 'landing') {
      nav.style.display = 'none';
    } else {
      nav.style.display = 'flex';
    }
  });

  // Update nav active states
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll(`.nav-link`).forEach(l => {
    if (l.textContent.trim().toLowerCase().includes(page)) l.classList.add('active');
  });
  window.scrollTo(0, 0);
  if (page === 'dashboard') renderDashboard();
  else if (page === 'debate') renderDebatePage();
  else if (page === 'report') renderReport(params);
  else if (page === 'profile') renderProfile();
  lucide.createIcons();
}

// Toast notifications
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}



// Score gauge SVG
function gaugeHTML(score, label, color) {
  if (!color) color = score >= 80 ? '#30d158' : score >= 60 ? '#06b6d4' : score >= 40 ? '#ff9f0a' : '#ff2d55';
  const r = 36, c = 2 * Math.PI * r, off = c - (score / 100) * c;
  return `<div class="gauge"><div class="gauge-circle"><svg width="90" height="90" viewBox="0 0 90 90"><circle class="gauge-bg" cx="45" cy="45" r="${r}"/><circle class="gauge-fill" cx="45" cy="45" r="${r}" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${off}" style="filter:drop-shadow(0 0 6px ${color}40)"/></svg><div class="gauge-value" style="color:${color}">${score}</div></div><div class="gauge-label">${label}</div></div>`;
}



// ========== DASHBOARD ==========
function renderDashboard() {
  const p = getProfile(), debates = getStore().debates;
  document.getElementById('dash-username').textContent = p.name;
  document.getElementById('dash-subtitle').textContent = debates.length === 0 ? 'Start your first debate to see analytics!' : `You've completed ${debates.length} debate${debates.length > 1 ? 's' : ''}. Keep improving!`;
  
  // Stats
  const avg = getAvgScore();
  document.getElementById('dash-stats').innerHTML = [
    { l: 'Avg Score', v: avg || '—', icon: 'target', c: '#06b6d4' },
    { l: 'Total Debates', v: debates.length, icon: 'swords', c: '#8b5cf6' },
    { l: 'Fallacies Found', v: p.totalFallaciesFound, icon: 'search', c: '#ff2d55' },
    { l: 'Counters Generated', v: p.totalCounters, icon: 'shield', c: '#30d158' },
  ].map(s => `<div class="glass-card stat-card"><div class="stat-card-label"><i data-lucide="${s.icon}" style="color:${s.c}"></i>${s.l}</div><div class="stat-card-value" style="color:${s.c}">${s.v}</div></div>`).join('');

  // Charts
  const m = getAvgMetrics();
  if (debates.length > 0) renderRadarChart(m);
  const hist = getScoreHistory();
  if (hist.length > 1) renderTrendChart(hist);

  // Recent debates
  const rd = document.getElementById('recent-debates');
  const recent = getRecentDebates(5);
  if (recent.length === 0) rd.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">No debates yet. Start your first one!</div>';
  else rd.innerHTML = recent.map((d, i) => {
    const sc = d.analysis?.score || 0;
    const col = sc >= 80 ? '#30d158' : sc >= 60 ? '#06b6d4' : sc >= 40 ? '#ff9f0a' : '#ff2d55';
    const date = new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const tags = (d.analysis?.fallacies || []).slice(0, 2).map(f => `<span class="fallacy-tag">${f.name || f}</span>`).join('');
    return `<div class="glass-card-hover debate-item" onclick="navigate('report',${d.id})" style="animation-delay:${i*0.1}s"><div class="debate-item-text"><p>${d.topic || d.argument?.substring(0, 80) || 'Debate'}</p><div class="debate-item-meta"><span>📅 ${date}</span><span style="background:rgba(139,92,246,.15);color:#a78bfa;padding:2px 8px;border-radius:50px">${d.format || 'casual'}</span></div>${tags ? '<div class="fallacy-tags">'+tags+'</div>' : ''}</div><div class="debate-score-badge" style="background:${col}15;color:${col};border:1px solid ${col}30">${sc}</div></div>`;
  }).join('');

  lucide.createIcons();
}

// ========== DEBATE PAGE ==========
function renderDebatePage() {
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFormat = btn.dataset.format;
    };
  });
  const topicInput = document.getElementById('debate-topic');
  if (!topicInput.value) {
    randomizeTopic();
  }
  lucide.createIcons();
}

function randomizeTopic() {
  const topicInput = document.getElementById('debate-topic');
  const pastDebates = getStore().debates || [];
  const usedTopics = new Set(pastDebates.map(d => d.topic?.toLowerCase().trim()));
  
  // Find topics that haven't been used yet
  let availableTopics = TOPICS.filter(t => !usedTopics.has(t.toLowerCase().trim()));
  
  // If all topics used, reset available topics
  if (availableTopics.length === 0) {
    availableTopics = TOPICS;
  }
  
  topicInput.value = availableTopics[Math.floor(Math.random() * availableTopics.length)];
}

function resetDebate() {
  document.getElementById('argument-input').value = '';
  document.getElementById('thread-messages').innerHTML = '';
  document.getElementById('thread-placeholder').style.display = '';
  document.getElementById('analysis-placeholder').style.display = '';
  const ls = document.getElementById('live-scores');
  if (ls) ls.style.display = 'none';
  document.getElementById('debate-status-bar').style.display = 'none';
  document.getElementById('debate-final-report').style.display = 'none';
  document.getElementById('debate-input-panel').style.display = '';
  currentHistory = [];
  debateStatus = 'ongoing';
  debateRound = 0;
  allAnalyses = [];
  currentDebateId = null;
  const btn = document.getElementById('analyze-btn');
  btn.disabled = false;
  btn.innerHTML = '<i data-lucide="send"></i> Submit Argument';
  
  const endBtn = document.getElementById('end-debate-btn');
  if (endBtn) {
    endBtn.disabled = false;
    endBtn.innerHTML = '<i data-lucide="square"></i> End Debate';
  }
  const giveUpBtn = document.getElementById('give-up-btn');
  if (giveUpBtn) {
    giveUpBtn.disabled = false;
    giveUpBtn.innerHTML = '<i data-lucide="flag"></i> Give Up';
  }
  
  lucide.createIcons();
}

function addMessageToThread(role, content, score) {
  document.getElementById('thread-placeholder').style.display = 'none';
  const container = document.getElementById('thread-messages');
  const isUser = role === 'user';
  const round = isUser ? debateRound : '';
  const scoreTag = score ? `<span class="msg-score" style="color:${score >= 70 ? '#30d158' : score >= 50 ? '#ff9f0a' : '#ff2d55'}">${score}/100</span>` : '';
  const div = document.createElement('div');
  div.className = `thread-msg ${isUser ? 'msg-user' : 'msg-ai'} animate-fade-in`;
  div.innerHTML = `
    <div class="msg-header">
      <span class="msg-role">${isUser ? '🧑 You' : '🤖 AI'}${round ? ` · Round ${round}` : ''}</span>
      ${scoreTag}
    </div>
    <div class="msg-content">${content}</div>`;
  container.appendChild(div);
  // Auto-scroll to bottom
  const thread = document.getElementById('debate-thread');
  thread.scrollTop = thread.scrollHeight;
}

let userTurnTimer = null;
let userTurnCountdown = null;
let timeLeft = 30;

function startUserTimer() {
  clearTimeout(userTurnTimer);
  clearInterval(userTurnCountdown);
  if (debateStatus !== 'ongoing') return;
  
  timeLeft = 30;
  const statusEl = document.getElementById('debate-status-text');
  statusEl.textContent = `Your turn — respond to the AI (${timeLeft}s left)`;
  
  userTurnCountdown = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
      statusEl.textContent = `Your turn — respond to the AI (${timeLeft}s left)`;
    } else {
      clearInterval(userTurnCountdown);
    }
  }, 1000);
  
  userTurnTimer = setTimeout(() => {
    handleUserTimeout();
  }, 30000);
}

function resetUserTimer() {
  if (debateStatus === 'ongoing' && userTurnTimer) {
    startUserTimer();
  }
}

async function handleUserTimeout() {
    debateStatus = 'ai_win';
    addMessageToThread('system_msg', '⏳ You took too long to respond! AI wins by default.');
    document.getElementById('debate-status-text').textContent = 'Time out — AI wins';
    document.getElementById('debate-input-panel').style.display = 'none';
    await showFinalReport('ai');
}

async function submitArgument() {
  const text = document.getElementById('argument-input').value.trim();
  const topic = document.getElementById('debate-topic').value;
  if (!text || text.length < 2) { showToast('Please enter an argument first', 'error'); return; }
  if (debateStatus !== 'ongoing') { showToast('This debate has concluded. Start a new one!', 'info'); return; }

  debateRound++;
  clearTimeout(userTurnTimer);
  clearInterval(userTurnCountdown);
  const btn = document.getElementById('analyze-btn');
  btn.disabled = true;
  let elapsed = 0;
  const timerInterval = setInterval(() => { elapsed++; btn.innerHTML = `<span class="loading-spinner"></span> Thinking... ${elapsed}s`; }, 1000);
  btn.innerHTML = '<span class="loading-spinner"></span> Thinking... 0s';

  // Show status bar
  document.getElementById('debate-status-bar').style.display = '';
  document.getElementById('round-badge').textContent = `Round ${debateRound}`;
  document.getElementById('debate-status-text').textContent = 'AI is analyzing...';

  // Add user message to thread immediately
  addMessageToThread('user', text);
  document.getElementById('argument-input').value = '';

  currentHistory.push({ role: 'user', content: text });

  let speechData = null;
  if (typeof isRecording !== 'undefined' && isRecording) { const r = stopRecording(); speechDuration = r.duration; }
  else if (window.lastSpeechDuration) { speechDuration = window.lastSpeechDuration; window.lastSpeechDuration = 0; }

  try {
    const HARD_TIMEOUT = 30000;
    const [analysis, counterRes] = await Promise.race([
      Promise.all([
        analyzeArgument(text, currentFormat),
        getCounterArgument(text, currentFormat, currentHistory, topic)
      ]),
      new Promise((_, rej) => setTimeout(() => rej(new Error('HARD_TIMEOUT')), HARD_TIMEOUT))
    ]);

    allAnalyses.push(analysis);
    const counterText = counterRes?.counter_argument || analysis.counter_argument;
    currentHistory.push({ role: 'ai', content: counterText });
    debateStatus = counterRes?.status || 'ongoing';

    addMessageToThread('ai', counterText);
    addMessageToThread('user_score', '', analysis.score); // hidden, just for score display
    updateLiveScores(analysis);
    processDebateResult(analysis, speechData);
    addDebate({ argument: text, topic, format: currentFormat, analysis, counter: counterText, history: currentHistory, status: debateStatus, speechData });

    if (debateStatus !== 'ongoing') {
      let forced = null;
      if (debateStatus === 'user_win') forced = 'user';
      if (debateStatus === 'ai_win') forced = 'ai';
      endDebate(forced);
      return;
    }
    startUserTimer();
  } catch (e) {
    console.error('Analysis error:', e.message);
    if (e.message === 'HARD_TIMEOUT') {
      debateStatus = 'user_win';
      addMessageToThread('system_msg', '🤖 AI took too long to respond (30s)! You win by default.');
      document.getElementById('debate-status-text').textContent = 'AI Time out — You win';
      document.getElementById('debate-input-panel').style.display = 'none';
      await showFinalReport('user');
    } else {
      const la = clientAnalysis(text);
      const lc = clientCounter(text);
      allAnalyses.push(la);
      currentHistory.push({ role: 'ai', content: lc.counter_argument });
      addMessageToThread('ai', lc.counter_argument);
      updateLiveScores(la);
      processDebateResult(la, null);
      addDebate({ argument: text, topic, format: currentFormat, analysis: la, counter: lc.counter_argument, history: currentHistory, status: lc.status || 'ongoing', speechData: null });
      
      if (lc.status && lc.status !== 'ongoing') {
        let forced = null;
        if (lc.status === 'user_win') forced = 'user';
        if (lc.status === 'ai_win') forced = 'ai';
        endDebate(forced);
        return;
      }
      startUserTimer();
    }
  }

  clearInterval(timerInterval);
  btn.disabled = false;
  btn.innerHTML = '<i data-lucide="send"></i> Reply';
  lucide.createIcons();
}

function updateLiveScores(analysis) {
  document.getElementById('analysis-placeholder').style.display = 'none';
  const ls = document.getElementById('live-scores');
  if (ls) ls.style.display = '';

  document.getElementById('score-gauges').innerHTML = [
    gaugeHTML(analysis.score, 'Overall'),
    gaugeHTML(analysis.logic, 'Logic', '#8b5cf6'),
    gaugeHTML(analysis.clarity, 'Clarity', '#06b6d4'),
    gaugeHTML(analysis.persuasion, 'Persuasion', '#30d158'),
  ].join('');

  const fa = document.getElementById('fallacy-alerts');
  if (analysis.fallacies && analysis.fallacies.length > 0) {
    fa.innerHTML = `<h3><span style="color:#ff2d55">⚠️</span> Fallacies (${analysis.fallacies.length})</h3>` +
      analysis.fallacies.map(f => {
        const col = f.severity === 'high' ? '#ff2d55' : f.severity === 'medium' ? '#ff9f0a' : '#30d158';
        return `<div style="display:flex;gap:8px;padding:8px;margin-top:8px;background:${col}10;border-radius:8px;border-left:3px solid ${col}"><span>${f.icon||'⚠️'}</span><div><strong style="font-size:.85rem">${f.name}</strong><p style="font-size:.8rem;color:var(--text-sec);margin:2px 0">${f.description}</p></div></div>`;
      }).join('');
  } else {
    fa.innerHTML = `<div style="display:flex;align-items:center;gap:8px"><span>✨</span><span style="color:var(--neon-green);font-size:.9rem;font-weight:600">No Fallacies Detected</span></div>`;
  }

  document.getElementById('suggestions-panel').innerHTML = `<h3><span style="color:var(--neon-green)">💡</span> Tips</h3>` +
    (analysis.suggestions || []).slice(0, 3).map(s => `<div class="suggestion-item"><div class="suggestion-dot"></div><span style="font-size:.85rem">${s}</span></div>`).join('');
  lucide.createIcons();
}

async function giveUpDebate() {
  debateStatus = 'ai_win';
  addMessageToThread('system_msg', '🏳️ You conceded the debate.');
  document.getElementById('debate-status-text').textContent = 'You gave up — AI wins';
  document.getElementById('debate-input-panel').style.display = 'none';
  await showFinalReport('ai');
}

async function endDebate(forceWinner) {
  if (currentHistory.length < 2) { showToast('Debate at least 1 round first', 'error'); return; }
  debateStatus = 'ended';
  document.getElementById('debate-input-panel').style.display = 'none';
  document.getElementById('debate-status-text').textContent = 'Evaluating debate...';
  document.getElementById('give-up-btn').disabled = true;
  document.getElementById('end-debate-btn').disabled = true;
  await showFinalReport(forceWinner);
}

async function showFinalReport(forceWinner) {
  clearTimeout(userTurnTimer);
  clearInterval(userTurnCountdown);
  
  // Disable both buttons immediately to prevent double-judging
  const endBtn = document.getElementById('end-debate-btn');
  const giveUpBtn = document.getElementById('give-up-btn');
  if (endBtn) {
    endBtn.disabled = true;
    endBtn.innerHTML = '<span class="loading-spinner"></span> Judging...';
  }
  if (giveUpBtn) giveUpBtn.disabled = true;
  
  const topic = document.getElementById('debate-topic').value;
  let result;
  try {
    result = await evaluateDebate(topic, currentHistory);
  } catch (e) {
    result = { winner: 'draw', score: 50, summary: 'Could not evaluate. Both sides debated well.' };
  }
  if (forceWinner) result.winner = forceWinner;

  const avgScore = allAnalyses.length ? Math.round(allAnalyses.reduce((s, a) => s + (a.score || 0), 0) / allAnalyses.length) : 50;
  const avgLogic = allAnalyses.length ? Math.round(allAnalyses.reduce((s, a) => s + (a.logic || 0), 0) / allAnalyses.length) : 50;
  const avgClarity = allAnalyses.length ? Math.round(allAnalyses.reduce((s, a) => s + (a.clarity || 0), 0) / allAnalyses.length) : 50;
  const avgPersuasion = allAnalyses.length ? Math.round(allAnalyses.reduce((s, a) => s + (a.persuasion || 0), 0) / allAnalyses.length) : 50;

  const isWin = result.winner === 'user';
  const isDraw = result.winner === 'draw' || result.winner === 'none';
  const winColor = isWin ? '#30d158' : isDraw ? '#ff9f0a' : '#ff2d55';
  const winEmoji = isWin ? '🏆' : isDraw ? '🤝' : '🤖';
  const winText = isWin ? 'YOU WIN!' : isDraw ? 'DRAW' : 'AI WINS';

  // Hide the status bar so the user doesn't see the stuck 'Judging' button
  document.getElementById('debate-status-bar').style.display = 'none';
  
  const report = document.getElementById('debate-final-report');
  report.style.display = '';
  document.getElementById('final-report-body').innerHTML = `
    <div class="glass-card" style="text-align:center;padding:40px 20px;margin-bottom:24px;background:radial-gradient(ellipse at top, ${winColor}20, transparent 70%), rgba(10,10,15,0.6);border-top:4px solid ${winColor}">
      <div style="font-size:5rem;margin-bottom:12px;filter:drop-shadow(0 0 20px ${winColor}80)">${winEmoji}</div>
      <h2 style="font-size:2.5rem;color:${winColor};margin:0;letter-spacing:-0.04em;text-transform:uppercase">${winText}</h2>
      
      <div style="display:flex;gap:12px;justify-content:center;margin-top:24px">
        <div style="background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.3);border-radius:100px;padding:8px 20px;font-size:.9rem;color:#06b6d4;font-weight:600">📊 ${debateRound} Rounds</div>
        <div style="background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.3);border-radius:100px;padding:8px 20px;font-size:.9rem;color:#a78bfa;font-weight:600">💬 ${currentHistory.length} Messages</div>
      </div>
    </div>
    
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:24px;margin-bottom:24px">
      <div class="glass-card report-section" style="margin:0;grid-column:1/-1">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px"><i data-lucide="graduation-cap" style="color:#8b5cf6;width:32px;height:32px"></i><h3 style="margin:0;font-size:1.4rem">Mentor's Final Verdict</h3></div>
        <p style="color:var(--text-sec);line-height:1.7;font-size:1.1rem;margin:0">${result.mentor_advice || result.summary || 'The debate has concluded.'}</p>
      </div>

      <div class="glass-card report-section" style="margin:0;grid-column:1/-1;display:flex;justify-content:space-around;flex-wrap:wrap">
        ${gaugeHTML(avgScore, 'Avg Score')}${gaugeHTML(avgLogic, 'Logic', '#8b5cf6')}${gaugeHTML(avgClarity, 'Clarity', '#06b6d4')}${gaugeHTML(avgPersuasion, 'Persuasion', '#30d158')}
      </div>

      <div class="glass-card report-section" style="margin:0"><h3 style="color:#30d158;display:flex;align-items:center;gap:8px"><i data-lucide="trending-up"></i> Key Strengths</h3><ul style="color:var(--text-sec);padding-left:20px;margin-top:12px;line-height:1.6">${((result.strengths && result.strengths.length) ? result.strengths : (result.user_strengths && result.user_strengths.length) ? result.user_strengths : ['Participated actively', 'Presented logical arguments']).map(s => `<li style="margin-bottom:8px">${s}</li>`).join('')}</ul></div>
      <div class="glass-card report-section" style="margin:0"><h3 style="color:#ff9f0a;display:flex;align-items:center;gap:8px"><i data-lucide="target"></i> Areas to Improve</h3><ul style="color:var(--text-sec);padding-left:20px;margin-top:12px;line-height:1.6">${((result.weaknesses && result.weaknesses.length) ? result.weaknesses : (result.user_weaknesses && result.user_weaknesses.length) ? result.user_weaknesses : (result.key_points_missed && result.key_points_missed.length) ? result.key_points_missed : ['Structure arguments more clearly', 'Add more empirical evidence']).map(s => `<li style="margin-bottom:8px">${s}</li>`).join('')}</ul></div>
    </div>
    
    <div style="display:flex;justify-content:center;gap:16px;margin-top:32px;flex-wrap:wrap">
      <button class="btn-primary" onclick="resetDebate()"><i data-lucide="plus"></i> New Debate</button>
      <button class="btn-secondary" onclick="navigate('dashboard')"><i data-lucide="layout-dashboard"></i> Dashboard</button>
      <button class="btn-secondary" onclick="downloadReport()"><i data-lucide="download"></i> Download Report</button>
    </div>`;

  document.getElementById('debate-status-text').textContent = `Debate concluded — ${winText}`;
  report.scrollIntoView({ behavior: 'smooth' });
  lucide.createIcons();
}


// ========== REPORT PAGE ==========
function renderReport(id) {
  const did = id || currentDebateId;
  const debate = did ? getDebateById(did) : getStore().debates[0];
  const body = document.getElementById('report-body');
  if (!debate) { body.innerHTML = '<div style="text-align:center;padding:80px;color:var(--text-muted)"><p style="font-size:1.2rem;margin-bottom:16px">No debate report found</p><button class="btn-primary" onclick="navigate(\'debate\')"><i data-lucide="swords"></i> Start a Debate</button></div>'; lucide.createIcons(); return; }
  const a = debate.analysis || {}, date = new Date(debate.timestamp).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  let html = `<div class="report-meta" style="justify-content:center;margin-bottom:32px;background:rgba(255,255,255,0.03);padding:12px;border-radius:100px;border:1px solid rgba(255,255,255,0.05)"><span>📅 ${date}</span><span>💬 ${debate.format || 'casual'}</span><span>📝 ${debate.argument?.split(/\s+/).length || 0} words</span></div>
    
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:24px;margin-bottom:24px">
      <div class="glass-card report-section" style="margin:0;border-top:4px solid #8b5cf6;grid-column:1/-1">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px"><i data-lucide="graduation-cap" style="color:#8b5cf6;width:32px;height:32px"></i><h3 style="margin:0;font-size:1.4rem">Mentor's Feedback</h3></div>
        <p style="color:var(--text-sec);line-height:1.7;font-size:1.1rem">${a.mentor_advice || a.summary || 'Good debate!'}</p>
      </div>
      
      <div class="glass-card report-section" style="margin:0;grid-column:1/-1;display:flex;justify-content:space-around;flex-wrap:wrap">
        ${gaugeHTML(a.score||0, 'Overall')}${gaugeHTML(a.logic||0, 'Logic', '#8b5cf6')}${gaugeHTML(a.clarity||0, 'Clarity', '#06b6d4')}${gaugeHTML(a.persuasion||0, 'Persuasion', '#30d158')}
      </div>

      <div class="glass-card report-section" style="margin:0"><h3 style="color:#30d158;display:flex;align-items:center;gap:8px"><i data-lucide="trending-up"></i> Strengths</h3><ul style="color:var(--text-sec);padding-left:20px;margin-top:12px;line-height:1.6">${(a.strengths||[]).map(s=>`<li style="margin-bottom:8px">${s}</li>`).join('')}</ul></div>
      <div class="glass-card report-section" style="margin:0"><h3 style="color:#ff9f0a;display:flex;align-items:center;gap:8px"><i data-lucide="target"></i> Areas to Improve</h3><ul style="color:var(--text-sec);padding-left:20px;margin-top:12px;line-height:1.6">${(a.weaknesses||[]).map(s=>`<li style="margin-bottom:8px">${s}</li>`).join('')}</ul></div>
    </div>

    <div class="glass-card report-section" style="margin-bottom:24px"><h3>📌 Topic</h3><p style="color:var(--text);font-size:1.1rem;line-height:1.6">${debate.topic || 'General debate'}</p></div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
      <div class="glass-card report-section" style="margin:0;border-left:3px solid #06b6d4"><h3 style="color:#06b6d4">📝 Your Argument</h3><p style="color:var(--text-sec);line-height:1.7">${debate.argument}</p></div>
      <div class="glass-card report-section" style="margin:0;border-left:3px solid #ff2d55"><h3 style="color:#ff2d55">⚔️ AI Counterargument</h3><p style="color:var(--text-sec);line-height:1.7">${debate.counter || a.counter_argument || 'None provided'}</p></div>
    </div>
    
    <div class="glass-card report-section" style="margin-bottom:24px"><h3>📋 Argument Breakdown</h3>
      <div style="display:grid;gap:12px;margin-top:16px">
        <div style="background:rgba(255,255,255,0.03);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.05)"><div style="color:#a78bfa;font-weight:600;margin-bottom:8px">Claim</div><div style="color:var(--text-sec)">${a.claim||'N/A'}</div></div>
        <div style="background:rgba(255,255,255,0.03);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.05)"><div style="color:#30d158;font-weight:600;margin-bottom:8px">Evidence</div><div style="color:var(--text-sec)">${a.evidence||'N/A'}</div></div>
        <div style="background:rgba(255,255,255,0.03);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.05)"><div style="color:#06b6d4;font-weight:600;margin-bottom:8px">Reasoning</div><div style="color:var(--text-sec)">${a.reasoning||'N/A'}</div></div>
      </div>
    </div>`;

  if (a.fallacies && a.fallacies.length) {
    html += `<div class="glass-card report-section" style="margin-bottom:24px"><h3><span style="color:#ff2d55">⚠️</span> Fallacies Detected (${a.fallacies.length})</h3>${a.fallacies.map(f => `<div style="display:flex;gap:12px;padding:16px;background:rgba(255,45,85,.05);border-radius:16px;border-left:4px solid #ff2d55;margin-top:12px"><span style="font-size:1.5rem">${f.icon||'⚠️'}</span><div><strong style="color:white;font-size:1.1rem">${f.name}</strong><p style="font-size:.95rem;color:var(--text-sec);margin-top:6px">${f.description}</p></div></div>`).join('')}</div>`;
  }
  
  html += `<div class="glass-card report-section" style="margin-bottom:32px"><h3>💡 Pro Tips</h3><div style="margin-top:16px">${(a.suggestions||[]).map(s => `<div class="suggestion-item" style="background:rgba(48,209,88,0.05);border:1px solid rgba(48,209,88,0.1);padding:12px 16px;border-radius:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px"><div class="suggestion-dot" style="background:#30d158"></div><span style="color:var(--text-sec)">${s}</span></div>`).join('')}</div></div>
    <div style="display:flex;justify-content:center;gap:16px;margin-top:40px;flex-wrap:wrap">
      <button class="btn-primary" onclick="navigate('debate')"><i data-lucide="swords"></i> New Debate</button>
      <button class="btn-secondary" onclick="downloadReport(${did})"><i data-lucide="download"></i> Download Report</button>
    </div>`;
    
  body.innerHTML = html;
  lucide.createIcons();
}

window.downloadReport = async function(id) {
  let sourceElement;
  if (document.getElementById('page-report').classList.contains('active')) {
    sourceElement = document.getElementById('report-body');
  } else {
    sourceElement = document.getElementById('final-report-body');
  }
  
  if (!sourceElement || !sourceElement.innerHTML.trim()) {
    showToast('Report content is empty or not found.', 'error');
    return;
  }

  showToast('Preparing PDF Document...', 'info');

  // 1. Create a dedicated print window
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  
  // 2. Generate specialized Print HTML
  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Debate AI - Analysis Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
      <style>
        :root { --primary: #06b6d4; --bg: #050508; --card: #0f172a; --text: #f8fafc; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { 
          background: var(--bg) !important; 
          color: var(--text) !important; 
          font-family: 'Outfit', sans-serif; 
          margin: 0; padding: 40px; 
        }
        .container { max-width: 800px; margin: 0 auto; }
        .header { border-bottom: 3px solid var(--primary); padding-bottom: 20px; margin-bottom: 40px; }
        .header h1 { margin: 0; font-size: 32px; color: var(--primary); }
        .glass-card, .report-section { 
          background: var(--card) !important; 
          border: 1px solid #1e293b !important; 
          padding: 30px !important; 
          border-radius: 16px !important; 
          margin-bottom: 24px !important;
          break-inside: avoid;
        }
        .gauge-circle { width: 90px; height: 90px; position: relative; margin: 0 auto 10px; }
        svg { transform: rotate(-90deg); }
        .gauge-bg { fill: none; stroke: #1e293b; stroke-width: 8; }
        .gauge-fill { fill: none; stroke-width: 8; stroke-linecap: round; }
        .gauge-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: 800; font-size: 20px; }
        .gauge-label { text-align: center; font-size: 14px; opacity: 0.8; }
        .fallacy-tag { background: rgba(255,45,85,0.1); color: #ff2d55; padding: 4px 10px; border-radius: 6px; font-size: 12px; margin-right: 5px; }
        button, .nav-links, .pulse-ring { display: none !important; }
        h1, h2, h3 { color: var(--primary); margin-top: 0; }
        p { line-height: 1.6; opacity: 0.9; }
        .suggestion-item { background: rgba(48,209,88,0.05); padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #30d158; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>DEBATE ANALYSIS REPORT</h1>
          <p>Analytical Audit • Neural Void AI Engine</p>
        </div>
        ${sourceElement.innerHTML}
      </div>
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
            // Optional: window.close();
          }, 1000);
        };
      <\/script>
    </body>
    </html>
  `;

  printWindow.document.write(printHtml);
  printWindow.document.close();
};

// ========== PROFILE PAGE ==========
function renderProfile() {
  const p = getProfile(), debates = getStore().debates;
  const el = document.getElementById('profile-content');
  el.innerHTML = `<div class="profile-header"><div class="profile-avatar">🗣️</div><div class="profile-info"><h1 class="neon-text">${p.name}</h1><p class="text-muted">Joined ${new Date(p.joinedDate).toLocaleDateString()}</p></div></div>
    <div class="profile-stats">${[
      { l: 'Debates', v: p.debatesCompleted, c: '#8b5cf6', i: 'swords' },
      { l: 'Avg Score', v: getAvgScore() || '—', c: '#06b6d4', i: 'target' },
      { l: 'Fallacies Found', v: p.totalFallaciesFound, c: '#ff2d55', i: 'search' },
      { l: 'Counters Generated', v: p.totalCounters, c: '#00fff5', i: 'shield' },
    ].map(s => `<div class="glass-card stat-card"><div class="stat-card-label"><i data-lucide="${s.i}" style="color:${s.c}"></i>${s.l}</div><div class="stat-card-value" style="color:${s.c}">${s.v}</div></div>`).join('')}</div>
    <div class="glass-card"><h3 style="margin-bottom:16px">📜 Debate History</h3>${debates.length ? debates.slice(0,10).map((d,i) => {
      const sc = d.analysis?.score || 0;
      const col = sc >= 80 ? '#30d158' : sc >= 60 ? '#06b6d4' : sc >= 40 ? '#ff9f0a' : '#ff2d55';
      const dt = new Date(d.timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric'});
      return `<div class="glass-card-hover debate-item" onclick="navigate('report',${d.id})" style="margin-bottom:8px"><div class="debate-item-text"><p>${d.topic||d.argument?.substring(0,80)||'Debate'}</p><div class="debate-item-meta"><span>📅 ${dt}</span><span style="background:rgba(139,92,246,.15);color:#a78bfa;padding:2px 8px;border-radius:50px">${d.format||'casual'}</span></div></div><div class="debate-score-badge" style="background:${col}15;color:${col};border:1px solid ${col}30">${sc}</div></div>`;
    }).join('') : '<div style="text-align:center;padding:30px;color:var(--text-muted)">No debates yet. Start debating to see your history!</div>'}</div>`;
  lucide.createIcons();
}

// Particle background
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  class P {
    constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.s = Math.random() * 2 + 0.5; this.sx = (Math.random() - 0.5) * 0.5; this.sy = (Math.random() - 0.5) * 0.5; this.o = Math.random() * 0.5 + 0.1; this.h = Math.random() > 0.5 ? 186 : 270; }
    update() { this.x += this.sx; this.y += this.sy; if (this.x < 0 || this.x > canvas.width) this.sx *= -1; if (this.y < 0 || this.y > canvas.height) this.sy *= -1; }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.s, 0, Math.PI * 2); ctx.fillStyle = `hsla(${this.h},80%,60%,${this.o})`; ctx.fill(); }
  }
  const n = Math.min(60, Math.floor(canvas.width * canvas.height / 20000));
  for (let i = 0; i < n; i++) particles.push(new P());
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y, d = Math.sqrt(dx*dx+dy*dy);
      if (d < 140) { ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = `rgba(6,182,212,${0.06*(1-d/140)})`; ctx.lineWidth = 0.5; ctx.stroke(); }
    }
    requestAnimationFrame(animate);
  }
  animate();
}

window.togglePasswordVisibility = function() {
  const input = document.getElementById('auth-password');
  const icon = document.getElementById('password-toggle-icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
  lucide.createIcons();
};

// Init
document.addEventListener('DOMContentLoaded', async () => {
  initParticles();
  lucide.createIcons();
  randomizeTopic();
  
  // User typing reset timer
  const argInput = document.getElementById('argument-input');
  if (argInput) {
    argInput.addEventListener('input', () => resetUserTimer());
    argInput.addEventListener('keydown', () => resetUserTimer());
  }
  
  await initStore(); // Fetches config and inits Supabase
  const currentUser = getCurrentUser();
  if (!currentUser) {
    navigate('login');
  } else {
    const store = getStore();
    if (!store.debates || store.debates.length === 0) {
      navigate('landing');
    } else {
      navigate('dashboard');
    }
  }
});

// Auth Handlers
let authMode = 'login'; // 'login' or 'signup'

window.signInWithGoogle = async function() {
  const res = await signInWithGoogleAuth();
  if (!res.success) {
    showToast(res.error || 'Google login failed.', 'error');
  }
};

window.toggleAuthMode = function(mode) {
  authMode = mode;
  const tabs = document.querySelectorAll('.login-tab');
  tabs.forEach(t => t.classList.remove('active'));
  if (mode === 'login') {
    tabs[0].classList.add('active');
    document.getElementById('group-name').style.display = 'none';
    document.getElementById('auth-submit-btn').innerHTML = `<span>Login</span> <i data-lucide="arrow-right"></i>`;
  } else {
    tabs[1].classList.add('active');
    document.getElementById('group-name').style.display = 'block';
    document.getElementById('auth-name').required = true;
    document.getElementById('auth-submit-btn').innerHTML = `<span>Sign Up</span> <i data-lucide="arrow-right"></i>`;
  }
  lucide.createIcons();
};

window.handleAuthSubmit = async function() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  
  document.getElementById('auth-submit-btn').disabled = true;
  document.getElementById('auth-submit-btn').innerHTML = '<span class="loading-spinner"></span> Processing...';
  
  if (authMode === 'login') {
    const res = await authenticateUser(email, password);
    if (res.success) {
      showToast(`Welcome back, ${res.name || email}!`, 'success');
      postLoginRouting();
    } else {
      showToast(res.error || 'Login failed.', 'error');
    }
  } else {
    const name = document.getElementById('auth-name').value.trim();
    if (!name) {
      showToast('Display name required.', 'error');
      document.getElementById('auth-submit-btn').disabled = false;
      document.getElementById('auth-submit-btn').innerHTML = `<span>Sign Up</span> <i data-lucide="arrow-right"></i>`;
      return;
    }
    const res = await registerUser(name, email, password);
    if (res.success) {
      showToast(`Welcome, ${name}! Account created.`, 'success');
      postLoginRouting();
    } else {
      showToast(res.error || 'Registration failed.', 'error');
    }
  }
  
  const btn = document.getElementById('auth-submit-btn');
  btn.disabled = false;
  btn.innerHTML = authMode === 'login' ? `<span>Login</span> <i data-lucide="arrow-right"></i>` : `<span>Sign Up</span> <i data-lucide="arrow-right"></i>`;
  lucide.createIcons();
};

function postLoginRouting() {
  const store = getStore();
  if (store.debates.length === 0) {
    navigate('landing');
  } else {
    navigate('dashboard');
  }
}

window.handleLogout = async function() {
  await logoutUser();
  showToast('Logged out successfully.', 'info');
  navigate('login');
};

// ========== GAMIFICATION ==========
const TOPICS = [
  'Should artificial intelligence be regulated by governments?',
  'Is social media doing more harm than good to society?',
  'Should college education be free for everyone?',
  'Is remote work better than office work?',
  'Should voting be mandatory in democracies?',
  'Is space exploration worth the investment?',
  'Should animals be used for scientific research?',
  'Is nuclear energy the solution to climate change?',
  'Should there be limits on free speech online?',
  'Is universal basic income a viable economic policy?',
  'Should genetic engineering of humans be permitted?',
  'Is capitalism the best economic system?',
  'Should a wealth tax be implemented globally?',
  'Are standardized tests a fair measure of intelligence?',
  'Should healthcare be a fundamental human right?',
  'Is a four-day work week better for the economy?',
  'Should governments censor harmful content on the internet?',
  'Is human cloning ethically justifiable?',
  'Should the minimum wage be a living wage?',
  'Are electric vehicles truly better for the environment?',
  'Should public transportation be entirely free?',
  'Is cryptocurrency the future of money?',
  'Should schools ban the use of smartphones?',
  'Is a vegetarian diet better for the planet?',
  'Should billionaires exist in a fair society?'
];

function processDebateResult(analysis, speechData) {
  const p = getProfile();
  const newDebates = p.debatesCompleted + 1;
  const newFallacies = p.totalFallaciesFound + (analysis.fallacies?.length || 0);
  const newCounters = p.totalCounters + 1;
  updateProfile({ debatesCompleted: newDebates, totalFallaciesFound: newFallacies, totalCounters: newCounters });
  return [];
}

// ========== CHARTS ==========
let radarChart = null, trendChart = null;

function renderRadarChart(data) {
  const ctx = document.getElementById('radar-chart');
  if (!ctx) return;
  if (radarChart) radarChart.destroy();
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Logic', 'Clarity', 'Persuasion', 'Evidence', 'Structure'],
      datasets: [{
        data: [data.logic, data.clarity, data.persuasion, data.evidence, data.structure],
        backgroundColor: 'rgba(6,182,212,0.15)',
        borderColor: '#06b6d4',
        borderWidth: 2,
        pointBackgroundColor: '#06b6d4',
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true, max: 100,
          grid: { color: 'rgba(255,255,255,0.06)' },
          angleLines: { color: 'rgba(255,255,255,0.06)' },
          pointLabels: { color: '#a0a0b8', font: { size: 12, weight: 500 } },
          ticks: { display: false }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderTrendChart(data) {
  const ctx = document.getElementById('trend-chart');
  if (!ctx) return;
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => '#' + d.debate),
      datasets: [
        { label: 'Score', data: data.map(d => d.score), borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.1)', tension: 0.4, borderWidth: 2, pointRadius: 4, fill: true },
        { label: 'Logic', data: data.map(d => d.logic), borderColor: '#8b5cf6', borderDash: [5,5], tension: 0.4, borderWidth: 1.5, pointRadius: 0 },
        { label: 'Clarity', data: data.map(d => d.clarity), borderColor: '#30d158', borderDash: [5,5], tension: 0.4, borderWidth: 1.5, pointRadius: 0 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b6b85', font: { size: 11 } } },
        y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b6b85', font: { size: 11 } } }
      },
      plugins: {
        legend: { labels: { color: '#a0a0b8', usePointStyle: true, pointStyle: 'line', font: { size: 11 } } },
        tooltip: { backgroundColor: 'rgba(18,18,26,0.9)', titleColor: '#f0f0f5', bodyColor: '#a0a0b8', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
      }
    }
  });
}

// ========== SPEECH RECOGNITION ==========
let recognition = null;
let speechStartTime = null;
let speechTimerInterval = null;
let isRecording = false;
let finalTranscriptAccumulated = '';

function initSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return false;
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.onresult = handleSpeechResult;
  recognition.onerror = (e) => {
    console.warn('Speech recognition error:', e.error);
    if (e.error !== 'no-speech' && e.error !== 'aborted') stopRecording();
  };
  recognition.onend = () => {
    if (isRecording) {
      try { recognition.start(); } catch(e) {}
    }
  };
  return true;
}

function handleSpeechResult(event) {
  let interim = '';
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      finalTranscriptAccumulated += transcript + ' ';
    } else {
      interim += transcript;
    }
  }
  const ta = document.getElementById('argument-input');
  const tt = document.getElementById('transcript-text');
  if (ta) ta.value = finalTranscriptAccumulated.trim();
  if (tt) tt.textContent = interim || '...listening';
  
  if (typeof resetUserTimer === 'function') resetUserTimer();
}

function startRecording() {
  if (!recognition && !initSpeech()) { showToast('Voice not supported. Use Chrome.', 'error'); return; }
  isRecording = true;
  finalTranscriptAccumulated = document.getElementById('argument-input').value;
  if (finalTranscriptAccumulated) finalTranscriptAccumulated += ' ';
  speechStartTime = Date.now();
  document.getElementById('voice-btn').classList.add('recording');
  document.getElementById('voice-status').textContent = 'Recording...';
  document.getElementById('voice-timer').style.display = '';
  document.getElementById('live-transcript').style.display = '';
  speechTimerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - speechStartTime) / 1000);
    document.getElementById('voice-timer').textContent = Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
  }, 1000);
  try { recognition.start(); } catch(e) {}
}

function stopRecording() {
  isRecording = false;
  if (recognition) try { recognition.stop(); } catch(e) {}
  clearInterval(speechTimerInterval);
  document.getElementById('voice-btn').classList.remove('recording');
  document.getElementById('voice-status').textContent = 'Click to speak';
  document.getElementById('voice-timer').style.display = 'none';
  document.getElementById('live-transcript').style.display = 'none';
  const duration = speechStartTime ? Math.floor((Date.now() - speechStartTime) / 1000) : 0;
  window.lastSpeechDuration = duration;
  return { duration };
}

function toggleVoice() {
  if (isRecording) stopRecording();
  else startRecording();
}
// Initialize App - Logic moved to earlier DOMContentLoaded listener
// document.addEventListener('DOMContentLoaded', initApp);
