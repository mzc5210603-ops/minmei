/* ═══════════ 时间小屋 · 逻辑 ═══════════ */
"use strict";
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");

/* ---------- 蜂鸣 ---------- */
function chime(times = 3) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = 880;
      g.gain.setValueAtTime(0, ctx.currentTime + i * .45);
      g.gain.linearRampToValueAtTime(.22, ctx.currentTime + i * .45 + .03);
      g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + i * .45 + .38);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * .45); o.stop(ctx.currentTime + i * .45 + .4);
    }
  } catch (e) { /* 静默 */ }
}

/* ---------- 挂钟 ---------- */
function tickClock() {
  const d = new Date();
  const s = d.getSeconds(), m = d.getMinutes(), h = d.getHours() % 12;
  $("handSec").style.transform = `rotate(${s * 6}deg)`;
  $("handMin").style.transform = `rotate(${m * 6 + s * .1}deg)`;
  $("handHr").style.transform = `rotate(${h * 30 + m * .5}deg)`;
  $("clockDigital").textContent = `${pad(d.getHours())}:${pad(m)}:${pad(s)}`;
}
tickClock(); setInterval(tickClock, 1000);

/* ---------- 番茄钟（拨杆启停） ---------- */
const pomo = {
  focus: 25 * 60, rest: 5 * 60,
  left: 25 * 60, phase: "focus", running: false, endAt: 0,
  done: +(localStorage.getItem("cabin-pomo-done") || 0)
};
const RING_LEN = 2 * Math.PI * 52;
$("pomoCount").textContent = `今日完成 ${pomo.done} 番`;

function pomoRender() {
  const total = pomo.phase === "focus" ? pomo.focus : pomo.rest;
  $("pomoTime").textContent = `${pad(Math.floor(pomo.left / 60))}:${pad(pomo.left % 60)}`;
  $("pomoPhase").textContent = pomo.phase === "focus" ? "专注" : "小憩";
  $("pomoRing").style.strokeDashoffset = RING_LEN * (1 - pomo.left / total);
  $("pomoRing").style.stroke = pomo.phase === "focus" ? "var(--red)" : "#4e7a4e";
}
function pomoTick() {
  if (!pomo.running) return;
  pomo.left = Math.max(0, Math.round((pomo.endAt - Date.now()) / 1000));
  if (pomo.left === 0) {
    chime(pomo.phase === "focus" ? 3 : 2);
    if (pomo.phase === "focus") {
      pomo.done++; localStorage.setItem("cabin-pomo-done", pomo.done);
      $("pomoCount").textContent = `今日完成 ${pomo.done} 番`;
      pomo.phase = "rest"; pomo.left = pomo.rest;
    } else { pomo.phase = "focus"; pomo.left = pomo.focus; }
    pomo.endAt = Date.now() + pomo.left * 1000;
  }
  pomoRender();
}
$("pomoLever").addEventListener("click", () => {
  pomo.running = !pomo.running;
  $("pomoLever").classList.toggle("on", pomo.running);
  if (pomo.running) pomo.endAt = Date.now() + pomo.left * 1000;
});
setInterval(pomoTick, 250);
pomoRender();

/* ---------- 倒计时（旋钮调分） ---------- */
const timer = { total: 600, left: 600, running: false, endAt: 0 };
function tRender() {
  $("tMin").textContent = pad(Math.floor(timer.left / 60));
  $("tSec").textContent = pad(timer.left % 60);
  $("tRun").textContent = timer.running ? "停" : "启";
}
document.querySelectorAll(".knob-btn").forEach(b => b.addEventListener("click", () => {
  if (timer.running) return;
  const d = +b.dataset.d * 60;
  timer.total = Math.min(99 * 60, Math.max(60, timer.total + d));
  timer.left = timer.total; tRender();
}));
$("tRun").addEventListener("click", () => {
  timer.running = !timer.running;
  if (timer.running) timer.endAt = Date.now() + timer.left * 1000;
  tRender();
});
$("tReset").addEventListener("click", () => {
  timer.running = false; timer.left = timer.total; tRender();
});
setInterval(() => {
  if (!timer.running) return;
  timer.left = Math.max(0, Math.round((timer.endAt - Date.now()) / 1000));
  if (timer.left === 0) { timer.running = false; chime(4); }
  tRender();
}, 250);
tRender();

/* ---------- 纪念日铜牌 ---------- */
let annivs = JSON.parse(localStorage.getItem("cabin-annivs") || "[]");
function annivRender() {
  $("tagWall").innerHTML = annivs.map((a, i) => {
    const days = Math.floor((Date.now() - new Date(a.date + "T00:00:00")) / 86400000);
    const txt = days >= 0 ? `已 ${days}` : `还剩 ${-days}`;
    return `<div class="brass-tag"><span>${a.name}</span><b>${Math.abs(days)}</b><small>${txt} 天</small>
      <button class="rm" data-i="${i}" title="取下">✕</button></div>`;
  }).join("");
}
$("aAdd").addEventListener("click", () => {
  const name = $("aName").value.trim(), date = $("aDate").value;
  if (!name || !date) return;
  annivs.push({ name, date });
  localStorage.setItem("cabin-annivs", JSON.stringify(annivs));
  $("aName").value = ""; $("aDate").value = "";
  annivRender();
});
$("tagWall").addEventListener("click", (e) => {
  const rm = e.target.closest(".rm");
  if (!rm) return;
  annivs.splice(+rm.dataset.i, 1);
  localStorage.setItem("cabin-annivs", JSON.stringify(annivs));
  annivRender();
});
annivRender();

/* ---------- 作息表 ---------- */
let sched = JSON.parse(localStorage.getItem("cabin-sched") || "[]");
function schedRender() {
  sched.sort((a, b) => a.time.localeCompare(b.time));
  $("schedList").innerHTML = sched.map((s, i) => `
    <li class="sched-item ${s.done ? "done" : ""}">
      <span class="sched-time">${s.time}</span>
      <span class="sched-name">${s.name}</span>
      <button class="sched-check" data-c="${i}">✔</button>
      <button class="sched-del" data-d="${i}">✕</button>
    </li>`).join("");
}
$("sAdd").addEventListener("click", () => {
  const name = $("sName").value.trim(), time = $("sTime").value;
  if (!name || !time) return;
  sched.push({ time, name, done: false });
  localStorage.setItem("cabin-sched", JSON.stringify(sched));
  $("sName").value = "";
  schedRender();
});
$("schedList").addEventListener("click", (e) => {
  const c = e.target.closest(".sched-check"), d = e.target.closest(".sched-del");
  if (c) { sched[+c.dataset.c].done = !sched[+c.dataset.c].done; }
  if (d) { sched.splice(+d.dataset.d, 1); }
  if (c || d) { localStorage.setItem("cabin-sched", JSON.stringify(sched)); schedRender(); }
});
schedRender();
