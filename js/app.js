// Main application controller
let currentPage = 'landing';
let currentFormat = 'casual';
let currentDebateId = null;
let speechDuration = 0;
let currentHistory = [];
let debateStatus = 'ongoing'; // 'ongoing', 'ai_win', 'user_win'

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
  // Format buttons
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFormat = btn.dataset.format;
    };
  });
  lucide.createIcons();
}

function randomizeTopic() {
  const t = ['Should artificial intelligence be regulated by governments?', 'Is space exploration worth the investment?', 'Should a universal basic income be implemented globally?', 'Is remote work better than office work?', 'Should genetic engineering in humans be allowed?'];
  document.getElementById('debate-topic').value = t[Math.floor(Math.random() * t.length)];
}

function clearArgument() {
  document.getElementById('argument-input').value = '';
  document.getElementById('analysis-results').style.display = 'none';
  document.getElementById('analysis-placeholder').style.display = '';
  currentHistory = [];
  debateStatus = 'ongoing';
}

async function submitArgument() {
  const text = document.getElementById('argument-input').value.trim();
  const topic = document.getElementById('debate-topic').value;
  if (!text) { showToast('Please enter an argument first', 'error'); return; }
  if (text.length < 10) { showToast('Argument too short. Write at least a sentence.', 'error'); return; }
  if (debateStatus !== 'ongoing') { showToast('This debate has concluded.', 'info'); return; }

  const btn = document.getElementById('analyze-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Thinking...';

  // Add user argument to history
  currentHistory.push({ role: 'user', content: text });

  // Stop recording if active
  let speechData = null;
  if (typeof isRecording !== 'undefined' && isRecording) {
    const r = stopRecording();
    speechDuration = r.duration;
    if (speechDuration > 2) speechData = await analyzeSpeechAPI(text, speechDuration);
  }

  try {
    const analysis = await analyzeArgument(text, currentFormat);
    const counterRes = await getCounterArgument(text, currentFormat, currentHistory, topic);
    
    if (counterRes) {
      currentHistory.push({ role: 'ai', content: counterRes.counter_argument });
      debateStatus = counterRes.status || 'ongoing';
      
      // Save debate session or update existing
      const debate = await addDebate({ 
        argument: text, 
        topic, 
        format: currentFormat, 
        analysis, 
        counter: counterRes.counter_argument, 
        history: currentHistory,
        status: debateStatus,
        speechData 
      });
      currentDebateId = debate.id;

      // Process debate stats
      processDebateResult(analysis, speechData);

      // Render results
      renderAnalysisResults(analysis, counterRes, speechData);
      
      if (debateStatus !== 'ongoing') {
        const win = debateStatus === 'user_win';
        showToast(win ? "CONGRATULATIONS! You won the debate!" : "The AI has won this debate.", win ? "success" : "info");
      }
    }
  } catch (e) {
    console.error(e);
    showToast("Error during analysis", "error");
  }

  btn.disabled = false;
  btn.innerHTML = '<i data-lucide="brain"></i> Continue Debate';
  lucide.createIcons();

  showToast(`Argument analyzed!`, 'success');
}

function renderAnalysisResults(analysis, counter, speechData) {
  document.getElementById('analysis-placeholder').style.display = 'none';
  document.getElementById('analysis-results').style.display = '';

  // Score gauges
  document.getElementById('score-gauges').innerHTML = [
    gaugeHTML(analysis.score, 'Overall'),
    gaugeHTML(analysis.logic, 'Logic', '#8b5cf6'),
    gaugeHTML(analysis.clarity, 'Clarity', '#06b6d4'),
    gaugeHTML(analysis.persuasion, 'Persuasion', '#30d158'),
    gaugeHTML(analysis.evidence_score || 50, 'Evidence', '#ff9f0a'),
  ].join('');

  // Argument breakdown
  const t = typeof TRANSLATIONS !== 'undefined' ? TRANSLATIONS[currentLang] : {};
  document.getElementById('argument-breakdown').innerHTML = `<h3 style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><span style="color:#06b6d4">📋</span> ${t.breakdown || 'Argument Breakdown'}</h3>
    <div class="breakdown-section"><div class="breakdown-label">${t.claim || 'Claim'}</div><div class="breakdown-text">${analysis.claim}</div></div>
    <div class="breakdown-section"><div class="breakdown-label">${t.evidence || 'Evidence'}</div><div class="breakdown-text" style="border-color:${analysis.evidence === 'No specific evidence cited' ? 'var(--neon-pink)' : 'var(--neon-green)'}">${analysis.evidence}</div></div>
    <div class="breakdown-section"><div class="breakdown-label">${t.reasoning || 'Reasoning'}</div><div class="breakdown-text" style="border-color:var(--accent)">${analysis.reasoning}</div></div>
    <div class="breakdown-section"><div class="breakdown-label">${t.tone || 'Tone'}</div><div class="breakdown-text" style="border-color:var(--neon-orange)">${analysis.tone}</div></div>`;

  // Fallacy alerts
  const fa = document.getElementById('fallacy-alerts');
  if (analysis.fallacies.length > 0) {
    fa.innerHTML = analysis.fallacies.map((f, i) => {
      const sev = f.severity || 'medium';
      const col = sev === 'high' ? '#ff2d55' : sev === 'medium' ? '#ff9f0a' : '#30d158';
      return `<div class="glass-card fallacy-alert" style="border-left-color:${col};animation-delay:${i*0.15}s;margin-bottom:12px"><div class="fallacy-alert-glow" style="background:linear-gradient(90deg,${col}10,transparent)"></div><div class="fallacy-alert-content"><div class="fallacy-alert-emoji">${f.icon || '⚠️'}</div><div><div class="fallacy-alert-title"><h4>${f.name}</h4><span class="severity-badge" style="background:${col}20;color:${col}">${sev}</span></div><p class="fallacy-alert-desc">${f.description}</p><div class="fallacy-alert-fix">💡 ${f.fix || 'Review your argument structure.'}</div></div></div></div>`;
    }).join('');
  } else {
    fa.innerHTML = `<div class="glass-card" style="border-left:3px solid var(--neon-green);padding:16px;display:flex;align-items:center;gap:12px;margin-bottom:12px"><span style="font-size:1.5rem">✨</span><div><h4 style="font-size:.9rem;font-weight:700;color:var(--neon-green)">No Fallacies Detected</h4><p style="font-size:.8rem;color:var(--text-sec)">Great job! Your argument is logically sound.</p></div></div>`;
  }

  // AI Counter
  const statusBadge = debateStatus === 'ongoing' ? '' : `<div class="status-badge ${debateStatus}">${debateStatus.replace('_', ' ').toUpperCase()}</div>`;
  document.getElementById('ai-counter').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
      <h3><span style="color:var(--accent)">⚔️</span> ${t.ai_response || 'AI Response'}</h3>
      ${statusBadge}
    </div>
    <div class="counter-text">${counter.counter_argument || analysis.counter_argument}</div>
    ${counter.reasoning ? `<div class="ai-reasoning"><strong>AI Reasoning:</strong> ${counter.reasoning}</div>` : ''}
  `;

  // Suggestions
  document.getElementById('suggestions-panel').innerHTML = `<h3><span style="color:var(--neon-green)">💡</span> Improvement Suggestions</h3>${analysis.suggestions.map(s => `<div class="suggestion-item"><div class="suggestion-dot"></div><span>${s}</span></div>`).join('')}`;

  // Speech metrics
  const sp = document.getElementById('speech-metrics-panel');
  if (speechData) {
    sp.style.display = '';
    const mc = (v, t) => v > t ? '#30d158' : v > t * 0.5 ? '#ff9f0a' : '#ff2d55';
    sp.innerHTML = `<div class="glass-card"><h3 style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><span style="color:var(--primary)">🎤</span> Speech Analysis</h3><div class="speech-metrics-grid">
      <div class="glass-card speech-metric"><div style="color:${mc(speechData.words_per_minute, 140)}">🏃</div><div class="speech-metric-value" style="color:${mc(speechData.words_per_minute, 140)}">${speechData.words_per_minute}</div><div class="speech-metric-label">Words/Min</div><div class="speech-metric-sub" style="color:${mc(speechData.words_per_minute, 140)}">${speechData.pace}</div></div>
      <div class="glass-card speech-metric"><div style="color:var(--primary)">📝</div><div class="speech-metric-value" style="color:var(--primary)">${speechData.total_words}</div><div class="speech-metric-label">Total Words</div><div class="speech-metric-sub">${speechData.words_per_second}/sec</div></div>
      <div class="glass-card speech-metric"><div style="color:${speechData.total_fillers > 5 ? '#ff2d55' : '#30d158'}">⚠️</div><div class="speech-metric-value" style="color:${speechData.total_fillers > 5 ? '#ff2d55' : '#30d158'}">${speechData.total_fillers}</div><div class="speech-metric-label">Filler Words</div><div class="speech-metric-sub">${speechData.filler_rate}</div></div>
      <div class="glass-card speech-metric"><div style="color:${mc(speechData.confidence, 70)}">💪</div><div class="speech-metric-value" style="color:${mc(speechData.confidence, 70)}">${speechData.confidence}%</div><div class="speech-metric-label">Confidence</div></div>
      ${Object.keys(speechData.filler_words).length ? `<div class="filler-breakdown glass-card"><h4>Filler Words Detected</h4><div class="filler-tags">${Object.entries(speechData.filler_words).map(([w,c]) => `<span class="filler-tag">"${w}" × ${c}</span>`).join('')}</div></div>` : ''}
    </div></div>`;
  } else sp.style.display = 'none';
}

// ========== REPORT PAGE ==========
function renderReport(id) {
  const did = id || currentDebateId;
  const debate = did ? getDebateById(did) : getStore().debates[0];
  const body = document.getElementById('report-body');
  if (!debate) { body.innerHTML = '<div style="text-align:center;padding:80px;color:var(--text-muted)"><p style="font-size:1.2rem;margin-bottom:16px">No debate report found</p><button class="btn-primary" onclick="navigate(\'debate\')"><i data-lucide="swords"></i> Start a Debate</button></div>'; lucide.createIcons(); return; }
  const a = debate.analysis, date = new Date(debate.timestamp).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  body.innerHTML = `<div class="report-meta"><span>📅 ${date}</span><span>💬 ${debate.format || 'casual'}</span><span>📝 ${debate.argument?.split(/\s+/).length || 0} words</span></div>
    <div class="glass-card report-section"><div class="report-scores">${gaugeHTML(a.score, 'Overall')}${gaugeHTML(a.logic, 'Logic', '#8b5cf6')}${gaugeHTML(a.clarity, 'Clarity', '#06b6d4')}${gaugeHTML(a.persuasion, 'Persuasion', '#30d158')}</div></div>
    <div class="glass-card report-section"><h3>📌 Topic</h3><p style="color:var(--text-sec);line-height:1.6">${debate.topic || 'General debate'}</p></div>
    <div class="glass-card report-section"><h3>📝 Your Argument</h3><p style="color:var(--text-sec);line-height:1.6">${debate.argument}</p></div>
    <div class="glass-card report-section"><h3>📋 Breakdown</h3>
      <div class="breakdown-section"><div class="breakdown-label">Claim</div><div class="breakdown-text">${a.claim}</div></div>
      <div class="breakdown-section"><div class="breakdown-label">Evidence</div><div class="breakdown-text">${a.evidence}</div></div>
      <div class="breakdown-section"><div class="breakdown-label">Reasoning</div><div class="breakdown-text">${a.reasoning}</div></div></div>
    ${a.fallacies.length ? `<div class="glass-card report-section"><h3>⚠️ Fallacies Found (${a.fallacies.length})</h3>${a.fallacies.map(f => `<div style="display:flex;gap:10px;padding:10px;background:rgba(255,45,85,.05);border-radius:10px;margin-bottom:8px"><span style="font-size:1.2rem">${f.icon||'⚠️'}</span><div><strong>${f.name}</strong><p style="font-size:.85rem;color:var(--text-sec)">${f.description}</p></div></div>`).join('')}</div>` : ''}
    <div class="glass-card report-section"><h3>⚔️ AI Counterargument</h3><div class="counter-text">${debate.counter || a.counter_argument}</div></div>
    <div class="glass-card report-section"><h3>💡 Suggestions</h3>${a.suggestions.map(s => `<div class="suggestion-item"><div class="suggestion-dot"></div><span>${s}</span></div>`).join('')}</div>
    <div style="text-align:center;margin-top:24px"><button class="btn-primary" onclick="navigate('debate')"><i data-lucide="swords"></i> New Debate</button></div>`;
  lucide.createIcons();
}

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
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  lucide.createIcons();
  randomizeTopic();

  // Firebase auth state listener handles routing
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const email = user.email;
      const name = user.displayName || email.split('@')[0];
      const store = getGlobalStore();
      store.currentUser = email;
      if (!store.users[email]) {
        store.users[email] = { email, debates: [], userProfile: createDefaultProfile(name) };
      }
      saveGlobalStore(store);
      syncFromFirebase(email, user.uid).catch(e => console.warn('Auth sync:', e.message));
      postLoginRouting();
    } else {
      navigate('login');
    }
  });
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
