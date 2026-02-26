let catalog = [];

async function loadCatalog() {
  const r = await fetch("data/lavka.json");
  if (!r.ok) throw new Error("Не загрузился data/lavka.json");
  const data = await r.json();
  catalog = data.products || [];
  console.log("Lavka catalog loaded:", catalog.length);
}

function normText(s) {
  return (s || "")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&shy;/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/ё/g, "е")
    .trim();
}

function breadcrumbsText(p) {
  return normText((p.breadcrumbs || []).join(" "));
}

function normalize(s) {
  return (s || "").toLowerCase().replace(/ё/g, "е").trim();
}

function tokenize(s) {
  return normalize(s)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function cleanCrumb(s) {
  return (s || "")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&shy;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const NONFOOD_TOP = new Set([
  "Гигиена",
  "Косметика и уход",
  "Уборка и стирка",
  "Добавить праздника",
  "Полезные мелочи",
  "Спорт",
]);

const NONFOOD_IZ_SUB = new Set([
  "Дом, милый дом",
  "Носки",
  "Пена и соль для ванны",
]);

function isNonFood(p) {
  const name = normText(p.name || "");
  const bc = normText((p.breadcrumbs || []).join(" "));

  if (name.includes("для ванн") || name.includes("для ванны")) return true;
  if (name.includes("соль для ванн") || name.includes("соль для ванны")) return true;
  if (name.includes("бомбочка для ванны") || name.includes("пена для ванн")) return true;

  // 2) breadcrumbs
  if (bc.includes("гигиен")) return true;
  if (bc.includes("пена") && bc.includes("ванн")) return true;
  if (bc.includes("космет") || bc.includes("уход")) return true;
  if (bc.includes("уборк") || bc.includes("стирк")) return true;

  return false;
}


const DESSERT_WORDS = new Set([
  "торт","пирог","пирожное","печенье","конфеты","шоколад","десерт","мороженое","вафли","кекс","рулет"
]);

function scoreProduct(name, q) {
  const n = normalize(name);
  const qn = normalize(q);

  if (!n || !qn) return -999;

  let score = 0;
  const tokens = tokenize(n);
  const qTokens = tokenize(qn);
  const qWord = qTokens[0];

  if (n.startsWith(qn)) score += 100;
  if (tokens[0] === qWord) score += 80;
  if (tokens.includes(qWord)) score += 40;
  if (n.includes(qn)) score += 10;

  if (tokens.some(t => DESSERT_WORDS.has(t))) score -= 50;

  return score;
}

function searchProducts(term, limit = 10) {
  const q = term.trim();
  if (!q) return [];

  const qn = normalize(q);

  const all = catalog.filter(p => normalize(p.name).includes(qn));

  const food = all.filter(p => !isNonFood(p));

  const qWord = tokenize(qn)[0] || qn;

  const pool = (qWord === "соль")
    ? food
    : ((food.length >= Math.min(5, limit)) ? food : all);
  

  if (qWord === "соль" && pool.length === 0) {
    const safeAll = all.filter(p => !normalize(p.name).includes("ванн"));
    safeAll.sort((a,b) => scoreProduct(b.name, q) - scoreProduct(a.name, q));
    return safeAll.slice(0, limit).map(p => ({
      id: p.id,
      name: p.name || "(без названия)",
      brand: p.brand || "",
      img: (p.images && p.images[0]) || "",
      price: p.cities?.[0]?.price?.price ?? null,
      url: p.cities?.[0]?.url || "",
      breadcrumbs: p.breadcrumbs || [],
    }));
  }
  pool.sort((a, b) => scoreProduct(b.name, q) - scoreProduct(a.name, q));

  const out = pool.slice(0, limit).map(p => ({
    id: p.id,
    name: p.name || "(без названия)",
    brand: p.brand || "",
    img: (p.images && p.images[0]) || "",
    price: p.cities?.[0]?.price?.price ?? null,
    url: p.cities?.[0]?.url || "",
    breadcrumbs: p.breadcrumbs || [],
  }));
  console.log("DEBUG", q, "all=", all.length, "food=", food.length);
  console.log("TOP1", out[0]?.name, out[0]?.breadcrumbs);
  return out;
}

function parseList(text) {
  return text.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
}

function buildCartFromText(text) {
  const terms = parseList(text).slice(0, 12);

  return terms.map(term => {
    const products = searchProducts(term, 10);
    return {
      term,
      qty: 1,
      selected: products[0] || null,
      alternatives: products
    };
  });
}

// ====== UI ======
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function productLabel(p) {
  const b = p.brand ? ` — ${p.brand}` : "";
  const pr = (p.price != null) ? ` • ${p.price}₽` : "";
  return `${p.name}${b}${pr}`;
}

let cartState = [];

function renderCart(root) {
  root.innerHTML = "";

  cartState.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "cart-row";

    if (!item.selected) {
      row.innerHTML = `
        <div class="cart-main">
          <div class="cart-title">Не найдено: <b>${escapeHtml(item.term)}</b></div>
          <div class="cart-sub">Попробуйте уточнить (например: “молоко 2.5%”) или нажмите “Нужна помощь”.</div>
        </div>
      `;
      root.appendChild(row);
      return;
    }

    const optionsHtml = item.alternatives
      .map(p => `
        <option value="${p.id}" ${p.id === item.selected.id ? "selected" : ""}>
          ${escapeHtml(productLabel(p))}
        </option>
      `)
      .join("");

    const imgHtml = item.selected.img
      ? `<img class="cart-img" src="${item.selected.img}" alt="">`
      : "";

    row.innerHTML = `
      <div class="cart-left">
        ${imgHtml}
        <div class="cart-main">
          <div class="cart-title">${escapeHtml(productLabel(item.selected))}</div>
          <div class="cart-sub">Запрос: ${escapeHtml(item.term)}</div>

          <select class="cart-select" data-index="${i}">
            ${optionsHtml}
          </select>
        </div>
      </div>

      <div class="cart-qty">
        <button type="button" class="qty-btn" data-dec="${i}">−</button>
        <div class="qty-val">${item.qty}</div>
        <button type="button" class="qty-btn" data-inc="${i}">+</button>

        <button type="button" class="remove-btn" data-rm="${i}" aria-label="Удалить">✕</button>
      </div>
    `;

    root.appendChild(row);
  });
  renderCheckoutBar();
  saveState({ cartState });
}

