/* ═══════════════════════════════════════════════════════════════
   app.js  —  Los Canelos Munchies Cash Register
   ═══════════════════════════════════════════════════════════════ */

"use strict";

// ── Config ────────────────────────────────────────────────────────────────────
const BUSINESS_NAME  = "LOS CANELOS MUNCHIES";
const BUSINESS_ADDR  = "4154 S Normandie Ave";
const BUSINESS_CITY  = "Los Angeles, CA 90037";
const SUMMARY_PIN    = "1997";
const STORAGE_KEY    = "loscanelos_receipts";
const LOGO_URL       = "https://i.ibb.co/vxHrGVKL/los-canelos-2.png";

const ITEMS = [
  {
    id:    "raspado",
    name:  "Raspado",
    price: 6.00,
    img:   "https://i.ibb.co/gZSPxhR1/raspado.png",
  },
  {
    id:    "water",
    name:  "Water Bottle",
    price: 1.50,
    img:   "https://i.ibb.co/SXjNQBnx/water-bottle.png",
  },
  {
    id:    "tostiloko",
    name:  "Tostiloko",
    price: 10.00,
    img:   "https://i.ibb.co/Nhz268X/tosti.png",
  },
];

// ── State ─────────────────────────────────────────────────────────────────────
let order    = {};
let receipts = [];
let payType  = "cash";
let tendered = 0;

// ── Persistence ───────────────────────────────────────────────────────────────
function saveToStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts)); } catch (_) {}
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        receipts = parsed;
        return true;
      }
    }
  } catch (_) {}
  return false;
}

// ── Leave warning ─────────────────────────────────────────────────────────────
window.addEventListener("beforeunload", (e) => {
  if (receipts.length > 0) {
    e.preventDefault();
    e.returnValue = "You have unsaved orders. Are you sure you want to leave?";
  }
});

// ── Utilities ─────────────────────────────────────────────────────────────────
const fmt = (n) => "$" + n.toFixed(2);

const now12h = () =>
  new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

const nowFull = () =>
  new Date().toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

const orderTotal = () =>
  ITEMS.reduce((s, it) => s + (order[it.id] || 0) * it.price, 0);

// ── Clock ─────────────────────────────────────────────────────────────────────
function tickClock() {
  const el = document.getElementById("clock");
  if (el) el.textContent = now12h();
}
setInterval(tickClock, 1000);
tickClock();

// ── Render items ──────────────────────────────────────────────────────────────
function renderItems() {
  const container = document.getElementById("itemsList");
  container.innerHTML = "";

  ITEMS.forEach((it) => {
    const qty  = order[it.id] || 0;
    const card = document.createElement("div");
    card.className = "item-card" + (qty > 0 ? " has-qty" : "");

    card.innerHTML = `
      <div class="item-img-wrap">
        <div class="item-img">
          <img src="${it.img}" alt="${it.name}" loading="lazy"
               onerror="this.style.display='none';" />
        </div>
        ${qty > 0 ? `<div class="item-qty-badge">${qty}</div>` : ""}
      </div>
      <div class="item-info">
        <div class="item-name">${it.name}</div>
        <div class="item-price">${fmt(it.price)} each</div>
        ${qty > 0 ? `<div class="item-subtotal">Subtotal: ${fmt(qty * it.price)}</div>` : ""}
      </div>
      <div class="item-controls">
        ${qty > 0 ? `<button class="ctrl-btn minus" data-id="${it.id}" aria-label="Remove ${it.name}">−</button>` : ""}
        <button class="ctrl-btn plus" data-id="${it.id}" aria-label="Add ${it.name}">+</button>
      </div>
    `;

    container.appendChild(card);
  });

  container.querySelectorAll(".ctrl-btn.plus").forEach((btn) =>
    btn.addEventListener("click", () => addItem(btn.dataset.id))
  );
  container.querySelectorAll(".ctrl-btn.minus").forEach((btn) =>
    btn.addEventListener("click", () => removeItem(btn.dataset.id))
  );
}

