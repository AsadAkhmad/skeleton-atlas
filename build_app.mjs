import esbuild from 'esbuild';
import fs from 'fs';

const r = await esbuild.build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', logLevel: 'error', legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');

const css = `
:root{--bg:#0d0f12;--bg2:#12151a;--panel:#14171c;--panel2:#191d23;--line:#262b33;--line2:#2f353e;--fg:#ece8e0;--muted:#979da6;--faint:#646a73;--accent:#e8b04a;--accent-ink:#1b1305;--blue:#6fa8d6;
--serif:'Newsreader',Georgia,'Times New Roman',serif;--sans:'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;--mono:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;color-scheme:dark}

#sys{border-bottom:1px solid var(--line);padding:8px 8px 6px;max-height:44%;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--line2) transparent;flex:none}
.sysh{display:flex;justify-content:space-between;align-items:baseline;margin:2px 8px 6px;font:600 10.5px var(--sans);letter-spacing:.09em;text-transform:uppercase;color:var(--faint)}
.sysh em{font:11px var(--mono);font-style:normal;letter-spacing:0;text-transform:none}
.sysrow{display:grid;grid-template-columns:1fr auto;align-items:center}
.systog{display:flex;align-items:center;gap:8px;border:0;background:none;padding:6px 8px;border-radius:8px;font-size:12.5px;font-weight:600;text-align:left;color:var(--muted)}
.systog:hover:not(:disabled){background:var(--panel2);color:var(--fg)}
.systog[aria-pressed=true]{color:var(--fg)}
.systog[aria-pressed=true] .sw{box-shadow:0 0 0 3px rgba(255,255,255,.16)}
.systog:disabled,.sysexp:disabled{opacity:.42;cursor:default}
.sysrow.busy .systog .rc::after{content:'building…';color:var(--accent)}
.sysexp{width:28px;height:28px;border:0;background:none;color:var(--faint);border-radius:7px}
.sysexp:hover:not(:disabled){background:var(--panel2);color:var(--fg)}
.sysrow.open .sysexp{transform:rotate(180deg)}
.sysitems{grid-column:1/-1;display:none;padding:0 0 4px 20px}
.sysrow.open .sysitems{display:block}
.sysit{display:flex;align-items:center;gap:4px}
.sysit .nm{flex:1;border:0;background:none;text-align:left;color:#cfcbc2;font-size:12.5px;padding:4px 7px;border-radius:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sysit .nm:hover{background:var(--panel2);color:var(--fg)}
.sysit.sel .nm{background:rgba(232,176,74,.16);color:#fff2d6}
.sysit.off .nm{color:var(--faint);text-decoration:line-through}
.sysit .e{border:0;background:none;color:var(--muted);width:24px;height:24px;border-radius:6px;font-size:13px}
.seg{display:flex;gap:2px;padding:2px;margin:2px 0 6px;background:var(--bg2);border:1px solid var(--line);border-radius:9px}
.seg button{flex:1;border:0;background:none;color:var(--muted);height:26px;border-radius:7px;font-size:12px;font-weight:600}
.seg button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink)}
.skinop{display:flex;align-items:center;gap:8px;padding:4px 6px 2px;color:var(--muted);font-size:12px}
.skinop input{flex:1;accent-color:var(--accent);min-width:0}
.skinop output{font:11px var(--mono);width:34px;text-align:right}
.sysit .e:hover{background:var(--panel2);color:var(--fg)}
*{box-sizing:border-box}
html,body{height:100%;margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 var(--sans);-webkit-font-smoothing:antialiased;overflow:hidden}
button{font:inherit;color:inherit;cursor:pointer}
button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
#app{--lw:292px;--rw:352px;display:grid;grid-template-columns:var(--lw) minmax(0,1fr) var(--rw);height:100%;background:var(--bg)}
aside{background:var(--panel);min-height:0;display:flex;flex-direction:column;position:relative;z-index:5}
#left{border-right:1px solid var(--line)}
#right{border-left:1px solid var(--line)}
.brand{display:flex;gap:12px;align-items:center;padding:16px 16px 12px}
.mark{width:34px;height:34px;flex:none;border-radius:9px;background:var(--panel2);border:1px solid var(--line2);display:grid;place-items:center;color:var(--accent)}
.brand h1{margin:0;font:600 20px/1.1 var(--serif);letter-spacing:.2px}
.brand p{margin:2px 0 0;color:var(--muted);font-size:12px}
.search{position:relative;padding:0 14px 10px;border-bottom:1px solid var(--line)}
.search input{width:100%;height:36px;border-radius:9px;border:1px solid var(--line2);background:var(--bg2);color:var(--fg);padding:0 12px;font:inherit;font-size:13px}
.search input::placeholder{color:var(--faint)}
#qcount{display:block;margin:6px 2px 0;font:11px var(--mono);color:var(--faint)}
#tree{overflow:auto;flex:1;padding:6px 8px 40px;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}
.reg{margin:4px 0}
.reg.off .rhead .rn{color:var(--faint);text-decoration:line-through}
.rhead{display:flex;align-items:center;gap:4px;position:sticky;top:0;background:var(--panel);z-index:2;padding:2px 0}
.rtoggle{flex:1;display:flex;align-items:center;gap:8px;border:0;background:none;padding:7px 8px;border-radius:8px;text-align:left;font-weight:600;font-size:12.5px;letter-spacing:.02em}
.rtoggle:hover{background:var(--panel2)}
.sw{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none}
.rn{flex:1}
.rc{font:11px var(--mono);color:var(--faint)}
.eye{border:0;background:none;color:var(--muted);width:30px;height:30px;border-radius:8px;display:grid;place-items:center}
.eye:hover{background:var(--panel2);color:var(--fg)}
.eye .slash{opacity:0}.eye[aria-pressed=false] .slash{opacity:1}.eye[aria-pressed=false]{color:var(--faint)}
.sub{margin:10px 8px 3px;font:600 10.5px var(--sans);letter-spacing:.09em;text-transform:uppercase;color:var(--faint);display:flex;justify-content:space-between}
.sub em{font:11px var(--mono);font-style:normal}
.item{display:flex;width:100%;align-items:center;gap:8px;border:0;background:none;text-align:left;padding:5px 8px 5px 14px;border-radius:7px;color:#cfcbc2;font-size:13px;min-height:28px}
.item:hover,.item.hov{background:var(--panel2);color:var(--fg)}
.item.sel{background:rgba(232,176,74,.16);color:#fff2d6}
.item .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sd{font:600 10px var(--mono);padding:1px 5px;border-radius:5px;background:var(--bg2);color:var(--muted);border:1px solid var(--line)}
.sel .sd{border-color:rgba(232,176,74,.5);color:var(--accent)}
.stage{position:relative;min-width:0;min-height:0;overflow:hidden;background:radial-gradient(ellipse 70% 60% at 50% 42%,#252b33 0%,#161a20 52%,#0b0d10 100%)}
#c{position:absolute;inset:0;display:block;touch-action:none;cursor:grab;outline:none}
#lines,#labels{position:absolute;inset:0;pointer-events:none;overflow:hidden}
#lines{width:100%;height:100%}
.ln{fill:none;stroke:rgba(215,208,190,.3);stroke-width:.8}
.ln.hot{stroke:var(--accent);stroke-width:1.3}
.lb{position:absolute;left:0;top:0;pointer-events:auto;border:1px solid rgba(255,255,255,.09);background:rgba(14,16,20,.74);color:#d9d5cb;font:500 11px/1 var(--sans);padding:4px 8px;border-radius:11px;white-space:nowrap;backdrop-filter:blur(3px);will-change:transform}
.lb:hover,.lb.hot{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
#tip{position:absolute;left:0;top:0;pointer-events:none;background:rgba(11,13,16,.94);border:1px solid var(--line2);border-radius:8px;padding:6px 10px;opacity:0;transition:opacity .12s;z-index:8;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.4)}
#tip b{display:block;font:600 13px var(--sans)}#tip b i{font-style:normal;color:var(--accent);font-weight:500}
#tip span{font-size:11px;color:var(--muted)}
.toolbar{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:flex;flex-wrap:wrap;justify-content:center;gap:4px 6px;align-items:center;background:rgba(18,21,26,.86);border:1px solid var(--line2);border-radius:14px;padding:6px;backdrop-filter:blur(8px);max-width:calc(100% - 20px);z-index:6;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.grp{display:flex;gap:2px;padding:0 4px;align-items:center}
.grp+.grp{border-left:1px solid var(--line2);padding-left:8px;margin-left:2px}
.toolbar button{border:0;background:none;color:var(--muted);height:32px;padding:0 11px;border-radius:9px;font-size:12.5px;font-weight:500;white-space:nowrap}
.toolbar button:hover{background:var(--panel2);color:var(--fg)}
.toolbar button.on,.toolbar button[aria-pressed=true]{color:var(--accent);background:rgba(232,176,74,.13)}
.views button.on{color:var(--accent-ink);background:var(--accent)}
.explode{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted)}
.explode input{width:96px;accent-color:var(--accent)}
.explode output{font:11px var(--mono);width:32px;color:var(--faint)}
.hint{position:absolute;left:16px;top:14px;font-size:12px;color:var(--faint);pointer-events:none;max-width:260px;z-index:3}
.hint b{color:var(--muted);font-weight:500}
.hide{position:absolute;right:10px;top:8px;z-index:3;border:0;background:var(--panel2);color:var(--muted);width:34px;height:34px;border-radius:50%;font-size:18px;line-height:1;display:grid;place-items:center}
.hide:hover{color:var(--fg);background:var(--line2)}
.brand .hide{position:static;margin-left:auto;flex:none}
.edgetab{display:none;position:absolute;right:0;top:50%;transform:translateY(-50%);z-index:7;border:1px solid var(--line2);border-right:0;background:rgba(18,21,26,.92);color:var(--fg);border-radius:10px 0 0 10px;padding:14px 7px;font:600 12px var(--sans);letter-spacing:.04em;writing-mode:vertical-rl}
.stage #loading{z-index:40}
#right .hd{padding-right:42px}
.edgetab:hover{background:var(--accent);color:var(--accent-ink)}
.toolbar.min>.grp:not(.keep){display:none}
.toolbar.min{padding:3px}
.fab{display:none;position:absolute;left:12px;top:12px;z-index:7;border:1px solid var(--line2);background:rgba(18,21,26,.9);border-radius:10px;height:36px;padding:0 14px;font-weight:600;font-size:13px}
#loading{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:20;display:grid;justify-items:center;gap:12px;padding:22px 30px;background:rgba(13,15,18,.78);border:1px solid var(--line2);border-radius:16px;backdrop-filter:blur(6px);transition:opacity .6s;text-align:center}
#loading.done{opacity:0;pointer-events:none}
#loading h2{margin:0;font:600 24px var(--serif)}
#loading p{margin:0;color:var(--muted);font-size:13px;font-family:var(--mono);height:18px}
.barwrap{width:min(320px,70vw);height:4px;background:var(--line);border-radius:4px;overflow:hidden}
#bar{height:100%;width:0;background:var(--accent);transition:width .15s}
/* right panel */
#detail{overflow:auto;flex:1;padding:16px 18px 40px;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}
.x{display:none;position:absolute;right:10px;top:8px;z-index:3;border:0;background:var(--panel2);width:34px;height:34px;border-radius:50%;font-size:20px;line-height:1}
.empty h2{margin:6px 0 8px;font:600 26px/1.15 var(--serif)}
.empty p{color:#b9b5ab}.muted{color:var(--muted)}
.facts{list-style:none;padding:0;margin:18px 0;display:grid;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.facts li{display:flex;gap:14px;align-items:baseline;background:var(--panel);padding:12px 14px}
.facts b{font:600 26px var(--serif);min-width:62px;color:var(--accent)}
.facts span{color:#c4c0b7;font-size:13px}
.hd .crumb{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--muted);letter-spacing:.02em}
.hd .crumb i{opacity:.4;font-style:normal}
.hd h2{margin:8px 0 4px;font:600 29px/1.12 var(--serif);letter-spacing:.1px;text-wrap:balance}
.lat{display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:#b5b1a8}
.lat em{font:italic 400 16px var(--serif)}
.side{font:600 10.5px var(--mono);letter-spacing:.08em;text-transform:uppercase;padding:2px 8px;border-radius:99px;border:1px solid var(--line2);color:var(--muted)}
.side.L{color:#9cc4e6;border-color:#35536b}.side.R{color:#e6b79c;border-color:#6b4a35}.side.M{color:#c9c3a8;border-color:#55523f}
.type{margin-top:6px;font-size:12px;color:var(--faint)}
.nav{display:flex;gap:6px;margin:16px 0 4px}
.nav button,.btns button{flex:1;border:1px solid var(--line2);background:var(--panel2);border-radius:9px;height:34px;font-size:12.5px;font-weight:500;color:#d6d2c9}
.nav button:hover:not(:disabled),.btns button:hover{border-color:#4a525d;background:#20252c}
.nav button:disabled{opacity:.4;cursor:default}
#detail section{margin-top:22px}
#detail h3{margin:0 0 8px;font:600 10.5px var(--sans);letter-spacing:.11em;text-transform:uppercase;color:var(--faint);display:flex;gap:8px;align-items:baseline}
#detail h3 .muted{text-transform:none;letter-spacing:0;font-weight:400;font-size:11.5px}
#detail p{margin:0;color:#d7d3ca;font-size:14px;line-height:1.6}
.big{display:flex;align-items:baseline;gap:6px}
.big b{font:600 46px/1 var(--serif);font-variant-numeric:tabular-nums}
.big span{font:500 16px var(--mono);color:var(--muted)}
.big em{margin-left:auto;font-size:11.5px;font-style:normal;color:var(--faint)}
.scale{height:6px;background:var(--bg2);border-radius:4px;margin-top:10px;overflow:hidden;border:1px solid var(--line)}
.scale i{display:block;height:100%;background:linear-gradient(90deg,#b88a35,var(--accent));border-radius:4px}
.scalecap{font-size:11px;color:var(--faint);margin-top:5px}
dl{margin:14px 0 0;display:grid;grid-template-columns:1fr auto;gap:0;border-top:1px solid var(--line)}
dt,dd{margin:0;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}
dt{color:var(--muted)}dd{font:500 12.5px var(--mono);text-align:right;color:#e4e0d6}
.feat{list-style:none;padding:0;margin:0;display:grid;gap:7px}
.feat li{position:relative;padding-left:16px;color:#d2cec5;font-size:13.5px;line-height:1.45}
.feat li::before{content:'';position:absolute;left:0;top:.62em;width:8px;height:1.5px;background:var(--accent);opacity:.7}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{border:1px solid var(--line2);background:var(--panel2);border-radius:99px;padding:4px 11px;font-size:12.5px;color:#d6d2c9}
.chip i{font:600 10px var(--mono);font-style:normal;color:var(--muted);margin-left:3px}
.chip:hover{border-color:var(--accent);color:#fff2d6}
.fact p{border:1px solid var(--line);background:var(--bg2);border-radius:11px;padding:12px 14px;color:#d9d0b8}
.locrow{display:flex;gap:14px;align-items:flex-start}
.body{width:74px;flex:none;color:#aaa;background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:6px}
.locrow p{font-size:12.5px}
.btns{display:grid;gap:6px;margin-top:10px}
/* responsive */
@media (max-width:1180px){#app{--lw:260px;--rw:320px}.grp .lbl{display:none}}
@media (min-width:901px){
 #app.noleft{--lw:0px}#app.noleft #left{visibility:hidden;overflow:hidden;min-width:0;border:0}#app.noleft .fab{display:block}
 #app.noright{--rw:0px}#app.noright #right{visibility:hidden;overflow:hidden;min-width:0;border:0}#app.noright .edgetab{display:block}
}
@media (max-width:900px){
 #app{grid-template-columns:minmax(0,1fr)}
 #left{position:absolute;left:0;top:0;bottom:0;width:min(86vw,330px);transform:translateX(-102%);transition:transform .28s;z-index:30;box-shadow:12px 0 40px rgba(0,0,0,.5)}
 #left.open{transform:none}
 #right{position:absolute;left:0;right:0;bottom:0;height:54%;transform:translateY(102%);transition:transform .3s;z-index:25;border-left:0;border-top:1px solid var(--line2);border-radius:16px 16px 0 0;box-shadow:0 -14px 40px rgba(0,0,0,.5)}
 #right.open{transform:none}
 .x{display:block}.fab{display:block}
 #hideright{right:52px}
 #showright.on{display:block}
 .toolbar{bottom:10px}
 .hint{display:none}
 body:has(#right.open) .toolbar{bottom:calc(54% + 8px)}
 .toolbar{padding:4px;gap:2px 4px}.toolbar button{padding:0 8px;height:30px;font-size:12px}.grp{padding:0 2px}.explode input{width:84px}
 .lb{font-size:10px;padding:3px 6px}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

const body = `
<div id="app">
  <aside id="left" aria-label="Bone list">
    <header class="brand">
      <div class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c-4 0-7 2.7-7 6.3 0 2.2 1.1 3.7 2.6 4.8V17a1 1 0 0 0 1 1H10v2.5M12 3c4 0 7 2.7 7 6.3 0 2.2-1.1 3.7-2.6 4.8V17a1 1 0 0 1-1 1H14v2.5M10 18v2.5M14 18v2.5"/><circle cx="9.3" cy="10" r="1.5"/><circle cx="14.7" cy="10" r="1.5"/></svg></div>
      <div><h1>Skeleton Atlas</h1><p>Adult human, 206 bones, 3D</p></div>
      <button id="hideleft" class="hide" aria-label="Hide the list" title="Hide the list ( [ )">‹</button>
    </header>
    <div class="search"><input id="q" type="search" placeholder="Search: femur, wrist, rib 7…" aria-label="Search bones" autocomplete="off"><span id="qcount">206 bones</span></div>
    <div id="sys"></div>
    <div id="tree"></div>
  </aside>
  <main class="stage">
    <canvas id="c" aria-label="3D skeleton. Drag to rotate, scroll to zoom, click a bone to select it." tabindex="0"></canvas>
    <svg id="lines"></svg><div id="labels"></div>
    <div id="tip"></div>
    <button id="openleft" class="fab">☰ Bones</button>
    <div class="toolbar" role="toolbar" aria-label="View controls">
      <div class="grp views"><button data-view="front" class="on">Front</button><button data-view="left">Side</button><button data-view="back">Back</button><button data-view="top">Top</button></div>
      <div class="grp"><button id="t-labels" title="Show bone names (L)">Names</button><button id="t-dim" title="Fade other bones when one is selected">Focus</button><button id="t-cart" title="Costal cartilage (not bone)">Cartilage</button><button id="t-teeth" title="Teeth (not counted as bones)">Teeth</button><button id="t-rot">Spin</button><button id="t-bones" title="Cycle the skeleton: solid, ghost, hidden">Bones: Solid</button></div>
      <div class="grp explode"><label for="explode">Explode</label><input id="explode" type="range" min="0" max="100" value="0"><output id="exv">0%</output></div>
      <div class="grp"><button id="reset">Reset</button></div>
      <div class="grp keep"><button id="t-min" aria-label="Hide or show the controls" title="Hide or show these controls ( h )">Hide ▾</button></div>
    </div>
    <button id="showright" class="edgetab" aria-label="Show details" title="Show the details panel ( ] )">Details</button>
    <div id="loading"><h2>Assembling the skeleton</h2><div class="barwrap"><div id="bar"></div></div><p id="loadtxt">starting…</p></div>
  </main>
  <aside id="right" aria-label="Bone details"><button id="hideright" class="hide" aria-label="Hide details" title="Hide the details panel ( ] )">›</button><button id="closeright" class="x" aria-label="Close details">×</button><div id="detail"></div></aside>
</div>`;

const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;1,6..72,400&display=swap">`;
const title = '<title>Skeleton Atlas</title>';
// Vercel Web Analytics (only in the deployed page; does nothing unless enabled in the Vercel dashboard)
const analytics = '<script defer src="/_vercel/insights/script.js"></script>';

const fragment = `${title}\n${fonts}\n<style>${css}</style>\n${body}\n<script>${js}</script>\n`;
fs.writeFileSync('dist/artifact.html', fragment);
fs.writeFileSync('dist/app.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${title}${fonts}${analytics}<style>${css}</style></head><body>${body}<script>${js}</script></body></html>`);
console.log('built app', (js.length / 1024) | 0, 'KB js,', (fragment.length / 1024) | 0, 'KB total');
fs.copyFileSync('dist/app.html', 'index.html');
