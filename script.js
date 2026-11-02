/* ============================================================
   Dream Japan — JFT Mock Test (3-file SPA)
   v2.0.0 — Device lock · eSewa payments · Notifications · 250-pt scale
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  onAuthStateChanged, signOut, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, getDocs, orderBy, limit, onSnapshot,
  serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ============ CONFIG ============ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD_JxMqTdYiW2DF8lgAlojh1quO32M0CuI",
  authDomain: "dream-japan-9cad8.firebaseapp.com",
  projectId: "dream-japan-9cad8",
  storageBucket: "dream-japan-9cad8.firebasestorage.app",
  messagingSenderId: "587561440248",
  appId: "1:587561440248:web:5a97ae4d2366e3b5583c0d",
  measurementId: "G-V3M5626QM5"
};
const ADMIN_EMAIL = "deepakrajpant978@gmail.com";
const REPO_BASE = "https://raw.githubusercontent.com/deepakrajpant/testapi/main/";
const QUESTIONS_DOC = "jftoctnovset/QORwII8D7qLZ7wuCDW36";

/* Payment / contact */
const ESEWA_ID = "9800000000";           // ← UPDATE
const ESEWA_NAME = "Dream Japan";        // ← UPDATE
const ADMIN_WHATSAPP = "9779800000000";  // ← UPDATE (international format, no +)

/* Cache keys */
const CACHE_KEY = "dj_q_cache_v6";
const CACHE_TTL = 60 * 60 * 1000;
const PLANS_CACHE_KEY = "dj_plans_v2";
const PLANS_TTL = 24 * 60 * 60 * 1000;
const PROFILE_CACHE_KEY = "dj_profile_v2";
const PROFILE_TTL = 24 * 60 * 60 * 1000;
const RESULTS_CACHE_KEY = "dj_results_v2";
const RESULTS_TTL = 60 * 60 * 1000;
const NOTIF_CACHE_KEY = "dj_notif_v1";
const LAST_LOGIN_KEY = "dj_last_login_update";
const DEVICE_KEY = "dj_device_id";
const EXAM_STATE_KEY = "dj_exam_state";
const RESULT_KEY = "dj_result";
const REDIRECT_AFTER_KEY = "dj_redirect_after";
const INSTALL_DISMISSED_KEY = "dj_install_dismissed";

const EXAM_MIN = 60;
const MAX_PLAYS = 2;
const PASS_PCT = 0.8;
const POINT_SCALE = 250;                 // ← 250-point scaling system

const SECTIONS = [
  { key:"sv", name:"Script & Vocabulary", short:"Script & Vocabulary", marks:3, icon:"📝" },
  { key:"ce", name:"Conversation & Expression", short:"Conversation & Expression", marks:4, icon:"💬" },
  { key:"lc", name:"Listening Comprehension", short:"Listening Comprehension", marks:6, icon:"🎧" },
  { key:"rc", name:"Reading Comprehension", short:"Reading Comprehension", marks:7, icon:"📖" }
];
const SET_NAMES = [
  { name:"SHIMEMASU", kana:"1" },{ name:"HARE", kana:"2" },
  { name:"GAKUSEI", kana:"3" },{ name:"ORIMASU", kana:"4" },
  { name:"KONPYUTA", kana:"5" },{ name:"MAGARIMASU", kana:"6" }
];

const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

/* ============ STATE ============ */
const state = {
  user: null, profile: null, isAdmin: false,
  screen: "loading", params: {},
  sets: [], plans: [], results: [],
  exam: null, practice: null,
  bookmarks: [], leaderboard: [], notifications: [],
  _userSub: null, _notifSub: null, _tick: null, _audio: null,
  _perfStart: 0, _perfLeftAtStart: 0, _timeupShown: false, _lockTick: null,
  _allStudents: null, _allQs: null, _allPayments: null,
  _confirmedLeave: false, _deviceChecked: false,
  _installPrompt: null, _installNotified: false,
  totalQ: 52, rawFullMarks: 244, fullMarks: POINT_SCALE, passMarks: Math.round(POINT_SCALE * PASS_PCT)
};
let _backHandling = false;
let _lastHandledHash = location.hash;
let _deferredPrompt = null;

/* ============ UTILS ============ */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;")
  .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const pad = n => String(n).padStart(2, "0");

let _toastTimer;
function toast(msg, type="") {
  const t = $("toast"); t.textContent = msg; t.className = "toast show" + (type ? " " + type : "");
  clearTimeout(_toastTimer); _toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}
function modal(title, bodyHTML, buttons) {
  const m = $("modal");
  const btns = buttons || [{ label: "OK", cls: "btn-primary" }];
  const btnHtml = btns.map((b, i) => `<button class="btn ${b.cls || "btn-primary"}" data-idx="${i}">${b.label}</button>`).join("");
  m.innerHTML = `<div class="modal-card"><h3>${esc(title)}</h3><div>${bodyHTML}</div><div class="modal-actions">${btnHtml}</div></div>`;
  m.classList.add("show");
  m.querySelectorAll(".modal-actions button").forEach(btn => {
    btn.onclick = () => {
      m.classList.remove("show");
      const b = btns[+btn.dataset.idx];
      if (b && b.onClick) b.onClick();
    };
  });
}
function closeModal() { $("modal").classList.remove("show"); }
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}
function daysLeft(ts) {
  if (!ts) return 0;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return Math.max(0, Math.ceil((d - Date.now()) / 86400000));
}
function timeAgo(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s/60) + "m ago";
  if (s < 86400) return Math.floor(s/3600) + "h ago";
  if (s < 604800) return Math.floor(s/86400) + "d ago";
  return fmtDate(ts);
}
function resolveUrl(url) {
  if (!url) return "";
  url = String(url).trim();
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.startsWith("scene:") || url.startsWith("tts:")) return url;
  const gh = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i);
  if (gh) return `https://raw.githubusercontent.com/${gh[1]}/${gh[2]}/${gh[3]}`;
  if (url.startsWith("//")) return "https:" + url;
  if (/^https?:\/\//.test(url)) return url;
  return REPO_BASE + url.replace(/^\/+/, "");
}
function sceneData(kind) {
  const sky = { rain:"#7f94a8", sun:"#6ec1f2", snow:"#c8d6e5", cloud:"#9fb3c4" }[kind] || "#6ec1f2";
  let x = kind === "sun" ? `<circle cx="300" cy="55" r="30" fill="#ffd23f"/>`
    : `<ellipse cx="110" cy="52" rx="55" ry="22" fill="#fff" opacity=".88"/><ellipse cx="255" cy="44" rx="60" ry="24" fill="#fff" opacity=".88"/>`;
  if (kind === "rain") for (let i = 0; i < 24; i++) x += `<line x1="${20+i*15}" y1="${90+(i*37)%60}" x2="${14+i*15}" y2="${110+(i*37)%60}" stroke="#d8ecff" stroke-width="2"/>`;
  if (kind === "snow") for (let i = 0; i < 22; i++) x += `<circle cx="${15+i*16}" cy="${95+(i*53)%90}" r="3" fill="#fff"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200"><rect width="360" height="200" fill="${sky}"/>${x}<rect y="165" width="360" height="35" fill="#5d8a4e"/><polygon points="170,165 215,95 260,165" fill="#c94536"/></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
const LOGO_SVG = `<svg viewBox="0 0 24 24"><path d="M12 4L20 19H4L12 4Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`;

/* ============ DEVICE REGISTRATION ============ */
function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem(DEVICE_KEY, id); } catch {}
  }
  return id;
}
async function verifyDevice(user, profile) {
  if (!user || !profile) return { ok: true };
  // Admins bypass device lock
  if (user.email === ADMIN_EMAIL) return { ok: true };

  const localId = getOrCreateDeviceId();
  const registered = profile.deviceId;

  if (!registered) {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        deviceId: localId,
        deviceRegisteredAt: serverTimestamp(),
        deviceLabel: (navigator.userAgent || "").slice(0, 120)
      });
      return { ok: true, justRegistered: true };
    } catch (e) {
      return { ok: true }; // network fail — don't lock user out
    }
  }

  if (registered !== localId) {
    return {
      ok: false,
      reason: "This account is registered on a different device. Please sign in from your original device or contact the administrator."
    };
  }
  return { ok: true };
}
async function resetDevice(uid) {
  try {
    await updateDoc(doc(db, "users", uid), {
      deviceId: null, deviceRegisteredAt: null, deviceLabel: null
    });
    toast("Device reset ✓ — next login will register", "ok");
  } catch (e) { toast("Failed: " + e.message, "err"); }
}

/* ============ LOCAL CACHES ============ */
function saveProfileCache(uid, profile) {
  try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ uid, profile, ts: Date.now() })); } catch {}
}
function loadProfileCache(uid) {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c || c.uid !== uid) return null;
    if (Date.now() - c.ts > PROFILE_TTL) return null;
    return c.profile;
  } catch { return null; }
}
function clearProfileCache() { try { localStorage.removeItem(PROFILE_CACHE_KEY); } catch {} }

function savePlansCache(plans) {
  try { localStorage.setItem(PLANS_CACHE_KEY, JSON.stringify({ ts: Date.now(), plans })); } catch {}
}
function loadPlansCache() {
  try {
    const raw = localStorage.getItem(PLANS_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c || Date.now() - c.ts > PLANS_TTL) return null;
    return c.plans;
  } catch { return null; }
}
function saveResultsCache(uid, results) {
  try { localStorage.setItem(`${RESULTS_CACHE_KEY}_${uid}`, JSON.stringify({ ts: Date.now(), results })); } catch {}
}
function loadResultsCache(uid) {
  try {
    const raw = localStorage.getItem(`${RESULTS_CACHE_KEY}_${uid}`);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c || Date.now() - c.ts > RESULTS_TTL) return null;
    return c.results;
  } catch { return null; }
}
function invalidateResultsCache(uid) { try { localStorage.removeItem(`${RESULTS_CACHE_KEY}_${uid}`); } catch {} }
function saveNotifCache(uid, items) {
  try { localStorage.setItem(`${NOTIF_CACHE_KEY}_${uid}`, JSON.stringify({ ts: Date.now(), items })); } catch {}
}
function loadNotifCache(uid) {
  try {
    const raw = localStorage.getItem(`${NOTIF_CACHE_KEY}_${uid}`);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c || Date.now() - c.ts > 60 * 60 * 1000) return null;
    return c.items;
  } catch { return null; }
}

/* ============ NOTIFICATIONS ============ */
async function sendNotification(targetUid, { title, body, type = "info" }) {
  try {
    await addDoc(collection(db, "users", targetUid, "notifications"), {
      title, body, type, read: false, createdAt: serverTimestamp()
    });
    return true;
  } catch (e) { console.warn("sendNotification", e); return false; }
}
async function broadcastNotification({ title, body, type = "info" }) {
  try {
    const snap = await getDocs(collection(db, "users"));
    const batch = writeBatch(db);
    let count = 0;
    snap.forEach(d => {
      const nRef = doc(collection(db, "users", d.id, "notifications"));
      batch.set(nRef, { title, body, type, read: false, createdAt: serverTimestamp() });
      count++;
    });
    if (count) await batch.commit();
    toast(`Sent to ${count} user${count === 1 ? "" : "s"} ✓`, "ok");
    return count;
  } catch (e) { toast("Failed: " + e.message, "err"); return 0; }
}
async function loadNotifications(uid) {
  try {
    const q = query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    saveNotifCache(uid, out);
    return out;
  } catch { return loadNotifCache(uid) || []; }
}
function setupRealtimeNotifications(uid) {
  if (state._notifSub) state._notifSub();
  try {
    const q = query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc"), limit(50));
    state._notifSub = onSnapshot(q, snap => {
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      state.notifications = items;
      saveNotifCache(uid, items);
      // Re-render topbar badge only (don't interrupt exam/practice)
      if (["home", "profile", "notifications"].includes(state.screen)) {
        if (state.screen === "notifications") render();
        else updateNotifBadge();
      }
    }, () => {});
  } catch {}
}
async function markNotificationRead(nid) {
  if (!state.user) return;
  try { await updateDoc(doc(db, "users", state.user.uid, "notifications", nid), { read: true }); } catch {}
}
async function markAllNotificationsRead() {
  if (!state.user) return;
  try {
    const snap = await getDocs(collection(db, "users", state.user.uid, "notifications"));
    const batch = writeBatch(db);
    snap.forEach(d => { if (!d.data().read) batch.update(d.ref, { read: true }); });
    await batch.commit();
    toast("All marked as read", "ok");
    render();
  } catch (e) { toast("Failed: " + e.message, "err"); }
}
async function deleteNotification(nid) {
  if (!state.user) return;
  try { await deleteDoc(doc(db, "users", state.user.uid, "notifications", nid)); render(); } catch {}
}
function updateNotifBadge() {
  const unread = (state.notifications || []).filter(n => !n.read).length;
  const badge = document.querySelector("[data-notif-badge]");
  if (badge) {
    if (unread > 0) { badge.textContent = unread > 9 ? "9+" : String(unread); badge.style.display = ""; }
    else badge.style.display = "none";
  }
}

/* ============ PAYMENTS (eSewa) ============ */
function buildWhatsAppLink(phone, text) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
function buildEsewaWaText(plan, txnId, amount, name, uid) {
  return `Hi Dream Japan Admin,\n\nI've paid for premium.\n\n` +
    `Name: ${name}\nUser ID: ${uid}\nPlan: ${plan.name}\nAmount: NPR ${amount}\n` +
    `Transaction ID: ${txnId}\nMethod: eSewa\n\nPlease verify and activate my premium.`;
}
async function createPaymentRequest(planId, txnId, method = "esewa") {
  const plan = state.plans.find(p => p.id === planId);
  if (!plan) throw new Error("Plan not found");
  if (!txnId || txnId.trim().length < 4) throw new Error("Enter a valid Transaction ID (min 4 chars)");
  const ref = await addDoc(collection(db, "accessRequests"), {
    uid: state.user.uid,
    email: state.profile.email || "",
    name: state.profile.name || "",
    type: "premium",
    planId, planName: plan.name, planPrice: plan.price, planDays: plan.days,
    amount: plan.price,
    txnId: txnId.trim(),
    paymentMethod: method,
    status: "pending",
    createdAt: serverTimestamp()
  });
  await sendNotification(state.user.uid, {
    title: "Payment submitted",
    body: `We received your payment request for ${plan.name}. Admin will verify within 24 hours.`,
    type: "success"
  });
  return ref.id;
}
async function approvePayment(rid, uid, planId) {
  try {
    const plans = state.plans.length ? state.plans : await loadPlans();
    const plan = plans.find(p => p.id === planId);
    if (!plan) throw new Error("Plan not found");
    const start = new Date();
    const expiry = new Date(Date.now() + plan.days * 86400000);
    await updateDoc(doc(db, "users", uid), {
      premium: { plan: plan.name, start, expiry, note: "eSewa approved" }
    });
    await updateDoc(doc(db, "accessRequests", rid), { status: "approved", approvedAt: serverTimestamp() });
    await sendNotification(uid, {
      title: "🎉 Premium activated!",
      body: `${plan.name} is now active until ${expiry.toLocaleDateString("en-GB")}. Happy studying!`,
      type: "premium"
    });
    toast("Premium approved ✓", "ok");
    renderAdminTab();
  } catch (e) { toast("Failed: " + e.message, "err"); }
}
async function rejectPayment(rid, uid) {
  try {
    await updateDoc(doc(db, "accessRequests", rid), { status: "rejected", rejectedAt: serverTimestamp() });
    await sendNotification(uid, {
      title: "Payment not verified",
      body: "We couldn't verify your payment. Please contact support with your Transaction ID.",
      type: "warn"
    });
    toast("Payment rejected", "ok");
    renderAdminTab();
  } catch (e) { toast("Failed: " + e.message, "err"); }
}

/* ============ SCORE SCALING ============ */
function scaleScore(rawScore, rawFull) {
  if (!rawFull) return 0;
  return Math.round((rawScore * POINT_SCALE) / rawFull);
}

