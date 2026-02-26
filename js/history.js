window.addToHistory = function addToHistory(text) {
  const t = (text || "").trim();
  if (!t) return;

  const st = loadState() || {};
  const hist = Array.isArray(st.history) ? st.history : [];
  const next = [t, ...hist.filter(x => x !== t)].slice(0, 12);

  saveState({ history: next });
  renderHistory(next);
};

window.renderHistory = function renderHistory(hist) {
  const wrap = document.getElementById("history");
  if (!wrap) return;

  if (!hist || !hist.length) { wrap.innerHTML = ""; return; }

  wrap.innerHTML = hist.map(h => `
    <button type="button" class="history-btn" data-h="${h.replaceAll('"','&quot;')}">${h}</button>
  `).join("");

  wrap.onclick = (e) => {
    const b = e.target.closest("[data-h]");
    if (!b) return;
    const input = document.getElementById("search-input-id");
    if (input) input.value = b.dataset.h;
  };
};