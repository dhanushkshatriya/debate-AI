// LocalStorage data store with Firebase sync support
const STORAGE_KEY = 'debate_ai_store';
let db = null;
let auth = null;

async function initStore() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    if (config.apiKey) {
      // Initialize Firebase
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      db = firebase.firestore();
      auth = firebase.auth();
      if (config.measurementId) {
        firebase.analytics();
      }
      console.log("Firebase initialized");
      
      // Handle Auth State
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          const email = user.email;
          const store = getGlobalStore();
          store.currentUser = email;
          if (!store.users[email]) {
            store.users[email] = { 
              email, 
              debates: [], 
              userProfile: createDefaultProfile(user.displayName || email) 
            };
          }
          saveGlobalStore(store);
          await syncFromFirebase(email);
          
          if (typeof currentPage !== 'undefined' && currentPage === 'login') {
            postLoginRouting();
          }
        } else {
          const store = getGlobalStore();
          store.currentUser = null;
          saveGlobalStore(store);
        }
      });
    }
  } catch (e) {
    console.error("Failed to init Firebase:", e);
  }
}

async function syncFromFirebase(email) {
  if (!db) return;
  try {
    // 5 second timeout — if Firestore is offline, skip silently
    const syncPromise = (async () => {
      // Sync Debates
      const debatesSnap = await db.collection('users').doc(email).collection('debates').orderBy('timestamp', 'desc').get();
      const debates = [];
      debatesSnap.forEach(doc => {
        debates.push({ id: doc.id, ...doc.data() });
      });

      // Sync Profile
      const profileDoc = await db.collection('users').doc(email).get();
      
      const store = getGlobalStore();
      if (!store.users[email]) {
        store.users[email] = { email, debates: [], userProfile: createDefaultProfile(email) };
      }
      
      store.users[email].debates = debates;
      if (profileDoc.exists) {
        store.users[email].userProfile = {
          ...createDefaultProfile(email),
          ...profileDoc.data()
        };
      }
      
      saveGlobalStore(store);
    })();
    
    await Promise.race([
      syncPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore sync timeout')), 5000))
    ]);
  } catch (e) {
    console.warn("Firebase sync skipped:", e.message);
  }
}

function getGlobalStore() {
  try {
    const d = localStorage.getItem(STORAGE_KEY);
    if (d) return JSON.parse(d);
  } catch (e) {}
  return { currentUser: null, users: {} };
}

function saveGlobalStore(store) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (e) {}
}

function createDefaultProfile(username) {
  return {
    name: username,
    debatesCompleted: 0,
    totalFallaciesFound: 0,
    totalCounters: 0,
    formatsUsed: [],
    joinedDate: new Date().toISOString(),
    xp: 0
  };
}

// Authentication
async function registerUser(name, email, password) {
  // Try Firebase first
  if (auth) {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName: name });
      await db.collection('users').doc(email).set(createDefaultProfile(name));
      return { success: true };
    } catch (e) {
      console.warn("Firebase register failed, falling back to Local-Only mode:", e.message);
    }
  }
  
  // Local-Only Fallback
  const store = getGlobalStore();
  if (store.users[email]) {
    return { success: false, error: "Account already exists locally." };
  }
  
  store.users[email] = {
    email,
    debates: [],
    userProfile: createDefaultProfile(name)
  };
  store.currentUser = email;
  saveGlobalStore(store);
  return { success: true };
}

async function authenticateUser(email, password) {
  // First attempt Firebase auth if initialized
  if (auth) {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      return { success: true, name: userCredential.user.displayName };
    } catch (e) {
      console.warn("Firebase auth failed, falling back to Local-Only mode:", e.message);
    }
  }
  
  // Local-Only Fallback
  const store = getGlobalStore();
  if (store.users[email]) {
    store.currentUser = email;
    saveGlobalStore(store);
    return { success: true, name: store.users[email].userProfile?.name || email };
  } else {
    return { success: false, error: "Account not found in local storage. Please sign up first." };
  }
}

async function signInWithGoogleAuth() {
  if (!auth) return { success: false, error: "Firebase not ready" };
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function logoutUser() {
  if (auth) auth.signOut();
  const store = getGlobalStore();
  store.currentUser = null;
  saveGlobalStore(store);
}

function getCurrentUser() {
  return getGlobalStore().currentUser;
}

// Data access for current user
function getStore() {
  const global = getGlobalStore();
  if (!global.currentUser || !global.users[global.currentUser]) {
    return { debates: [], userProfile: createDefaultProfile('Guest') };
  }
  return global.users[global.currentUser];
}

function saveStore(userStore) {
  const global = getGlobalStore();
  if (global.currentUser) {
    global.users[global.currentUser] = userStore;
    saveGlobalStore(global);
  }
}

// Debate operations
async function addDebate(debate) {
  const email = getCurrentUser();
  const s = getStore();
  const newDebate = { ...debate, id: Date.now(), timestamp: new Date().toISOString() };
  
  // Local Save FIRST — this is instant and always works
  s.debates.unshift(newDebate);
  saveStore(s);
  
  // Firestore Save — fire and forget with timeout, NEVER blocks UI
  if (db && email) {
    const firestoreTimeout = (promise, ms) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), ms))
    ]);
    
    firestoreTimeout(
      (async () => {
        const docRef = await db.collection('users').doc(email).collection('debates').add(newDebate);
        newDebate.id = docRef.id;
        await db.collection('users').doc(email).update({
          debatesCompleted: firebase.firestore.FieldValue.increment(1),
          xp: firebase.firestore.FieldValue.increment(50)
        });
      })(),
      5000
    ).catch(e => console.warn("Firestore save skipped:", e.message));
  }
  
  return newDebate;
}

function getDebateById(id) {
  return getStore().debates.find(d => d.id === id);
}

function getRecentDebates(n = 5) {
  return getStore().debates.slice(0, n);
}

// Profile operations
function getProfile() {
  return getStore().userProfile;
}

function updateProfile(updates) {
  const s = getStore();
  Object.assign(s.userProfile, updates);
  saveStore(s);
  
  const email = getCurrentUser();
  if (db && email) {
    db.collection('users').doc(email).update(updates).catch(console.error);
  }
}

// Analytics operations
function getAvgScore() {
  const d = getStore().debates;
  if (!d.length) return 0;
  return Math.round(d.reduce((s, x) => s + (x.analysis?.score || 0), 0) / d.length);
}

function getScoreHistory() {
  return getStore().debates.slice(0, 20).reverse().map((d, i) => ({
    debate: i + 1,
    score: d.analysis?.score || 0,
    logic: d.analysis?.logic || 0,
    clarity: d.analysis?.clarity || 0,
    persuasion: d.analysis?.persuasion || 0,
  }));
}

function getAvgMetrics() {
  const d = getStore().debates;
  if (!d.length) return { logic: 0, clarity: 0, persuasion: 0, evidence: 0, structure: 0 };
  const n = d.length;
  return {
    logic: Math.round(d.reduce((s, x) => s + (x.analysis?.logic || 0), 0) / n),
    clarity: Math.round(d.reduce((s, x) => s + (x.analysis?.clarity || 0), 0) / n),
    persuasion: Math.round(d.reduce((s, x) => s + (x.analysis?.persuasion || 0), 0) / n),
    evidence: Math.round(d.reduce((s, x) => s + (x.analysis?.evidence_score || 50), 0) / n),
    structure: Math.round(d.reduce((s, x) => s + (x.analysis?.structure || 50), 0) / n),
  };
}
