// Firebase Auth + Firestore data store
const firebaseConfig = {
  apiKey: "AIzaSyAi0natXfE2OcDEukUWKgpRIlL3pWjgbuY",
  authDomain: "teamdark-9c9da.firebaseapp.com",
  projectId: "teamdark-9c9da",
  storageBucket: "teamdark-9c9da.firebasestorage.app",
  messagingSenderId: "1018447105912",
  appId: "1:1018447105912:web:f7b7d888720332cf28c28d",
  measurementId: "G-D0FHYELBZ3"
};

// Initialize Firebase directly (no backend fetch needed)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Enable offline persistence so Firestore works without constant connectivity
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  console.warn('Firestore persistence error:', err.code);
});

const STORAGE_KEY = 'debate_ai_store';

function createDefaultProfile(username) {
  return {
    name: username,
    debatesCompleted: 0,
    totalFallaciesFound: 0,
    totalCounters: 0,
    formatsUsed: [],
    joinedDate: new Date().toISOString(),
  };
}

// === LOCAL STORE HELPERS ===

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

// === FIREBASE AUTH ===

async function registerUser(name, email, password) {
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });

    // Local init
    const store = getGlobalStore();
    store.currentUser = email;
    if (!store.users[email]) {
      store.users[email] = { email, debates: [], userProfile: createDefaultProfile(name) };
    }
    saveGlobalStore(store);

    // Firestore profile (non-blocking)
    db.collection('users').doc(cred.user.uid).set(createDefaultProfile(name)).catch(e => console.warn('Firestore profile create:', e.message));

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function authenticateUser(email, password) {
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const name = cred.user.displayName || email.split('@')[0];

    // Sync local store
    const store = getGlobalStore();
    store.currentUser = email;
    if (!store.users[email]) {
      store.users[email] = { email, debates: [], userProfile: createDefaultProfile(name) };
    }
    saveGlobalStore(store);

    // Firestore sync (non-blocking — won't fail login)
    syncFromFirebase(email, cred.user.uid).catch(e => console.warn('Sync:', e.message));

    return { success: true, name };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function signInWithGoogleAuth() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    const name = user.displayName || user.email.split('@')[0];

    // Local store first (always works)
    const store = getGlobalStore();
    store.currentUser = user.email;
    if (!store.users[user.email]) {
      store.users[user.email] = { email: user.email, debates: [], userProfile: createDefaultProfile(name) };
    }
    saveGlobalStore(store);

    // Firestore profile + sync (non-blocking)
    db.collection('users').doc(user.uid).get().then(doc => {
      if (!doc.exists) db.collection('users').doc(user.uid).set(createDefaultProfile(name));
    }).catch(e => console.warn('Firestore Google profile:', e.message));
    syncFromFirebase(user.email, user.uid).catch(e => console.warn('Sync:', e.message));

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function logoutUser() {
  await auth.signOut();
  const store = getGlobalStore();
  store.currentUser = null;
  saveGlobalStore(store);
}

function getCurrentUser() {
  return getGlobalStore().currentUser;
}

// === FIRESTORE SYNC ===

async function syncFromFirebase(email, uid) {
  try {
    // Sync debates
    const snap = await db.collection('users').doc(uid).collection('debates').orderBy('timestamp', 'desc').get();
    const debates = [];
    snap.forEach(doc => debates.push({ id: doc.id, ...doc.data() }));

    // Sync profile
    const profileDoc = await db.collection('users').doc(uid).get();

    const store = getGlobalStore();
    if (!store.users[email]) {
      store.users[email] = { email, debates: [], userProfile: createDefaultProfile(email) };
    }
    if (debates.length > 0) {
      store.users[email].debates = debates;
    }
    if (profileDoc.exists) {
      store.users[email].userProfile = { ...createDefaultProfile(email), ...profileDoc.data() };
    }
    saveGlobalStore(store);
  } catch (e) {
    console.error("Firebase sync error:", e);
  }
}

function getFirebaseUid() {
  return auth.currentUser ? auth.currentUser.uid : null;
}

// === DATA STORE (localStorage, keyed per user) ===

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

// === DEBATE OPERATIONS ===

async function addDebate(debate) {
  const email = getCurrentUser();
  const uid = getFirebaseUid();
  const s = getStore();
  const newDebate = { ...debate, timestamp: new Date().toISOString() };

  // Local save
  s.debates.unshift(newDebate);
  saveStore(s);

  // Firestore save
  if (uid) {
    try {
      const docRef = await db.collection('users').doc(uid).collection('debates').add(newDebate);
      newDebate.id = docRef.id;
      await db.collection('users').doc(uid).update({
        debatesCompleted: firebase.firestore.FieldValue.increment(1),
      });
    } catch (e) {
      console.error("Firestore save error:", e);
    }
  }

  return newDebate;
}

function getDebateById(id) {
  return getStore().debates.find(d => d.id === id || d.id === parseInt(id));
}

function getRecentDebates(n = 5) {
  return getStore().debates.slice(0, n);
}

// === PROFILE OPERATIONS ===

function getProfile() {
  return getStore().userProfile;
}

function updateProfile(updates) {
  const s = getStore();
  Object.assign(s.userProfile, updates);
  saveStore(s);

  const uid = getFirebaseUid();
  if (uid) {
    db.collection('users').doc(uid).update(updates).catch(console.error);
  }
}

// === ANALYTICS ===

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
    persuasion: Math.round(d.reduce((s, x) => s + (x.analysis?.persuasion || 0) / n), 0),
    evidence: Math.round(d.reduce((s, x) => s + (x.analysis?.evidence_score || 50), 0) / n),
    structure: Math.round(d.reduce((s, x) => s + (x.analysis?.structure || 50), 0) / n),
  };
}
