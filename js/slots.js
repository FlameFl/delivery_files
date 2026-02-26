window.TIME_WINDOWS = [
  { id: "10-12", label: "10:00–12:00" },
  { id: "12-14", label: "12:00–14:00" },
];

// window.chosenDayId  = localStorage.getItem("slotDay")  || "";
// window.chosenTimeId = localStorage.getItem("slotTime") || "";

window.chosenDayId  = "";
window.chosenTimeId = "";

window.makeDays = function makeDays(n = 7) {
  const days = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const topRaw = new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(d).replace(".", "");
    const top = topRaw[0].toUpperCase() + topRaw.slice(1);
    const bottom = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(d);
    const key = d.toISOString().slice(0, 10);
    days.push({ id: key, top, bottom });
  }
  return days;
};

window.selectedSlotLabel = function selectedSlotLabel() {
  if (!chosenDayId || !chosenTimeId) return "";
  const days = makeDays(7);
  const day = days.find(x => x.id === chosenDayId);
  const time = TIME_WINDOWS.find(x => x.id === chosenTimeId);
  if (!day || !time) return "";
  return `${day.top}, ${day.bottom} • ${time.label}`;
};

window.renderSlotPicker = function renderSlotPicker() {
  const daysRoot = document.getElementById("slot-days");
  const timesRoot = document.getElementById("slot-times");
  const hint = document.getElementById("slot-hint");
  if (!daysRoot || !timesRoot || !hint) return;

  const days = makeDays(7);

  daysRoot.innerHTML = days.map(d => `
    <button type="button" class="slot-btn ${d.id === chosenDayId ? "is-active" : ""}" data-day="${d.id}">
      <div class="slot-top">${d.top}</div>
      <div class="slot-bottom">${d.bottom}</div>
    </button>
  `).join("");

  timesRoot.innerHTML = TIME_WINDOWS.map(t => `
    <button type="button" class="slot-btn ${t.id === chosenTimeId ? "is-active" : ""}" data-time="${t.id}">
      <div class="slot-top">${t.label}</div>
      <div class="slot-bottom">Окно доставки</div>
    </button>
  `).join("");

  hint.textContent = (chosenDayId && chosenTimeId)
    ? `Выбрано: ${selectedSlotLabel()}`
    : "Выберите день и время";

  daysRoot.onclick = (e) => {
    const b = e.target.closest("[data-day]");
    if (!b) return;
    chosenDayId = b.dataset.day;
    // localStorage.setItem("slotDay", chosenDayId);
    saveState({ chosenDayId });
    renderSlotPicker();
    renderCheckoutBar?.();
  };

  timesRoot.onclick = (e) => {
    const b = e.target.closest("[data-time]");
    if (!b) return;
    chosenTimeId = b.dataset.time;
    // localStorage.setItem("slotTime", chosenTimeId);
    saveState({ chosenTimeId });
    renderSlotPicker();
    renderCheckoutBar?.();
  };
};