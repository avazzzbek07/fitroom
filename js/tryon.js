// Виртуальная примерка: камера (или фото) → поиск позы MediaPipe → наложение одежды по точкам тела.
import { svgFor, metaOf, groupOf } from './products.js';

const MP = new URL('../vendor/mediapipe/', import.meta.url).href;

// pair — пара точек [левая, правая], к которой привязана вещь; ax/ay — куда эта пара попадает в SVG.
// next — вторая пара точек для вертикального растяжения (бёдра, лодыжки).
const ANCHORS = {
  top: { pair: [11, 12], ax: 100, ay: 48, span: 90, next: [23, 24], vspan: 150, clamp: [0.7, 1.6] },
  bottom: { pair: [23, 24], ax: 100, ay: 34, span: 72, next: [27, 28], vspan: 256, clamp: [0.8, 2.2] },
  hat: { pair: [7, 8], ax: 100, ay: 172, span: 92 },
  glasses: { pair: [2, 5], ax: 100, ay: 40, span: 80 },
};
export const SLOTS = ['top', 'bottom', 'hat', 'glasses'];
const DRAW_ORDER = ['bottom', 'top', 'glasses', 'hat'];
const GEN_MS = 1100;

let landmarkerPromise = null;
function getLandmarker() {
  landmarkerPromise ??= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import(MP + 'vision_bundle.mjs');
    const fileset = await FilesetResolver.forVisionTasks(MP + 'wasm');
    const opts = (delegate) => ({
      baseOptions: { modelAssetPath: MP + 'pose_landmarker_lite.task', delegate },
      runningMode: 'VIDEO', numPoses: 1,
    });
    try { return await PoseLandmarker.createFromOptions(fileset, opts('GPU')); }
    catch { return await PoseLandmarker.createFromOptions(fileset, opts('CPU')); }
  })();
  return landmarkerPromise;
}

const imgCache = new Map();
function garmentImg(p) {
  if (!imgCache.has(p.id)) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgFor(p, 3));
    imgCache.set(p.id, img);
  }
  return imgCache.get(p.id);
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const byX = (a, b) => (a.x <= b.x ? [a, b] : [b, a]);

// Поза-заглушка, если модель не загрузилась: вещи просто стоят по центру кадра.
function staticPose(W, H) {
  const p = Array.from({ length: 33 }, () => ({ x: W / 2, y: H / 2 }));
  const set = (i, x, y) => { p[i] = { x: x * W, y: y * H }; };
  set(0, 0.5, 0.25); set(2, 0.475, 0.22); set(5, 0.525, 0.22); set(7, 0.455, 0.235); set(8, 0.545, 0.235);
  set(11, 0.41, 0.4); set(12, 0.59, 0.4); set(23, 0.44, 0.75); set(24, 0.56, 0.75); set(27, 0.45, 1.4); set(28, 0.55, 1.4);
  return p;
}

