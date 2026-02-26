window.initProfileUI = function initProfileUI() {
  const addr = document.getElementById("addr-input");
  const comm = document.getElementById("comment-input");
  if (!addr && !comm) return;

  const st = loadState();
  if (st) {
    if (addr && st.address) addr.value = st.address;
    if (comm && st.comment) comm.value = st.comment;
  }

  addr?.addEventListener("input", () => saveState({ address: addr.value }));
  comm?.addEventListener("input", () => saveState({ comment: comm.value }));
};