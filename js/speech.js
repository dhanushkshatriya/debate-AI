// Speech recognition using Web Speech API
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
  return { duration: speechStartTime ? Math.floor((Date.now() - speechStartTime) / 1000) : 0 };
}

function toggleVoice() {
  if (isRecording) stopRecording();
  else startRecording();
}
