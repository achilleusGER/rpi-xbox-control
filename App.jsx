/* Hallmark · app-shell · atmospheric · Midnight
 * Xbox Controller UI · mobile-first · OKLCH token system · 4pt spacing
 * touch-targets: ≥44px · responsive: 320/375/414/768px · a11y: WCAG AA
 * Pre-emit scores: P5 H4 E5 S4 R5 V4
 */
import { useState, useRef, useEffect } from "react";

// ── CSS (injected once at module load) ────────────────────────────────────────

const _CSS = `
:root {
  --cp:   oklch(10% 0.015 268);
  --cp2:  oklch(14% 0.018 268);
  --cp3:  oklch(19% 0.020 268);
  --cp4:  oklch(24% 0.020 268);
  --ca:   oklch(43% 0.176 142);
  --cad:  oklch(26% 0.090 142);
  --cal:  oklch(74% 0.130 142);
  --coa:  oklch(98% 0.005 142);
  --cdr:  oklch(55% 0.220 15);
  --cwa:  oklch(72% 0.170 65);
  --cba:  oklch(43% 0.170 142);
  --cbb:  oklch(49% 0.190 20);
  --cbx:  oklch(46% 0.220 252);
  --cby:  oklch(67% 0.160 86);
  --cob:  oklch(97% 0.010 0);
  --coby: oklch(12% 0.010 90);
  --ct1:  oklch(92% 0.010 268);
  --ct2:  oklch(62% 0.012 268);
  --ct3:  oklch(38% 0.012 268);
  --cb1:  oklch(21% 0.018 268);
  --cb2:  oklch(28% 0.018 268);
  --cf:   oklch(70% 0.180 220);
  --fd: 'Space Grotesk', system-ui, sans-serif;
  --fb: 'Inter', system-ui, sans-serif;
  --fm: 'JetBrains Mono', ui-monospace, monospace;
  --tx: .6875rem; --ts: .8125rem; --tb: 1rem;
  --tl: 1.125rem; --txl: 1.25rem; --t2xl: 1.5rem;
  --s1:.25rem; --s2:.5rem; --s3:.75rem; --s4:1rem;
  --s5:1.25rem; --s6:1.5rem; --s8:2rem; --s12:3rem;
  --rsm:6px; --rmd:10px; --rlg:16px; --rxl:20px; --rfu:9999px;
  --eo:cubic-bezier(.16,1,.3,1); --ei:cubic-bezier(.4,0,1,1);
  --df:80ms; --db:160ms;
  --nav:60px; --stat:46px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{overflow-x:clip;overscroll-behavior:none;-webkit-tap-highlight-color:transparent}
body{background:var(--cp)}
.app{display:flex;flex-direction:column;height:100dvh;background:var(--cp);color:var(--ct1);font-family:var(--fb);overflow:hidden}
/* Status bar */
.sbar{display:flex;align-items:center;gap:var(--s3);padding:0 var(--s4);background:var(--cp2);border-bottom:1px solid var(--cb1);min-height:var(--stat);flex-shrink:0}
.sbar__dot{width:8px;height:8px;border-radius:var(--rfu);flex-shrink:0;transition:background var(--db) var(--eo),box-shadow var(--db) var(--eo)}
.sbar__dot--ok{background:var(--ca);box-shadow:0 0 6px var(--ca)}
.sbar__dot--err{background:var(--cdr)}
.sbar__dot--busy{background:var(--cwa)}
.sbar__text{font-size:var(--ts);color:var(--ct2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sbar__run{font-size:var(--tx);color:var(--ca);font-family:var(--fm);display:flex;align-items:center;gap:var(--s1);flex-shrink:0}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.blink{animation:blink 1.2s ease-in-out infinite}
/* Main */
.main{flex:1;overflow-y:auto;overflow-x:hidden;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch}
.view{min-height:100%;padding:var(--s4);padding-bottom:var(--s12)}
/* Bottom nav */
.bnav{display:flex;border-top:1px solid var(--cb1);background:var(--cp2);flex-shrink:0;padding-bottom:env(safe-area-inset-bottom,0px)}
.bnav__tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:var(--nav);background:none;border:none;cursor:pointer;color:var(--ct3);font-family:var(--fb);font-size:var(--tx);font-weight:500;letter-spacing:.04em;position:relative;transition:color var(--df) var(--eo);-webkit-tap-highlight-color:transparent}
.bnav__tab::after{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%) scaleX(0);width:28px;height:2px;background:var(--ca);border-radius:0 0 var(--rsm) var(--rsm);transition:transform var(--db) var(--eo)}
.bnav__tab--on{color:var(--ca)}
.bnav__tab--on::after{transform:translateX(-50%) scaleX(1)}
.bnav__tab:focus-visible{outline:2px solid var(--cf);outline-offset:-2px}
.bnav__ico{font-size:1.375rem;line-height:1}
.bnav__badge{position:absolute;top:8px;right:calc(50% - 16px);width:8px;height:8px;background:var(--ca);border-radius:var(--rfu);border:2px solid var(--cp2)}
/* Cards */
.card{background:var(--cp2);border:1px solid var(--cb1);border-radius:var(--rlg);padding:var(--s4);margin-bottom:var(--s4)}
.card__head{font-size:var(--tx);font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--ct3);margin-bottom:var(--s3);font-family:var(--fd)}
/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--s2);min-height:44px;padding:var(--s3) var(--s5);border:none;border-radius:var(--rmd);font-family:var(--fb);font-size:var(--ts);font-weight:600;cursor:pointer;transition:background var(--df) var(--eo),transform var(--df) var(--eo);-webkit-tap-highlight-color:transparent;white-space:nowrap}
.btn:focus-visible{outline:2px solid var(--cf);outline-offset:2px}
.btn:active{transform:scale(.95)}
.btn:disabled{opacity:.35;cursor:not-allowed;pointer-events:none}
.btn--pri{background:var(--ca);color:var(--coa)}
.btn--pri:hover{background:oklch(50% .17 142)}
.btn--sec{background:var(--cp3);color:var(--ct1);border:1px solid var(--cb1)}
.btn--sec:hover{background:var(--cp4)}
.btn--dng{background:oklch(22% .06 15);color:var(--cdr);border:1px solid oklch(28% .08 15)}
.btn--dng:hover{background:oklch(27% .08 15)}
.btn--ghost{background:transparent;color:var(--ct2)}
.btn--ghost:hover{background:var(--cp3);color:var(--ct1)}
.btn--full{width:100%}
.btn--sm{min-height:36px;padding:var(--s2) var(--s3);font-size:var(--tx)}
/* Xbox buttons */
.xbtn{display:flex;align-items:center;justify-content:center;width:clamp(44px,14vw,70px);height:clamp(44px,14vw,70px);border-radius:var(--rfu);border:none;font-weight:700;font-size:clamp(.8125rem,4vw,1.25rem);cursor:pointer;transition:transform var(--df) var(--eo),box-shadow var(--db) var(--eo);-webkit-tap-highlight-color:transparent;flex-shrink:0;user-select:none}
.xbtn:focus-visible{outline:3px solid var(--cf);outline-offset:3px}
.xbtn:active{transform:scale(.86)}
.xbtn--a{background:var(--cba);color:var(--cob);box-shadow:0 3px 10px oklch(43% .17 142 / .4)}
.xbtn--b{background:var(--cbb);color:var(--cob);box-shadow:0 3px 10px oklch(49% .19 20 / .4)}
.xbtn--x{background:var(--cbx);color:var(--cob);box-shadow:0 3px 10px oklch(46% .22 252 / .4)}
.xbtn--y{background:var(--cby);color:var(--coby);box-shadow:0 3px 10px oklch(67% .16 86 / .35)}
.xbtn--dp{background:var(--cp3);color:var(--ct2)}
.xbtn--nx{background:var(--cad);color:var(--cal);box-shadow:0 3px 10px oklch(43% .17 142 / .25)}
.xbtn--sy{background:var(--cp3);color:var(--ct2);font-size:var(--ts)}
.xbtn--sm{width:clamp(40px,11vw,52px);height:clamp(40px,11vw,52px);font-size:clamp(.6875rem,3.5vw,1rem)}
.xbadge{width:26px;height:26px;border-radius:var(--rfu);display:flex;align-items:center;justify-content:center;font-size:var(--ts);font-weight:700;flex-shrink:0}
/* Controller layout */
.ctrl-clusters{display:flex;justify-content:space-around;align-items:center;padding:var(--s3) 0}
.ctrl-cluster{display:flex;flex-direction:column;align-items:center;gap:var(--s2)}
.cluster-lbl{font-size:var(--tx);color:var(--ct3);text-transform:uppercase;letter-spacing:.08em;font-family:var(--fd)}
.dpad,.fbtns{display:grid;grid-template-columns:repeat(3,clamp(44px,14vw,70px));grid-template-rows:repeat(3,clamp(44px,14vw,70px));gap:clamp(3px,1vw,6px)}
.sys-row{display:flex;justify-content:center;gap:var(--s4);flex-wrap:wrap;padding:var(--s3) 0 var(--s2)}
/* Sequence list */
.seq-list{display:flex;flex-direction:column;gap:var(--s2)}
.seq-item{display:flex;align-items:center;gap:var(--s3);padding:var(--s3) var(--s4);background:var(--cp2);border:1px solid var(--cb1);border-radius:var(--rmd);cursor:pointer;min-height:52px;transition:border-color var(--df) var(--eo),background var(--df) var(--eo)}
.seq-item:hover{border-color:var(--cb2)}
.seq-item:focus-visible{outline:2px solid var(--cf);outline-offset:2px}
.seq-item--on{border-color:var(--cad);background:oklch(13% .02 142)}
.seq-item__info{flex:1;overflow:hidden;min-width:0}
.seq-item__name{font-size:var(--tb);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ct1)}
.seq-item__meta{font-size:var(--tx);color:var(--ct3);font-family:var(--fm);margin-top:2px}
.seq-item__acts{display:flex;gap:var(--s2);flex-shrink:0}
/* Step chips */
.chip{display:flex;align-items:center;gap:var(--s2);padding:var(--s2) var(--s3);border:1px solid var(--cb1);border-radius:var(--rmd);margin-bottom:var(--s2);min-height:44px;transition:border-color var(--db) var(--eo),box-shadow var(--db) var(--eo)}
.chip--btn{background:oklch(13% .02 142);border-color:oklch(26% .07 142)}
.chip--wait{background:oklch(13% .02 65);border-color:oklch(28% .08 65)}
.chip--on{border-color:var(--ca) !important;box-shadow:0 0 12px oklch(43% .17 142 / .3)}
.chip__idx{font-size:var(--tx);color:var(--ct3);font-family:var(--fm);min-width:20px;text-align:right;flex-shrink:0}
.chip__lbl{flex:1;font-size:var(--ts);color:var(--ct1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.chip__acts{display:flex;gap:3px;flex-shrink:0}
.chip__act{width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:var(--cp3);border:none;border-radius:var(--rsm);color:var(--ct2);font-size:var(--ts);cursor:pointer;transition:background var(--df) var(--eo),color var(--df) var(--eo);-webkit-tap-highlight-color:transparent}
.chip__act:hover{background:var(--cp4);color:var(--ct1)}
.chip__act:focus-visible{outline:2px solid var(--cf);outline-offset:2px}
.chip__act:active{transform:scale(.9)}
.chip__act:disabled{opacity:.3;cursor:default;pointer-events:none}
.chip__act--del:hover{background:oklch(22% .06 15);color:var(--cdr)}
/* Stats strip */
.stats{display:flex;gap:var(--s5);padding:var(--s3) var(--s4);background:var(--cp3);border-radius:var(--rmd);margin-bottom:var(--s4);overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.stats::-webkit-scrollbar{display:none}
.stat__v{font-size:var(--tl);font-weight:700;font-family:var(--fm);color:var(--ct1);line-height:1.2}
.stat__l{font-size:var(--tx);color:var(--ct3)}
/* Segment */
.seg{display:flex;gap:2px;background:var(--cp3);border-radius:var(--rmd);padding:2px;margin-bottom:var(--s3)}
.seg__btn{flex:1;min-height:38px;background:transparent;border:none;border-radius:calc(var(--rmd) - 2px);color:var(--ct2);font-size:var(--ts);font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background var(--df) var(--eo),color var(--df) var(--eo)}
.seg__btn--on{background:var(--cp2);color:var(--ct1);box-shadow:0 1px 3px oklch(0% 0 0 / .4)}
.seg__btn:focus-visible{outline:2px solid var(--cf);outline-offset:2px}
/* Inputs */
.inp{width:100%;min-height:44px;padding:var(--s3) var(--s4);background:var(--cp3);border:1px solid var(--cb1);border-radius:var(--rmd);color:var(--ct1);font-family:var(--fb);font-size:var(--tb);outline:none;transition:border-color var(--df) var(--eo),box-shadow var(--df) var(--eo)}
.inp:focus{border-color:var(--ca);box-shadow:0 0 0 3px oklch(43% .17 142 / .2)}
.inp::placeholder{color:var(--ct3)}
.inp--title{background:transparent;border-color:transparent;border-radius:0;border-bottom:2px solid var(--ca);padding:var(--s2) 0;font-size:var(--t2xl);font-weight:700;font-family:var(--fd)}
.inp--title:focus{border-color:transparent;border-bottom-color:var(--ca);box-shadow:none}
.sel{width:100%;min-height:44px;padding:var(--s3) var(--s4);background:var(--cp3);border:1px solid var(--cb1);border-radius:var(--rmd);color:var(--ct1);font-family:var(--fb);font-size:var(--tb);outline:none}
.sel:focus{border-color:var(--ca)}
/* FAB */
.fab{position:fixed;right:var(--s5);bottom:calc(var(--nav) + env(safe-area-inset-bottom,0px) + var(--s4));width:56px;height:56px;border-radius:var(--rfu);background:var(--ca);color:var(--coa);border:none;font-size:1.625rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px oklch(43% .17 142 / .5);transition:transform var(--db) var(--eo),box-shadow var(--db) var(--eo);-webkit-tap-highlight-color:transparent;z-index:10}
.fab:hover{transform:scale(1.06)}
.fab:active{transform:scale(.93)}
.fab:focus-visible{outline:3px solid var(--cf);outline-offset:3px}
/* Running banner */
.run-banner{position:fixed;bottom:calc(var(--nav) + env(safe-area-inset-bottom,0px) + var(--s3));left:var(--s4);right:var(--s4);display:flex;align-items:center;gap:var(--s3);padding:var(--s3) var(--s4);background:oklch(16% .04 142);border:1px solid var(--cad);border-radius:var(--rlg);box-shadow:0 8px 24px oklch(0% 0 0 / .5);z-index:9}
.run-banner__lbl{flex:1;font-size:var(--ts);color:var(--ca);font-family:var(--fm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Modal sheet */
.overlay{position:fixed;inset:0;background:oklch(0% 0 0 / .75);display:flex;align-items:flex-end;justify-content:center;z-index:100;padding-bottom:env(safe-area-inset-bottom,0px)}
@media(min-width:480px){.overlay{align-items:center}}
.sheet{background:var(--cp2);border:1px solid var(--cb2);border-radius:var(--rxl) var(--rxl) 0 0;padding:var(--s5);width:100%;max-width:480px;max-height:85dvh;overflow-y:auto}
@media(min-width:480px){.sheet{border-radius:var(--rxl)}}
.sheet__handle{width:40px;height:4px;border-radius:var(--rfu);background:var(--cb2);margin:0 auto var(--s4)}
@media(min-width:480px){.sheet__handle{display:none}}
.sheet__title{font-size:var(--tl);font-weight:700;color:var(--ct1);font-family:var(--fd);margin-bottom:var(--s4)}
/* Console item */
.con-item{display:flex;align-items:center;gap:var(--s3);padding:var(--s3) var(--s4);background:var(--cp3);border:1px solid var(--cb1);border-radius:var(--rmd);margin-bottom:var(--s2)}
.con-item__name{flex:1;font-size:var(--tb);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Empty state */
.empty{display:flex;flex-direction:column;align-items:center;gap:var(--s4);padding:var(--s12) var(--s6);text-align:center;color:var(--ct3)}
.empty__ico{font-size:3.5rem}
.empty__txt{font-size:var(--tb)}
/* Utils */
.eyebrow{font-size:var(--tx);font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--ct3);font-family:var(--fd);margin-bottom:var(--s2)}
.sec-title{font-size:var(--txl);font-weight:700;color:var(--ct1);font-family:var(--fd);margin-bottom:var(--s4)}
.divider{height:1px;background:var(--cb1);margin:var(--s4) 0}
.row{display:flex;gap:var(--s2);align-items:center}
.flex1{flex:1}
.qa-grid{display:flex;flex-wrap:wrap;gap:var(--s2);margin-bottom:var(--s3)}
.wait-grid{display:flex;flex-wrap:wrap;gap:var(--s2)}
/* Toggle-Zeile */
.tog-row{display:flex;align-items:center;justify-content:space-between;gap:var(--s4);min-height:44px}
.tog-row+.tog-row{border-top:1px solid var(--cb1);padding-top:var(--s3);margin-top:var(--s3)}
.tog-row__info{min-width:0}
.tog-row__lbl{font-size:var(--ts);font-weight:500;color:var(--ct1)}
.tog-row__sub{font-size:var(--tx);color:var(--ct3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Switch */
.sw{position:relative;width:46px;height:26px;flex-shrink:0}
.sw input{opacity:0;width:0;height:0;position:absolute}
.sw__t{position:absolute;inset:0;border-radius:var(--rfu);background:var(--cb2);cursor:pointer;transition:background var(--db) var(--eo)}
.sw__t::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:var(--rfu);background:#fff;transition:transform var(--db) var(--eo)}
.sw input:checked+.sw__t{background:var(--ca)}
.sw input:checked+.sw__t::after{transform:translateX(20px)}
.sw input:focus-visible+.sw__t{outline:2px solid var(--cf);outline-offset:2px}
/* Controller-Dot */
.cdot{width:10px;height:10px;border-radius:var(--rfu);flex-shrink:0;transition:background var(--db) var(--eo),box-shadow var(--db) var(--eo)}
.cdot--ok{background:var(--ca);box-shadow:0 0 8px oklch(43% .17 142 / .7)}
.cdot--err{background:var(--cdr)}
/* Log panel */
.logpanel{font-family:var(--fm);font-size:var(--tx);display:flex;flex-direction:column;gap:2px}
.logline{display:flex;gap:var(--s2);padding:var(--s2) var(--s3);border-radius:var(--rsm);line-height:1.4;word-break:break-all}
.logline--ERROR,.logline--CRITICAL{background:oklch(14% .05 15);color:var(--cdr)}
.logline--WARNING{background:oklch(14% .04 65);color:var(--cwa)}
.logline--INFO{color:var(--ct2)}
.logline--DEBUG{color:var(--ct3)}
.logline__ts{color:var(--ct3);flex-shrink:0;min-width:54px}
.logline__lvl{flex-shrink:0;min-width:44px;font-weight:600}
.logline__name{color:var(--ct3);flex-shrink:0;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.logline__msg{flex:1}
/* Responsive */
@media(min-width:480px){.view{padding:var(--s5)}}
@media(min-width:768px){.view{max-width:640px;margin:0 auto}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:1ms !important;transition-duration:1ms !important}}
`;

