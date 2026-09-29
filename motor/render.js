// Motor de render headless: usa o MESMO HTML do gerador (fonte única da verdade).
// Uso: node render.js job.json
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { registerFont, createCanvas, loadImage } = require('canvas');
const F = p => path.join(__dirname, 'fonts', p);
for (const w of [400, 500, 600, 700]) registerFont(F(`Oswald-${w}.ttf`), { family: 'Oswald', weight: String(w) });
for (const w of [400, 500, 700]) registerFont(F(`Inter-${w}.ttf`), { family: 'Inter', weight: String(w) });
registerFont(F('Inter-500-italic.ttf'), { family: 'Inter', weight: '500', style: 'italic' });
registerFont(F('NotoEmoji-500.ttf'), { family: 'Noto Emoji' });
const { JSDOM } = require('jsdom');
{ const C = require('canvas').CanvasRenderingContext2D; const ft = C.prototype.fillText, mt = C.prototype.measureText;
  const fix = t => typeof t === 'string' ? t.replace(/👇/g, '↓') : t;
  C.prototype.fillText = function (t, ...a) { return ft.call(this, fix(t), ...a); };
  C.prototype.measureText = function (t) { return mt.call(this, fix(t)); }; }

const GEN = process.env.GEN_HTML || path.join(__dirname, 'gerador.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nodeCanvas = (el, dst) => { const id = el.getContext('2d').getImageData(0, 0, el.width, el.height); dst.getContext('2d').putImageData(id, 0, 0); return dst; };

async function boot() {
  const html = fs.readFileSync(GEN, 'utf8').replace(/<link[^>]+fonts\.googleapis[^>]*>/g, '');
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, resources: 'usable' });
  const w = dom.window, errs = [];
  w.addEventListener('error', e => errs.push(e.message));
  await sleep(300);
  return { w, d: w.document, errs };
}

async function waitPhoto(w, prev) { for (let i = 0; i < 60; i++) { const p = w.eval('photo'); if (p && p !== prev) return p; await sleep(50); } return w.eval('photo'); }

async function setup(ctx, job) {
  const { w, d } = ctx;
  if (job.photoGroup !== undefined) { d.getElementById('bankGroup').value = job.photoGroup; }
  if (job.theme) { w.eval(`style=${JSON.stringify(job.style || 'D')};markStyle();chaos=null;fishTitle=false;`); w.eval(`loadTheme(${JSON.stringify(job.theme)}${job.items ? ',' + JSON.stringify(job.items) : ''})`); }
  if (job.style) w.eval(`if(style!==${JSON.stringify(job.style)})setStyle(${JSON.stringify(job.style)})`);
  if (job.items) { d.getElementById('items').value = job.items.join('\n'); }
  if (job.title) { ['t1', 't2', 't3'].forEach((k, i) => { if (job.title[i] !== undefined) d.getElementById(k).value = job.title[i]; }); }
  if (job.part) { w.eval(`partN=${job.part};setTitle();`); if (job.title) ['t1','t2','t3'].forEach((k,i)=>{ if (job.title[i]!==undefined) d.getElementById(k).value=job.title[i]; }); }
  if (job.photoIndex !== undefined) { const prev = w.eval('photo'); w.eval(`bankIdx=${job.photoIndex};setPhotoFromURL(BANK[${job.photoIndex}].data)`); await waitPhoto(w, prev); }
  else if (job.photo !== false) { const prev = w.eval('photo'); w.eval('randomBankPhoto()'); await waitPhoto(w, prev); }
  if (job.zoom) d.getElementById('zoom').value = job.zoom;
  if (job.px !== undefined) d.getElementById('px').value = job.px;
  if (job.py !== undefined) d.getElementById('py').value = job.py;
  w.eval('RENDER.k=Infinity;RENDER.frac=1;RENDER.zoom=1;RENDER.spot=-1;draw();makeCaption();');
}