// ── Render totals / change ────────────────────────────────────────────────────
function renderTotal() {
  const total = orderTotal();
  document.getElementById("totalAmount").textContent = fmt(total);

  document.getElementById("btnComplete").disabled = total === 0;
  document.getElementById("btnReceipt").disabled  = receipts.length === 0;
  document.getElementById("btnSummary").disabled  = receipts.length === 0;

  // Badge
  const badge = document.getElementById("orderBadge");
  if (receipts.length > 0) {
    const grand = receipts.reduce((s, r) => s + r.total, 0);
    badge.textContent = `${receipts.length} completed order${receipts.length !== 1 ? "s" : ""} · ${fmt(grand)} total`;
    badge.style.display = "block";
  } else {
    badge.style.display = "none";
  }

  // Change calculator
  const changeBox    = document.getElementById("changeBox");
  const changeLabel  = document.getElementById("changeLabel");
  const changeAmount = document.getElementById("changeAmount");

  if (payType === "cash" && tendered > 0 && total > 0) {
    const diff = tendered - total;
    changeBox.style.display = "flex";
    if (diff >= 0) {
      changeBox.classList.remove("short");
      changeLabel.textContent  = "CHANGE DUE";
      changeAmount.textContent = fmt(diff);
    } else {
      changeBox.classList.add("short");
      changeLabel.textContent  = "AMOUNT SHORT";
      changeAmount.textContent = fmt(Math.abs(diff));
    }
  } else {
    changeBox.style.display = "none";
  }
}

function render() {
  renderItems();
  renderTotal();
}

// ── Order mutations ───────────────────────────────────────────────────────────
function addItem(id) {
  order[id] = (order[id] || 0) + 1;
  render();
}

function removeItem(id) {
  if ((order[id] || 0) <= 1) delete order[id];
  else order[id]--;
  render();
}

function clearOrder() {
  order    = {};
  tendered = 0;
  document.getElementById("tenderedInput").value = "";
  highlightBill(null);
  render();
}

function completeOrder() {
  const total = orderTotal();
  if (total === 0) return;

  receipts.push({
    time:    now12h(),
    items:   ITEMS.filter((it) => order[it.id]).map((it) => ({
               name:     it.name,
               qty:      order[it.id],
               price:    it.price,
               subtotal: order[it.id] * it.price,
             })),
    total,
    payType,
  });

  saveToStorage();
  clearOrder();
}

// ── Payment type ──────────────────────────────────────────────────────────────
function setPayType(type) {
  payType = type;
  document.getElementById("btnCash").classList.toggle("active",   type === "cash");
  document.getElementById("btnCredit").classList.toggle("active", type === "credit");
  document.getElementById("cashSection").style.display = type === "cash" ? "block" : "none";
  renderTotal();
}

// ── Bill buttons ──────────────────────────────────────────────────────────────
function highlightBill(val) {
  document.querySelectorAll(".bill-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.val === String(val));
  });
}

document.querySelectorAll(".bill-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    tendered = parseFloat(btn.dataset.val);
    document.getElementById("tenderedInput").value = tendered;
    highlightBill(btn.dataset.val);
    renderTotal();
  });
});

document.getElementById("tenderedInput").addEventListener("input", (e) => {
  tendered = parseFloat(e.target.value) || 0;
  highlightBill(null);
  renderTotal();
});

// ── Action buttons ────────────────────────────────────────────────────────────
document.getElementById("btnCash").addEventListener("click",    () => setPayType("cash"));
document.getElementById("btnCredit").addEventListener("click",  () => setPayType("credit"));
document.getElementById("btnClear").addEventListener("click",   clearOrder);
document.getElementById("btnComplete").addEventListener("click", completeOrder);
document.getElementById("btnReceipt").addEventListener("click",  () => generateReceiptPDF());
document.getElementById("btnSummary").addEventListener("click",  openPinModal);
document.getElementById("bannerDismiss").addEventListener("click", () => {
  document.getElementById("savedBanner").style.display = "none";
});