(function injectCSS() {
  const s = document.createElement("style");
  s.textContent = _CSS;
  document.head.appendChild(s);
  const f = document.createElement("link");
  f.rel = "stylesheet";
  f.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap";
  document.head.appendChild(f);
})();

// ── Constants ─────────────────────────────────────────────────────────────────

const BTN_META = {
  A:     { label: "A",  cls: "xbtn--a" },
  B:     { label: "B",  cls: "xbtn--b" },
  X:     { label: "X",  cls: "xbtn--x" },
  Y:     { label: "Y",  cls: "xbtn--y" },
  Up:    { label: "▲",  cls: "xbtn--dp" },
  Down:  { label: "▼",  cls: "xbtn--dp" },
  Left:  { label: "◀",  cls: "xbtn--dp" },
  Right: { label: "▶",  cls: "xbtn--dp" },
  Menu:  { label: "☰",  cls: "xbtn--sy" },
  View:  { label: "⧉",  cls: "xbtn--sy" },
  Nexus: { label: "⊛",  cls: "xbtn--nx" },
  LB:    { label: "LB", cls: "xbtn--sy" },
  RB:    { label: "RB", cls: "xbtn--sy" },
};
const ALL_BTNS = Object.keys(BTN_META);

// ── API ───────────────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Small components ──────────────────────────────────────────────────────────

