class Color {
  constructor(r, g, b) {
    this.r = r; this.g = g; this.b = b;
  }

  set(r, g, b) {
    this.r = this.clamp(r);
    this.g = this.clamp(g);
    this.b = this.clamp(b);
  }

  clamp(v) { return Math.min(255, Math.max(0, v)); }

  multiply(m) {
    const r = this.clamp(this.r * m[0] + this.g * m[1] + this.b * m[2]);
    const g = this.clamp(this.r * m[3] + this.g * m[4] + this.b * m[5]);
    const b = this.clamp(this.r * m[6] + this.g * m[7] + this.b * m[8]);
    this.r = r; this.g = g; this.b = b;
  }

  invert(v = 1) {
    this.r = this.clamp((v + (this.r / 255) * (1 - 2 * v)) * 255);
    this.g = this.clamp((v + (this.g / 255) * (1 - 2 * v)) * 255);
    this.b = this.clamp((v + (this.b / 255) * (1 - 2 * v)) * 255);
  }

  sepia(v = 1) {
    this.multiply([
      0.393 + 0.607 * (1 - v), 0.769 - 0.769 * (1 - v), 0.189 - 0.189 * (1 - v),
      0.349 - 0.349 * (1 - v), 0.686 + 0.314 * (1 - v), 0.168 - 0.168 * (1 - v),
      0.272 - 0.272 * (1 - v), 0.534 - 0.534 * (1 - v), 0.131 + 0.869 * (1 - v),
    ]);
  }

  saturate(v = 1) {
    this.multiply([
      0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v,
      0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v,
      0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v,
    ]);
  }

  hueRotate(angle = 0) {
    const rad = (angle / 180) * Math.PI;
    const s = Math.sin(rad), c = Math.cos(rad);
    this.multiply([
      0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
      0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
      0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
    ]);
  }

  brightness(v = 1) {
    this.r = this.clamp(this.r * v);
    this.g = this.clamp(this.g * v);
    this.b = this.clamp(this.b * v);
  }

  contrast(v = 1) {
    const i = -(0.5 * v) + 0.5;
    this.r = this.clamp(this.r * v + i * 255);
    this.g = this.clamp(this.g * v + i * 255);
    this.b = this.clamp(this.b * v + i * 255);
  }

  hsl() {
    const r = this.r / 255, g = this.g / 255, b = this.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 100, s: s * 100, l: l * 100 };
  }
}

function solveFilter(targetColor) {
  const target = targetColor;
  const targetHSL = target.hsl();
  const work = new Color(0, 0, 0);

  function loss(filters) {
    work.set(0, 0, 0);
    work.invert(filters[0] / 100);
    work.sepia(filters[1] / 100);
    work.saturate(filters[2] / 100);
    work.hueRotate(filters[3] * 3.6);
    work.brightness(filters[4] / 100);
    work.contrast(filters[5] / 100);
    const hsl = work.hsl();
    return (
      Math.abs(work.r - target.r) + Math.abs(work.g - target.g) + Math.abs(work.b - target.b) +
      Math.abs(hsl.h - targetHSL.h) + Math.abs(hsl.s - targetHSL.s) + Math.abs(hsl.l - targetHSL.l)
    );
  }

  function fix(v, i) {
    const max = i === 2 ? 7500 : (i === 4 || i === 5) ? 200 : 100;
    if (i === 3) { v = ((v % 360) + 360) % 360; }
    else { v = Math.min(max, Math.max(0, v)); }
    return v;
  }

  function spsa(A, a, c, vals, iters) {
    const alpha = 1, gamma = 1 / 6;
    let best = null, bestLoss = Infinity;
    const d = new Array(6), hi = new Array(6), lo = new Array(6);
    for (let k = 0; k < iters; k++) {
      const ck = c / Math.pow(k + 1, gamma);
      for (let i = 0; i < 6; i++) {
        d[i] = Math.random() > 0.5 ? 1 : -1;
        hi[i] = vals[i] + ck * d[i];
        lo[i] = vals[i] - ck * d[i];
      }
      const diff = loss(hi) - loss(lo);
      for (let i = 0; i < 6; i++) {
        vals[i] = fix(vals[i] - (a[i] / Math.pow(A + k + 1, alpha)) * (diff / (2 * ck)) * d[i], i);
      }
      const l = loss(vals);
      if (l < bestLoss) { best = vals.slice(); bestLoss = l; }
    }
    return { values: best, loss: bestLoss };
  }

  let wide = { loss: Infinity };
  for (let i = 0; wide.loss > 25 && i < 3; i++) {
    const r = spsa(5, [60, 180, 18000, 600, 1.2, 1.2], 15, [50, 20, 3750, 50, 100, 100], 1000);
    if (r.loss < wide.loss) wide = r;
  }
  const A1 = wide.loss + 1;
  const narrow = spsa(wide.loss, [0.25 * A1, 0.25 * A1, A1, 0.25 * A1, 0.2 * A1, 0.2 * A1], 2, wide.values, 500);
  const f = narrow.values;
  return `brightness(0) saturate(100%) invert(${Math.round(f[0])}%) sepia(${Math.round(f[1])}%) saturate(${Math.round(f[2])}%) hue-rotate(${Math.round(f[3] * 3.6)}deg) brightness(${Math.round(f[4])}%) contrast(${Math.round(f[5])}%)`;
}

function parseColor(str) {
  str = str.trim();
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    const full = hex.length === 3
      ? hex.split('').map(c => c + c).join('')
      : hex;
    return new Color(
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16)
    );
  }
  const m = str.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) return new Color(+m[1], +m[2], +m[3]);
  return null;
}

function applyIconFilter() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--secondary-bg-color');
  const color = parseColor(raw);
  if (!color) return;
  const filter = solveFilter(color);
  document.querySelectorAll('.nav-icon img').forEach(img => {
    img.style.filter = filter;
  });
}

document.addEventListener('DOMContentLoaded', applyIconFilter);