// ── PIN Modal ─────────────────────────────────────────────────────────────────
function openPinModal() {
  document.getElementById("pinInput").value = "";
  document.getElementById("pinError").style.display = "none";
  document.getElementById("pinInput").classList.remove("error");
  document.getElementById("pinOverlay").style.display = "flex";
  setTimeout(() => document.getElementById("pinInput").focus(), 50);
}
function closePinModal() {
  document.getElementById("pinOverlay").style.display = "none";
}
function submitPin() {
  const val = document.getElementById("pinInput").value.trim();
  if (val === SUMMARY_PIN) {
    closePinModal();
    generateSummaryPDF();
  } else {
    document.getElementById("pinError").style.display = "block";
    document.getElementById("pinInput").classList.add("error");
    document.getElementById("pinInput").value = "";
    document.getElementById("pinInput").focus();
  }
}

document.getElementById("pinCancel").addEventListener("click",  closePinModal);
document.getElementById("pinConfirm").addEventListener("click", submitPin);
document.getElementById("pinInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitPin();
});
document.getElementById("pinOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("pinOverlay")) closePinModal();
});

// ── PDF helpers ───────────────────────────────────────────────────────────────

/**
 * Load an image URL and return a base64 data-URL.
 * Falls back gracefully if the fetch fails.
 */
function loadImgBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (_) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Add the company logo centred at the top of the receipt.
 * Returns the Y position after the logo (or the same Y if it failed).
 */
async function addLogoToPDF(doc, W, startY) {
  const b64 = await loadImgBase64(LOGO_URL);
  if (!b64) return startY;

  // Draw logo proportionally, capped at 40 mm wide
  const maxW  = 40;
  const imgEl = new Image();
  imgEl.src   = b64;
  await new Promise((r) => { imgEl.onload = r; });
  const ratio  = imgEl.naturalHeight / imgEl.naturalWidth;
  const drawW  = Math.min(maxW, W - 10);
  const drawH  = drawW * ratio;
  const x      = (W - drawW) / 2;

  doc.addImage(b64, "PNG", x, startY, drawW, drawH);
  return startY + drawH + 3;
}

// ── Receipt List PDF (preview) ────────────────────────────────────────────────
async function generateReceiptPDF() {
  if (!window.jspdf) { alert("PDF engine not ready — please try again."); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: [80, 297] });
  const W = 80;
  let y = 6;

  /* helpers */
  const center = (txt, size, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.text(txt, W / 2, y, { align: "center" });
    y += size * 0.45 + 1;
  };
  const dashes = () => {
    doc.setLineDash([1, 1.2]);
    doc.setDrawColor(150, 150, 150);
    doc.line(4, y, W - 4, y);
    y += 3;
  };
  const row = (left, right, size = 8, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.text(String(left),  6,     y);
    doc.text(String(right), W - 6, y, { align: "right" });
    y += size * 0.45 + 1.4;
  };

  /* Logo */
  y = await addLogoToPDF(doc, W, y);
  y += 1;

  /* Header */
  center(BUSINESS_NAME, 9, true);
  center(BUSINESS_ADDR, 7);
  center(BUSINESS_CITY, 7);
  center(nowFull(), 7);
  y += 1;
  dashes();
  center("** PREVIEW  —  NOT FINAL **", 7);
  y += 1;
  center("RECEIPT LIST", 9, true);
  y += 1;
  dashes();

  /* ── TRANSACTIONS first ── */
  center("TRANSACTIONS", 8, true);
  y += 0.5;
  receipts.forEach((r, i) => {
    row(`#${i + 1}  ${r.time}`, fmt(r.total), 7.5);
  });
  y += 1;
  dashes();

  /* ── Item totals ── */
  row("ITEM", "TOTAL", 8, true);
  dashes();

  const allItems = {};
  receipts.forEach((r) =>
    r.items.forEach((it) => {
      if (!allItems[it.name]) allItems[it.name] = { qty: 0, total: 0, price: it.price };
      allItems[it.name].qty   += it.qty;
      allItems[it.name].total += it.subtotal;
    })
  );

  Object.entries(allItems).forEach(([name, d]) => {
    row(name, "", 8);
    row(`  ${d.qty} x ${fmt(d.price)}`, fmt(d.total), 7.5);
  });

  dashes();
  const grandTotal = receipts.reduce((s, r) => s + r.total, 0);
  row("TOTAL", fmt(grandTotal), 9, true);
  y += 2;
  dashes();
  center(`${receipts.length} transaction(s)`, 7);

  /* Diagonal watermark */
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.09 }));
  doc.setFontSize(19);
  doc.setFont("courier", "bold");
  doc.setTextColor(180, 0, 0);
  doc.text("PREVIEW ONLY", W / 2, 140, { align: "center", angle: 45 });
  doc.text("PREVIEW ONLY", W / 2, 210, { align: "center", angle: 45 });
  doc.restoreGraphicsState();
  doc.setTextColor(0, 0, 0);

  doc.output("dataurlnewwindow");
}