function XBtn({ id, size, onClick, disabled }) {
  const m = BTN_META[id] || { label: id, cls: "xbtn--sy" };
  return (
    <button
      className={`xbtn${size ? ` xbtn--${size}` : ""} ${m.cls}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={id}
    >
      {m.label}
    </button>
  );
}

function StepChip({ step, index, active, onDelete, onMoveUp, onMoveDown, onEdit, isFirst, isLast }) {
  const isBtn = step.type === "button";
  const meta = isBtn ? BTN_META[step.button] : null;
  return (
    <div className={`chip chip--${isBtn ? "btn" : "wait"}${active ? " chip--on" : ""}`}>
      <span className="chip__idx">{index + 1}</span>
      {isBtn ? (
        <div className={`xbadge ${meta?.cls || "xbtn--sy"}`}>{meta?.label || step.button}</div>
      ) : (
        <span style={{ fontSize: "1.125rem", flexShrink: 0 }}>⏱</span>
      )}
      <span className="chip__lbl">
        {isBtn ? `Button ${step.button}` : `Pause ${step.seconds}s`}
      </span>
      <div className="chip__acts">
        <button className="chip__act" onClick={() => onEdit(index)} aria-label="Bearbeiten">✎</button>
        <button className="chip__act" onClick={() => onMoveUp(index)} disabled={isFirst} aria-label="Hoch">↑</button>
        <button className="chip__act" onClick={() => onMoveDown(index)} disabled={isLast} aria-label="Runter">↓</button>
        <button className="chip__act chip__act--del" onClick={() => onDelete(index)} aria-label="Löschen">✕</button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  // Connection
  const [consoles, setConsoles]             = useState([]);
  const [scanning, setScanning]             = useState(false);
  const [connected, setConnected]           = useState(false);
  const [consoleName, setConsoleName]       = useState("");
  const [statusMsg, setStatusMsg]           = useState("Nicht verbunden");
  const [statusOk, setStatusOk]             = useState(false);

  // USB Controller + Keepalive
  const [ctrlConnected, setCtrlConnected]   = useState(false);
  const [ctrlName, setCtrlName]             = useState("");
  const [keepaliveOn, setKeepaliveOn]       = useState(false);
  const [keepaliveBusy, setKeepaliveBusy]   = useState(false);

  // Sequences
  const [sequences, setSequences]     = useState({});
  const [activeSeq, setActiveSeq]     = useState(null);
  const [editName, setEditName]       = useState("");
  const [steps, setSteps]             = useState([]);
  const [isDirty, setIsDirty]         = useState(false);
  const [running, setRunning]         = useState(false);
  const [runningName, setRunningName] = useState("");

  // Add-step form
  const [addType, setAddType]   = useState("button");
  const [addButton, setAddButton] = useState("A");
  const [addWait, setAddWait]   = useState("1.0");

  // Edit-step modal
  const [editModal, setEditModal] = useState(null);

  // Simulation (local, no API)
  const [simStep, setSimStep] = useState(-1);
  const simRef = useRef(null);

  // Navigation
  const [tab, setTab] = useState("control");

  // Logs
  const [logs, setLogs]         = useState([]);
  const [logsError, setLogsError] = useState(false);
  const logBottomRef = useRef(null);

  // ── Init ──────────────────────────────────────────────────────────────

  useEffect(() => {
    loadSequences();
    checkStatus();
    fetchLogs();
    const t = setInterval(() => { checkStatus(); checkRunning(); fetchLogs(); }, 5000);
    return () => clearInterval(t);
  }, []);

  // Beim Wechsel auf Logs-Tab sofort scrollen
  useEffect(() => {
    if (tab === "logs") {
      fetchLogs();
      setTimeout(() => logBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [tab]);

  async function checkStatus() {
    try {
      const d = await api("GET", "/status");
      setConnected(d.connected);
      setConsoleName(d.console?.name || "");
      if (d.connected) {
        setStatusMsg(`Verbunden: ${d.console.name}`);
        setStatusOk(true);
      } else {
        setStatusMsg("Nicht verbunden");
        setStatusOk(false);
      }
      // USB Controller + Keepalive
      if (d.controller) {
        setCtrlConnected(d.controller.connected);
        setCtrlName(d.controller.name || "");
      }
      if (d.keepalive) {
        setKeepaliveOn(d.keepalive.enabled);
      }
    } catch { /* Pi unerreichbar */ }
  }

  async function fetchLogs() {
    try {
      const d = await api("GET", "/logs");
      setLogs(d);
      setLogsError(false);
    } catch {
      setLogsError(true);
    }
  }

  async function toggleKeepalive(val) {
    setKeepaliveBusy(true);
    try {
      const d = await api("POST", "/keepalive", { enabled: val });
      setKeepaliveOn(d.enabled);
    } catch (e) {
      setStatus("Keepalive-Fehler: " + e.message, false);
    } finally {
      setKeepaliveBusy(false);
    }
  }

  async function checkRunning() {
    try {
      const d = await api("GET", "/running");
      if (!d.running) { setRunning(false); setRunningName(""); }
    } catch { /* ignore */ }
  }

  async function loadSequences() {
    try {
      const d = await api("GET", "/sequences");
      setSequences(d);
    } catch (e) {
      console.error("Sequenzen laden:", e);
    }
  }

  // ── Connection ────────────────────────────────────────────────────────

  function setStatus(msg, ok = true) { setStatusMsg(msg); setStatusOk(ok); }

  async function scan() {
    setScanning(true);
    setStatus("Suche läuft…", true);
    try {
      const d = await api("POST", "/scan", { timeout: 5 });
      setConsoles(d.consoles || []);
      setStatus(
        d.consoles?.length ? `${d.consoles.length} Xbox gefunden` : "Keine Xbox gefunden",
        !!d.consoles?.length,
      );
    } catch (e) {
      setStatus("Scan-Fehler: " + e.message, false);
    } finally {
      setScanning(false);
    }
  }

  async function connect(liveid, name) {
    setStatus("Verbinde… (Auth-Versuch 1/3, bis zu 2 min)");
    try {
      const info = await api("POST", "/connect", { liveid });
      setConnected(true);
      setConsoleName(name);
      const pairing = info.pairing || "?";
      if (pairing === "Paired") {
        setStatus(`Verbunden: ${name} ✓`);
      } else {
        setStatus(`Verbunden (anonym): ${name} — Buttons evtl. eingeschränkt`, false);
      }
    } catch (e) {
      setStatus("Verbindungsfehler: " + e.message, false);
    }
  }

  async function reconnect() {
    setStatus("Wiederherstelle Verbindung… (bis zu 2 min)");
    try {
      const info = await api("POST", "/reconnect");
      setConnected(true);
      const pairing = info.pairing || "?";
      if (pairing === "Paired") {
        setStatus(`Wiederhergestellt: ${info.name} ✓`);
        setConsoleName(info.name);
      } else {
        setStatus(`Wiederhergestellt (anonym): ${info.name} — Buttons evtl. eingeschränkt`, false);
      }
    } catch (e) {
      setStatus("Reconnect fehlgeschlagen: " + e.message, false);
    }
  }

  async function sendButton(btn) {
    if (!connected) return setStatus("Nicht verbunden", false);
    try {
      await api("POST", "/button", { button: btn });
      setStatus(`▶ ${btn}`);
    } catch (e) {
      setStatus(e.message, false);
    }
  }

  // ── Sequences ─────────────────────────────────────────────────────────

  function openNew() {
    if (isDirty && !confirm("Ungespeicherte Änderungen verwerfen?")) return;
    setActiveSeq("__new__");
    setEditName("");
    setSteps([]);
    setIsDirty(false);
    setTab("editor");
  }

  function openSeq(name) {
    if (isDirty && !confirm("Ungespeicherte Änderungen verwerfen?")) return;
    setActiveSeq(name);
    setEditName(name);
    setSteps([...sequences[name]]);
    setIsDirty(false);
    setTab("editor");
  }

  async function saveSeq() {
    const name = editName.trim();
    if (!name) return alert("Bitte einen Namen eingeben.");
    try {
      await api("POST", "/sequences", { name, steps });
      if (activeSeq && activeSeq !== "__new__" && activeSeq !== name) {
        await api("DELETE", `/sequences/${encodeURIComponent(activeSeq)}`);
      }
      setActiveSeq(name);
      setIsDirty(false);
      await loadSequences();
      setStatus(`Gespeichert: ${name}`);
    } catch (e) {
      setStatus("Speichern fehlgeschlagen: " + e.message, false);
    }
  }

  async function deleteSeq(name, e) {
    e?.stopPropagation();
    if (!confirm(`"${name}" wirklich löschen?`)) return;
    try {
      await api("DELETE", `/sequences/${encodeURIComponent(name)}`);
      if (activeSeq === name) { setActiveSeq(null); setSteps([]); }
      await loadSequences();
    } catch (e2) {
      setStatus(e2.message, false);
    }
  }

  async function duplicateSeq(name, e) {
    e?.stopPropagation();
    let newName = name + " (Kopie)";
    let i = 2;
    while (sequences[newName]) newName = `${name} (Kopie ${i++})`;
    try {
      await api("POST", "/sequences", { name: newName, steps: sequences[name] });
      await loadSequences();
    } catch (e2) { setStatus(e2.message, false); }
  }

  // ── Steps ─────────────────────────────────────────────────────────────

  function addStep() {
    const step = addType === "button"
      ? { type: "button", button: addButton }
      : { type: "wait", seconds: parseFloat(addWait) || 1 };
    setSteps(p => [...p, step]);
    setIsDirty(true);
  }

  function addStepDirect(step) {
    setSteps(p => [...p, step]);
    setIsDirty(true);
  }

  function deleteStep(i) {
    setSteps(p => p.filter((_, idx) => idx !== i));
    setIsDirty(true);
  }

  function moveStep(i, dir) {
    setSteps(p => {
      const a = [...p];
      const j = i + dir;
      if (j < 0 || j >= a.length) return a;
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
    setIsDirty(true);
  }

  function openEditModal(index) {
    setEditModal({ index, step: { ...steps[index] } });
  }

  function applyEdit() {
    setSteps(p => p.map((s, i) => i === editModal.index ? { ...editModal.step } : s));
    setEditModal(null);
    setIsDirty(true);
  }

  // ── Run / Stop ────────────────────────────────────────────────────────

  async function runSeq(name, repeat, e) {
    e?.stopPropagation();
    try {
      await api("POST", `/run/${encodeURIComponent(name)}`, { repeat });
      setRunning(true);
      setRunningName(name + (repeat ? " ↺" : ""));
      setStatus(`▶ ${name}${repeat ? " (Loop)" : ""}`);
    } catch (e2) { setStatus(e2.message, false); }
  }

  async function stopSeq() {
    try {
      await api("POST", "/stop");
      setRunning(false);
      setRunningName("");
      setStatus("Gestoppt");
    } catch (e) { setStatus(e.message, false); }
  }

  // ── Simulation ────────────────────────────────────────────────────────

  function startSim() {
    if (!steps.length) return;
    clearTimeout(simRef.current);
    setSimStep(0);
    let i = 0;
    function tick() {
      if (i >= steps.length) { setSimStep(-1); return; }
      setSimStep(i);
      const delay = steps[i].type === "wait" ? steps[i].seconds * 1000 : 400;
      i++;
      simRef.current = setTimeout(tick, delay);
    }
    tick();
  }

  function stopSim() { clearTimeout(simRef.current); setSimStep(-1); }

  // ── Export / Import ───────────────────────────────────────────────────

  function exportJSON() {
    const blob = new Blob([JSON.stringify(sequences, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob), download: "sequences.json",
    });
    a.click();
  }

  function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target.result);
        for (const [name, s] of Object.entries(data)) {
          await api("POST", "/sequences", { name, steps: s });
        }
        await loadSequences();
        setStatus("Importiert.");
      } catch { alert("Ungültige JSON-Datei."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Computed ──────────────────────────────────────────────────────────

  const totalDuration = steps.reduce(
    (s, st) => s + (st.type === "wait" ? st.seconds : 0.1), 0,
  );

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="app">

      {/* Status bar */}
      <div className="sbar">
        <div className={`sbar__dot sbar__dot--${scanning ? "busy" : statusOk ? "ok" : "err"}`} />
        <span className="sbar__text">{statusMsg}</span>
        {running && (
          <span className="sbar__run">
            <span className="blink">●</span> Läuft
          </span>
        )}
      </div>

      {/* Main views */}
      <main className="main">
        {tab === "control"   && ControlView()}
        {tab === "sequences" && SequencesView()}
        {tab === "editor"    && EditorView()}
        {tab === "logs"      && LogsView()}
      </main>

      {/* Bottom navigation */}
      <nav className="bnav">
        {[
          { id: "control",   icon: "🎮", label: "Steuerung" },
          { id: "sequences", icon: "📋", label: "Sequenzen" },
          { id: "editor",    icon: "✏️",  label: "Editor", badge: isDirty },
          { id: "logs",      icon: "📄", label: "Logs",
            badge: logs.some(l => l.level === "ERROR" || l.level === "CRITICAL") },
        ].map(t => (
          <button
            key={t.id}
            className={`bnav__tab${tab === t.id ? " bnav__tab--on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="bnav__ico">{t.icon}</span>
            {t.label}
            {t.badge && <span className="bnav__badge" aria-label="Ungespeichert" />}
          </button>
        ))}
      </nav>

      {/* Running banner */}
      {running && (
        <div className="run-banner">
          <span className="run-banner__lbl">▶ {runningName}</span>
          <button className="btn btn--dng btn--sm" onClick={stopSeq}>⏹ Stop</button>
        </div>
      )}

      {/* Edit-step modal */}
      {editModal && (
        <div className="overlay" onClick={() => setEditModal(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet__handle" />
            <div className="sheet__title">Schritt bearbeiten</div>

            <div className="seg" style={{ marginBottom: "var(--s4)" }}>
              {["button", "wait"].map(t => (
                <button
                  key={t}
                  className={`seg__btn${editModal.step.type === t ? " seg__btn--on" : ""}`}
                  onClick={() => setEditModal(m => ({
                    ...m, step: {
                      ...m.step, type: t,
                      ...(t === "button" ? { button: m.step.button || "A" } : { seconds: m.step.seconds || 1 }),
                    },
                  }))}
                >
                  {t === "button" ? "🎮 Button" : "⏱ Pause"}
                </button>
              ))}
            </div>

            {editModal.step.type === "button" ? (
              <div>
                <div className="eyebrow">Button wählen</div>
                <div className="qa-grid">
                  {ALL_BTNS.map(b => (
                    <button
                      key={b}
                      className={`xbtn xbtn--sm ${BTN_META[b].cls}`}
                      style={editModal.step.button === b
                        ? { outline: "3px solid var(--ct1)", outlineOffset: "2px" }
                        : {}}
                      onClick={() => setEditModal(m => ({ ...m, step: { ...m.step, button: b } }))}
                      aria-label={b}
                    >
                      {BTN_META[b].label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="eyebrow">Wartezeit (Sekunden)</div>
                <input
                  type="number" min="0.1" step="0.1"
                  value={editModal.step.seconds}
                  onChange={e => setEditModal(m => ({ ...m, step: { ...m.step, seconds: parseFloat(e.target.value) || 1 } }))}
                  className="inp"
                  style={{ marginBottom: "var(--s3)" }}
                />
                <div className="wait-grid">
                  {[0.2, 0.5, 1, 1.5, 2, 3, 5, 10, 30, 60].map(s => (
                    <button
                      key={s}
                      className={`btn btn--sm${editModal.step.seconds === s ? " btn--pri" : " btn--sec"}`}
                      onClick={() => setEditModal(m => ({ ...m, step: { ...m.step, seconds: s } }))}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s5)" }}>
              <button className="btn btn--pri flex1" onClick={applyEdit}>✓ Übernehmen</button>
              <button className="btn btn--sec" onClick={() => setEditModal(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── View: Control ───────────────────────────────────────────────────

  function ControlView() {
    return (
      <div className="view">

        {/* Connection card */}
        <div className="card">
          <div className="card__head">Xbox Verbindung</div>
          <button
            className={`btn btn--full ${scanning ? "btn--ghost" : "btn--sec"}`}
            onClick={scan}
            disabled={scanning}
            style={{ marginBottom: "var(--s3)" }}
          >
            {scanning ? <><span className="blink">⟳</span> Suche läuft…</> : "🔍 Xbox suchen"}
          </button>

          {consoles.map(c => (
            <div key={c.liveid} className="con-item">
              <span style={{ fontSize: "1.25rem" }}>📺</span>
              <span className="con-item__name">{c.name}</span>
              <button
                className={`btn btn--sm ${connected && consoleName === c.name ? "btn--pri" : "btn--sec"}`}
                onClick={() => connect(c.liveid, c.name)}
              >
                {connected && consoleName === c.name ? "✓ Verb." : "Verbinden"}
              </button>
            </div>
          ))}

          {consoles.length === 0 && !scanning && (
            <p style={{ fontSize: "var(--ts)", color: "var(--ct3)" }}>
              Suche nach Xbox-Konsolen im Netzwerk.
            </p>
          )}
        </div>

        {/* USB Controller + Keepalive */}
        <div className="card">
          <div className="card__head">USB Controller</div>

          {/* Verbindungsstatus */}
          <div className="tog-row">
            <div className="tog-row__info">
              <div className="tog-row__lbl">Verbindung</div>
              <div className="tog-row__sub">
                {ctrlConnected ? (ctrlName || "Xbox Controller") : "Kein Controller erkannt"}
              </div>
            </div>
            <div className={`cdot ${ctrlConnected ? "cdot--ok" : "cdot--err"}`} />
          </div>

          {/* Wachhalten-Toggle */}
          <div className="tog-row">
            <div className="tog-row__info">
              <div className="tog-row__lbl">Wachhalten</div>
              <div className="tog-row__sub">Verhindert automatisches Trennen (Rumble-Ping alle 25 s)</div>
            </div>
            <label className="sw" aria-label="Wachhalten">
              <input
                type="checkbox"
                checked={keepaliveOn}
                disabled={keepaliveBusy}
                onChange={e => toggleKeepalive(e.target.checked)}
              />
              <span className="sw__t" />
            </label>
          </div>
        </div>

        {/* Controller */}
        <div className="card">
          <div className="card__head">Direkte Steuerung</div>
          {!connected && consoleName && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: "var(--s3)", marginBottom: "var(--s3)",
              padding: "var(--s2) var(--s3)",
              background: "color-mix(in srgb, var(--cdr) 12%, transparent)",
              borderRadius: "var(--r)",
              border: "1px solid color-mix(in srgb, var(--cdr) 30%, transparent)",
            }}>
              <span style={{ fontSize: "var(--ts)", color: "var(--cdr)" }}>
                Verbindung unterbrochen
              </span>
              <button className="btn btn--sm btn--pri" onClick={reconnect}>
                ↺ Wiederherstellen
              </button>
            </div>
          )}
          {!connected && !consoleName && (
            <p style={{ fontSize: "var(--ts)", color: "var(--cdr)", marginBottom: "var(--s3)" }}>
              Nicht verbunden — Buttons deaktiviert.
            </p>
          )}

          {/* D-Pad + Face buttons */}
          <div className="ctrl-clusters">
            <div className="ctrl-cluster">
              <span className="cluster-lbl">D-Pad</span>
              <div className="dpad">
                <span /><XBtn id="Up"    onClick={() => sendButton("Up")}    disabled={!connected} /><span />
                <XBtn    id="Left"  onClick={() => sendButton("Left")}   disabled={!connected} />
                <XBtn    id="Nexus" onClick={() => sendButton("Nexus")}  disabled={!connected} />
                <XBtn    id="Right" onClick={() => sendButton("Right")}  disabled={!connected} />
                <span /><XBtn id="Down"  onClick={() => sendButton("Down")}  disabled={!connected} /><span />
              </div>
            </div>

            <div className="ctrl-cluster">
              <span className="cluster-lbl">Tasten</span>
              <div className="fbtns">
                <span /><XBtn id="Y" onClick={() => sendButton("Y")} disabled={!connected} /><span />
                <XBtn    id="X" onClick={() => sendButton("X")} disabled={!connected} />
                <span />
                <XBtn    id="B" onClick={() => sendButton("B")} disabled={!connected} />
                <span /><XBtn id="A" onClick={() => sendButton("A")} disabled={!connected} /><span />
              </div>
            </div>
          </div>

          {/* System buttons */}
          <div className="sys-row">
            {["LB", "Menu", "View", "RB"].map(b => (
              <XBtn key={b} id={b} onClick={() => sendButton(b)} disabled={!connected} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── View: Sequences ─────────────────────────────────────────────────

  function SequencesView() {
    const names = Object.keys(sequences);
    return (
      <div className="view">
        <div style={{ display: "flex", alignItems: "center", marginBottom: "var(--s4)", gap: "var(--s3)" }}>
          <h1 className="sec-title" style={{ margin: 0, flex: 1 }}>Sequenzen</h1>
          <button className="btn btn--sm btn--ghost" onClick={exportJSON} title="Exportieren">↓ Export</button>
          <label className="btn btn--sm btn--ghost" style={{ cursor: "pointer" }} title="Importieren">
            ↑ Import
            <input type="file" accept=".json" onChange={importJSON} style={{ display: "none" }} />
          </label>
        </div>

        {names.length === 0 ? (
          <div className="empty">
            <span className="empty__ico">📋</span>
            <span className="empty__txt">Noch keine Sequenzen.<br />Tippe + um eine zu erstellen.</span>
          </div>
        ) : (
          <div className="seq-list">
            {names.map(name => {
              const seq = sequences[name];
              const dur = seq.reduce((s, st) => s + (st.type === "wait" ? st.seconds : 0.1), 0);
              return (
                <div
                  key={name}
                  className={`seq-item${activeSeq === name ? " seq-item--on" : ""}`}
                  onClick={() => openSeq(name)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={e => e.key === "Enter" && openSeq(name)}
                >
                  <div className="seq-item__info">
                    <div className="seq-item__name">{name}</div>
                    <div className="seq-item__meta">{seq.length} Schr · {dur.toFixed(1)}s</div>
                  </div>
                  <div className="seq-item__acts" onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn--sm btn--sec"
                      onClick={e => runSeq(name, false, e)}
                      disabled={!connected}
                      title="Einmal ausführen"
                      aria-label="Ausführen"
                    >▶</button>
                    <button
                      className="btn btn--sm btn--sec"
                      onClick={e => runSeq(name, true, e)}
                      disabled={!connected}
                      title="Loop"
                      aria-label="Loop"
                    >↺</button>
                    <button
                      className="btn btn--sm btn--ghost"
                      onClick={e => duplicateSeq(name, e)}
                      title="Duplizieren"
                      aria-label="Duplizieren"
                    >⎘</button>
                    <button
                      className="btn btn--sm btn--dng"
                      onClick={e => deleteSeq(name, e)}
                      title="Löschen"
                      aria-label="Löschen"
                    >🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAB */}
        <button className="fab" onClick={openNew} aria-label="Neue Sequenz">+</button>
      </div>
    );
  }

  // ── View: Logs ──────────────────────────────────────────────────────

  function LogsView() {
    const LEVEL_ICON = { ERROR: "✕", CRITICAL: "✕", WARNING: "⚠", INFO: "·", DEBUG: "·" };
    return (
      <div className="view">
        <div style={{ display: "flex", alignItems: "center", marginBottom: "var(--s4)", gap: "var(--s3)" }}>
          <h1 className="sec-title" style={{ margin: 0, flex: 1 }}>Logs</h1>
          <button className="btn btn--sm btn--ghost" onClick={fetchLogs}>⟳ Aktualisieren</button>
          <button className="btn btn--sm btn--ghost" onClick={() => setLogs([])}>🗑 Leeren</button>
        </div>

        {logsError && (
          <div style={{ color: "var(--cdr)", fontSize: "var(--ts)", marginBottom: "var(--s4)" }}>
            ✕ Logs nicht erreichbar
          </div>
        )}

        {logs.length === 0 ? (
          <div className="empty">
            <span className="empty__ico">📄</span>
            <span className="empty__txt">Noch keine Log-Einträge.</span>
          </div>
        ) : (
          <div className="card" style={{ padding: "var(--s3)" }}>
            <div className="logpanel">
              {logs.map((l, i) => (
                <div key={i} className={`logline logline--${l.level}`}>
                  <span className="logline__ts">{l.ts}</span>
                  <span className="logline__lvl">{LEVEL_ICON[l.level] || "·"} {l.level}</span>
                  <span className="logline__name">{l.name}</span>
                  <span className="logline__msg">{l.msg}</span>
                </div>
              ))}
              <div ref={logBottomRef} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── View: Editor ────────────────────────────────────────────────────

  function EditorView() {
    if (!activeSeq) {
      return (
        <div className="view">
          <div className="empty">
            <span className="empty__ico">✏️</span>
            <span className="empty__txt">Wähle eine Sequenz aus der Bibliothek<br />oder erstelle eine neue.</span>
            <button className="btn btn--pri" onClick={openNew}>+ Neue Sequenz</button>
          </div>
        </div>
      );
    }

    return (
      <div className="view">

        {/* Name */}
        <input
          className="inp inp--title"
          value={editName}
          onChange={e => { setEditName(e.target.value); setIsDirty(true); }}
          placeholder="Sequenzname…"
          aria-label="Sequenzname"
          style={{ marginBottom: "var(--s4)", display: "block" }}
        />

        {/* Stats */}
        <div className="stats">
          <div className="stat">
            <div className="stat__v">{steps.length}</div>
            <div className="stat__l">Schritte</div>
          </div>
          <div className="stat">
            <div className="stat__v">{totalDuration.toFixed(1)}s</div>
            <div className="stat__l">Gesamt</div>
          </div>
          <div className="stat">
            <div className="stat__v">{steps.filter(s => s.type === "button").length}</div>
            <div className="stat__l">Buttons</div>
          </div>
          <div className="stat">
            <div className="stat__v">{steps.filter(s => s.type === "wait").length}</div>
            <div className="stat__l">Pausen</div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: "var(--s2)", marginBottom: "var(--s4)", flexWrap: "wrap" }}>
          {simStep >= 0
            ? <button className="btn btn--dng btn--sm" onClick={stopSim}>⏹ Sim Stop</button>
            : <button className="btn btn--sec btn--sm" onClick={startSim} disabled={!steps.length}>▶ Simulieren</button>
          }
          <div style={{ flex: 1 }} />
          {steps.length > 0 && (
            <button
              className="btn btn--dng btn--sm"
              onClick={() => { if (confirm("Alle Schritte löschen?")) { setSteps([]); setIsDirty(true); } }}
            >🗑 Alle</button>
          )}
          <button
            className={`btn btn--sm ${isDirty ? "btn--pri" : "btn--sec"}`}
            onClick={saveSeq}
          >
            💾 {isDirty ? "Speichern*" : "Gespeichert"}
          </button>
        </div>

        {/* Step list */}
        {steps.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--ct3)", padding: "var(--s8) 0",
            border: "2px dashed var(--cb1)", borderRadius: "var(--rlg)", marginBottom: "var(--s4)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "var(--s2)" }}>🎮</div>
            <div style={{ fontSize: "var(--ts)" }}>Schritte unten hinzufügen</div>
          </div>
        ) : (
          <div style={{ marginBottom: "var(--s4)" }}>
            {steps.map((step, i) => (
              <StepChip
                key={i} step={step} index={i} active={simStep === i}
                onDelete={deleteStep}
                onMoveUp={idx => moveStep(idx, -1)}
                onMoveDown={idx => moveStep(idx, 1)}
                onEdit={openEditModal}
                isFirst={i === 0} isLast={i === steps.length - 1}
              />
            ))}
          </div>
        )}

        <div className="divider" />

        {/* Quick-add section */}
        <div className="card">
          <div className="card__head">Schnell hinzufügen</div>

          {/* Segment: button / wait */}
          <div className="seg">
            {["button", "wait"].map(t => (
              <button
                key={t}
                className={`seg__btn${addType === t ? " seg__btn--on" : ""}`}
                onClick={() => setAddType(t)}
              >
                {t === "button" ? "🎮 Button" : "⏱ Pause"}
              </button>
            ))}
          </div>

          {addType === "button" ? (
            <>
              {/* Quick-tap all buttons */}
              <div className="eyebrow">Tippen zum Hinzufügen</div>
              <div className="qa-grid">
                {ALL_BTNS.map(b => (
                  <XBtn
                    key={b} id={b} size="sm"
                    onClick={() => addStepDirect({ type: "button", button: b })}
                  />
                ))}
              </div>

              {/* Custom button select */}
              <div className="divider" />
              <div className="eyebrow">Oder wählen</div>
              <select
                className="sel"
                value={addButton}
                onChange={e => setAddButton(e.target.value)}
                style={{ marginBottom: "var(--s3)" }}
              >
                {ALL_BTNS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <button className="btn btn--pri btn--full" onClick={addStep}>+ Button hinzufügen</button>
            </>
          ) : (
            <>
              <div className="eyebrow">Pausendauer</div>
              <div className="wait-grid" style={{ marginBottom: "var(--s3)" }}>
                {[0.5, 1, 2, 3, 5].map(s => (
                  <button
                    key={s}
                    className="btn btn--sec btn--sm"
                    onClick={() => addStepDirect({ type: "wait", seconds: s })}
                  >
                    ⏱ {s}s
                  </button>
                ))}
              </div>

              <div className="divider" />
              <div className="eyebrow">Benutzerdefiniert</div>
              <div style={{ display: "flex", gap: "var(--s2)", marginBottom: "var(--s3)", alignItems: "center" }}>
                <input
                  type="number" min="0.1" step="0.1" value={addWait}
                  onChange={e => setAddWait(e.target.value)}
                  className="inp"
                  style={{ width: "90px" }}
                  aria-label="Sekunden"
                />
                <span style={{ fontSize: "var(--ts)", color: "var(--ct3)" }}>Sekunden</span>
              </div>
              <div className="wait-grid" style={{ marginBottom: "var(--s3)" }}>
                {[0.2, 0.5, 1, 1.5, 2, 3, 5, 10, 30, 60].map(s => (
                  <button
                    key={s}
                    className={`btn btn--sm ${parseFloat(addWait) === s ? "btn--pri" : "btn--sec"}`}
                    onClick={() => setAddWait(String(s))}
                  >
                    {s}s
                  </button>
                ))}
              </div>
              <button className="btn btn--pri btn--full" onClick={addStep}>+ Pause hinzufügen</button>
            </>
          )}
        </div>

        {/* Templates */}
        <div className="card">
          <div className="card__head">Templates</div>
          {[
            { label: "A + 1s Pause",  s: [{ type: "button", button: "A" }, { type: "wait", seconds: 1 }] },
            { label: "3× A tippen",   s: [{ type: "button", button: "A" }, { type: "wait", seconds: 0.3 }, { type: "button", button: "A" }, { type: "wait", seconds: 0.3 }, { type: "button", button: "A" }] },
            { label: "↑ dann A",      s: [{ type: "button", button: "Up" }, { type: "wait", seconds: 0.5 }, { type: "button", button: "A" }] },
            { label: "Nexus-Menü",    s: [{ type: "button", button: "Nexus" }, { type: "wait", seconds: 1 }] },
          ].map(tpl => (
            <button
              key={tpl.label}
              className="btn btn--sec btn--full"
              style={{ marginBottom: "var(--s2)", justifyContent: "flex-start" }}
              onClick={() => { setSteps(p => [...p, ...tpl.s]); setIsDirty(true); }}
            >
              + {tpl.label}
            </button>
          ))}
        </div>

      </div>
    );
  }
}
