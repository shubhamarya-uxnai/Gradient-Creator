import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(here, '../../legacy.html'), 'utf8')
const from = source.indexOf('const TAU = Math.PI * 2;')
const to = source.indexOf('/* ---------- 7. ui ---------- */')
if (from < 0 || to < 0 || to <= from) throw new Error('Legacy engine boundaries changed')
let engine = source.slice(from, to)
// DOM notification belongs to React. The engine calls this callback from exports.
engine = engine.replace(/let toastTimer = 0;\s*function toast\(msg\)\{[\s\S]*?\n\}/, 'const toast = msg => events.toast(msg);')
engine = engine.replace("$('#ovTitle').textContent = 'Encoding with ' + engine + ' on this Mac';", "events.overlay({ title: 'Encoding with ' + engine + ' on this Mac' });")
const randomFrom = source.indexOf('function randomiseAll(){')
const randomTo = source.indexOf('/* A shortcut must not fire', randomFrom)
const random = source.slice(randomFrom, randomTo).replace('invalidate(); refresh();', 'invalidate();')
const output = `/* Generated from legacy.html by scripts/extract-engine.mjs. Keep export math in one source until parity is verified. */
export function createStudioEngine(events) {
${engine}
let token = { cancel: false };
let previewT = 0;
let activePreset = null;
let saveTimer = 0;
const refresh = () => events.change();
const paintSize = () => events.change();
const markStale = () => { EST.key = ''; events.change(); scheduleEstimate(); };
function save(){ clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem('ggs.v2', JSON.stringify({ P, X })); } catch(e){} }, 400); }
function invalidate(){ shapeCache.key = ''; activePreset = null; markStale(); save(); }
function load(){
  try { const data = JSON.parse(localStorage.getItem('ggs.v2') || '{}'); if (data.P) Object.assign(P, data.P); if (data.X) Object.assign(X, data.X); } catch(e){}
  if (typeof X.zoomX !== 'number') X.zoomX = typeof X.zoom === 'number' ? X.zoom : 1;
  if (typeof X.zoomY !== 'number') X.zoomY = typeof X.zoom === 'number' ? X.zoom : 1;
  if (typeof X.linkZoom !== 'boolean') X.linkZoom = Math.abs(X.zoomX - X.zoomY) < .001;
  delete X.zoom;
}
const showOverlay = title => { token = { cancel: false }; events.overlay({ title, progress: 0, label: 'Starting' }); };
const prog = (progress, label) => events.overlay({ progress, label });
const hideOverlay = () => events.overlay(null);
const askOverlay = (title, message, choices) => events.confirm(title, message, choices);
async function guarded(fn){ try { return await fn(); } catch(e){ hideOverlay(); console.error(e); toast('Export failed: ' + (e && e.message || e)); return null; } }
function measureMotion(){
  const W = 120, H = Math.max(24, Math.round(120 * X.h / X.w));
  const b = buf('motion', W, H, true), c = cropOf(X), n = frameCount(X);
  const p = Object.assign({}, P, { grain: 0 });
  renderOut(b.x, W, H, 0, p, 0, c);
  const a = new Uint8ClampedArray(b.x.getImageData(0, 0, W, H).data);
  let most = 0;
  for (const t of [.25, .5, .75]){
    renderOut(b.x, W, H, t, p, Math.round(t * n), c);
    const d = b.x.getImageData(0, 0, W, H).data;
    let k = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - a[i]) + Math.abs(d[i + 1] - a[i + 1]) + Math.abs(d[i + 2] - a[i + 2]) > 24) k++;
    most = Math.max(most, k / (W * H));
  }
  return most;
}
const STILL = .015;
${random}
load();
scheduleEstimate();
return {
  P, X, PALETTES, PRESETS, STYLES, SIZE_PRESETS, DEFAULTS,
  get activePreset(){ return activePreset; }, get localEngine(){ return localEngineName(); },
  get browserOK(){ return BROWSER_OK; }, get estimate(){ return EST; },
  get previewT(){ return previewT; }, set previewT(t){ previewT = t; },
  frameCount: () => frameCount(X), realFps: () => realFps(X), cropZoom: () => cropZoom(X), virtualSize: () => virtualSize(X),
  renderPreview(ctx,w,h,frame){ renderOut(ctx,w,h,frame / frameCount(X),P,frame,cropOf(X)); },
  renderThumb(params,ctx,w,h){ drawFrame(ctx,w,h,.3,params,3); },
  resolvePreset(pr){ const p = JSON.parse(JSON.stringify(DEFAULTS)); Object.keys(pr).forEach(k => { if (k !== 'pal') p[k] = pr[k]; }); if (pr.pal){ p.colors = PALETTES[pr.pal].slice(); p.colorCount = 5; } p.bg = pr.bg || p.colors[0]; return p; },
  setPreset(name,params){ Object.assign(P,JSON.parse(JSON.stringify(params))); invalidate(); activePreset = name; events.change(); },
  update(group,key,value){ group[key] = value; invalidate(); },
  updateSize(w,h){ X.w = clamp(Math.round(w),32,4000); X.h = clamp(Math.round(h),32,4000); markStale(); save(); },
  resetCrop(){ Object.assign(X,{ zoomX:1, zoomY:1, panX:.5, panY:.5 }); markStale(); save(); },
  randomiseAll,
  newShape(){ P.seed = 1 + Math.floor(Math.random()*99999); invalidate(); },
  shuffle(){ const a=P.colors.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } P.colors=a; invalidate(); },
  setPan(x,y){ X.panX=clamp(x,0,1); X.panY=clamp(y,0,1); markStale(); save(); },
  copySettings: () => JSON.stringify({ P, X }),
  pasteSettings(raw){ const o=JSON.parse(raw); if(o.P) Object.assign(P,o.P); if(o.X) Object.assign(X,o.X); invalidate(); },
  exportBrowser: () => doExportBrowser(), exportLocal: () => doExportLocal(),
  exportPNG, exportFrames: doExportFrames,
  exportWebM: () => guarded(async () => { showOverlay('Recording WebM'); await exportWEBM(prog,token); hideOverlay(); }),
  cancel(){ token.cancel=true; if(BUSY) gwStop(); hideOverlay(); toast('Cancelled'); },
  connectHelper,
  async detectHelper(){ LOCAL=await detectLocal(); EST.key=''; events.change(); },
  estimateNow(){ scheduleEstimate(); },
  formatBytes: fmtBytes, formatSeconds: fmtSecs,
  dispose(){ gwStop(); clearTimeout(EST.timer); clearTimeout(saveTimer); }
};
}
`
writeFileSync(resolve(here, '../src/engine/legacy-engine.js'), output)