/* ============ EXAM LOCK ============ */
function examLockKey(setIdx) { return `dj_exam_lock_${setIdx}`; }
function readExamLock(setIdx) {
  try { const raw = localStorage.getItem(examLockKey(setIdx)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function isExamLockedByOther(setIdx) {
  const lock = readExamLock(setIdx);
  if (!lock) return false;
  return lock.tab !== TAB_ID && (Date.now() - lock.ts) < 90000;
}
function acquireExamLock(setIdx) {
  try { localStorage.setItem(examLockKey(setIdx), JSON.stringify({ ts: Date.now(), tab: TAB_ID })); } catch {}
}
function refreshExamLock(setIdx) {
  try { localStorage.setItem(examLockKey(setIdx), JSON.stringify({ ts: Date.now(), tab: TAB_ID })); } catch {}
}
function releaseExamLock(setIdx) {
  try { const lock = readExamLock(setIdx); if (lock && lock.tab === TAB_ID) localStorage.removeItem(examLockKey(setIdx)); } catch {}
}


/* ============ HISTORY / ROUTER ============ */
function initHistory() {
  const { screen, params } = parseHash();
  if (!screen || screen === "home" || screen === "login" || screen === "signup") {
    history.replaceState({ screen: "home", params: {} }, "", location.hash || "#/home");
  } else {
    history.replaceState({ screen: "home", params: {} }, "", "#/home");
    const search = new URLSearchParams(params).toString();
    history.pushState({ screen, params }, "", "#/" + screen + (search ? "?" + search : ""));
  }
  _lastHandledHash = location.hash;
}
function parseHash() {
  const raw = location.hash || "#/home";
  const [screen, qs] = raw.slice(2).split("?");
  const params = {};
  if (qs) new URLSearchParams(qs).forEach((v, k) => params[k] = v);
  return { screen: screen || "home", params };
}
function navigate(screen, params = {}) {
  const search = new URLSearchParams(params).toString();
  const hash = "#/" + screen + (search ? "?" + search : "");
  if (screen === "home" && state.screen === "home") {
    if (location.hash !== "#/home") history.replaceState({ screen: "home", params: {} }, "", "#/home");
    return;
  }
  if (screen === "home" && state.screen !== "home") {
    if (location.hash === hash) { state.screen = "home"; state.params = {}; stopAudio(); render(); window.scrollTo(0, 0); return; }
    history.back(); return;
  }
  if (state.screen === "home" || !state.screen) history.pushState({ screen, params }, "", hash);
  else history.replaceState({ screen, params }, "", hash);
  state.screen = screen; state.params = params;
  stopAudio(); render(); window.scrollTo(0, 0);
}
function replaceNavigate(screen, params = {}) {
  const search = new URLSearchParams(params).toString();
  const hash = "#/" + screen + (search ? "?" + search : "");
  history.replaceState({ screen, params }, "", hash);
  state.screen = screen; state.params = params;
  stopAudio(); render(); window.scrollTo(0, 0);
}
window.addEventListener("popstate", () => {
  if (state.screen === "exam" && state.exam && !state._confirmedLeave) {
    if (_backHandling) return;
    _backHandling = true;
    const search = new URLSearchParams(state.params || {}).toString();
    const hash = "#/exam" + (search ? "?" + search : "");
    history.pushState({ screen: "exam", params: state.params }, "", hash);
    _lastHandledHash = hash;
    askLeaveExam();
    setTimeout(() => { _backHandling = false; }, 400);
    return;
  }
  if (state._confirmedLeave) {
    state._confirmedLeave = false;
    const savedSetIdx = state.exam?.setIdx;
    state.exam = null; clearExamState();
    if (state._tick) { clearInterval(state._tick); state._tick = null; }
    if (state._lockTick) { clearInterval(state._lockTick); state._lockTick = null; }
    if (savedSetIdx !== undefined) releaseExamLock(savedSetIdx);
  }
  const { screen, params } = parseHash();
  state.screen = screen || "home"; state.params = params;
  _lastHandledHash = location.hash;
  stopAudio(); render();
});
window.addEventListener("hashchange", () => {
  if (location.hash === _lastHandledHash) return;
  _lastHandledHash = location.hash;
  if (state.screen === "exam" && state.exam) {
    const search = new URLSearchParams(state.params || {}).toString();
    const hash = "#/exam" + (search ? "?" + search : "");
    history.replaceState({ screen: "exam", params: state.params }, "", hash);
    _lastHandledHash = hash; return;
  }
  const { screen, params } = parseHash();
  if (screen === state.screen && JSON.stringify(params) === JSON.stringify(state.params)) return;
  state.screen = screen; state.params = params;
  stopAudio(); render();
});

/* ============ AUTH ============ */
async function signInGoogle() {
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    if (["auth/popup-blocked","auth/popup-closed-by-user","auth/cancelled-popup-request",
         "auth/operation-not-supported-in-this-environment"].includes(e.code)) {
      try {
        sessionStorage.setItem(REDIRECT_AFTER_KEY, location.hash || "#/home");
        await signInWithRedirect(auth, provider);
      } catch (re) { toast(re.message, "err"); }
    } else { toast("Login failed: " + (e.code || e.message), "err"); }
  }
}
async function signInEmail(email, pass) {
  try { await signInWithEmailAndPassword(auth, email, pass); return true; }
  catch (e) {
    const map = {
      "auth/user-not-found":"No account with this email",
      "auth/wrong-password":"Incorrect password",
      "auth/invalid-email":"Invalid email",
      "auth/invalid-credential":"Invalid email or password"
    };
    toast(map[e.code] || "Login failed", "err"); return false;
  }
}
async function signUpEmail(email, pass, name) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "users", cred.user.uid), {
      name: name || email.split("@")[0], email, photoURL: "",
      emailVerified: false, role: email === ADMIN_EMAIL ? "admin" : "student",
      status: "active", practiceAccess: false, premium: null,
      bookmarks: [], streak: { count: 0, last: null }, bestScore: 0,
      deviceId: getOrCreateDeviceId(),
      deviceRegisteredAt: serverTimestamp(),
      deviceLabel: (navigator.userAgent || "").slice(0, 120),
      createdAt: serverTimestamp(), lastLogin: serverTimestamp()
    });
    try { await sendEmailVerification(cred.user); } catch {}
    toast("Account created! Check email to verify.", "ok");
    return true;
  } catch (e) {
    const map = {
      "auth/email-already-in-use":"Email already in use",
      "auth/weak-password":"Password too weak (6+ chars)",
      "auth/invalid-email":"Invalid email"
    };
    toast(map[e.code] || "Signup failed", "err"); return false;
  }
}
async function resetPassword(email) {
  try { await sendPasswordResetEmail(auth, email); toast("Reset link sent", "ok"); }
  catch (e) { toast("Failed: " + e.message, "err"); }
}
async function logout() {
  if (state._userSub) { state._userSub(); state._userSub = null; }
  if (state._notifSub) { state._notifSub(); state._notifSub = null; }
  if (state._lockTick) { clearInterval(state._lockTick); state._lockTick = null; }
  if (state._tick) { clearInterval(state._tick); state._tick = null; }
  stopAudio(); clearProfileCache();
  if (state.user) invalidateResultsCache(state.user.uid);
  try { localStorage.removeItem(LAST_LOGIN_KEY); } catch {}
  await signOut(auth);
}
async function touchLastLogin(uid) {
  try {
    const last = +localStorage.getItem(LAST_LOGIN_KEY) || 0;
    if (Date.now() - last < 60 * 60 * 1000) return;
    await updateDoc(doc(db, "users", uid), { lastLogin: serverTimestamp() });
    localStorage.setItem(LAST_LOGIN_KEY, String(Date.now()));
  } catch {}
}
async function createNewProfile(user) {
  const isAdmin = user.email === ADMIN_EMAIL;
  const profile = {
    name: user.displayName || (user.email || "").split("@")[0],
    email: user.email || "", photoURL: user.photoURL || "",
    emailVerified: !!user.emailVerified,
    role: isAdmin ? "admin" : "student", status: "active",
    practiceAccess: false, premium: null, bookmarks: [],
    streak: { count: 0, last: null }, bestScore: 0,
    deviceId: getOrCreateDeviceId(),
    deviceRegisteredAt: serverTimestamp(),
    deviceLabel: (navigator.userAgent || "").slice(0, 120),
    createdAt: serverTimestamp(), lastLogin: serverTimestamp()
  };
  try {
    await setDoc(doc(db, "users", user.uid), profile);
    localStorage.setItem(LAST_LOGIN_KEY, String(Date.now()));
  } catch (e) { console.warn("Profile create:", e.code); }
  return { uid: user.uid, ...profile };
}
async function ensureUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const profile = { uid: user.uid, ...snap.data() };
      saveProfileCache(user.uid, profile);
      touchLastLogin(user.uid);
      return profile;
    }
    const fresh = await createNewProfile(user);
    saveProfileCache(user.uid, fresh);
    return fresh;
  } catch (e) {
    const cached = loadProfileCache(user.uid);
    if (cached) return cached;
    throw e;
  }
}

/* ============ DATA LOADING ============ */
function normalizeRow(r) {
  if (!r) return null;
  if (Array.isArray(r)) {
    if (r.length < 11) return null;
    return {
      set: Number(r[0]) || 1, section: String(r[1] || "sv").toLowerCase(),
      question: String(r[2] || "").trim(), passage: String(r[3] || "").trim(),
      image: String(r[4] || "").trim(), audio: String(r[5] || "").trim(),
      answer: String(r[6] || "A").toUpperCase(),
      A: String(r[7] || "").trim(), B: String(r[8] || "").trim(),
      C: String(r[9] || "").trim(), D: String(r[10] || "").trim()
    };
  }
  return {
    set: Number(r.set) || 1, section: String(r.section || "sv").toLowerCase(),
    question: String(r.question || "").trim(), passage: String(r.passage || "").trim(),
    image: String(r.image || "").trim(), audio: String(r.audio || "").trim(),
    answer: String(r.answer || "A").toUpperCase(),
    A: String(r.A || "").trim(), B: String(r.B || "").trim(),
    C: String(r.C || "").trim(), D: String(r.D || "").trim()
  };
}
function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c || c.v !== 6 || !Array.isArray(c.rows)) return null;
    if (Date.now() - c.ts > CACHE_TTL) return null;
    return c;
  } catch { return null; }
}
function setCache(rows) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ v: 6, ts: Date.now(), rows })); } catch {}
}
function clearQCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
  try { localStorage.removeItem("dj_q_cache_v5"); } catch {}
}
async function fetchQuestionsFromFirestore() {
  const snap = await getDoc(doc(db, QUESTIONS_DOC));
  if (!snap.exists()) throw new Error("Questions not found");
  const data = snap.data();
  let rows = null;
  if (Array.isArray(data)) rows = data;
  else if (Array.isArray(data.questions)) rows = data.questions;
  else for (const k of Object.keys(data)) { if (Array.isArray(data[k])) { rows = data[k]; break; } }
  if (!rows || !rows.length) throw new Error("No questions found");
  return rows.map(normalizeRow).filter(Boolean);
}
async function loadQuestions(force = false) {
  const cached = getCache();
  if (!force && cached) return { rows: cached.rows, fromCache: true };
  try {
    const rows = await fetchQuestionsFromFirestore();
    setCache(rows);
    return { rows, fromCache: false };
  } catch (e) {
    if (cached) return { rows: cached.rows, fromCache: true, error: e };
    throw e;
  }
}
function buildSets(rows) {
  const sets = SET_NAMES.map((n, i) => ({
    idx: i + 1, name: n.name, kana: n.kana,
    sections: SECTIONS.map(s => ({
      key: s.key, name: s.name, short: s.short, marks: s.marks, count: 0, questions: [], icon: s.icon
    }))
  }));
  rows.forEach(r => {
    const row = normalizeRow(r);
    if (!row || row.set < 1 || row.set > 6) return;
    const set = sets[row.set - 1];
    const sec = set.sections.find(s => s.key === row.section);
    if (!sec) return;
    const ansIdx = Math.max(0, Math.min(3, row.answer.charCodeAt(0) - 65));
    sec.questions.push({
      q: row.question, p: row.passage || null,
      img: row.image ? (row.image.startsWith("scene:") ? sceneData(row.image.slice(6)) : resolveUrl(row.image)) : null,
      au: row.audio || null,
      o: [row.A, row.B, row.C, row.D],
      a: ansIdx, sel: undefined, locked: false, played: 0
    });
  });
  sets.forEach(s => s.sections.forEach(sec => sec.count = sec.questions.length));
  return sets;
}
function recomputeTotals() {
  if (!state.sets.length) return;
  const secs = state.sets[0].sections;
  state.totalQ = secs.reduce((a, s) => a + s.questions.length, 0);
  state.rawFullMarks = secs.reduce((a, s) => a + s.questions.length * s.marks, 0);
  state.fullMarks = POINT_SCALE;
  state.passMarks = Math.round(POINT_SCALE * PASS_PCT);
}
async function loadResults(uid) {
  try {
    const q = query(collection(db, "users", uid, "results"), orderBy("submittedAt", "desc"), limit(30));
    const snap = await getDocs(q);
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    saveResultsCache(uid, out);
    return out;
  } catch { return loadResultsCache(uid) || []; }
}
async function loadResultsCached(uid) {
  const cached = loadResultsCache(uid);
  if (cached) return cached;
  return await loadResults(uid);
}
async function loadPlans() {
  try {
    const snap = await getDocs(collection(db, "plans"));
    const plans = [];
    snap.forEach(d => plans.push({ id: d.id, ...d.data() }));
    plans.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (!plans.length) {
      const defs = [
        { id:"p15", name:"15-Day Premium", price:500, days:15, active:true,
          benefits:["Full access to all 6 sets","Unlimited attempts","Answer explanations","Progress tracking","Practice Mode access","Bookmarks & Streak"] },
        { id:"p30", name:"30-Day Premium", price:1000, days:30, active:true,
          benefits:["Everything in 15-day","Priority support","Section-wise analytics","Leaderboard eligibility","PDF result export"] }
      ];
      for (const p of defs) try { await setDoc(doc(db, "plans", p.id), p); } catch {}
      savePlansCache(defs);
      return defs;
    }
    savePlansCache(plans);
    return plans;
  } catch { return loadPlansCache() || []; }
}
async function loadPlansCached() {
  const cached = loadPlansCache();
  if (cached) return cached;
  return await loadPlans();
}
async function loadLeaderboard() {
  try {
    const q = query(collection(db, "users"), orderBy("bestScore", "desc"), limit(20));
    const snap = await getDocs(q);
    const out = [];
    snap.forEach(d => {
      const u = d.data();
      if ((u.bestScore || 0) > 0) out.push({
        uid: d.id, name: u.name || "Student", photoURL: u.photoURL || "",
        bestScore: u.bestScore, streak: (u.streak && u.streak.count) || 0
      });
    });
    return out;
  } catch { return []; }
}
async function bumpStreak() {
  if (!state.user || !state.profile) return;
  const streak = state.profile.streak || { count: 0, last: null };
  const last = streak.last ? new Date(streak.last) : null;
  const now = new Date();
  let newCount = streak.count || 0;
  if (!last) newCount = 1;
  else {
    const diff = Math.floor((now - last) / 86400000);
    if (diff === 0) return;
    newCount = diff === 1 ? newCount + 1 : 1;
  }
  try {
    await updateDoc(doc(db, "users", state.user.uid), { streak: { count: newCount, last: now.toISOString() } });
    if (state.profile) state.profile.streak = { count: newCount, last: now.toISOString() };
    saveProfileCache(state.user.uid, state.profile);
  } catch {}
}
async function requestAccess() {
  if (!state.profile) return;
  try {
    const existing = await getDocs(query(collection(db, "accessRequests"),
      where("uid", "==", state.user.uid), where("status", "==", "pending")));
    if (!existing.empty) return toast("You already have a pending request", "warn");
    await addDoc(collection(db, "accessRequests"), {
      uid: state.user.uid, email: state.profile.email || "", name: state.profile.name || "",
      type: "practice", status: "pending", createdAt: serverTimestamp()
    });
    await sendNotification(state.user.uid, {
      title: "Request submitted",
      body: "Your practice access request has been sent to the admin.",
      type: "info"
    });
    toast("Request submitted ✓", "ok");
  } catch (e) { toast("Failed: " + e.message, "err"); }
}
async function toggleBookmark(setIdx, secKey, qi) {
  if (!state.user) return;
  const p = state.profile || {};
  const bms = [...(p.bookmarks || [])];
  const idx = bms.findIndex(b => b.set === setIdx && b.section === secKey && b.qi === qi);
  if (idx >= 0) bms.splice(idx, 1);
  else bms.push({ set: setIdx, section: secKey, qi, addedAt: Date.now() });
  try {
    await updateDoc(doc(db, "users", state.user.uid), { bookmarks: bms });
    state.profile.bookmarks = bms;
    saveProfileCache(state.user.uid, state.profile);
    toast(idx >= 0 ? "Bookmark removed" : "Bookmarked ✓", "ok");
  } catch (e) { toast("Failed: " + e.message, "err"); }
}

