// Speech recognition using Web Speech API
let recognition = null;
let speechStartTime = null;
let speechTimerInterval = null;
let isRecording = false;
let finalTranscriptAccumulated = '';

function initSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    console.error('Speech Recognition not supported in this browser.');
    return false;
  }
  
  if (recognition) return true;

  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    console.log('Speech recognition started');
    isRecording = true;
  };

  recognition.onresult = handleSpeechResult;

  recognition.onerror = (e) => {
    console.warn('Speech recognition error:', e.error);
    if (e.error === 'not-allowed') {
      showToast('Microphone access denied. Please allow it in browser settings.', 'error');
      stopRecording();
    } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
      // showToast('Speech error: ' + e.error, 'error');
      // don't stop for every minor error
    }
  };

  recognition.onend = () => {
    console.log('Speech recognition ended');
    if (isRecording) {
      console.log('Restarting recognition...');
      try { recognition.start(); } catch(e) { console.error('Restart failed:', e); }
    }
  };
  return true;
}

function handleSpeechResult(event) {
  let interim = '';
  let newFinal = '';

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      newFinal += transcript + ' ';
    } else {
      interim += transcript;
    }
  }

  if (newFinal) {
    finalTranscriptAccumulated += newFinal;
  }

  const ta = document.getElementById('argument-input');
  const tt = document.getElementById('transcript-text');
  
  if (ta) {
    // Show accumulated final results + current interim
    ta.value = (finalTranscriptAccumulated + interim).trim();
    // Scroll to bottom
    ta.scrollTop = ta.scrollHeight;
  }
  
  if (tt) tt.textContent = interim || '...listening';
}

function startRecording() {
  if (!recognition && !initSpeech()) { 
    showToast('Voice input is not supported in this browser. Please use Chrome.', 'error'); 
    return; 
  }
  
  finalTranscriptAccumulated = document.getElementById('argument-input').value;
  if (finalTranscriptAccumulated && !finalTranscriptAccumulated.endsWith(' ')) {
    finalTranscriptAccumulated += ' ';
  }

  isRecording = true;
  speechStartTime = Date.now();
  
  const btn = document.getElementById('voice-btn');
  const status = document.getElementById('voice-status');
  const timer = document.getElementById('voice-timer');
  const live = document.getElementById('live-transcript');

  if (btn) btn.classList.add('recording');
  if (status) status.textContent = 'Listening...';
  if (timer) {
    timer.style.display = '';
    timer.textContent = '0:00';
  }
  if (live) live.style.display = '';

  speechTimerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - speechStartTime) / 1000);
    if (timer) timer.textContent = Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
  }, 1000);

  try { 
    recognition.start(); 
  } catch(e) { 
    console.warn('Recognition already started or failed to start:', e);
    // If it's already started, it's fine
  }
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    try { recognition.stop(); } catch(e) { console.error('Stop error:', e); }
  }
  
  clearInterval(speechTimerInterval);
  
  const btn = document.getElementById('voice-btn');
  const status = document.getElementById('voice-status');
  const timer = document.getElementById('voice-timer');
  const live = document.getElementById('live-transcript');

  if (btn) btn.classList.remove('recording');
  if (status) status.textContent = 'Click to speak';
  if (timer) timer.style.display = 'none';
  if (live) live.style.display = 'none';
  
  const duration = speechStartTime ? Math.floor((Date.now() - speechStartTime) / 1000) : 0;
  return { duration };
}

function toggleVoice() {
  if (isRecording) stopRecording();
  else startRecording();
}