export function createTryOn({ canvas, video, onStatus }) {
  const ctx = canvas.getContext('2d');
  const outfit = {};          // slot → product
  const genStart = {};        // slot → время начала «генерации»
  let source = null, mirror = true, stream = null;
  let landmarker = null, modelFailed = false;
  let smooth = null, lastSeen = 0, lastVideoTime = -1, needDetect = false;
  let raf = 0, status = '';

  const setStatus = (s) => { if (s !== status) { status = s; onStatus(s); } };

  setStatus('loadingModel');
  getLandmarker().then((l) => { landmarker = l; }).catch((e) => { console.warn('Pose model failed', e); modelFailed = true; });

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('insecure');
    stopCamera();
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    await video.play();
    source = video; mirror = true; smooth = null; lastVideoTime = -1;
  }

  function stopCamera() {
    stream?.getTracks().forEach((tr) => tr.stop());
    stream = null;
    video.srcObject = null;
  }

  function useImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { stopCamera(); source = img; mirror = false; smooth = null; needDetect = true; resolve(); };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function setItem(p) {
    const slot = groupOf(p);
    if (outfit[slot]?.id === p.id) return;
    outfit[slot] = p;
    genStart[slot] = performance.now();
    garmentImg(p);
  }
  function removeSlot(slot) { delete outfit[slot]; }

  function detect(now) {
    let pts = null;
    if (source === video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      pts = landmarker.detectForVideo(video, now).landmarks?.[0];
    } else if (source !== video && needDetect) {
      needDetect = false;
      pts = landmarker.detectForVideo(source, now).landmarks?.[0];
    }
    if (!pts) return;
    const W = canvas.width, H = canvas.height;
    const px = pts.map((q) => ({ x: (mirror ? 1 - q.x : q.x) * W, y: q.y * H }));
    if (!smooth || source !== video) smooth = px;
    else smooth = smooth.map((s, i) => ({ x: s.x + (px[i].x - s.x) * 0.55, y: s.y + (px[i].y - s.y) * 0.55 }));
    lastSeen = now;
  }

  function drawItem(slot, p, pose, alpha) {
    const A = ANCHORS[slot], img = garmentImg(p), { w, h } = metaOf(p);
    if (!img.complete) return;
    const [P1, P2] = byX(pose[A.pair[0]], pose[A.pair[1]]);
    const dx = P2.x - P1.x, dy = P2.y - P1.y, dist = Math.hypot(dx, dy);
    if (dist < 4) return;
    const s = dist / A.span, m = mid(P1, P2);
    let sy = s;
    if (A.next) {
      const n = mid(pose[A.next[0]], pose[A.next[1]]);
      sy = clamp(Math.hypot(n.x - m.x, n.y - m.y) / A.vspan, s * A.clamp[0], s * A.clamp[1]);
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 14;
    ctx.translate(m.x, m.y);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.scale(s, sy);
    ctx.drawImage(img, -A.ax, -A.ay, w, h);
    ctx.restore();
  }

  // Пунктирный силуэт и сканирующая линия — эффект «AI-генерации» при смене вещи.
  function drawScan(pose, t, now) {
    const [a, b] = byX(pose[11], pose[12]), [c, d] = byX(pose[23], pose[24]);
    const sd = Math.hypot(b.x - a.x, b.y - a.y), ex = sd * 0.28, nose = pose[0];
    const lw = Math.max(2, canvas.width / 400);
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - t) * 3);
    ctx.setLineDash([lw * 4, lw * 3]);
    ctx.lineDashOffset = -now / 25;
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(nose.x, nose.y - sd * 0.08, sd * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(a.x - ex, a.y); ctx.lineTo(c.x - ex * 0.8, c.y + sd * 0.2);
    ctx.lineTo(d.x + ex * 0.8, d.y + sd * 0.2); ctx.lineTo(b.x + ex, b.y); ctx.closePath(); ctx.stroke();
    const top = nose.y - sd * 0.6, bot = Math.max(c.y, d.y) + sd * 0.2, y = top + (bot - top) * t;
    const g = ctx.createLinearGradient(0, y - 30, 0, y + 2);
    g.addColorStop(0, 'rgba(229,38,43,0)'); g.addColorStop(1, 'rgba(229,38,43,.55)');
    ctx.setLineDash([]);
    ctx.fillStyle = g; ctx.fillRect(a.x - ex * 1.6, y - 30, b.x - a.x + ex * 3.2, 32);
    ctx.restore();
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!source) return;
    const sw = source.videoWidth || source.naturalWidth, sh = source.videoHeight || source.naturalHeight;
    if (!sw) return;
    if (canvas.width !== sw || canvas.height !== sh) { canvas.width = sw; canvas.height = sh; }
    const now = performance.now();

    ctx.save();
    if (mirror) { ctx.translate(sw, 0); ctx.scale(-1, 1); }
    ctx.drawImage(source, 0, 0, sw, sh);
    ctx.restore();

    if (landmarker) { try { detect(now); } catch (e) { console.warn(e); } }

    let pose = null;
    if (landmarker && smooth && (source !== video || now - lastSeen < 700)) pose = smooth;
    else if (modelFailed) pose = staticPose(sw, sh);

    const generating = SLOTS.some((s) => outfit[s] && now - genStart[s] < GEN_MS);
    if (!landmarker && !modelFailed) setStatus('loadingModel');
    else if (!pose) setStatus('noPerson');
    else if (generating) setStatus('generating');
    else if (modelFailed) setStatus('noTracking');
    else setStatus(Object.keys(outfit).length ? 'live' : 'pickItem');
    if (!pose) return;

    let scanT = -1;
    for (const slot of DRAW_ORDER) {
      const p = outfit[slot];
      if (!p) continue;
      const t = (now - genStart[slot]) / GEN_MS;
      drawItem(slot, p, pose, clamp((t - 0.35) / 0.5, 0, 1) * 0.97);
      if (t < 1) scanT = Math.max(scanT, t);
    }
    if (scanT >= 0) drawScan(pose, scanT, now);
  }
  raf = requestAnimationFrame(frame);

  function snapshot() {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `fitroom-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  }

  function destroy() { cancelAnimationFrame(raf); stopCamera(); }

  return { startCamera, useImage, setItem, removeSlot, outfit, snapshot, destroy, hasSource: () => !!source };
}