/* ============ EXAM STATE ============ */
function saveExamState(ex) {
  try {
    sessionStorage.setItem(EXAM_STATE_KEY, JSON.stringify({
      setIdx: ex.setIdx, startedAt: ex.startedAt,
      si: ex.si, qi: ex.qi, left: ex.left, maxReachable: ex.maxReachable,
      answers: ex.sections.map(s => s.questions.map(q => q.sel === undefined ? null : q.sel)),
      played: ex.sections.map(s => s.questions.map(q => q.played || 0)),
      locked: ex.sections.map(s => s.questions.map(q => !!q.locked))
    }));
  } catch {}
}
function loadExamState() {
  try { const raw = sessionStorage.getItem(EXAM_STATE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function clearExamState() { try { sessionStorage.removeItem(EXAM_STATE_KEY); } catch {} }
function saveResult(res) { try { sessionStorage.setItem(RESULT_KEY, JSON.stringify(res)); } catch {} }
function loadResult() {
  try { const r = sessionStorage.getItem(RESULT_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function clearResult() { try { sessionStorage.removeItem(RESULT_KEY); } catch {} }

/* ============ RENDER ============ */
function render() {
  const root = $("app");
  const s = state.screen;
  let html = "";
  if (!state.user) {
    if (s === "signup") html = renderSignup();
    else html = renderLogin();
  } else if (s === "loading") html = renderLoading();
  else if (s === "login" || s === "signup" || s === "home") html = renderHomeScreen();
  else if (s === "sets") html = renderSets();
  else if (s === "start") html = renderStart();
  else if (s === "exam") html = renderExam();
  else if (s === "result") html = renderResult();
  else if (s === "review") html = renderReview();
  else if (s === "profile") html = renderProfile();
  else if (s === "premium") html = renderPremium();
  else if (s === "practice") html = renderPractice();
  else if (s === "bookmarks") html = renderBookmarks();
  else if (s === "leaderboard") html = renderLeaderboard();
  else if (s === "notifications") html = renderNotifications();
  else if (s === "admin") html = state.isAdmin ? renderAdmin() : renderHomeScreen();
  else html = renderHomeScreen();
  root.innerHTML = html;
  postRender();
}

function topbarHTML() {
  if (!state.user) return "";
  const p = state.profile || {};
  const initial = (p.name || state.user.email || "U")[0].toUpperCase();
  const avatar = p.photoURL
    ? `<img src="${esc(p.photoURL)}" class="avatar" alt="" loading="lazy">`
    : `<div class="avatar">${initial}</div>`;
  const unread = (state.notifications || []).filter(n => !n.read).length;
  const notifBadge = unread > 0
    ? `<span data-notif-badge style="position:absolute;top:-4px;right:-4px;background:var(--red,#ef4444);color:#fff;font-size:9px;font-weight:900;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 4px;border:1.5px solid var(--card)">${unread > 9 ? "9+" : unread}</span>`
    : `<span data-notif-badge style="display:none"></span>`;
  return `<div class="topbar"><div class="topbar-inner">
    <div class="logo" data-go="home">${LOGO_SVG}</div>
    <div class="brand" data-go="home"><h1>Dream Japan</h1><p>JFT MOCK TEST</p></div>
    <button class="btn btn-ghost btn-sm" data-go="notifications" style="position:relative;padding:6px 10px;font-size:16px">
      🔔${notifBadge}
    </button>
    <button class="user-btn" data-go="profile">${avatar}
      <span>${esc(p.name || state.user.email)}</span></button>
  </div></div>`;
}
function bottomNavHTML(active) {
  if (!state.user) return "";
  const items = [
    { key:"home", icon:"🏠", label:"Home" },
    { key:"sets", icon:"📚", label:"Tests" },
    { key:"premium", icon:"⭐", label:"Premium" },
    { key:"profile", icon:"👤", label:"Profile" }
  ];
  return `<nav class="bottom-nav"><div class="bnav-inner">${items.map(it => `
    <button class="bnav-item ${active === it.key ? "on" : ""}" data-nav="${it.key}">
      <span class="ic">${it.icon}</span><span>${it.label}</span>
    </button>`).join("")}</div></nav>`;
}
function renderLoading() {
  return `<div class="loading-screen"><div class="spinner"></div><p class="muted">Loading Dream Japan…</p></div>`;
}
function renderLogin() {
  return `<div class="login-wrap"><div class="login-card">
    <div class="login-logo">${LOGO_SVG}</div>
    <h2>Dream Japan</h2>
    <p class="sub">Sign in to access JFT-BASIC mock tests</p>
    <button class="gbtn" id="gLogin">
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Continue with Google
    </button>
    <div class="divider">or</div>
    <div class="field"><label>Email</label><input type="email" id="loginEmail" class="input" placeholder="you@example.com"></div>
    <div class="field"><label>Password</label><input type="password" id="loginPass" class="input" placeholder="••••••••"></div>
    <button class="btn btn-primary btn-block mt-2" id="emailLogin">Sign In</button>
    <div class="login-link"><a id="forgotLink">Forgot password?</a> · <a id="signupLink">Create account</a></div>
  </div></div>`;
}
function renderSignup() {
  return `<div class="login-wrap"><div class="login-card">
    <div class="login-logo">${LOGO_SVG}</div>
    <h2>Create Account</h2>
    <p class="sub">Join Dream Japan and start practising</p>
    <div class="field"><label>Name</label><input type="text" id="signName" class="input" placeholder="Your name"></div>
    <div class="field"><label>Email</label><input type="email" id="signEmail" class="input" placeholder="you@example.com"></div>
    <div class="field"><label>Password</label><input type="password" id="signPass" class="input" placeholder="6+ characters"></div>
    <div class="field"><label>Confirm Password</label><input type="password" id="signPass2" class="input" placeholder="Re-enter"></div>
    <button class="btn btn-primary btn-block mt-2" id="emailSignup">Create Account</button>
    <div class="login-link">Already have an account? <a id="backLogin">Sign in</a></div>
  </div></div>`;
}
function renderHomeScreen() {
  const p = state.profile || {};
  const results = state.results || [];
  const completed = results.length;
  const best = completed ? Math.max(...results.map(r => r.percentage || 0)) : 0;
  const premiumActive = p.premium && daysLeft(p.premium.expiry) > 0;
  const hasAccess = premiumActive || p.practiceAccess || state.isAdmin;
  const streak = (p.streak && p.streak.count) || 0;

  return `${topbarHTML()}<div class="wrap">
    <div class="hero" data-go="sets">
      <small>JFT-BASIC · PRACTICE SERIES</small>
      <h2>Mock Test 2026</h2>
      <p>Six full-length practice sets built on the official 4-section JFT pattern — scaled to 250 marks.</p>
      <div class="hero-stats">
        <div><strong>6</strong><span>Sets</span></div>
        <div><strong>${completed}</strong><span>Completed</span></div>
        <div><strong>${completed ? best + "%" : "–"}</strong><span>Best %</span></div>
      </div>
      <div class="hero-cta">Start practising →</div>
    </div>
    ${streak > 0 ? `<div class="streak-banner"><div class="fire">🔥</div><div style="flex:1"><h4>${streak}-day streak!</h4><p>Keep it up — practice daily to improve faster.</p></div></div>` : ""}
    ${!hasAccess ? `<div class="card mt-2" style="background:#fef3c7;border-color:var(--orange)">
      <div class="flex" style="align-items:flex-start">
        <div style="font-size:28px">🔒</div>
        <div style="flex:1">
          <h3 style="margin-bottom:6px">Access Required</h3>
          <p class="muted" style="margin-bottom:12px">You need practice access or premium to take tests.</p>
          <div class="flex" style="gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" data-go="premium">View Plans</button>
            <button class="btn btn-ghost btn-sm" id="reqAccessBtn">Request Access</button>
          </div>
        </div>
      </div>
    </div>` : ""}
    <div class="grid-2 mt-2">
      <div class="card" style="cursor:pointer;text-align:center" data-go="practice">
        <div style="font-size:28px;margin-bottom:6px">🎯</div>
        <h4 style="font-size:13px">Quick Practice</h4><p class="muted small">Pick a section</p></div>
      <div class="card" style="cursor:pointer;text-align:center" data-go="bookmarks">
        <div style="font-size:28px;margin-bottom:6px">🔖</div>
        <h4 style="font-size:13px">Bookmarks</h4><p class="muted small">${(p.bookmarks || []).length} saved</p></div>
      <div class="card" style="cursor:pointer;text-align:center" data-go="leaderboard">
        <div style="font-size:28px;margin-bottom:6px">🏆</div>
        <h4 style="font-size:13px">Leaderboard</h4><p class="muted small">Top students</p></div>
      <div class="card" style="cursor:pointer;text-align:center" data-go="premium">
        <div style="font-size:28px;margin-bottom:6px">⭐</div>
        <h4 style="font-size:13px">Premium</h4>
        <p class="muted small">${premiumActive ? daysLeft(p.premium.expiry) + "d left" : "View plans"}</p></div>
    </div>
    <div class="card mt-2">
      <div class="flex-between mb-2"><h3>Recent Activity</h3>
        <button class="btn btn-ghost btn-sm" data-go="profile">Profile →</button></div>
      ${completed ? results.slice(0, 3).map(r => `
        <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div><h4>Set ${r.setIdx} · ${esc(r.setName || "—")}</h4><p class="muted small">${fmtDate(r.submittedAt)}</p></div>
          <div style="text-align:right">
            <div style="font-size:18px;font-weight:900;color:${r.percentage >= 80 ? "var(--green)" : "var(--orange)"}">${r.percentage}%</div>
            <div class="muted small">${r.score}/${r.maxScore}</div></div>
        </div>`).join("") : `<p class="muted center" style="padding:24px 0">No attempts yet. Start your first exam!</p>`}
    </div>
  </div>${bottomNavHTML("home")}`;
}
function renderSets() {
  if (!state.sets.length) {
    return `${topbarHTML()}<div class="wrap" style="padding:16px 0 80px">
      <button class="btn btn-ghost btn-sm mb-2" data-go="home">← Back</button>
      <h2 class="mb-2">Choose a Set</h2>
      <div class="card center" style="padding:40px 20px"><div class="spinner" style="margin:0 auto 12px"></div>
        <p class="muted">Loading questions…</p></div></div>${bottomNavHTML("sets")}`;
  }
  return `${topbarHTML()}<div class="wrap" style="padding-top:16px;padding-bottom:80px">
    <button class="btn btn-ghost btn-sm mb-2" data-go="home">← Back</button>
    <h2 class="mb-2">Choose a Set</h2>
    ${state.sets.map((s, i) => `
      <div class="set-card" data-set="${i}">
        <div class="set-kana">${s.kana}</div>
        <div class="set-info"><small>SET ${s.idx}</small><h3>${s.name}</h3>
          <em>${s.sections.reduce((a, sec) => a + sec.count, 0)} questions · 60 min · 250 marks</em></div>
        <div style="color:var(--purple);font-size:20px">→</div>
      </div>`).join("")}
  </div>${bottomNavHTML("sets")}`;
}
function renderStart() {
  const setIdx = +state.params.set || 0;
  const set = state.sets[setIdx];
  if (!set) return renderSets();
  const p = state.profile || {};
  const premiumActive = p.premium && daysLeft(p.premium.expiry) > 0;
  const hasAccess = premiumActive || p.practiceAccess || state.isAdmin;
  if (!hasAccess) {
    return `${topbarHTML()}<div class="wrap" style="padding-top:16px">
      <button class="btn btn-ghost btn-sm mb-2" data-go="sets">← Back</button>
      <div class="card center">
        <div style="font-size:48px;margin-bottom:12px">🔒</div>
        <h2>Access Required</h2>
        <p class="muted mt-1 mb-3">Practice access or premium is needed to start exams.</p>
        <button class="btn btn-primary btn-block mb-1" data-go="premium">View Plans</button>
        <button class="btn btn-ghost btn-block" id="reqAcc2">Request Access</button>
      </div></div>`;
  }
  return `${topbarHTML()}<div class="wrap" style="padding-top:16px;padding-bottom:40px">
    <button class="btn btn-ghost btn-sm mb-2" data-go="sets">← Back</button>
    <div class="card card-lg">
      <div style="width:70px;height:70px;border-radius:50%;background:var(--grad);color:#fff;
        display:grid;place-items:center;font-size:32px;font-weight:800;margin:0 auto 16px">${set.kana}</div>
      <h2 class="center">${set.name}</h2>
      <p class="center muted mt-1" style="font-size:11px;letter-spacing:1.2px;font-weight:800;color:var(--purple)">JFT-BASIC PRACTICE MOCK TEST</p>
      <div class="grid-2 mt-3 mb-3">
        <div class="center" style="background:var(--bg);border-radius:12px;padding:14px">
          <div style="font-size:22px;font-weight:900">${state.totalQ}</div><div class="muted small">Questions</div></div>
        <div class="center" style="background:var(--bg);border-radius:12px;padding:14px">
          <div style="font-size:22px;font-weight:900">250</div><div class="muted small">Total Marks</div></div>
        <div class="center" style="background:var(--bg);border-radius:12px;padding:14px">
          <div style="font-size:22px;font-weight:900">60</div><div class="muted small">Minutes</div></div>
        <div class="center" style="background:var(--bg);border-radius:12px;padding:14px">
          <div style="font-size:22px;font-weight:900">200</div><div class="muted small">Pass Mark</div></div>
      </div>
      <h3 class="mb-1">Exam Rules</h3>
      <ol class="muted mb-3" style="padding-left:18px;font-size:12.5px;line-height:1.7">
        <li>Once you finish a section you cannot return to it</li>
        <li>Timer auto-submits the exam at 00:00</li>
        <li>Answer each question before moving forward</li>
        <li>Audio can be replayed ${MAX_PLAYS} times per question</li>
        <li>Pass mark: 200 / 250 (80%)</li>
        <li>Your progress is saved if you refresh the page</li>
      </ol>
      <label class="flex" style="background:var(--bg);padding:12px;border-radius:10px;cursor:pointer">
        <input type="checkbox" id="agree" style="width:18px;height:18px;accent-color:var(--purple)">
        <span style="font-size:12.5px;font-weight:600">I understand the rules and am ready</span>
      </label>
      <button class="btn btn-primary btn-block mt-2" id="startBtn" disabled>START EXAM</button>
    </div></div>`;
}
function renderExam() {
  if (!state.exam) {
    const saved = loadExamState();
    if (saved) { setTimeout(() => resumeExamFromSaved(saved), 0); return renderLoading(); }
    setTimeout(() => replaceNavigate("sets"), 10);
    return renderLoading();
  }
  const ex = state.exam;
  const sec = ex.sections[ex.si];
  const q = sec.questions[ex.qi];
  const isLastQ = ex.qi === sec.questions.length - 1;
  const isLastSec = ex.si === ex.sections.length - 1;
  const nextLabel = isLastQ ? (isLastSec ? "Submit Exam ✓" : "Finish Section →") : "Next →";

  let mediaHTML = "";
  if (q.img) mediaHTML += `<img src="${esc(q.img)}" loading="lazy" onerror="this.style.display='none'">`;
  if (q.au) mediaHTML += `<div class="audio-row" id="audRow">
    <button class="play-btn" id="playBtn">▶</button>
    <button class="play-btn" style="width:38px;height:38px;background:var(--bg2);color:var(--purple)" id="replayBtn">↻</button>
    <div style="flex:1;min-width:0">
      <div class="wave" style="width:100%">${'<i></i>'.repeat(18)}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);font-weight:700;margin-top:2px">
        <span id="audTime">0:00</span><span id="audLeft">${Math.max(0, MAX_PLAYS - (q.played || 0))} left</span><span id="audDur">--:--</span>
      </div>
    </div></div>`;
  if (mediaHTML) mediaHTML = `<div class="media">${mediaHTML}</div>`;

  const optsHTML = q.o.slice(0, q.o[3] ? 4 : 3).map((t, i) => `
    <div class="opt ${q.sel === i ? "sel" : ""}" data-opt="${i}">
      <div class="opt-ltr">${"ABCD"[i]}</div>
      <div class="opt-tx">${esc(t)}</div></div>`).join("");

  return `<div class="exam-bar"><div class="exam-bar-inner">
    <button class="xback" id="leaveBtn">✕</button>
    <div class="exam-info">
      <b>Set ${ex.set.idx} · ${esc(ex.set.name)}</b>
      <span>Section ${ex.si + 1} of 4 — ${esc(sec.name)}</span></div>
    <div class="timer ${ex.left <= 600 ? "low" : ""}" id="timerDisplay">
      ⏱ <span>${pad(Math.floor(Math.ceil(ex.left) / 60))}:${pad(Math.ceil(ex.left) % 60)}</span></div>
  </div></div>
  <div class="wrap" style="padding-bottom:40px">
    <div class="steps">${ex.sections.map((s, i) =>
      `<div class="step ${i === ex.si ? "cur" : i < ex.si ? "done" : ""}">${s.short}</div>`).join("")}</div>
    <div class="progress-bar"><i id="progressFill" style="width:${(ex.answeredCount / sec.questions.length) * 100}%"></i></div>
    <div class="palette">${sec.questions.map((qq, i) => {
      const disabled = i > ex.maxReachable || qq.locked;
      return `<button class="pal-btn ${qq.sel !== undefined ? "ans" : ""} ${i === ex.qi ? "cur" : ""}"
        ${disabled ? "disabled" : ""} data-jump="${i}">${i + 1}</button>`;
    }).join("")}</div>
    <div class="q-card">
      <div class="q-meta">
        <span class="q-num">Q ${ex.qi + 1} of ${sec.questions.length}</span>
        <span class="q-tag">${sec.short}</span>
        <span class="q-marks">${sec.marks} marks</span></div>
      ${q.p ? `<div class="passage">${esc(q.p)}</div>` : ""}
      <div class="q-text">${esc(q.q)}</div>
      ${mediaHTML}
      <div class="opts" id="opts">${optsHTML}</div>
      <button class="btn btn-ghost btn-sm mt-2" data-bm="1">🔖 Bookmark</button>
    </div>
    <div class="exam-nav">
      <button class="btn btn-ghost" id="prevBtn" ${ex.qi === 0 ? "disabled" : ""}>← Previous</button>
      <button class="btn btn-primary" id="nextBtn" ${q.sel === undefined ? "disabled" : ""}>${nextLabel}</button>
    </div></div>`;
}
function renderResult() {
  const r = loadResult();
  if (!r) return renderHomeScreen();
  const pass = r.score >= state.passMarks;
  const pct = r.percentage;
  return `${topbarHTML()}<div class="wrap" style="padding:16px 0 40px">
    <div class="result-card">
      <div class="result-badge ${pass ? "pass" : "fail"}">${pass ? "PASSED" : "NOT PASSED"}</div>
      <span class="muted" style="font-size:11px;letter-spacing:1.2px;font-weight:800">SET ${r.setIdx} · ${esc(r.setName)}</span>
      <div class="ring mt-2">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle class="bg" cx="80" cy="80" r="68"/>
          <circle class="fg" id="resultRing" cx="80" cy="80" r="68" stroke-dasharray="427.3" stroke-dashoffset="427.3"
            stroke="${pass ? "var(--green)" : "var(--red)"}"/></svg>
        <div><b>${r.score}</b><span>/ ${r.maxScore}</span></div></div>
      <div class="grade-text">${pass ? (pct >= 95 ? "🌸 Outstanding!" : "✅ Passed — well done!") : `❌ Need ${state.passMarks - r.score} more marks to pass`}</div>
      <div class="result-stats">
        <div><h4>Correct</h4><p class="g">${r.correct}</p></div>
        <div><h4>Wrong</h4><p class="r">${r.wrong}</p></div>
        <div><h4>Skipped</h4><p>${r.unanswered}</p></div>
        <div><h4>Percent</h4><p>${pct}%</p></div></div>
    </div>
    <div class="card mt-2"><h3 class="mb-2">Section Breakdown</h3>
      ${r.sections.map(s => `
        <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:12px;font-weight:800">${esc(s.name)}</div>
          <div style="font-size:12px;font-weight:900;color:var(--purple)">${s.scaledScore ?? s.score} / ${s.scaledMax ?? s.max}</div>
        </div>`).join("")}</div>
    <div class="grid-2 mt-2">
      <button class="btn btn-ghost" data-review="all">All Answers</button>
      <button class="btn btn-ghost" data-review="wrong">Wrong Only</button></div>
    <button class="btn btn-teal btn-block mt-1" id="shareBtn">📤 Share Result</button>
    <button class="btn btn-primary btn-block mt-1" id="retryBtn">Try Again</button>
    <button class="btn btn-ghost btn-block mt-1" data-go="sets">Back to Sets</button></div>`;
}
function renderReview() {
  const r = loadResult();
  const filter = state.params.filter || "all";
  if (!r) return renderHomeScreen();
  return `${topbarHTML()}<div class="wrap" style="padding:16px 0 40px">
    <button class="btn btn-ghost btn-sm mb-2" data-go="result">← Back</button>
    <div class="flex-between mb-2"><h2>Answer Review</h2>
      <div class="flex" style="gap:6px">
        <button class="btn btn-sm ${filter === "all" ? "btn-primary" : "btn-ghost"}" data-review="all">All</button>
        <button class="btn btn-sm ${filter === "wrong" ? "btn-primary" : "btn-ghost"}" data-review="wrong">Wrong</button></div></div>
    ${r.sections.map(s => {
      const items = s.items.filter(it => filter === "all" || it.yourAns !== it.correctAns);
      if (!items.length) return "";
      return `<h3 class="mt-2 mb-1" style="color:var(--purple);font-size:12px;letter-spacing:.8px;text-transform:uppercase">${esc(s.name)}</h3>
        ${items.map(it => `
          <div class="card mb-1" style="border-left:4px solid ${it.yourAns === it.correctAns ? "var(--green)" : "var(--red)"}">
            <div style="font-size:11px;font-weight:800;color:var(--muted);margin-bottom:6px">Q${it.idx + 1} · ${s.marks} marks${it.yourAns === undefined ? " · not answered" : ""}</div>
            ${it.p ? `<div class="passage" style="font-size:13px;padding:10px;margin-bottom:8px">${esc(it.p)}</div>` : ""}
            ${it.img ? `<img src="${esc(it.img)}" loading="lazy" style="width:100%;border-radius:10px;margin-bottom:8px" onerror="this.style.display='none'">` : ""}
            ${it.au ? `<div class="muted small mb-1" style="font-weight:700">🔊 ${esc(it.au)}</div>` : ""}
            <div style="font-size:13.5px;line-height:1.5;margin-bottom:8px;white-space:pre-line">${esc(it.q)}</div>
            ${it.o.map((txt, i) => {
              if (i === 3 && !txt) return "";
              const isC = i === it.correctAns, isY = i === it.yourAns;
              const style = isC ? "background:#d1fae5;border-color:var(--green)" : (isY && !isC ? "background:#fee2e2;border-color:var(--red)" : "");
              return `<div style="padding:9px 11px;border:1px solid var(--border);border-radius:9px;margin-top:6px;font-size:12.5px;${style}">
                ${"ABCD"[i]}. ${esc(txt)} ${isC ? "✓ Correct" : ""} ${isY && !isC ? "✗ Your answer" : ""}</div>`;
            }).join("")}
          </div>`).join("")}`;
    }).join("")}</div>`;
}
function renderProfile() {
  const p = state.profile || {};
  const premActive = p.premium && daysLeft(p.premium.expiry) > 0;
  const streak = (p.streak && p.streak.count) || 0;
  const unreadNotifs = (state.notifications || []).filter(n => !n.read).length;
  return `${topbarHTML()}<div class="wrap" style="padding-bottom:80px">
    <div class="profile-header">
      ${p.photoURL ? `<img src="${esc(p.photoURL)}" class="profile-avatar" loading="lazy">`
        : `<div class="profile-avatar">${(p.name || "U")[0].toUpperCase()}</div>`}
      <h2>${esc(p.name || "Student")}</h2><p>${esc(p.email || "")}</p>
      <div class="role-badge">${state.isAdmin ? "👑 Administrator" : premActive ? "⭐ Premium" : "Student"}</div>
    </div>
    <div class="grid-3 mt-2">
      <div class="stat-card center"><div class="num">${state.results.length}</div><div class="lbl">Tests</div></div>
      <div class="stat-card center"><div class="num">${streak}</div><div class="lbl">Streak</div></div>
      <div class="stat-card center"><div class="num">${p.bestScore || 0}%</div><div class="lbl">Best</div></div></div>
    <div class="card mt-2">
      <h3 class="mb-2">Account Status</h3>
      <div class="flex-between" style="padding:8px 0"><span class="muted small">Account</span>
        <span class="badge ${p.status === "blocked" ? "badge-danger" : "badge-success"}">${p.status === "blocked" ? "Blocked" : "Active"}</span></div>
      <div class="flex-between" style="padding:8px 0;border-top:1px solid var(--border)">
        <span class="muted small">Practice Access</span>
        <span class="badge ${p.practiceAccess ? "badge-success" : "badge-muted"}">${p.practiceAccess ? "Granted" : "Not granted"}</span></div>
      <div class="flex-between" style="padding:8px 0;border-top:1px solid var(--border)">
        <span class="muted small">Premium</span>
        <span class="badge ${premActive ? "badge-prem" : "badge-muted"}">${premActive ? `${esc(p.premium.plan)} · ${daysLeft(p.premium.expiry)}d` : "Inactive"}</span></div>
      <div class="flex-between" style="padding:8px 0;border-top:1px solid var(--border)">
        <span class="muted small">Member Since</span>
        <span style="font-size:12px;font-weight:700">${fmtDate(p.createdAt)}</span></div>
      ${p.deviceId ? `<div class="flex-between" style="padding:8px 0;border-top:1px solid var(--border)">
        <span class="muted small">Device Lock</span>
        <span class="badge badge-info">Registered</span></div>` : ""}
    </div>
    ${state.isAdmin ? `<button class="btn btn-primary btn-block mt-2" data-go="admin">⚙ Open Admin Dashboard</button>` : ""}
    <button class="btn btn-ghost btn-block mt-1" data-go="notifications">🔔 Notifications${unreadNotifs ? ` <span class="badge badge-danger" style="margin-left:6px">${unreadNotifs}</span>` : ""}</button>
    <button class="btn btn-ghost btn-block mt-1" data-go="bookmarks">🔖 My Bookmarks (${(p.bookmarks || []).length})</button>
    <button class="btn btn-ghost btn-block mt-1" data-go="leaderboard">🏆 Leaderboard</button>
    <button class="btn btn-ghost btn-block mt-1" data-go="premium">View Premium Plans</button>
    <button class="btn btn-danger btn-block mt-1" id="logoutBtn">Logout</button>
  </div>${bottomNavHTML("profile")}`;
}
function renderPremium() {
  const p = state.profile || {};
  const premActive = p.premium && daysLeft(p.premium.expiry) > 0;
  if (premActive) {
    return `${topbarHTML()}<div class="wrap" style="padding:16px 0 80px">
      <button class="btn btn-ghost btn-sm mb-2" data-go="home">← Back</button>
      <div class="premium-status">
        <h3>⭐ Premium Active</h3><p class="plan-name">${esc(p.premium.plan)}</p>
        <div class="grid-2 mt-2">
          <div style="background:rgba(255,255,255,.2);border-radius:10px;padding:10px">
            <div style="font-size:9px;opacity:.8;text-transform:uppercase;font-weight:800">Started</div>
            <div style="font-size:13px;font-weight:800;margin-top:2px">${fmtDate(p.premium.start)}</div></div>
          <div style="background:rgba(255,255,255,.2);border-radius:10px;padding:10px">
            <div style="font-size:9px;opacity:.8;text-transform:uppercase;font-weight:800">Expires</div>
            <div style="font-size:13px;font-weight:800;margin-top:2px">${fmtDate(p.premium.expiry)}</div></div></div>
        <div style="margin-top:14px;background:rgba(255,255,255,.2);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:24px;font-weight:900">${daysLeft(p.premium.expiry)}</div>
          <div style="font-size:10px;opacity:.9;font-weight:700">days remaining</div></div>
      </div>
      <div class="card mt-2"><h3 class="mb-2">Your Premium Benefits</h3>
        <ul style="list-style:none;padding:0">
          ${["Unlimited attempts","Answer explanations","Practice Mode","Bookmarks & Streak tracking","Leaderboard eligibility"]
            .map(b => `<li style="padding:8px 0;font-size:13px;display:flex;gap:8px;align-items:center"><span style="color:var(--green);font-weight:900">✓</span>${b}</li>`).join("")}
        </ul></div>
      <button class="btn btn-primary btn-block mt-3" data-go="sets">Start Practising</button>
    </div>${bottomNavHTML("premium")}`;
  }
  return `${topbarHTML()}<div class="wrap" style="padding:16px 0 80px">
    <button class="btn btn-ghost btn-sm mb-2" data-go="home">← Back</button>
    <div class="card-prem card-lg" style="border-radius:22px;margin-bottom:16px;padding:28px 22px">
      <div style="font-size:36px;margin-bottom:8px">⭐</div>
      <h2 style="color:#fff;font-size:24px;margin-bottom:6px">Unlock Premium</h2>
      <p style="font-size:13px;opacity:.95;max-width:340px">Get full access to all 6 mock tests, unlimited attempts, practice mode, and more.</p>
    </div>
    <h3 class="mb-2">Choose your plan</h3>
    ${state.plans.filter(pl => pl.active).map((pl, i) => `
      <div class="plan-card ${i === 1 ? "featured" : ""}">
        ${i === 1 ? '<span class="badge badge-prem mb-1">Most Popular</span>' : ""}
        <div class="flex-between"><h3>${esc(pl.name)}</h3>
          <div style="text-align:right">
            <div class="price">NPR ${pl.price.toLocaleString()}</div>
            <div class="muted small">${pl.days} days</div></div></div>
        <ul class="benefits">${(pl.benefits || []).map(b => `<li>${esc(b)}</li>`).join("")}</ul>
        <button class="btn btn-prem btn-block mt-2" data-plan="${pl.id}">Pay with eSewa</button>
      </div>`).join("")}
    <div class="card mt-2" style="background:var(--bg)">
      <h3 class="mb-1" style="font-size:13px">How to pay with eSewa</h3>
      <ol class="muted small" style="line-height:1.7;padding-left:18px;margin-top:8px">
        <li>Open eSewa app or web — tap "Send Money"</li>
        <li>Send to <b>${ESEVA_ID}</b> (${ESEWA_NAME})</li>
        <li>Copy the Transaction ID from your receipt</li>
        <li>Tap "Pay with eSewa" on a plan, paste the ID, submit</li>
        <li>Admin verifies within 24 hours</li>
      </ol>
    </div>
  </div>${bottomNavHTML("premium")}`;
}
function renderPractice() {
  const p = state.profile || {};
  const premActive = p.premium && daysLeft(p.premium.expiry) > 0;
  const hasAccess = premActive || p.practiceAccess || state.isAdmin;
  if (!hasAccess) {
    return `${topbarHTML()}<div class="wrap" style="padding:16px 0 40px">
      <button class="btn btn-ghost btn-sm mb-2" data-go="home">← Back</button>
      <div class="card center">
        <div style="font-size:48px;margin-bottom:12px">⭐</div>
        <h2>Premium Feature</h2>
        <p class="muted mt-1 mb-3">Practice Mode is available for premium members only.</p>
        <button class="btn btn-prem btn-block" data-go="premium">View Plans</button>
      </div></div>`;
  }
  return `${topbarHTML()}<div class="wrap" style="padding:16px 0 80px">
    <button class="btn btn-ghost btn-sm mb-2" data-go="home">← Back</button>
    <h2 class="mb-1">Quick Practice</h2>
    <p class="muted mb-3">Choose a section — 10 questions, no timer</p>
    ${SECTIONS.map(s => `
      <div class="practice-card" data-practice="${s.key}">
        <div class="ic">${s.icon}</div>
        <div style="flex:1"><h4>${esc(s.name)}</h4><p>10 questions · ${s.marks} marks each</p></div>
        <div style="color:var(--purple);font-size:20px">→</div>
      </div>`).join("")}</div>`;
}
function renderBookmarks() {
  const p = state.profile || {};
  const bms = p.bookmarks || [];
  if (!bms.length) {
    return `${topbarHTML()}<div class="wrap" style="padding:16px 0 40px">
      <button class="btn btn-ghost btn-sm mb-2" data-go="home">← Back</button>
      <h2 class="mb-2">My Bookmarks</h2>
      <div class="empty"><div class="big">🔖</div>No bookmarks yet.<br>Tap the bookmark icon on any question during practice.</div></div>`;
  }
  return `${topbarHTML()}<div class="wrap" style="padding:16px 0 80px">
    <button class="btn btn-ghost btn-sm mb-2" data-go="home">← Back</button>
    <h2 class="mb-2">My Bookmarks (${bms.length})</h2>
    ${bms.map((bm, i) => {
      const set = state.sets[bm.set - 1]; if (!set) return "";
      const sec = set.sections.find(s => s.key === bm.section); if (!sec) return "";
      const q = sec.questions[bm.qi]; if (!q) return "";
      return `<div class="card mb-1">
        <div class="flex-between mb-1">
          <span class="badge badge-info">Set ${bm.set} · ${sec.short}</span>
          <button class="btn btn-sm btn-ghost" data-rm-bm="${i}">Remove</button></div>
        <div style="font-size:13.5px;line-height:1.5;margin-bottom:8px">${esc(q.q)}</div>
        ${q.o.map((t, oi) => t ? `<div style="padding:7px 10px;font-size:12px;color:var(--muted);border-radius:6px;margin-top:4px;${oi === q.a ? "background:#d1fae5;color:#047857;font-weight:700" : ""}">
          ${"ABCD"[oi]}. ${esc(t)} ${oi === q.a ? "✓" : ""}</div>` : "").join("")}
      </div>`;
    }).join("")}</div>`;
}
function renderLeaderboard() {
  const lb = state.leaderboard || [];
  return `${topbarHTML()}<div class="wrap" style="padding:16px 0 80px">
    <button class="btn btn-ghost btn-sm mb-2" data-go="home">← Back</button>
    <h2 class="mb-1">🏆 Leaderboard</h2>
    <p class="muted mb-3">Top 20 students by best score</p>
    <div class="card">${lb.length ? lb.map((u, i) => {
      const rankClass = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
      return `<div class="lb-row">
        <div class="lb-rank ${rankClass}">${i + 1}</div>
        <div class="lb-info"><b>${esc(u.name)}</b><span>🔥 ${u.streak}-day streak</span></div>
        <div class="lb-score">${u.bestScore}%</div></div>`;
    }).join("") : `<div class="empty">No scores yet.</div>`}</div></div>`;
}
function renderNotifications() {
  const items = state.notifications || [];
  return `${topbarHTML()}<div class="wrap" style="padding:16px 0 80px">
    <button class="btn btn-ghost btn-sm mb-2" data-go="profile">← Back</button>
    <div class="flex-between mb-2">
      <h2>🔔 Notifications</h2>
      ${items.some(n => !n.read) ? `<button class="btn btn-ghost btn-sm" id="markAllRead">Mark all read</button>` : ""}</div>
    ${items.length ? items.map(n => `
      <div class="card mb-1" style="border-left:4px solid ${n.type === "premium" ? "var(--violet)" : n.type === "success" ? "var(--green)" : n.type === "warn" ? "var(--orange)" : "var(--cyan)"};opacity:${n.read ? ".7" : "1"}">
        <div class="flex-between mb-1">
          <h4 style="font-size:13px">${esc(n.title)}</h4>
          <span class="muted small">${timeAgo(n.createdAt)}</span></div>
        <p class="muted" style="font-size:12.5px;line-height:1.5">${esc(n.body)}</p>
        <div class="flex mt-1" style="gap:6px">
          ${!n.read ? `<button class="btn btn-sm btn-ghost" data-notif-read="${n.id}">Mark read</button>` : ""}
          <button class="btn btn-sm btn-ghost" data-notif-del="${n.id}">Delete</button></div>
      </div>`).join("") : `<div class="empty"><div class="big">🔔</div>No notifications yet.</div>`}
  </div>`;
}


/* ============ ADMIN ============ */
let adminTab = "overview";
function renderAdmin() {
  const tabs = [
    { id:"overview", label:"Overview" },{ id:"students", label:"Students" },
    { id:"requests", label:"Requests" },{ id:"payments", label:"Payments" },
    { id:"questions", label:"Questions" },{ id:"notify", label:"Notify" },
    { id:"settings", label:"Settings" }
  ];
  const contentMap = {
    overview: adminOverviewHTML, students: adminStudentsHTML, requests: adminRequestsHTML,
    payments: adminPaymentsHTML, questions: adminQuestionsHTML, notify: adminNotifyHTML,
    settings: adminSettingsHTML
  };
  return `${topbarHTML()}<div class="wrap" style="padding:16px 0 80px">
    <button class="btn btn-ghost btn-sm mb-2" data-go="profile">← Back</button>
    <h2 class="mb-2">⚙ Admin Dashboard</h2>
    <div class="admin-tabs">${tabs.map(t =>
      `<button class="admin-tab ${adminTab === t.id ? "on" : ""}" data-admin-tab="${t.id}">${t.label}</button>`).join("")}</div>
    <div id="adminContent">${contentMap[adminTab]()}</div></div>`;
}
function renderAdminTab() {
  const contentMap = {
    overview: adminOverviewHTML, students: adminStudentsHTML, requests: adminRequestsHTML,
    payments: adminPaymentsHTML, questions: adminQuestionsHTML, notify: adminNotifyHTML,
    settings: adminSettingsHTML
  };
  const el = $("adminContent");
  if (el && contentMap[adminTab]) { el.innerHTML = contentMap[adminTab](); bindAdminTab(); }
}
function adminOverviewHTML() {
  return `<div class="grid-2">
    <div class="stat-card"><div class="num" id="statTotal">…</div><div class="lbl">Total Students</div></div>
    <div class="stat-card"><div class="num" id="statActive">…</div><div class="lbl">Active</div></div>
    <div class="stat-card"><div class="num" id="statBlocked">…</div><div class="lbl">Blocked</div></div>
    <div class="stat-card"><div class="num" id="statPremium">…</div><div class="lbl">Premium</div></div>
    <div class="stat-card"><div class="num" id="statPending">…</div><div class="lbl">Pending Requests</div></div>
    <div class="stat-card"><div class="num" id="statPayments">…</div><div class="lbl">Pending Payments</div></div>
    <div class="stat-card"><div class="num" id="statQuestions">…</div><div class="lbl">Questions</div></div>
    <div class="stat-card"><div class="num" id="statPlans">…</div><div class="lbl">Premium Plans</div></div></div>
  <div class="card mt-2"><h3 class="mb-1">Quick Actions</h3>
    <div class="grid-2">
      <button class="btn btn-primary btn-sm" data-admin-tab="students">Students</button>
      <button class="btn btn-teal btn-sm" data-admin-tab="questions">Questions</button>
      <button class="btn btn-ghost btn-sm" data-admin-tab="payments">Payments</button>
      <button class="btn btn-ghost btn-sm" data-admin-tab="notify">Notify</button>
      <button class="btn btn-ghost btn-sm" data-admin-tab="requests">Requests</button>
      <button class="btn btn-ghost btn-sm" id="refreshQBtn">↻ Refresh Q</button></div></div>`;
}
function adminStudentsHTML() {
  return `<div class="field"><input type="text" id="studentSearch" class="input" placeholder="Search by name or email…"></div>
    <div id="studentsList"><p class="muted center" style="padding:24px">Loading…</p></div>`;
}
function adminRequestsHTML() {
  return `<div id="requestsList"><p class="muted center" style="padding:24px">Loading…</p></div>`;
}
function adminPaymentsHTML() {
  return `<div id="paymentsList"><p class="muted center" style="padding:24px">Loading…</p></div>`;
}
function adminQuestionsHTML() {
  return `<div class="flex-between mb-2"><h3>Questions</h3>
    <div class="flex" style="gap:6px">
      <button class="btn btn-ghost btn-sm" id="refreshQ2">↻</button>
      <button class="btn btn-primary btn-sm" id="addQBtn">+ Add</button></div></div>
  <div class="card" style="background:var(--bg);padding:12px;margin-bottom:12px">
    <p class="muted small" style="line-height:1.6"><b>📁 GitHub Media:</b> Put images in <code>photos/</code> and audio in <code>audio/</code>.<br>
      Base: <code>${REPO_BASE}</code></p></div>
  <div class="field"><input type="text" id="qSearch" class="input" placeholder="Search questions…"></div>
  <div id="questionsList"><p class="muted center" style="padding:24px">Loading…</p></div>`;
}
function adminNotifyHTML() {
  return `<div class="card">
    <h3 class="mb-2">Send Notification</h3>
    <div class="field"><label>Title</label><input type="text" id="notifyTitle" class="input" placeholder="Notification title"></div>
    <div class="field"><label>Message</label><textarea id="notifyBody" class="input" placeholder="Message body…"></textarea></div>
    <div class="field"><label>Type</label><select id="notifyType" class="input">
      <option value="info">Info</option><option value="success">Success</option>
      <option value="warn">Warning</option><option value="premium">Premium</option></select></div>
    <div class="field"><label>Audience</label><select id="notifyAudience" class="input">
      <option value="all">All Students</option><option value="uid">Specific User ID</option></select></div>
    <div class="field" id="notifyUidWrap" style="display:none"><label>User ID</label><input type="text" id="notifyUid" class="input" placeholder="Firebase UID"></div>
    <button class="btn btn-primary btn-block mt-2" id="sendNotifyBtn">Send Notification</button>
  </div>
  <div class="card mt-2" style="background:var(--bg)">
    <h3 class="mb-1" style="font-size:13px">Tip</h3>
    <p class="muted small" style="line-height:1.6">Broadcast notifications are written to each user's <code>notifications</code> subcollection. For large user bases (500+), this may take a few seconds.</p></div>`;
}
function adminSettingsHTML() {
  return `<div class="card">
    <h3 class="mb-2">System Info</h3>
    <div class="flex-between" style="padding:8px 0"><span class="muted small">Admin Email</span><span style="font-size:12px">${esc(ADMIN_EMAIL)}</span></div>
    <div class="flex-between" style="padding:8px 0;border-top:1px solid var(--border)"><span class="muted small">eSewa Number</span><span style="font-size:12px">${esc(ESEVA_ID)}</span></div>
    <div class="flex-between" style="padding:8px 0;border-top:1px solid var(--border)"><span class="muted small">WhatsApp</span><span style="font-size:12px">+${esc(ADMIN_WHATSAPP)}</span></div>
    <div class="flex-between" style="padding:8px 0;border-top:1px solid var(--border)"><span class="muted small">Total Q</span><span style="font-size:12px">${state.totalQ}</span></div>
    <div class="flex-between" style="padding:8px 0;border-top:1px solid var(--border)"><span class="muted small">Scaling</span><span style="font-size:12px">${POINT_SCALE} marks</span></div></div>
  <div class="card mt-2"><h3 class="mb-2">Export / Import Questions</h3>
    <button class="btn btn-primary btn-block mb-2" id="exportBtn">📥 Download questions.json</button>
    <textarea id="importText" class="input" placeholder='{"questions": [...]}' style="min-height:100px"></textarea>
    <button class="btn btn-teal btn-block mt-2" id="importBtn">Import</button></div>`;
}

/* ============ POST-RENDER ============ */
function postRender() {
  document.querySelectorAll("[data-go]").forEach(el => el.onclick = () => navigate(el.dataset.go));
  document.querySelectorAll("[data-nav]").forEach(el => el.onclick = () => navigate(el.dataset.nav));
  document.querySelectorAll("[data-admin-tab]").forEach(el => el.onclick = () => { adminTab = el.dataset.adminTab; render(); });
  document.querySelectorAll("[data-review]").forEach(el => el.onclick = () => navigate("review", { filter: el.dataset.review }));

  if (state.screen === "login" && !state.user) {
    $("gLogin").onclick = signInGoogle;
    $("emailLogin").onclick = () => {
      const e = $("loginEmail").value.trim(), p = $("loginPass").value;
      if (!e || !p) return toast("Email and password required", "err");
      signInEmail(e, p);
    };
    $("signupLink").onclick = () => navigate("signup");
    $("forgotLink").onclick = () => {
      const email = $("loginEmail").value.trim();
      if (!email) return toast("Enter your email first", "err");
      resetPassword(email);
    };
  }
  if (state.screen === "signup") {
    $("backLogin").onclick = () => navigate("login");
    $("emailSignup").onclick = async () => {
      const name = $("signName").value.trim(), email = $("signEmail").value.trim();
      const p1 = $("signPass").value, p2 = $("signPass2").value;
      if (!email || !p1) return toast("All fields required", "err");
      if (p1 !== p2) return toast("Passwords don't match", "err");
      if (p1.length < 6) return toast("Password 6+ characters", "err");
      await signUpEmail(email, p1, name);
    };
  }
  const reqBtn = $("reqAccessBtn");
  if (reqBtn) reqBtn.onclick = requestAccess;
  document.querySelectorAll("[data-set]").forEach(el => el.onclick = () => navigate("start", { set: el.dataset.set }));

  const agree = $("agree"), startBtn = $("startBtn");
  if (agree && startBtn) {
    agree.onchange = () => { startBtn.disabled = !agree.checked; };
    startBtn.onclick = () => {
      if (!agree.checked) return toast("Please agree to the rules", "err");
      beginExam(+state.params.set);
    };
  }
  const reqAcc2 = $("reqAcc2");
  if (reqAcc2) reqAcc2.onclick = requestAccess;
  if (state.screen === "exam" && state.exam) bindExamEvents();

  const shareBtn = $("shareBtn"); if (shareBtn) shareBtn.onclick = shareResult;
  const retryBtn = $("retryBtn");
  if (retryBtn) retryBtn.onclick = () => { const r = loadResult(); if (r) navigate("start", { set: r.setIdx - 1 }); };
  if (state.screen === "result") setTimeout(() => {
    const r = loadResult(), ring = $("resultRing");
    if (ring && r) ring.style.strokeDashoffset = 427.3 * (1 - r.percentage / 100);
  }, 100);

  const logoutBtn = $("logoutBtn"); if (logoutBtn) logoutBtn.onclick = logout;

  document.querySelectorAll("[data-plan]").forEach(el => el.onclick = () => openEsewaModal(el.dataset.plan));
  document.querySelectorAll("[data-practice]").forEach(el => el.onclick = () => startPractice(el.dataset.practice));

  document.querySelectorAll("[data-rm-bm]").forEach(el => {
    el.onclick = async () => {
      const bms = [...(state.profile.bookmarks || [])];
      bms.splice(+el.dataset.rmBm, 1);
      try {
        await updateDoc(doc(db, "users", state.user.uid), { bookmarks: bms });
        state.profile.bookmarks = bms; saveProfileCache(state.user.uid, state.profile);
        render(); toast("Removed", "ok");
      } catch (e) { toast("Failed: " + e.message, "err"); }
    };
  });

  document.querySelectorAll("[data-notif-read]").forEach(el => el.onclick = async () => { await markNotificationRead(el.dataset.notifRead); });
  document.querySelectorAll("[data-notif-del]").forEach(el => el.onclick = async () => { await deleteNotification(el.dataset.notifDel); });
  const mar = $("markAllRead"); if (mar) mar.onclick = markAllNotificationsRead;

  if (state.screen === "admin" && state.isAdmin) bindAdminTab();
}
function openEsewaModal(planId) {
  const plan = state.plans.find(p => p.id === planId);
  if (!plan) return;
  modal(`Pay NPR ${plan.price.toLocaleString()} with eSewa`, `
    <div style="text-align:center;margin-bottom:12px">
      <div style="font-size:40px;margin-bottom:8px">💰</div>
      <p style="font-size:13px;line-height:1.5">Send <b>NPR ${plan.price.toLocaleString()}</b> to:</p>
      <div style="background:var(--bg);border-radius:12px;padding:12px;margin:10px 0">
        <div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px">eSewa ID</div>
        <div style="font-size:20px;font-weight:900;color:var(--violet);letter-spacing:1px;margin-top:2px">${esc(ESEVA_ID)}</div>
        <div style="font-size:12px;font-weight:700;color:var(--text);margin-top:2px">${esc(ESEVA_NAME)}</div></div>
      <p class="muted small" style="line-height:1.5">Then paste the Transaction ID below. Admin will verify within 24h.</p></div>
    <div class="field"><label>Transaction ID</label>
      <input type="text" id="esewaTxnId" class="input" placeholder="e.g. 0ABC123XYZ" autocomplete="off"></div>
    <div style="background:#dbeafe;border-radius:8px;padding:10px;font-size:11px;color:#1e40af;line-height:1.5">
      ⓘ A WhatsApp confirmation message will also be prepared — send it to admin to speed up verification.</div>
  `, [
    { label: "Cancel", cls: "btn-ghost" },
    { label: "Submit Payment", cls: "btn-primary", onClick: async () => {
      const txn = ($("esewaTxnId")?.value || "").trim();
      if (!txn || txn.length < 4) return toast("Enter a valid Transaction ID", "err");
      try {
        await createPaymentRequest(planId, txn, "esewa");
        const text = buildEsewaWaText(plan, txn, plan.price, state.profile.name, state.user.uid);
        const waLink = buildWhatsAppLink(ADMIN_WHATSAPP, text);
        modal("✅ Payment Submitted", `
          <p style="font-size:13px;line-height:1.6;margin-bottom:12px">Your payment request is pending admin verification. You'll receive a notification once approved.</p>
          <p class="muted small" style="line-height:1.6">For faster activation, send your transaction receipt on WhatsApp:</p>`,
          [{ label: "Close", cls: "btn-ghost" },
           { label: "Open WhatsApp", cls: "btn-teal", onClick: () => window.open(waLink, "_blank") }]);
      } catch (e) { toast(e.message, "err"); }
    }}
  ]);
}

/* ============ EXAM ENGINE ============ */
async function beginExam(setIdx, force = false) {
  const set = state.sets[setIdx];
  if (!set) return navigate("sets");
  const p = state.profile || {};
  const premActive = p.premium && daysLeft(p.premium.expiry) > 0;
  if (!(premActive || p.practiceAccess || state.isAdmin)) {
    modal("Access Required", "You need premium or practice access to start this exam.",
      [{ label: "View Plans", cls: "btn-primary", onClick: () => navigate("premium") }]);
    return;
  }
  if (!force && isExamLockedByOther(setIdx)) {
    modal("Another tab has this exam", "This exam appears open in another tab. Starting here may cause duplicate submissions.",
      [{ label: "Cancel", cls: "btn-ghost" },
       { label: "Start Anyway", cls: "btn-primary", onClick: () => beginExam(setIdx, true) }]);
    return;
  }
  const sections = set.sections.map(s => ({
    ...s, questions: s.questions.map(q => ({ ...q, sel: undefined, locked: false, played: 0 }))
  }));
  state.exam = {
    set, setIdx, sections, si: 0, qi: 0,
    left: EXAM_MIN * 60, paused: false, answeredCount: 0, maxReachable: 0,
    startedAt: Date.now()
  };
  acquireExamLock(setIdx); saveExamState(state.exam); startTimer(); bumpStreak();
  navigate("exam");
}
function resumeExamFromSaved(saved) {
  const set = state.sets[saved.setIdx];
  if (!set) { clearExamState(); replaceNavigate("sets"); return; }
  const sections = set.sections.map((s, si) => ({
    ...s, questions: s.questions.map((q, qi) => ({
      ...q, sel: saved.answers?.[si]?.[qi] ?? undefined,
      locked: !!(saved.locked?.[si]?.[qi]), played: saved.played?.[si]?.[qi] || 0
    }))
  }));
  state.exam = {
    set, setIdx: saved.setIdx, sections,
    si: saved.si || 0, qi: saved.qi || 0,
    left: Math.max(0, saved.left || EXAM_MIN * 60), paused: false,
    answeredCount: sections[saved.si || 0].questions.filter(x => x.sel !== undefined).length,
    maxReachable: saved.maxReachable || 0, startedAt: saved.startedAt || Date.now()
  };
  refreshExamLock(saved.setIdx); startTimer(); render();
}
function startTimer() {
  if (state._tick) clearInterval(state._tick);
  if (state._lockTick) clearInterval(state._lockTick);
  state._perfStart = performance.now();
  state._perfLeftAtStart = state.exam.left;
  state._timeupShown = false;
  state._tick = setInterval(tick, 500);
  state._lockTick = setInterval(() => { if (state.exam) refreshExamLock(state.exam.setIdx); }, 15000);
  refreshExamLock(state.exam.setIdx);
}
function tick() {
  const ex = state.exam;
  if (!ex) { clearInterval(state._tick); return; }
  if (ex.paused) { state._perfStart = performance.now(); state._perfLeftAtStart = ex.left; return; }
  const elapsedSec = (performance.now() - state._perfStart) / 1000;
  ex.left = Math.max(0, state._perfLeftAtStart - elapsedSec);
  const el = $("timerDisplay");
  if (el) {
    const secs = Math.ceil(ex.left);
    el.innerHTML = `⏱ <span>${pad(Math.floor(secs / 60))}:${pad(secs % 60)}</span>`;
    el.classList.toggle("low", ex.left <= 600);
  }
  if (ex.left <= 0 && !state._timeupShown) {
    state._timeupShown = true; clearInterval(state._tick);
    if (state._lockTick) { clearInterval(state._lockTick); state._lockTick = null; }
    modal("Time is up!", "Submitting automatically…",
      [{ label: "View Results", cls: "btn-primary", onClick: finishExam }]);
  }
}
function bindExamEvents() {
  const ex = state.exam;
  const sec = ex.sections[ex.si];
  const q = sec.questions[ex.qi];
  document.querySelectorAll("[data-opt]").forEach(el => el.onclick = () => selectOpt(+el.dataset.opt));
  document.querySelectorAll("[data-jump]").forEach(el => el.onclick = () => { if (!el.disabled) jumpTo(+el.dataset.jump); });
  $("prevBtn").onclick = prevQ;
  $("nextBtn").onclick = nextQ;
  $("leaveBtn").onclick = askLeaveExam;
  const pb = $("playBtn"); if (pb) pb.onclick = () => playAudio(q);
  const rb = $("replayBtn"); if (rb) rb.onclick = () => playAudio(q);
  const bm = document.querySelector("[data-bm]");
  if (bm) bm.onclick = () => toggleBookmark(ex.set.idx, sec.key, ex.qi);
}
function selectOpt(i) {
  const ex = state.exam; if (!ex) return;
  const sec = ex.sections[ex.si], q = sec.questions[ex.qi];
  if (q.locked) return;
  q.sel = i;
  ex.answeredCount = sec.questions.filter(x => x.sel !== undefined).length;
  document.querySelectorAll(".opt").forEach((el, idx) => el.classList.toggle("sel", idx === i));
  const nextBtn = $("nextBtn"); if (nextBtn) nextBtn.disabled = false;
  const palette = document.querySelectorAll(".pal-btn");
  if (palette[ex.qi]) palette[ex.qi].classList.add("ans");
  const pbar = $("progressFill");
  if (pbar) pbar.style.width = (ex.answeredCount / sec.questions.length * 100) + "%";
  saveExamState(ex);
}
function jumpTo(i) {
  const ex = state.exam; if (!ex) return;
  const sec = ex.sections[ex.si]; if (!sec) return;
  if (i < 0 || i >= sec.questions.length) return;
  if (i > ex.maxReachable) return;
  if (sec.questions[i]?.locked) return;
  stopAudio(); ex.qi = i; saveExamState(ex); render();
}
function prevQ() { const ex = state.exam; if (!ex) return; if (ex.qi > 0) { stopAudio(); ex.qi--; saveExamState(ex); render(); } }
function nextQ() {
  const ex = state.exam; if (!ex) return;
  const sec = ex.sections[ex.si], q = sec.questions[ex.qi];
  if (q.sel === undefined) return;
  if (ex.qi < sec.questions.length - 1) {
    stopAudio(); ex.qi++;
    if (ex.qi > ex.maxReachable) ex.maxReachable = ex.qi;
    saveExamState(ex); render();
  } else finishSection();
}

function finishSection() {
  const ex = state.exam;
  const sec = ex.sections[ex.si];
  const unanswered = sec.questions.filter(x => x.sel === undefined).length;
  const isLast = ex.si === ex.sections.length - 1;
  modal(isLast ? "Submit your exam?" : "Complete this section?",
    (unanswered ? `${unanswered} unanswered. ` : "") +
    (isLast ? "You cannot change answers after submitting." : "You cannot return to this section."),
    [
      { label: "Cancel", cls: "btn-ghost" },
      { label: isLast ? "Submit" : "Continue", cls: "btn-primary", onClick: () => {
        sec.questions.forEach(q => q.locked = true);
        if (isLast) finishExam();
        else {
          ex.si++; ex.qi = 0; ex.maxReachable = 0;
          saveExamState(ex);
          render();
        }
      }}
    ]);
}

function askLeaveExam() {
  if (!state.exam) return;
  state.exam.paused = true;
  stopAudio();
  modal("Leave the exam?", "Progress will be lost and the timer will stop.",
    [
      { label: "Stay", cls: "btn-ghost", onClick: () => { if (state.exam) state.exam.paused = false; } },
      { label: "Leave", cls: "btn-danger", onClick: () => {
        state._confirmedLeave = true;
        history.back();
      }}
    ]);
}

async function finishExam() {
  if (state._tick) clearInterval(state._tick);
  if (state._lockTick) { clearInterval(state._lockTick); state._lockTick = null; }
  stopAudio();
  const ex = state.exam;
  if (!ex) return;
  const used = Math.round(EXAM_MIN * 60 - ex.left);

  let rawScore = 0, correct = 0, unanswered = 0;
  const rawFull = state.rawFullMarks || state.fullMarks;

  const sections = ex.sections.map(s => {
    const items = s.questions.map((q, idx) => ({
      idx, q: q.q, p: q.p, img: q.img, au: q.au, o: q.o,
      correctAns: q.a, yourAns: q.sel
    }));
    let c = 0, u = 0;
    s.questions.forEach(q => {
      if (q.sel === undefined) u++;
      else if (q.sel === q.a) c++;
    });
    const rawSecScore = c * s.marks;
    const rawSecMax   = s.questions.length * s.marks;
    const scaledSecScore = scaleScore(rawSecScore, rawFull);
    const scaledSecMax   = scaleScore(rawSecMax, rawFull);
    rawScore += rawSecScore;
    correct  += c; unanswered += u;
    return {
      name: s.name, short: s.short, marks: s.marks,
      score: scaledSecScore, max: scaledSecMax,
      rawScore: rawSecScore, rawMax: rawSecMax,
      items
    };
  });

  const wrong = state.totalQ - correct - unanswered;
  const scaledScore = scaleScore(rawScore, rawFull);
  const percentage = Math.round((scaledScore / POINT_SCALE) * 100);

  const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const result = {
    setIdx: ex.set.idx, setName: ex.set.name,
    score: scaledScore, maxScore: POINT_SCALE,
    rawScore, rawFull,
    percentage, correct, wrong, unanswered,
    sections, timeUsed: used,
    startedAt: new Date(ex.startedAt).toISOString(),
    submittedAt: new Date().toISOString()
  };

  saveResult(result);
  clearExamState();
  invalidateResultsCache(state.user.uid);

  const setIdx = ex.setIdx;
  state.exam = null;
  releaseExamLock(setIdx);

  try {
    await saveResultToDb(result, attemptId);
    // Fire-and-forget notification for pass
    if (scaledScore >= state.passMarks) {
      sendNotification(state.user.uid, {
        title: "🎉 You passed!",
        body: `Set ${result.setIdx} — ${result.score}/${result.maxScore} (${result.percentage}%). Great job!`,
        type: "success"
      }).catch(() => {});
    }
    replaceNavigate("result");
  } catch (e) {
    console.error("Save result", e);
    modal("Could not save to cloud",
      "Your result is saved on this device. Retry now to also sync it to your history.",
      [
        { label: "Continue Offline", cls: "btn-ghost", onClick: () => replaceNavigate("result") },
        { label: "Retry Upload", cls: "btn-primary", onClick: async () => {
          try {
            await saveResultToDb(result, attemptId);
            toast("Uploaded ✓", "ok");
            replaceNavigate("result");
          } catch {
            toast("Still offline — result kept locally", "err");
            replaceNavigate("result");
          }
        }}
      ]);
  }
}

async function saveResultToDb(result, attemptId) {
  if (!state.user) throw new Error("Not signed in");
  await setDoc(doc(db, "users", state.user.uid, "results", attemptId), {
    ...result, submittedAt: serverTimestamp()
  });
  if (result.percentage > (state.profile?.bestScore || 0)) {
    await updateDoc(doc(db, "users", state.user.uid), { bestScore: result.percentage });
    if (state.profile) state.profile.bestScore = result.percentage;
    saveProfileCache(state.user.uid, state.profile);
  }
  if (!state.results.some(r => r.id === attemptId)) {
    state.results.unshift({ ...result, id: attemptId });
    saveResultsCache(state.user.uid, state.results);
  }
}

/* ============ AUDIO PLAYER ============ */
function stopAudio() {
  if (state._audio) {
    try { state._audio.pause(); state._audio.currentTime = 0; } catch {}
    state._audio = null;
  }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  const row = $("audRow");
  if (row) row.classList.remove("on");
  const timeEl = $("audTime");
  if (timeEl) timeEl.textContent = "0:00";
}

function formatTime(sec) {
  if (!sec || isNaN(sec) || !isFinite(sec)) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${pad(s)}`;
}

function playAudio(q) {
  if (!q) return;
  if ((q.played || 0) >= MAX_PLAYS) {
    modal("Audio limit reached", `Audio can only be played ${MAX_PLAYS} times per question.`);
    return;
  }

  // Pause previous but don't reset play count for this question
  if (state._audio) { try { state._audio.pause(); } catch {} state._audio = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();

  q.played = (q.played || 0) + 1;

  const row = $("audRow");
  const leftEl = $("audLeft");
  const timeEl = $("audTime");
  const durEl  = $("audDur");

  if (row) row.classList.add("on");
  if (leftEl) leftEl.textContent = `${Math.max(0, MAX_PLAYS - q.played)} left`;
  if (timeEl) timeEl.textContent = "0:00";
  if (durEl)  durEl.textContent  = "--:--";

  const finish = () => {
    if (row) row.classList.remove("on");
    if (timeEl) timeEl.textContent = "0:00";
  };

  const src = q.au;
  if (!src) { finish(); return; }

  if (src.startsWith("tts:")) {
    if (!("speechSynthesis" in window)) {
      toast("Audio not supported", "err");
      finish();
      return;
    }
    const u = new SpeechSynthesisUtterance(src.slice(4));
    u.lang = "ja-JP";
    u.rate = 0.85;
    u.onend = u.onerror = finish;
    speechSynthesis.speak(u);
    return;
  }

  state._audio = new Audio(resolveUrl(src));
  state._audio.preload = "auto";

  state._audio.onloadedmetadata = () => {
    if (durEl) durEl.textContent = formatTime(state._audio.duration);
  };
  state._audio.ontimeupdate = () => {
    if (timeEl && state._audio) timeEl.textContent = formatTime(state._audio.currentTime);
  };
  state._audio.onended = () => {
    if (timeEl) timeEl.textContent = formatTime(state._audio?.duration || 0);
    finish();
  };
  state._audio.onerror = () => {
    toast("Could not load audio", "err");
    finish();
  };

  state._audio.play().catch(() => {
    toast("Tap play again to enable audio", "warn");
    finish();
  });
}

/* ============ PRACTICE MODE ============ */
function startPractice(sectionKey) {
  const pool = [];
  state.sets.forEach(s => {
    const sec = s.sections.find(x => x.key === sectionKey);
    if (sec) sec.questions.forEach(q => pool.push({ ...q, sel: undefined, locked: false, played: 0 }));
  });
  if (pool.length < 5) return toast("Not enough questions in this section", "err");

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, Math.min(10, pool.length));
  const meta = SECTIONS.find(s => s.key === sectionKey);

  state.practice = {
    sections: [{
      key: meta.key, name: meta.name, short: meta.short, marks: meta.marks,
      questions: picked, count: picked.length, icon: meta.icon
    }],
    si: 0, qi: 0, answeredCount: 0, maxReachable: 0
  };
  renderPracticeScreen();
}

function renderPracticeScreen() {
  const root = $("app");
  const pr = state.practice;
  if (!pr) return renderPractice();

  const sec = pr.sections[0];
  const q = sec.questions[pr.qi];

  let mediaHTML = "";
  if (q.img) mediaHTML += `<img src="${esc(q.img)}" loading="lazy" onerror="this.style.display='none'">`;
  if (q.au) mediaHTML += `<div class="audio-row" id="audRow">
    <button class="play-btn" id="playBtn">▶</button>
    <div style="flex:1;min-width:0">
      <div class="wave" style="width:100%">${'<i></i>'.repeat(18)}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);font-weight:700;margin-top:2px">
        <span id="audTime">0:00</span><span>unlimited</span><span id="audDur">--:--</span>
      </div>
    </div></div>`;
  if (mediaHTML) mediaHTML = `<div class="media">${mediaHTML}</div>`;

  const optsHTML = q.o.slice(0, q.o[3] ? 4 : 3).map((t, i) => `
    <div class="opt ${q.sel === i ? "sel" : ""}" data-popt="${i}">
      <div class="opt-ltr">${"ABCD"[i]}</div>
      <div class="opt-tx">${esc(t)}</div>
    </div>`).join("");

  const isLast = pr.qi === sec.questions.length - 1;

  root.innerHTML = `
    <div class="exam-bar"><div class="exam-bar-inner">
      <button class="xback" id="leaveBtn">✕</button>
      <div class="exam-info">
        <b>Practice · ${esc(sec.name)}</b>
        <span>Q ${pr.qi + 1} of ${sec.questions.length}</span>
      </div>
    </div></div>
    <div class="wrap" style="padding-bottom:40px">
      <div class="progress-bar"><i id="progressFill" style="width:${(pr.answeredCount / sec.questions.length) * 100}%"></i></div>
      <div class="palette">${sec.questions.map((qq, i) =>
        `<button class="pal-btn ${qq.sel !== undefined ? "ans" : ""} ${i === pr.qi ? "cur" : ""}"
          ${i > pr.maxReachable ? "disabled" : ""} data-pjump="${i}">${i + 1}</button>`).join("")}</div>
      <div class="q-card">
        <div class="q-meta">
          <span class="q-num">Q ${pr.qi + 1} of ${sec.questions.length}</span>
          <span class="q-tag">${sec.short}</span>
          <span class="q-marks">${sec.marks} marks</span>
        </div>
        ${q.p ? `<div class="passage">${esc(q.p)}</div>` : ""}
        <div class="q-text">${esc(q.q)}</div>
        ${mediaHTML}
        <div class="opts">${optsHTML}</div>
        <button class="btn btn-ghost btn-sm mt-2" data-pbm="1">🔖 Bookmark</button>
      </div>
      <div class="exam-nav">
        <button class="btn btn-ghost" id="prevBtn" ${pr.qi === 0 ? "disabled" : ""}>← Previous</button>
        <button class="btn btn-primary" id="nextBtn" ${q.sel === undefined ? "disabled" : ""}>${isLast ? "Finish ✓" : "Next →"}</button>
      </div>
    </div>`;

  document.querySelectorAll("[data-popt]").forEach(el => el.onclick = () => practiceSelect(+el.dataset.popt));
  document.querySelectorAll("[data-pjump]").forEach(el => el.onclick = () => {
    if (!el.disabled) { stopAudio(); pr.qi = +el.dataset.pjump; renderPracticeScreen(); }
  });
  $("prevBtn").onclick = () => { if (pr.qi > 0) { stopAudio(); pr.qi--; renderPracticeScreen(); } };
  $("nextBtn").onclick = () => {
    if (q.sel === undefined) return;
    if (pr.qi < sec.questions.length - 1) {
      stopAudio(); pr.qi++;
      if (pr.qi > pr.maxReachable) pr.maxReachable = pr.qi;
      renderPracticeScreen();
    } else finishPractice();
  };
  $("leaveBtn").onclick = () => {
    modal("Leave practice?", "Your progress will not be saved.",
      [{ label:"Stay", cls:"btn-ghost" },
       { label:"Leave", cls:"btn-danger", onClick: () => { stopAudio(); state.practice = null; navigate("practice"); } }]);
  };
  if ($("playBtn")) $("playBtn").onclick = () => playAudio(q);
  const pbm = document.querySelector("[data-pbm]");
  if (pbm) pbm.onclick = () => {
    // Find the underlying set/section/qi this practice question came from
    const qText = sec.questions[pr.qi].q;
    let found = null;
    state.sets.forEach((set, si) => set.sections.forEach(s => s.questions.forEach((qq, qi) => {
      if (!found && qq.q === qText) found = { set: set.idx, section: s.key, qi };
    })));
    if (found) toggleBookmark(found.set, found.section, found.qi);
    else toast("Could not locate question", "err");
  };
}

function practiceSelect(i) {
  const pr = state.practice;
  if (!pr) return;
  const sec = pr.sections[0];
  sec.questions[pr.qi].sel = i;
  pr.answeredCount = sec.questions.filter(x => x.sel !== undefined).length;
  document.querySelectorAll(".opt").forEach((el, idx) => el.classList.toggle("sel", idx === i));
  const nb = $("nextBtn"); if (nb) nb.disabled = false;
  const palette = document.querySelectorAll(".pal-btn");
  if (palette[pr.qi]) palette[pr.qi].classList.add("ans");
  const pb = $("progressFill");
  if (pb) pb.style.width = (pr.answeredCount / sec.questions.length * 100) + "%";
}

function finishPractice() {
  const sec = state.practice.sections[0];
  let correct = 0;
  sec.questions.forEach(q => { if (q.sel === q.a) correct++; });
  const total = sec.questions.length;
  const pct = Math.round(correct / total * 100);
  modal("Practice Complete", `<div class="center">
    <div style="font-size:48px;margin-bottom:8px">${pct >= 70 ? "🎉" : "💪"}</div>
    <h3 style="font-size:32px;color:var(--purple);margin-bottom:4px">${correct}/${total}</h3>
    <p class="muted">${pct}% correct</p>
  </div>`, [{ label: "Done", cls: "btn-primary", onClick: () => {
    state.practice = null;
    navigate("home");
  }}]);
}

/* ============ SHARE ============ */
async function shareResult() {
  const r = loadResult();
  if (!r) return;
  const pass = r.score >= state.passMarks;
  const text = `🎌 I scored ${r.score}/${r.maxScore} (${r.percentage}%) on Dream Japan JFT Mock Test!\nSet ${r.setIdx} · ${r.setName}\n${pass ? "✅ PASSED" : "📚 Practicing hard"}\n#JFT #DreamJapan`;
  if (navigator.share) {
    try { await navigator.share({ title: "Dream Japan JFT Result", text }); return; } catch {}
  }
  try { await navigator.clipboard.writeText(text); toast("Copied to clipboard ✓", "ok"); }
  catch { modal("Share Result", `<p style="white-space:pre-line;font-size:13px">${esc(text)}</p>`); }
}

/* ============ ADMIN BINDINGS ============ */
function bindAdminTab() {
  if (adminTab === "overview") {
    loadStats();
    const rb = $("refreshQBtn");
    if (rb) rb.onclick = refreshQuestions;
  }
  if (adminTab === "students") {
    const s = $("studentSearch");
    if (s) s.oninput = filterStudents;
    loadStudents();
  }
  if (adminTab === "requests") loadRequests();
  if (adminTab === "payments") loadPayments();
  if (adminTab === "questions") {
    const q = $("qSearch");
    if (q) q.oninput = filterQuestions;
    const add = $("addQBtn"); if (add) add.onclick = () => openQEditor(null);
    const r2 = $("refreshQ2"); if (r2) r2.onclick = refreshQuestions;
    loadQs();
  }
  if (adminTab === "notify") {
    const sel = $("notifyAudience");
    if (sel) sel.onchange = () => {
      const w = $("notifyUidWrap");
      if (w) w.style.display = sel.value === "uid" ? "" : "none";
    };
    const btn = $("sendNotifyBtn");
    if (btn) btn.onclick = async () => {
      const title = $("notifyTitle").value.trim();
      const body  = $("notifyBody").value.trim();
      const type  = $("notifyType").value;
      const audience = $("notifyAudience").value;
      if (!title || !body) return toast("Title and message required", "err");
      btn.disabled = true;
      try {
        if (audience === "uid") {
          const uid = $("notifyUid").value.trim();
          if (!uid) { toast("Enter user ID", "err"); return; }
          const ok = await sendNotification(uid, { title, body, type });
          if (ok) {
            toast("Sent ✓", "ok");
            $("notifyTitle").value = ""; $("notifyBody").value = ""; $("notifyUid").value = "";
          } else toast("Failed to send", "err");
        } else {
          await broadcastNotification({ title, body, type });
          $("notifyTitle").value = ""; $("notifyBody").value = "";
        }
      } finally { btn.disabled = false; }
    };
  }
  if (adminTab === "settings") {
    const ex = $("exportBtn"); if (ex) ex.onclick = exportJSON;
    const im = $("importBtn"); if (im) im.onclick = importJSON;
  }
}

async function loadStats() {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    let total = 0, active = 0, blocked = 0, premiumActive = 0;
    usersSnap.forEach(d => {
      const u = d.data();
      total++;
      if (u.status === "blocked") blocked++; else active++;
      if (u.premium && u.premium.expiry && daysLeft(u.premium.expiry) > 0) premiumActive++;
    });
    const reqSnap = await getDocs(query(collection(db, "accessRequests"), where("status", "==", "pending")));
    let pendingPay = 0, pendingReq = 0;
    reqSnap.forEach(d => { if (d.data().type === "premium") pendingPay++; else pendingReq++; });

    if ($("statTotal"))     $("statTotal").textContent = total;
    if ($("statActive"))    $("statActive").textContent = active;
    if ($("statBlocked"))   $("statBlocked").textContent = blocked;
    if ($("statPremium"))   $("statPremium").textContent = premiumActive;
    if ($("statPending"))   $("statPending").textContent = pendingReq;
    if ($("statPayments"))  $("statPayments").textContent = pendingPay;
    if ($("statQuestions")) $("statQuestions").textContent = state.totalQ;
    if ($("statPlans"))     $("statPlans").textContent = (state.plans || []).length;
  } catch (e) { console.warn("loadStats", e); }
}

async function loadStudents() {
  const list = $("studentsList");
  if (!list) return;
  try {
    const snap = await getDocs(collection(db, "users"));
    const users = [];
    snap.forEach(d => {
      if (state.user && d.id === state.user.uid) return;
      users.push({ uid: d.id, ...d.data() });
    });
    state._allStudents = users;
    renderStudentRows(users);
  } catch (e) {
    list.innerHTML = `<p class="muted" style="color:var(--red)">Error: ${esc(e.message)}</p>`;
  }
}

function renderStudentRows(users) {
  const list = $("studentsList");
  if (!list) return;
  if (!users.length) {
    list.innerHTML = `<p class="muted center" style="padding:24px">No students found.</p>`;
    return;
  }
  list.innerHTML = users.map(u => {
    const premActive = u.premium && daysLeft(u.premium.expiry) > 0;
    return `<div class="admin-q-item">
      <div class="flex-between mb-1" style="align-items:flex-start">
        <div style="min-width:0;flex:1">
          <h4 style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.name || "Unnamed")}</h4>
          <p class="muted small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.email)}</p>
          <p class="muted small">Best: ${u.bestScore || 0}% · Streak: ${(u.streak?.count) || 0} · Device: ${u.deviceId ? "🔒" : "—"}</p>
        </div>
        <div class="badges" style="flex-shrink:0">
          ${u.status === "blocked" ? '<span class="badge badge-danger">Blocked</span>' : '<span class="badge badge-success">Active</span>'}
          ${premActive ? '<span class="badge badge-prem">Premium</span>' : ""}
          ${u.practiceAccess ? '<span class="badge badge-info">Practice</span>' : ""}
        </div>
      </div>
      ${premActive ? `<p class="muted small">Premium: ${esc(u.premium.plan)} · ${daysLeft(u.premium.expiry)}d left</p>` : ""}
      <div class="actions">
        <button data-uact="grant-prem" data-uid="${u.uid}">Grant Premium</button>
        <button data-uact="toggle-practice" data-uid="${u.uid}" data-val="${!u.practiceAccess}">${u.practiceAccess ? "Revoke" : "Grant"} Practice</button>
        <button data-uact="reset-device" data-uid="${u.uid}">Reset Device</button>
        <button class="${u.status === "blocked" ? "preview" : "del"}" data-uact="toggle-block" data-uid="${u.uid}" data-status="${u.status}">${u.status === "blocked" ? "Unblock" : "Block"}</button>
      </div>
    </div>`;
  }).join("");

  list.querySelectorAll("[data-uact]").forEach(b => {
    b.onclick = () => {
      const act = b.dataset.uact;
      if (act === "grant-prem") grantPremium(b.dataset.uid);
      else if (act === "toggle-practice") togglePractice(b.dataset.uid, b.dataset.val === "true");
      else if (act === "reset-device") {
        modal("Reset device lock?", "The user will be able to register a new device on next login.",
          [{ label: "Cancel", cls: "btn-ghost" },
           { label: "Reset", cls: "btn-danger", onClick: () => resetDevice(b.dataset.uid).then(loadStudents) }]);
      }
      else if (act === "toggle-block") toggleBlock(b.dataset.uid, b.dataset.status);
    };
  });
}

function filterStudents() {
  const q = ($("studentSearch").value || "").toLowerCase().trim();
  const all = state._allStudents || [];
  if (!q) return renderStudentRows(all);
  renderStudentRows(all.filter(u =>
    (u.name || "").toLowerCase().includes(q) ||
    (u.email || "").toLowerCase().includes(q)
  ));
}

async function loadRequests() {
  const list = $("requestsList");
  if (!list) return;
  try {
    const snap = await getDocs(query(collection(db, "accessRequests"), orderBy("createdAt", "desc"), limit(100)));
    const reqs = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.type !== "premium") reqs.push({ id: d.id, ...data });
    });
    if (!reqs.length) {
      list.innerHTML = `<p class="muted center" style="padding:24px">No access requests.</p>`;
      return;
    }
    list.innerHTML = reqs.map(r => `
      <div class="admin-q-item">
        <div class="flex-between mb-1" style="align-items:flex-start">
          <div style="min-width:0;flex:1">
            <h4>${esc(r.name || r.email || r.uid)}</h4>
            <p class="muted small">Practice request · ${fmtDate(r.createdAt)}</p>
          </div>
          <span class="badge badge-${r.status === "pending" ? "warn" : r.status === "approved" ? "success" : "danger"}">${esc(r.status)}</span>
        </div>
        ${r.status === "pending" ? `<div class="actions">
          <button class="preview" data-ract="approve" data-rid="${r.id}" data-uid="${r.uid}" data-type="${esc(r.type)}" data-plan="${esc(r.planId||"")}">Approve</button>
          <button class="del" data-ract="reject" data-rid="${r.id}" data-uid="${r.uid}">Reject</button>
        </div>` : ""}
      </div>`).join("");

    list.querySelectorAll("[data-ract]").forEach(b => {
      b.onclick = () => {
        if (b.dataset.ract === "approve") approveRequest(b.dataset.rid, b.dataset.uid, b.dataset.type, b.dataset.plan);
        else if (b.dataset.ract === "reject") rejectRequest(b.dataset.rid, b.dataset.uid);
      };
    });
  } catch (e) {
    list.innerHTML = `<p class="muted" style="color:var(--red)">${esc(e.message)}</p>`;
  }
}

async function loadPayments() {
  const list = $("paymentsList");
  if (!list) return;
  try {
    const snap = await getDocs(query(collection(db, "accessRequests"), orderBy("createdAt", "desc"), limit(100)));
    const reqs = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.type === "premium") reqs.push({ id: d.id, ...data });
    });
    if (!reqs.length) {
      list.innerHTML = `<p class="muted center" style="padding:24px">No payment requests.</p>`;
      return;
    }
    list.innerHTML = reqs.map(r => `
      <div class="admin-q-item">
        <div class="flex-between mb-1" style="align-items:flex-start">
          <div style="min-width:0;flex:1">
            <h4>${esc(r.name || r.email || r.uid)}</h4>
            <p class="muted small">${esc(r.planName || "—")} · NPR ${(r.amount || r.planPrice || 0).toLocaleString()}</p>
            <p class="muted small">Txn: <code style="font-weight:700">${esc(r.txnId || "—")}</code></p>
            <p class="muted small">${timeAgo(r.createdAt)}</p>
          </div>
          <span class="badge badge-${r.status === "pending" ? "warn" : r.status === "approved" ? "success" : "danger"}">${esc(r.status)}</span>
        </div>
        ${r.status === "pending" ? `<div class="actions">
          <button class="preview" data-pact="approve" data-rid="${r.id}" data-uid="${r.uid}" data-plan="${esc(r.planId||"")}">✓ Approve</button>
          <button class="del" data-pact="reject" data-rid="${r.id}" data-uid="${r.uid}">✕ Reject</button>
        </div>` : ""}
      </div>`).join("");

    list.querySelectorAll("[data-pact]").forEach(b => {
      b.onclick = () => {
        if (b.dataset.pact === "approve") {
          modal("Approve payment?", `This will activate premium for this user.`,
            [{ label: "Cancel", cls: "btn-ghost" },
             { label: "Approve", cls: "btn-primary", onClick: () => approvePayment(b.dataset.rid, b.dataset.uid, b.dataset.plan) }]);
        } else if (b.dataset.pact === "reject") {
          modal("Reject payment?", "The user will be notified.",
            [{ label: "Cancel", cls: "btn-ghost" },
             { label: "Reject", cls: "btn-danger", onClick: () => rejectPayment(b.dataset.rid, b.dataset.uid) }]);
        }
      };
    });
  } catch (e) {
    list.innerHTML = `<p class="muted" style="color:var(--red)">${esc(e.message)}</p>`;
  }
}