function wireCartHandlers(root) {
  root.addEventListener("change", (e) => {
    const sel = e.target.closest(".cart-select");
    if (!sel) return;

    const idx = Number(sel.dataset.index);
    const chosenId = sel.value;
    const item = cartState[idx];
    const next = item.alternatives.find(p => p.id === chosenId);
    if (next) item.selected = next;

    renderCart(root);
  });

  root.addEventListener("click", (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");

    if (inc) {
      const idx = Number(inc.dataset.inc);
      cartState[idx].qty += 1;
      renderCart(root);
    }
    if (dec) {
      const idx = Number(dec.dataset.dec);
      cartState[idx].qty = Math.max(1, cartState[idx].qty - 1);
      renderCart(root);
    }
    const rm = e.target.closest("[data-rm]");
    if (rm) {
      const idx = Number(rm.dataset.rm);
      cartState.splice(idx, 1);
      saveState({ cartState });
      renderCart(root);
      return;
    } 
  });
}

// ====== glue ======
document.addEventListener("DOMContentLoaded", async () => {
  window.resetUIState = resetUIState;
  window.afterLoginRestore = restoreFromState;

  window.renderTopbar?.();
  initAuthUI?.(() => {
    window.renderTopbar?.();
    restoreFromState();
    initProfileUI?.();
    renderSlotPicker?.();
    renderCheckoutBar?.();

    const st = loadState?.();
    renderHistory?.(st?.history || []);
  });

  if (!getAuth?.()?.phone) {
    openAuth?.();
    return;
  }

  restoreFromState();
  initProfileUI?.();
  renderSlotPicker?.();
  renderCheckoutBar?.();

  const input = document.getElementById("search-input-id");
  const btn = document.getElementById("build-cart-btn");
  const cartRoot = document.getElementById("cart-root");

  input?.addEventListener("input", () => saveState?.({ inputText: input.value }));

  btn.disabled = true;
  btn.textContent = "Загружаю каталог…";
  try {
    await loadCatalog();
  } catch (e) {
    console.error(e);
    btn.textContent = "Каталог не загрузился";
    alert("Не удалось загрузить data/lavka.json. Проверь путь и сервер.");
    return;
  }
  btn.disabled = false;
  btn.textContent = "Собрать корзину";

  wireCartHandlers(cartRoot);

  btn.addEventListener("click", () => {
    btn.disabled = true;
    btn.textContent = "Собираю…";
    try {
      cartState = buildCartFromText(input.value);
      saveState?.({ inputText: input.value, cartState });
      addToHistory?.(input.value);

      renderCart(cartRoot);
      document.querySelector('.segmented__btn[data-tab="sub"]')?.click();
    } catch (err) {
      console.error(err);
      alert("Не получилось собрать корзину.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Собрать корзину";
    }
  });

  const st = loadState?.();
  renderHistory?.(st?.history || []);
});

// ====== Slots ======
const TIME_WINDOWS = [
  { id: "10-12", label: "10:00–12:00" },
  { id: "12-14", label: "12:00–14:00" },
];

function makeDays(n = 7) {
  const days = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const top = new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(d);
    const bottom = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(d);

    const key = d.toISOString().slice(0, 10);
    days.push({ id: key, top, bottom });
  }
  return days;
}

// let chosenDayId = localStorage.getItem("slotDay") || "";
// let chosenTimeId = localStorage.getItem("slotTime") || "";
let chosenDayId = "";
let chosenTimeId = "";

function selectedSlotLabel() {
  if (!chosenDayId || !chosenTimeId) return "";
  const days = makeDays(7);
  const day = days.find(x => x.id === chosenDayId);
  const time = TIME_WINDOWS.find(x => x.id === chosenTimeId);
  if (!day || !time) return "";
  return `${day.top}, ${day.bottom} • ${time.label}`;
}

