const TRANSLATIONS = {
  en: {
    hero_title: 'Master the Art of <span class="neon-text">Debate</span> with <span class="neon-text">AI Coaching</span>',
    hero_subtitle: 'Analyze arguments in real time, detect logical fallacies, get AI-powered counterarguments, and track your improvement.',
    start_debating: 'Start Debating',
    view_dashboard: 'View Dashboard',
    arena_title: 'Live Debate Arena',
    arena_subtitle: 'Argue your position and get real-time AI analysis',
    your_argument: 'Your Argument',
    analyze_btn: 'Analyze Argument',
    continue_debate: 'Continue Debate',
    clear_btn: 'Clear',
    topic: 'Topic',
    history: 'History',
    dashboard: 'Dashboard',
    profile: 'Profile',
    logout: 'Logout',
    overall_score: 'Overall Score',
    logic: 'Logic',
    clarity: 'Clarity',
    persuasion: 'Persuasion',
    evidence: 'Evidence',
    fallacies_found: 'Fallacies Found',
    no_fallacies: 'No Fallacies Detected',
    ai_response: 'AI Response',
    suggestions: 'Improvement Suggestions',
    speech_analysis: 'Speech Analysis',
    wpm: 'Words/Min',
    confidence: 'Confidence',
    filler_words: 'Filler Words',
  },
  es: {
    hero_title: 'Domina el Arte del <span class="neon-text">Debate</span> con <span class="neon-text">Entrenamiento IA</span>',
    hero_subtitle: 'Analiza argumentos en tiempo real, detecta falacias lógicas, obtén contraargumentos potenciados por IA y sigue tu progreso.',
    start_debating: 'Empezar a Debatir',
    view_dashboard: 'Ver Panel',
    arena_title: 'Arena de Debate en Vivo',
    arena_subtitle: 'Argumenta tu posición y obtén análisis de IA en tiempo real',
    your_argument: 'Tu Argumento',
    analyze_btn: 'Analizar Argumento',
    continue_debate: 'Continuar Debate',
    clear_btn: 'Limpiar',
    topic: 'Tema',
    history: 'Historial',
    dashboard: 'Panel',
    profile: 'Perfil',
    logout: 'Cerrar Sesión',
    overall_score: 'Puntuación Total',
    logic: 'Lógica',
    clarity: 'Claridad',
    persuasion: 'Persuasión',
    evidence: 'Evidencia',
    fallacies_found: 'Falacias Encontradas',
    no_fallacies: 'No se Detectaron Falacias',
    ai_response: 'Respuesta de la IA',
    suggestions: 'Sugerencias de Mejora',
    speech_analysis: 'Análisis de Voz',
    wpm: 'Palabras/Min',
    confidence: 'Confianza',
    filler_words: 'Palabras de Relleno',
  },
  hi: {
      hero_title: '<span class="neon-text">डिबेट</span> की कला में महारत हासिल करें <span class="neon-text">AI कोचिंग</span> के साथ',
      hero_subtitle: 'वास्तविक समय में तर्कों का विश्लेषण करें, तार्किक कमियों का पता लगाएं, AI-संचालित जवाबी तर्क प्राप्त करें, और अपने सुधार को ट्रैक करें।',
      start_debating: 'डिबेट शुरू करें',
      view_dashboard: 'डैशबोर्ड देखें',
      arena_title: 'लाइव डिबेट एरिना',
      arena_subtitle: 'अपनी स्थिति स्पष्ट करें और वास्तविक समय में AI विश्लेषण प्राप्त करें',
      your_argument: 'आपका तर्क',
      analyze_btn: 'तर्क का विश्लेषण करें',
      continue_debate: 'डिबेट जारी रखें',
      clear_btn: 'साफ करें',
      topic: 'विषय',
      history: 'इतिहास',
      dashboard: 'डैशबोर्ड',
      profile: 'प्रोफ़ाइल',
      logout: 'लॉगआउट',
      overall_score: 'कुल स्कोर',
      logic: 'तर्क',
      clarity: 'स्पष्टता',
      persuasion: 'अनुनय',
      evidence: 'प्रमाण',
      fallacies_found: 'तर्क दोष मिले',
      no_fallacies: 'कोई तर्क दोष नहीं मिला',
      ai_response: 'AI की प्रतिक्रिया',
      suggestions: 'सुधार के सुझाव',
      speech_analysis: 'भाषण विश्लेषण',
      wpm: 'शब्द/मिनट',
      confidence: 'आत्मविश्वास',
      filler_words: 'फिलर शब्द',
  }
};

let currentLang = 'en';

function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang;
  updateUI();
  localStorage.setItem('debate_ai_lang', lang);
}

function updateUI() {
  const t = TRANSLATIONS[currentLang];
  
  // Update elements with data-t attribute
  document.querySelectorAll('[data-t]').forEach(el => {
    const key = el.dataset.t;
    if (t[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = t[key];
      } else {
        el.innerHTML = t[key];
      }
    }
  });
  
  // Re-run lucide
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Initialize language
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('debate_ai_lang');
  if (saved) setLanguage(saved);
});