async function loadQs() {
  const list = $("questionsList");
  if (!list) return;
  try {
    const rows = await fetchQuestionsFromFirestore();
    state._allQs = rows;
    renderQRows(rows);
  } catch (e) {
    list.innerHTML = `<p class="muted" style="color:var(--red)">${esc(e.message)}</p>`;
  }
}

function filterQuestions() {
  const q = ($("qSearch").value || "").toLowerCase().trim();
  const rows = (state._allQs || []).filter(r =>
    (r.question || "").toLowerCase().includes(q) ||
    (r.passage || "").toLowerCase().includes(q)
  );
  renderQRows(rows);
}

function renderQRows(rows) {
  const list = $("questionsList");
  if (!list) return;
  if (!rows.length) {
    list.innerHTML = `<p class="muted center" style="padding:24px">No questions.</p>`;
    return;
  }
  list.innerHTML = rows.map((r, i) => `
    <div class="admin-q-item">
      <div class="badges">
        <span class="badge badge-info">Set ${r.set}</span>
        <span class="badge badge-muted">${esc((SECTIONS.find(s => s.key === r.section) || {}).short || r.section)}</span>
        <span class="badge badge-muted">Ans: ${esc(r.answer)}</span>
        ${r.image ? '<span class="badge badge-muted">🖼</span>' : ""}
        ${r.audio ? '<span class="badge badge-muted">🔊</span>' : ""}
      </div>
      <div class="qtxt">${esc((r.question || "").slice(0, 200))}</div>
      <div class="actions">
        <button class="preview" data-qact="preview" data-i="${i}">Preview</button>
        <button class="edit" data-qact="edit" data-i="${i}">Edit</button>
        <button class="del" data-qact="del" data-i="${i}">Delete</button>
      </div>
    </div>`).join("");

  list.querySelectorAll("[data-qact]").forEach(b => {
    b.onclick = () => {
      const row = rows[+b.dataset.i];
      if (b.dataset.qact === "preview") previewQ(row);
      else if (b.dataset.qact === "edit") openQEditor(row);
      else if (b.dataset.qact === "del") deleteQ(row);
    };
  });
}