function renderSlotPicker() {
  const daysRoot = document.getElementById("slot-days");
  const timesRoot = document.getElementById("slot-times");
  const hint = document.getElementById("slot-hint");
  if (!daysRoot || !timesRoot || !hint) return;

  const days = makeDays(7);

  // render days
  daysRoot.innerHTML = days.map(d => `
    <button type="button" class="slot-btn ${d.id === chosenDayId ? "is-active" : ""}" data-day="${d.id}">
      <div class="slot-top">${d.top}</div>
      <div class="slot-bottom">${d.bottom}</div>
    </button>
  `).join("");

  // render times
  timesRoot.innerHTML = TIME_WINDOWS.map(t => `
    <button type="button" class="slot-btn ${t.id === chosenTimeId ? "is-active" : ""}" data-time="${t.id}">
      <div class="slot-top">${t.label}</div>
      <div class="slot-bottom">Окно доставки</div>
    </button>
  `).join("");

  hint.textContent = (chosenDayId && chosenTimeId)
    ? `Выбрано: ${selectedSlotLabel()}`
    : "Выберите день и время";

  // handlers
  daysRoot.onclick = (e) => {
    const b = e.target.closest("[data-day]");
    if (!b) return;
    chosenDayId = b.dataset.day;
    chosenDayId = b.dataset.day;
    // localStorage.setItem("slotDay", chosenDayId);
    saveState({ chosenDayId });
    renderSlotPicker();
    renderCheckoutBar();
  };

  timesRoot.onclick = (e) => {
    const b = e.target.closest("[data-time]");
    if (!b) return;
    chosenTimeId = b.dataset.time;
    // localStorage.setItem("slotTime", chosenTimeId);
    saveState({ chosenTimeId });
    renderSlotPicker();
    renderCheckoutBar();
  };
}

function calcTotal(cart) {
  let sum = 0;
  let unknown = 0;

  for (const item of cart) {
    const price = item.selected?.price;
    if (price == null || Number.isNaN(price)) {
      unknown += 1;
      continue;
    }
    sum += price * (item.qty || 1);
  }
  return { sum, unknown };
}

function formatRub(x) {
  return `${Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₽`;
}

let chosenSlotId = localStorage.getItem("slotId") || "";

function renderCheckoutBar() {
  const sumEl = document.getElementById("total-sum");
  const subEl = document.getElementById("total-sub");
  const confirmBtn = document.getElementById("confirm-btn");
  if (!sumEl || !subEl || !confirmBtn) return;

  const { sum, unknown } = calcTotal(cartState);
  sumEl.textContent = formatRub(sum);
  subEl.textContent = unknown ? `⚠️ ${unknown} поз. без цены (не учтены)` : "Все позиции списка учтены";

  const slotOk = !!(chosenDayId && chosenTimeId);
  confirmBtn.disabled = !slotOk || cartState.length === 0;
  confirmBtn.style.opacity = confirmBtn.disabled ? "0.6" : "1";
  confirmBtn.style.cursor = confirmBtn.disabled ? "default" : "pointer";

  confirmBtn.onclick = () => {
    if (!slotOk) return;
    alert(`Слот: ${selectedSlotLabel()}\nИтого: ${formatRub(sum)}`);
  };
}

function resetUIState() {
  const input = document.getElementById("search-input-id");
  if (input) input.value = "";

  cartState = [];
  const cartRoot = document.getElementById("cart-root");
  if (cartRoot) cartRoot.innerHTML = "";

  const addr = document.getElementById("addr-input");
  const comm = document.getElementById("comment-input");
  if (addr) addr.value = "";
  if (comm) comm.value = "";

  chosenDayId = "";
  chosenTimeId = "";

  document.querySelector('.segmented__btn[data-tab="order"]')?.click();

  renderSlotPicker?.();
  renderCheckoutBar?.();
  renderHistory?.([]);
}

function restoreFromState() {
  resetUIState();

  window.resetUIState = resetUIState;
  window.afterLoginRestore = restoreFromState;

  const st = loadState?.();
  if (!st) return;

  const input = document.getElementById("search-input-id");
  if (input && st.inputText) input.value = st.inputText;

  if (Array.isArray(st.cartState)) cartState = st.cartState;

  const addr = document.getElementById("addr-input");
  const comm = document.getElementById("comment-input");
  if (addr && st.address) addr.value = st.address;
  if (comm && st.comment) comm.value = st.comment;

  chosenDayId = st.chosenDayId || "";
  chosenTimeId = st.chosenTimeId || "";

  renderSlotPicker?.();
  renderCheckoutBar?.();
  renderHistory?.(st.history || []);

  const cartRoot = document.getElementById("cart-root");
  if (cartRoot && cartState.length) {
    renderCart(cartRoot);
    document.querySelector('.segmented__btn[data-tab="sub"]')?.click();
  }
}