// ---------- Helpers ----------
const $ = id => document.getElementById(id);
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

// Reads a number from an input. Returns null if empty or not a valid number.
function readNumber(id) {
  const raw = $(id).value.trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
function setMsg(id, text, type) {
  const el = $(id);
  el.textContent = text;
  el.className = "msg" + (type ? " " + type : "");
}
function markInvalid(id, bad) { $(id).setAttribute("aria-invalid", bad ? "true" : "false"); }
function showResult(id, html) { const el = $(id); el.innerHTML = ""; void el.offsetWidth; el.innerHTML = html; }

// ---------- Navigation ----------
const views = ["home", "convert", "tax", "loops", "payroll"];
function go(name) {
  views.forEach(v => { $("view-" + v).hidden = v !== name; });
  const view = $("view-" + name);
  view.classList.remove("enter"); void view.offsetWidth; view.classList.add("enter");
  document.querySelectorAll("nav button").forEach(b => {
    if (b.dataset.go === name) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
  $("main").focus({ preventScroll: true });
  document.title = (name === "home" ? "Edzymon Waga" : view.querySelector("h1").textContent) + " — Student Projects";
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-go]");
  if (t) go(t.dataset.go);
});

// ---------- 1. Conversion ----------
const conversions = {
  c2f:  { from: "°C", to: "°F", label: "Value in °C", fn: c => c * 9 / 5 + 32 },
  f2c:  { from: "°F", to: "°C", label: "Value in °F", fn: f => (f - 32) * 5 / 9 },
  m2ft: { from: "m",  to: "ft", label: "Value in meters", fn: m => m * 3.28084 },
  ft2m: { from: "ft", to: "m",  label: "Value in feet", fn: ft => ft * 0.3048 }
};
const swapMap = { c2f: "f2c", f2c: "c2f", m2ft: "ft2m", ft2m: "m2ft" };

function updateConvertLabel() { $("cv-label").textContent = conversions[$("cv-type").value].label; }
function convert() {
  const c = conversions[$("cv-type").value];
  const v = readNumber("cv-in");
  $("cv-out").innerHTML = "";
  if (v === null) { markInvalid("cv-in", true); setMsg("cv-msg", "Enter a valid number to convert.", "err"); return; }
  markInvalid("cv-in", false); setMsg("cv-msg", "");
  const r = c.fn(v);
  showResult("cv-out", `<div class="big">${num.format(r)} ${c.to}</div><div class="calc">${num.format(v)} ${c.from} = ${num.format(r)} ${c.to}</div>`);
}
$("cv-go").addEventListener("click", convert);
$("cv-in").addEventListener("keydown", e => { if (e.key === "Enter") convert(); });
$("cv-type").addEventListener("change", () => { updateConvertLabel(); $("cv-out").innerHTML = ""; });
$("cv-swap").addEventListener("click", () => {
  const out = $("cv-out").querySelector(".big");
  const prev = out ? out.textContent.split(" ")[0].replace(/,/g, "") : "";
  $("cv-type").value = swapMap[$("cv-type").value];
  updateConvertLabel();
  if (prev !== "") { $("cv-in").value = prev; convert(); } else { $("cv-out").innerHTML = ""; }
});

// ---------- 2. Income tax ----------
// [lower limit, base tax, rate, description]
const brackets = [
  [0,       0,       0,    "₱250,000 and below"],
  [250000,  0,       0.20, "Over ₱250,000 but not over ₱400,000"],
  [400000,  30000,   0.25, "Over ₱400,000 but not over ₱800,000"],
  [800000,  130000,  0.30, "Over ₱800,000 but not over ₱2,000,000"],
  [2000000, 490000,  0.32, "Over ₱2,000,000 but not over ₱8,000,000"],
  [8000000, 2410000, 0.35, "Over ₱8,000,000"]
];
function computeTax(income) {
  let i = 0;
  for (let k = 1; k < brackets.length; k++) { if (income > brackets[k][0]) i = k; }
  const [limit, base, rate, desc] = brackets[i];
  const excess = i === 0 ? 0 : income - limit;
  return { desc, base, rate, excess, tax: base + excess * rate };
}
function taxRun() {
  const v = readNumber("tx-in");
  $("tx-out").innerHTML = "";
  if (v === null) { markInvalid("tx-in", true); setMsg("tx-msg", "Enter your net taxable income as a number.", "err"); return; }
  if (v < 0) { markInvalid("tx-in", true); setMsg("tx-msg", "Income cannot be negative.", "err"); return; }
  markInvalid("tx-in", false); setMsg("tx-msg", "");
  const r = computeTax(v);
  const calc = r.rate === 0 ? "No tax is due in this bracket." :
    `${peso.format(r.base)} + (${peso.format(r.excess)} × ${r.rate * 100}%) = ${peso.format(r.tax)}`;
  showResult("tx-out", `<div class="muted">Income tax due</div><div class="big">${peso.format(r.tax)}</div>
    <dl><dt>Bracket</dt><dd>${r.desc}</dd><dt>Net taxable income</dt><dd>${peso.format(v)}</dd>
    <dt>Basic tax</dt><dd>${peso.format(r.base)}</dd><dt>Excess</dt><dd>${peso.format(r.excess)}</dd>
    <dt>Rate on excess</dt><dd>${r.rate * 100}%</dd></dl><div class="calc">${calc}</div>`);
}
$("tx-go").addEventListener("click", taxRun);
$("tx-in").addEventListener("keydown", e => { if (e.key === "Enter") taxRun(); });

// ---------- 3. Loops ----------
// Reads a whole number between min and max; shows an error otherwise.
function readInt(id, msgId, min, max) {
  const v = readNumber(id);
  let err = "";
  if (v === null) err = "Enter a whole number.";
  else if (!Number.isInteger(v)) err = "Use a whole number, without decimals.";
  else if (v < min) err = `Enter a number that is ${min} or higher.`;
  else if (v > max) err = `Enter a number no higher than ${max.toLocaleString()}.`;
  markInvalid(id, !!err); setMsg(msgId, err, err ? "err" : "");
  return err ? null : v;
}
// Show the whole sequence if short, otherwise the first and last terms.
function joinTerms(terms, sep) {
  return terms.length <= 12 ? terms.join(sep) : terms.slice(0, 5).join(sep) + sep + "…" + sep + terms.slice(-3).join(sep);
}

// Factorial with a WHILE loop (BigInt keeps 20! exact)
function factorial() {
  $("f-out").innerHTML = "";
  const n = readInt("f-in", "f-msg", 0, 20);
  if (n === null) return;
  let result = 1n, i = BigInt(n);
  const terms = [];
  while (i > 1n) { result *= i; terms.push(i.toString()); i--; }
  if (terms.length === 0) terms.push("1");
  showResult("f-out", `<div class="big">${n}! = ${result.toLocaleString("en-US")}</div><div class="calc">${n}! = ${joinTerms(terms, " × ")} = ${result.toLocaleString("en-US")}</div>`);
}

// Sum with a DO...WHILE loop
function sumDo() {
  $("s-out").innerHTML = "";
  const n = readInt("s-in", "s-msg", 1, 100000);
  if (n === null) return;
  let sum = 0, i = 1;
  const terms = [];
  do { sum += i; terms.push(i); i++; } while (i <= n);
  showResult("s-out", `<div class="big">Sum = ${sum.toLocaleString("en-US")}</div><div class="calc">${joinTerms(terms, " + ")} = ${sum.toLocaleString("en-US")}</div>`);
}

// Average with a FOR loop
function average() {
  $("a-out").innerHTML = "";
  const n = readInt("a-in", "a-msg", 1, 100000);
  if (n === null) return;
  let sum = 0;
  for (let i = 1; i <= n; i++) { sum += i; }
  const avg = sum / n;
  showResult("a-out", `<div class="big">Average = ${num.format(avg)}</div>
    <dl><dt>N</dt><dd>${n.toLocaleString("en-US")}</dd><dt>Sum</dt><dd>${sum.toLocaleString("en-US")}</dd></dl>
    <div class="calc">Average = ${sum.toLocaleString("en-US")} ÷ ${n.toLocaleString("en-US")} = ${num.format(avg)}</div>`);
}
[["f", factorial], ["s", sumDo], ["a", average]].forEach(([p, fn]) => {
  $(p + "-go").addEventListener("click", fn);
  $(p + "-in").addEventListener("keydown", e => { if (e.key === "Enter") fn(); });
});

// ---------- 4. Payroll ----------
const employees = [];
let lastAdded = -1;
function esc(s) { return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function flash(id, text) {
  const el = $(id);
  if (el.textContent === text) return;
  el.textContent = text; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 500);
}
function renderPayroll() {
  let g = 0, d = 0, n = 0;
  $("p-body").innerHTML = employees.map((e, i) => {
    g += e.gross; d += e.ded; n += e.net;
    return `<tr class="${i === lastAdded ? "new" : ""}"><td>${i + 1}</td><td>${esc(e.name)}</td><td>${num.format(e.days)}</td>
      <td>${peso.format(e.rate)}</td><td>${peso.format(e.gross)}</td><td>${peso.format(e.ded)}</td>
      <td class="net">${peso.format(e.net)}</td></tr>`;
  }).join("");
  $("p-empty").hidden = employees.length > 0;
  flash("sm-n", String(employees.length)); flash("sm-g", peso.format(g));
  flash("sm-d", peso.format(d)); flash("sm-net", peso.format(n));
  lastAdded = -1;
}
function addEmployee() {
  const name = $("p-name").value.trim();
  const days = readNumber("p-days"), rate = readNumber("p-rate"), ded = readNumber("p-ded");
  const errors = [];
  markInvalid("p-name", !name); if (!name) errors.push("Enter the employee's name.");
  markInvalid("p-days", days === null || days < 0); if (days === null || days < 0) errors.push("Days worked must be 0 or more.");
  markInvalid("p-rate", rate === null || rate < 0); if (rate === null || rate < 0) errors.push("Daily rate must be 0 or more.");
  markInvalid("p-ded", ded === null || ded < 0); if (ded === null || ded < 0) errors.push("Deduction must be 0 or more.");
  if (errors.length) { setMsg("p-msg", errors.join(" "), "err"); return; }
  const gross = days * rate;
  if (ded > gross) { markInvalid("p-ded", true); setMsg("p-msg", "Deduction cannot be higher than gross pay (" + peso.format(gross) + ").", "err"); return; }
  employees.push({ name, days, rate, gross, ded, net: gross - ded });
  lastAdded = employees.length - 1;
  renderPayroll();
  setMsg("p-msg", name + " was added to the payroll.", "ok");
  ["p-name", "p-days", "p-rate", "p-ded"].forEach(id => { $(id).value = ""; });
  $("p-name").focus();
}
function deleteEmployee() {
  const v = readNumber("p-del");
  if (employees.length === 0) { markInvalid("p-del", true); setMsg("p-delmsg", "There are no employees to delete.", "err"); return; }
  if (v === null || !Number.isInteger(v) || v < 1 || v > employees.length) {
    markInvalid("p-del", true);
    setMsg("p-delmsg", `Enter a line number from 1 to ${employees.length}.`, "err"); return;
  }
  const removed = employees.splice(v - 1, 1)[0];
  markInvalid("p-del", false); $("p-del").value = "";
  renderPayroll();
  setMsg("p-delmsg", `Deleted line ${v} (${removed.name}). Remaining lines were renumbered.`, "ok");
}
$("p-add").addEventListener("click", addEmployee);
$("p-delgo").addEventListener("click", deleteEmployee);
["p-name", "p-days", "p-rate", "p-ded"].forEach(id => $(id).addEventListener("keydown", e => { if (e.key === "Enter") addEmployee(); }));
$("p-del").addEventListener("keydown", e => { if (e.key === "Enter") deleteEmployee(); });

// ---------- Start ----------
updateConvertLabel();
renderPayroll();
go("home");
