window.openAuth = function openAuth() {
  document.getElementById("auth-backdrop")?.classList.add("is-open");
};
window.closeAuth = function closeAuth() {
  document.getElementById("auth-backdrop")?.classList.remove("is-open");
};

window.initAuthUI = function initAuthUI(onLogin) {
  const phoneEl = document.getElementById("auth-phone");
  const codeEl  = document.getElementById("auth-code");
  const sendBtn = document.getElementById("auth-send");
  const loginBtn= document.getElementById("auth-login");
  const hint    = document.getElementById("auth-hint");
  if (!phoneEl || !codeEl || !sendBtn || !loginBtn || !hint) return;

  let lastCode = "";

  sendBtn.addEventListener("click", () => {
    const phone = normalizePhone(phoneEl.value);
    if (!phone || phone.length < 10) { hint.textContent = "Введите телефон."; return; }
    lastCode = String(Math.floor(1000 + Math.random() * 9000));
    hint.textContent = `MVP-код: ${lastCode} (в реале будет SMS)`;
    codeEl.focus();
  });

  loginBtn.addEventListener("click", () => {
    const phone = normalizePhone(phoneEl.value);
    const code  = (codeEl.value || "").trim();
    if (!phone) { hint.textContent = "Введите телефон."; return; }
    if (!code)  { hint.textContent = "Введите код."; return; }
    if (lastCode && code !== lastCode) { hint.textContent = "Неверный код."; return; }

    setAuth(phone);

    window.resetUIState?.();
    window.afterLoginRestore?.();

    closeAuth();
    onLogin?.();
    window.renderTopbar?.();
  });

  if (getAuth()?.phone) closeAuth();
};

window.renderTopbar = function renderTopbar() {
  const bar = document.getElementById("topbar");
  const phone = document.getElementById("topbar-phone");
  const btn = document.getElementById("logout-btn");
  if (!bar || !phone || !btn) return;

  const a = getAuth();
  if (!a?.phone) {
    bar.hidden = true;
    return;
  }

  phone.textContent = a.phone;
  bar.hidden = false;

  btn.onclick = () => {
    clearAuth();
    window.resetUIState?.();
    openAuth();
    renderTopbar();
  };
};