function openQEditor(rowOrNull) {
  const isEdit = !!rowOrNull;
  const r = rowOrNull || { set:1, section:"sv", question:"", passage:"", image:"", audio:"", answer:"A", A:"", B:"", C:"", D:"" };
  modal(isEdit ? "Edit Question" : "Add Question", `
    <div class="grid-2">
      <div class="field"><label>Set</label>
        <select id="qeSet" class="input">${SET_NAMES.map((s, i) =>
          `<option value="${i + 1}" ${r.set === i + 1 ? "selected" : ""}>${s.name}</option>`).join("")}</select></div>
      <div class="field"><label>Section</label>
        <select id="qeSec" class="input">${SECTIONS.map(s =>
          `<option value="${s.key}" ${r.section === s.key ? "selected" : ""}>${s.name}</option>`).join("")}</select></div>
    </div>
    <div class="field"><label>Question</label><textarea id="qeQ" class="input">${esc(r.question)}</textarea></div>
    <div class="field"><label>Passage (optional)</label><textarea id="qeP" class="input">${esc(r.passage || "")}</textarea></div>
    <div class="field"><label>Image</label><input type="text" id="qeImg" class="input" value="${esc(r.image || "")}" placeholder="photos/q1.jpg"></div>
    <div class="field"><label>Audio</label><input type="text" id="qeAu" class="input" value="${esc(r.audio || "")}" placeholder="audio/q1.mp3"></div>
    <div class="field"><label>Correct answer</label>
      <select id="qeAns" class="input">${"ABCD".split("").map(l =>
        `<option value="${l}" ${r.answer === l ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="grid-2">
      <div class="field"><label>A</label><input type="text" id="qeA" class="input" value="${esc(r.A)}"></div>
      <div class="field"><label>B</label><input type="text" id="qeB" class="input" value="${esc(r.B)}"></div>
      <div class="field"><label>C</label><input type="text" id="qeC" class="input" value="${esc(r.C)}"></div>
      <div class="field"><label>D (optional)</label><input type="text" id="qeD" class="input" value="${esc(r.D)}"></div>
    </div>`,
    [
      { label: "Cancel", cls: "btn-ghost" },
      { label: isEdit ? "Update" : "Add", cls: "btn-primary", onClick: () => saveQ(rowOrNull, isEdit) }
    ]);
}

async function saveQ(origRow, isEdit) {
  const newRow = {
    set: +$("qeSet").value, section: $("qeSec").value,
    question: $("qeQ").value.trim(), passage: $("qeP").value.trim(),
    image: $("qeImg").value.trim(), audio: $("qeAu").value.trim(),
    answer: $("qeAns").value,
    A: $("qeA").value.trim(), B: $("qeB").value.trim(),
    C: $("qeC").value.trim(), D: $("qeD").value.trim()
  };
  if (!newRow.question || !newRow.A || !newRow.B || !newRow.C) return toast("Question, A, B, C required", "err");
  if (newRow.answer === "D" && !newRow.D) return toast("Answer D but option D empty", "err");
  try {
    const rows = await fetchQuestionsFromFirestore();
    const list = [...rows];
    if (isEdit && origRow) {
      const gi = list.findIndex(r => r.set === origRow.set && r.section === origRow.section &&
        r.question === origRow.question && r.A === origRow.A);
      if (gi >= 0) list[gi] = newRow;
      else list.push(newRow);
    } else {
      list.push(newRow);
    }
    await setDoc(doc(db, QUESTIONS_DOC), { questions: list });
    clearQCache(); setCache(list);
    state.sets = buildSets(list); recomputeTotals();
    toast(isEdit ? "Updated ✓" : "Added ✓", "ok");
    loadQs();
  } catch (e) { toast("Failed: " + e.message, "err"); }
}

function previewQ(row) {
  if (!row) return;
  modal("Preview", `
    <div class="flex mb-1" style="gap:6px;flex-wrap:wrap">
      <span class="badge badge-info">Set ${row.set}</span>
      <span class="badge badge-muted">${esc((SECTIONS.find(s => s.key === row.section) || {}).name || row.section)}</span>
      <span class="badge badge-muted">Ans ${esc(row.answer)}</span>
    </div>
    ${row.passage ? `<div class="passage" style="margin-top:12px">${esc(row.passage)}</div>` : ""}
    <div style="font-size:15px;font-weight:700;line-height:1.5;margin:12px 0;white-space:pre-line">${esc(row.question)}</div>
    ${row.image ? `<div class="muted small mb-1">🖼 ${esc(row.image)}</div>` : ""}
    ${row.audio ? `<div class="muted small mb-2">🔊 ${esc(row.audio)}</div>` : ""}
    ${["A","B","C","D"].map(l => {
      const t = row[l]; if (!t) return "";
      const isC = l === row.answer;
      return `<div style="padding:10px 12px;border:1px solid var(--border);border-radius:8px;margin-top:6px;font-size:13px;${isC ? "background:#d1fae5;border-color:var(--green);font-weight:700" : ""}">
        <b>${l}.</b> ${esc(t)} ${isC ? "✓" : ""}</div>`;
    }).join("")}
  `);
}

async function deleteQ(row) {
  if (!row) return;
  modal("Delete this question?", `"${esc((row.question || "").slice(0, 60))}…" will be removed.`,
    [{ label: "Cancel", cls: "btn-ghost" },
     { label: "Delete", cls: "btn-danger", onClick: async () => {
       try {
         const rows = await fetchQuestionsFromFirestore();
         const filtered = rows.filter(r => !(r.set === row.set && r.section === row.section &&
           r.question === row.question && r.A === row.A));
         await setDoc(doc(db, QUESTIONS_DOC), { questions: filtered });
         clearQCache(); setCache(filtered);
         state.sets = buildSets(filtered); recomputeTotals();
         toast("Deleted ✓", "ok");
         loadQs();
       } catch (e) { toast("Failed: " + e.message, "err"); }
     }}]);
}

async function refreshQuestions() {
  toast("Refreshing…");
  try {
    clearQCache();
    const rows = await fetchQuestionsFromFirestore();
    setCache(rows);
    state.sets = buildSets(rows); recomputeTotals();
    if ($("questionsList")) loadQs();
    toast("Refreshed ✓", "ok");
  } catch (e) { toast("Failed: " + e.message, "err"); }
}

async function exportJSON() {
  try {
    const rows = await fetchQuestionsFromFirestore();
    const blob = new Blob([JSON.stringify({ questions: rows }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "questions.json"; a.click();
    URL.revokeObjectURL(url);
    toast("Downloaded", "ok");
  } catch (e) { toast("Failed: " + e.message, "err"); }
}

async function importJSON() {
  const text = ($("importText").value || "").trim();
  if (!text) return toast("Paste JSON first", "err");
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { return toast("Invalid JSON: " + e.message, "err"); }
  const rows = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(rows)) return toast("JSON must contain questions array", "err");
  if (!confirm(`Replace all questions with ${rows.length}? Cannot be undone.`)) return;
  try {
    await setDoc(doc(db, QUESTIONS_DOC), { questions: rows });
    clearQCache(); setCache(rows);
    state.sets = buildSets(rows); recomputeTotals();
    toast(`Imported ${rows.length} ✓`, "ok");
  } catch (e) { toast("Failed: " + e.message, "err"); }
}

async function grantPremium(uid) {
  const plans = state.plans.length ? state.plans : await loadPlans();
  const planOptions = plans.map(p => `<option value="${p.id}">${esc(p.name)} — NPR ${p.price} (${p.days}d)</option>`).join("");
  modal("Grant Premium", `
    <div class="field"><label>Plan</label><select id="grantPlan" class="input">${planOptions}</select></div>
    <div class="field"><label>Custom days (leave empty to use plan)</label>
      <input type="number" id="grantDays" class="input" min="1" max="365" placeholder="e.g. 45"></div>
    <div class="field"><label>Note</label><input type="text" id="grantNote" class="input" placeholder="Optional"></div>`,
    [{ label: "Cancel", cls: "btn-ghost" },
     { label: "Grant", cls: "btn-primary", onClick: async () => {
       const plan = plans.find(p => p.id === $("grantPlan").value);
       if (!plan) return;
       const customDays = parseInt($("grantDays").value, 10);
       const days = (customDays && customDays > 0) ? customDays : plan.days;
       const start = new Date();
       const expiry = new Date(Date.now() + days * 86400000);
       try {
         await updateDoc(doc(db, "users", uid), {
           premium: { plan: plan.name, start, expiry, note: ($("grantNote") || {}).value || "" }
         });
         await sendNotification(uid, {
           title: "🎉 Premium granted",
           body: `${plan.name} activated for ${days} days (until ${expiry.toLocaleDateString("en-GB")}).`,
           type: "premium"
         });
         toast("Premium granted ✓", "ok");
         loadStudents();
       } catch (e) { toast("Failed: " + e.message, "err"); }
     }}]);
}

async function togglePractice(uid, value) {
  try {
    await updateDoc(doc(db, "users", uid), { practiceAccess: value });
    await sendNotification(uid, {
      title: value ? "Practice access granted" : "Practice access revoked",
      body: value ? "You can now take practice tests." : "Your practice access has been revoked by the admin.",
      type: value ? "success" : "warn"
    });
    toast(`Practice ${value ? "granted" : "revoked"} ✓`, "ok");
    loadStudents();
  } catch (e) { toast("Failed: " + e.message, "err"); }
}

async function toggleBlock(uid, currentStatus) {
  const newStatus = currentStatus === "blocked" ? "active" : "blocked";
  modal(`${newStatus === "blocked" ? "Block" : "Unblock"} user?`, `Status will change to "${newStatus}".`,
    [{ label: "Cancel", cls: "btn-ghost" },
     { label: "Confirm", cls: newStatus === "blocked" ? "btn-danger" : "btn-primary", onClick: async () => {
       try {
         await updateDoc(doc(db, "users", uid), { status: newStatus });
         if (newStatus === "active") {
           sendNotification(uid, { title: "Account unblocked", body: "Your account has been unblocked.", type: "success" }).catch(() => {});
         }
         toast(`User ${newStatus}`, "ok"); loadStudents();
       } catch (e) { toast("Failed: " + e.message, "err"); }
     }}]);
}

async function approveRequest(rid, uid, type, planId) {
  try {
    await updateDoc(doc(db, "accessRequests", rid), { status: "approved", approvedAt: serverTimestamp() });
    if (type === "practice") {
      await updateDoc(doc(db, "users", uid), { practiceAccess: true });
      await sendNotification(uid, {
        title: "Practice access approved ✓",
        body: "Your practice access request has been approved.",
        type: "success"
      });
    } else if (type === "premium" && planId) {
      await approvePayment(rid, uid, planId);
      return;
    }
    toast("Approved ✓", "ok");
    loadRequests();
  } catch (e) { toast("Failed: " + e.message, "err"); }
}

async function rejectRequest(rid, uid) {
  try {
    await updateDoc(doc(db, "accessRequests", rid), { status: "rejected", rejectedAt: serverTimestamp() });
    if (uid) {
      await sendNotification(uid, {
        title: "Request not approved",
        body: "Your request was not approved. Please contact the admin for more information.",
        type: "warn"
      });
    }
    toast("Rejected", "ok");
    if (adminTab === "payments") loadPayments();
    else loadRequests();
  } catch (e) { toast("Failed: " + e.message, "err"); }
}

/* ============ BOOT / AUTH LISTENER ============ */
function renderWithBootTarget(screen, params) {
  if (screen === "loading" || screen === "login" || screen === "signup") {
    navigate(params.next || "home");
  } else if (screen === "exam") {
    const saved = loadExamState();
    if (saved) {
      state.screen = "exam";
      resumeExamFromSaved(saved);
    } else {
      replaceNavigate("sets");
    }
  } else {
    state.screen = screen;
    state.params = params;
    render();
  }
}

function setupRealtimeProfile(user) {
  if (state._userSub) state._userSub();
  state._userSub = onSnapshot(doc(db, "users", user.uid), snap => {
    if (!snap.exists()) return;
    const fresh = { uid: user.uid, ...snap.data() };
    const prev = state.profile;
    state.profile = fresh;
    state.isAdmin = (user.email === ADMIN_EMAIL) || fresh.role === "admin";
    saveProfileCache(user.uid, fresh);

    if (fresh.status === "blocked" && prev?.status !== "blocked") {
      modal("Account Blocked", "Your account has been blocked. Contact the administrator.",
        [{ label: "Logout", cls: "btn-danger", onClick: logout }]);
      return;
    }

    if (!prev) return;
    const changed =
      (prev.premium?.expiry?.seconds || prev.premium?.expiry || null) !== (fresh.premium?.expiry?.seconds || fresh.premium?.expiry || null) ||
      prev.practiceAccess !== fresh.practiceAccess ||
      prev.status !== fresh.status ||
      prev.role !== fresh.role ||
      (prev.bookmarks?.length || 0) !== (fresh.bookmarks?.length || 0) ||
      prev.name !== fresh.name ||
      prev.photoURL !== fresh.photoURL ||
      prev.deviceId !== fresh.deviceId;

    if (changed && !["exam", "practice", "result"].includes(state.screen)) {
      render();
    }
  }, (err) => { console.warn("profile sub:", err); });
}

async function loadDataInBackground() {
  try {
    const qr = await loadQuestions();
    state.sets = buildSets(qr.rows);
    recomputeTotals();
  } catch (e) { console.warn("loadQuestions", e); }

  try { state.plans = await loadPlansCached(); } catch {}

  if (state.user) {
    try { state.results = await loadResultsCached(state.user.uid); } catch {}
    try { state.notifications = await loadNotifications(state.user.uid); } catch {}
  }

  if (state.user && ["home", "profile", "sets", "premium", "bookmarks", "leaderboard"].includes(state.screen)) {
    render();
  }
}

onAuthStateChanged(auth, async (user) => {
  if (state._userSub) { state._userSub(); state._userSub = null; }
  if (state._notifSub) { state._notifSub(); state._notifSub = null; }
  if (state._lockTick) { clearInterval(state._lockTick); state._lockTick = null; }

  if (!user) {
    state.user = null; state.profile = null; state.isAdmin = false;
    state.sets = []; state.results = []; state.plans = []; state.notifications = [];
    const { screen, params } = parseHash();
    if (screen === "login" || screen === "signup") {
      state.screen = screen; state.params = params; render();
    } else {
      navigate("login", screen && screen !== "loading" ? { next: screen } : {});
    }
    return;
  }

  state.user = user;
  const { screen, params } = parseHash();

  // Fast path: cached profile
  const cachedProfile = loadProfileCache(user.uid);
  if (cachedProfile) {
    state.profile = cachedProfile;
    state.isAdmin = (user.email === ADMIN_EMAIL) || cachedProfile.role === "admin";

    if (cachedProfile.status === "blocked") {
      modal("Account Blocked", "Your account has been blocked. Contact the administrator.",
        [{ label: "Logout", cls: "btn-danger", onClick: logout }]);
      return;
    }

    // Verify device (async, non-blocking for first render)
    verifyDevice(user, cachedProfile).then(v => {
      if (!v.ok) {
        modal("Device Mismatch", v.reason, [{ label: "Logout", cls: "btn-danger", onClick: logout }]);
      }
    }).catch(() => {});

    renderWithBootTarget(screen, params);
    setupRealtimeProfile(user);
    setupRealtimeNotifications(user.uid);
    loadDataInBackground();
    return;
  }

  // Slow path: first login on this device
  state.screen = "loading";
  render();
  try {
    state.profile = await ensureUserProfile(user);
    state.isAdmin = (user.email === ADMIN_EMAIL) || state.profile.role === "admin";
    saveProfileCache(user.uid, state.profile);

    if (state.profile.status === "blocked") {
      modal("Account Blocked", "Your account has been blocked. Contact the administrator.",
        [{ label: "Logout", cls: "btn-danger", onClick: logout }]);
      return;
    }

    // Device verification
    const v = await verifyDevice(user, state.profile);
    if (!v.ok) {
      modal("Device Mismatch", v.reason, [{ label: "Logout", cls: "btn-danger", onClick: logout }]);
      return;
    }
    if (v.justRegistered) {
      toast("Device registered ✓", "ok");
    }

    await loadDataInBackground();
    setupRealtimeProfile(user);
    setupRealtimeNotifications(user.uid);

    const redirectTarget = sessionStorage.getItem(REDIRECT_AFTER_KEY);
    if (redirectTarget) {
      sessionStorage.removeItem(REDIRECT_AFTER_KEY);
      if (location.hash !== redirectTarget) history.replaceState({}, "", redirectTarget);
    }

    renderWithBootTarget(screen, params);
  } catch (e) {
    console.error("Boot error", e);
    toast("Load error: " + e.message, "err");
    state.screen = "home"; render();
  }
});

/* ============ PWA INSTALL ============ */
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _deferredPrompt = e;
  // Only show once per day
  try {
    const last = +localStorage.getItem(INSTALL_DISMISSED_KEY) || 0;
    if (Date.now() - last < 24 * 60 * 60 * 1000) return;
  } catch {}
  if (state.user && state.screen === "home" && !state._installNotified) {
    state._installNotified = true;
    setTimeout(() => {
      modal("📲 Install Dream Japan", `
        <p style="font-size:13px;line-height:1.6;margin-bottom:12px">Install the app for faster access, offline question cache, and a native feel.</p>
        <p class="muted small" style="line-height:1.5">You can dismiss this prompt — it won't be shown again for 24 hours.</p>`,
        [
          { label: "Not now", cls: "btn-ghost", onClick: () => {
            try { localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now())); } catch {}
          }},
          { label: "Install", cls: "btn-primary", onClick: async () => {
            if (!_deferredPrompt) { toast("Install not available", "warn"); return; }
            _deferredPrompt.prompt();
            const { outcome } = await _deferredPrompt.userChoice;
            if (outcome === "accepted") toast("Installing…", "ok");
            _deferredPrompt = null;
          }}
        ]);
    }, 3000);
  }
});