function meta(ctx) {
  const { w, d } = ctx;
  return {
    theme: w.eval('theme'), style: w.eval('style'), bankIdx: w.eval('bankIdx'),
    title: ['t1', 't2', 't3'].map(k => d.getElementById(k).value),
    items: d.getElementById('items').value.split('\n').filter(Boolean),
    caption: { title: d.getElementById('capTitle').textContent, desc: d.getElementById('capDesc').textContent, tags: d.getElementById('capTags').textContent },
  };
}

function toPNG(canvas, out) { const jpg = /\.jpe?g$/i.test(out); const b64 = (jpg ? canvas.toDataURL('image/jpeg', .92) : canvas.toDataURL('image/png')).split(',')[1]; fs.writeFileSync(out, Buffer.from(b64, 'base64')); }

async function renderImage(job) {
  const ctx = await boot(); await setup(ctx, job);
  toPNG(ctx.d.getElementById('cv'), job.out);
  if (job.follow) toPNG(ctx.w.eval('renderFollow()'), job.follow);
  const m = meta(ctx); m.errors = ctx.errs; return m;
}

// ---------- vídeo ----------
function synthAudio(wav, T, pops) {
  execFileSync('python3', [path.join(__dirname, 'synth.py'), wav, String(T), JSON.stringify(pops)]);
}

