window.LS = {
  auth: "mvp_auth",
  statePrefix: "mvp_state_", // + phone
};

window.normalizePhone = function normalizePhone(raw) {
  return (raw || "").replace(/[^\d+]/g, "").replace(/^8/, "+7");
};

window.getAuth = function getAuth() {
  try { return JSON.parse(localStorage.getItem(LS.auth) || "null"); }
  catch { return null; }
};

window.setAuth = function setAuth(phone) {
  localStorage.setItem(LS.auth, JSON.stringify({ phone, ts: Date.now() }));
};

window.clearAuth = function clearAuth() {
  localStorage.removeItem(LS.auth);
};

window.stateKey = function stateKey() {
  const a = getAuth();
  return a?.phone ? (LS.statePrefix + a.phone) : null;
};

window.loadState = function loadState() {
  const k = stateKey();
  if (!k) return null;
  try { return JSON.parse(localStorage.getItem(k) || "null"); }
  catch { return null; }
};

window.saveState = function saveState(partial) {
  const k = stateKey();
  if (!k) return;
  const prev = loadState() || {};
  const next = { ...prev, ...partial, updatedAt: Date.now() };
  localStorage.setItem(k, JSON.stringify(next));
};