// ── Daily Summary PDF (authorized) ───────────────────────────────────────────
async function generateSummaryPDF() {
  if (!window.jspdf) { alert("PDF engine not ready — please try again."); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: [80, 297] });
  const W = 80;
  let y = 6;

  const center = (txt, size, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.text(txt, W / 2, y, { align: "center" });
    y += size * 0.45 + 1;
  };
  const dashes = () => {
    doc.setLineDash([1, 1.2]);
    doc.setDrawColor(150, 150, 150);
    doc.line(4, y, W - 4, y);
    y += 3;
  };
  const row = (left, right, size = 8, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.text(String(left),  6,     y);
    doc.text(String(right), W - 6, y, { align: "right" });
    y += size * 0.45 + 1.6;
  };

  /* Logo */
  y = await addLogoToPDF(doc, W, y);
  y += 1;

  /* Header */
  center(BUSINESS_NAME, 9, true);
  center(BUSINESS_ADDR, 7);
  center(BUSINESS_CITY, 7);
  y += 1;
  center("DAILY SETTLEMENT", 10, true);
  center(nowFull(), 7);
  y += 1;
  dashes();
  center("AUTHORIZED SUMMARY", 8, true);
  dashes();

  /* All sales */
  row("TIME", "AMT    TYPE", 7.5, true);
  dashes();

  receipts.forEach((r, i) => {
    const tag = r.payType === "cash" ? "CASH" : "CRD ";
    row(`#${i + 1}  ${r.time}`, `${fmt(r.total)}  ${tag}`, 7.5);
  });

  dashes();

  /* Payment breakdown */
  const cashTotal   = receipts.filter((r) => r.payType === "cash").reduce((s, r) => s + r.total, 0);
  const creditTotal = receipts.filter((r) => r.payType === "credit").reduce((s, r) => s + r.total, 0);
  const grandTotal  = cashTotal + creditTotal;

  y += 1;
  row("Cash Payments",   fmt(cashTotal),   8);
  row("Credit Payments", fmt(creditTotal), 8);
  y += 1;
  dashes();

  /* Grand total */
  doc.setFontSize(9.5);
  doc.setFont("courier", "bold");
  doc.text("TOTAL PAYMENTS", 6, y);
  doc.text(fmt(grandTotal), W - 6, y, { align: "right" });
  y += 8;

  dashes();
  center(`${receipts.length} transaction(s)`, 7);
  y += 2;
  center("END OF DAY", 8, true);
  y += 2;
  center("Authorized: ________________", 7);

  doc.output("dataurlnewwindow");
}

// ── Init ──────────────────────────────────────────────────────────────────────
(function init() {
  const restored = loadFromStorage();
  if (restored) {
    document.getElementById("savedBanner").style.display = "flex";
  }
  setPayType("cash");
  render();
})();
