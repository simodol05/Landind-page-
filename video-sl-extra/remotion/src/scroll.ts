import TL from './timeline.json';

// Stessa curva di capture/screen.mjs: la posizione di scorrimento della pagina nello schermo.
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function scrollAt(t: number): number {
  const k = TL.scroll as [number, number][];
  if (t <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, y0] = k[i];
    const [t1, y1] = k[i + 1];
    if (t <= t1) return y0 + (y1 - y0) * easeInOut((t - t0) / (t1 - t0));
  }
  return k[k.length - 1][1];
}