async function renderVideo(job) {
  const ctx = await boot(); await setup(ctx, job);
  const { w, d } = ctx; const cv = d.getElementById('cv');
  const T = job.T || 65, fps = 30, N = Math.round(T * fps);
  w.eval('RENDER.k=Infinity;RENDER.maxI=-1;RENDER.zoom=1;draw();');
  const n = Math.max(1, w.eval('RENDER.maxI') + 1);
  const intro = .7, step = Math.max(2.2, Math.min(4.5, T * .55 / n)), revealEnd = intro + n * step, outroLen = 5;
  const handle = d.getElementById('sig').value.trim() || '@mindsetbazillionario';
  const vc = createCanvas(1080, 1920), vx = vc.getContext('2d');
  // fundo: foto desfocada e escurecida
  const bg = createCanvas(1080, 1920), bx = bg.getContext('2d'); bx.fillStyle = '#000'; bx.fillRect(0, 0, 1080, 1920);
  const photo = w.eval('photo');
  if (photo) {
    const pimg = await loadImage(photo.toDataURL('image/jpeg', .8));
    const c0 = createCanvas(27, 48), x0 = c0.getContext('2d'); const s0 = Math.max(27 / pimg.width, 48 / pimg.height);
    x0.drawImage(pimg, (27 - pimg.width * s0) / 2, (48 - pimg.height * s0) / 2, pimg.width * s0, pimg.height * s0);
    const c1 = createCanvas(108, 192), x1 = c1.getContext('2d'); x1.drawImage(c0, 0, 0, 108, 192);
    bx.imageSmoothingEnabled = true; bx.drawImage(c1, 0, 0, 1080, 1920); bx.fillStyle = 'rgba(0,0,0,.72)'; bx.fillRect(0, 0, 1080, 1920);
  }
  const fmt = x => { x = Math.max(0, Math.floor(x)); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); };
  const pops = []; let lastK = -1;
  const silent = job.out.replace(/\.mp4$/, '.silent.mp4');
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', '1080x1920', '-r', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent]);
  const write = buf => new Promise(r => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', r); else r(); });
  let memeImg = null, memeKey = ''; const memeBuf = createCanvas(1080, 1350);
  for (let f = 0; f < N; f++) {
    const t = f / fps;
    let k = Math.floor((t - intro) / step), frac = (t - intro - k * step) / .45; if (t < intro) { k = 0; frac = 0; } if (k >= n) { k = Infinity; frac = 1; }
    if (k !== Infinity && t >= intro && k !== lastK) { lastK = k; pops.push(+t.toFixed(3)); }
    const p = Math.min(1, t / Math.min(T, revealEnd + .5)); const zoom = 1 + .16 * Math.pow(1 - p, 1.6);
    const key = `${k}|${Math.min(1, Math.max(0, frac)).toFixed(1)}|${Math.floor(f / 4)}`;
    if (key !== memeKey) { w.eval(`RENDER.k=${k === Infinity ? 'Infinity' : k};RENDER.frac=${frac};RENDER.zoom=${zoom};RENDER.spot=-1;draw();`); memeImg = nodeCanvas(cv, memeBuf); memeKey = key; }
    vx.drawImage(bg, 0, 0); vx.drawImage(memeImg, 0, 285, 1080, 1350);
    const pr = Math.min(1, t / T); vx.font = '600 34px Oswald'; vx.fillStyle = 'rgba(255,255,255,.85)'; vx.textAlign = 'left';
    vx.fillText(fmt(t), 60, 222); const tt = fmt(T); vx.fillText(tt, 1020 - vx.measureText(tt).width, 222);
    vx.fillStyle = 'rgba(255,255,255,.2)'; vx.fillRect(60, 240, 960, 10); vx.fillStyle = '#e5402f'; vx.fillRect(60, 240, Math.max(10, 960 * pr), 10);
    const ot = t - (T - outroLen);
    if (ot >= 0) {
      if (!pops.outro) { pops.outro = 1; pops.push(+t.toFixed(3)); }
      const a = Math.min(1, ot / .45), e = 1 - Math.pow(1 - a, 3);
      vx.save(); vx.globalAlpha = e; vx.fillStyle = 'rgba(0,0,0,.9)'; vx.fillRect(0, 285, 1080, 1350);
      vx.translate(540, 960); const sc2 = .9 + .1 * e; vx.scale(sc2, sc2); vx.textAlign = 'center';
      vx.fillStyle = '#d9ab55'; vx.font = '600 40px Oswald'; vx.fillText('GOSTOU?', 0, -230);
      vx.fillStyle = '#ffffff'; vx.font = '700 150px Oswald'; vx.fillText('SIGA', 0, -80);
      let hs = 74; vx.font = `700 ${hs}px Oswald`; while (vx.measureText(handle).width > 900 && hs > 30) { hs -= 2; vx.font = `700 ${hs}px Oswald`; }
      vx.fillStyle = '#e5402f'; vx.fillText(handle, 0, 20);
      vx.fillStyle = 'rgba(255,255,255,.85)'; vx.font = "500 44px Inter, 'Noto Emoji'"; vx.fillText('Todo dia um tema novo.', 0, 110); vx.fillText('Comenta qual vem depois 👇', 0, 170);
      const pulse = 1 + .05 * Math.sin(ot * 6); vx.scale(pulse, pulse); vx.fillStyle = '#e5402f';
      vx.beginPath(); vx.moveTo(-140, 230); vx.arcTo(190, 230, 190, 330, 50); vx.arcTo(190, 330, -190, 330, 50); vx.arcTo(-190, 330, -190, 230, 50); vx.arcTo(-190, 230, 190, 230, 50); vx.closePath(); vx.fill();
      vx.fillStyle = '#ffffff'; vx.font = '700 52px Oswald'; vx.fillText('+ SEGUIR', 0, 298); vx.restore();
    }
    await write(vc.toBuffer('raw'));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  const wav = job.out.replace(/\.mp4$/, '.wav');
  if (job.sound !== false) {
    synthAudio(wav, T, pops.filter(x => typeof x === 'number'));
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', job.out]);
    fs.unlinkSync(wav); fs.unlinkSync(silent);
  } else fs.renameSync(silent, job.out);
  if (job.thumb) toPNG(cv, job.thumb);
  const m = meta(ctx); m.errors = ctx.errs; m.video = { T, n, step: +step.toFixed(2), revealEnd: +revealEnd.toFixed(1) }; return m;
}

(async () => {
  const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const jobs = Array.isArray(job) ? job : [job];
  const res = [];
  for (const j of jobs) res.push(j.kind === 'video' ? await renderVideo(j) : await renderImage(j));
  console.log(JSON.stringify(res, null, 1));
  process.exit(0);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