window.addEventListener("appinstalled", () => {
  toast("Dream Japan installed ✓", "ok");
  _deferredPrompt = null;
});

/* ============ KEYBOARD SHORTCUTS ============ */
window.addEventListener("keydown", (e) => {
  if (state.screen !== "exam" && state.screen !== "practice") return;
  if (e.target.matches("input, textarea, select")) return;
  if (document.querySelector(".overlay.show")) return;

  const k = e.key.toLowerCase();

  if (state.screen === "exam") {
    if (["a","b","c","d"].includes(k)) {
      const opt = document.querySelector(`[data-opt="${"abcd".indexOf(k)}"]`);
      if (opt) opt.click();
    } else if (k === "arrowright") $("nextBtn")?.click();
    else if (k === "arrowleft") $("prevBtn")?.click();
  } else if (state.screen === "practice") {
    if (["a","b","c","d"].includes(k)) {
      const opt = document.querySelector(`[data-popt="${"abcd".indexOf(k)}"]`);
      if (opt) opt.click();
    } else if (k === "arrowright") $("nextBtn")?.click();
    else if (k === "arrowleft") $("prevBtn")?.click();
  }
});

/* ============ CLEANUP ============ */
window.addEventListener("beforeunload", () => {
  stopAudio();
  if (state._tick) clearInterval(state._tick);
  if (state._lockTick) clearInterval(state._lockTick);
});

/* ============ INIT ============ */
initHistory();

console.log("%cDream Japan v2.0.0", "color:#8b5cf6;font-weight:900;font-size:14px",
  "· 250-pt scale · device-lock · eSewa payments · notifications");
