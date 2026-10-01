import React from 'react';
import {
  AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, continueRender, delayRender,
  interpolate, staticFile, useCurrentFrame,
} from 'remotion';
import {
  CAPTIONS, FPS, SHOT_A, SHOT_B, TAP_B_LOCAL, TITLES, type Caption, type Title,
} from './timeline';

// ---------------------------------------------------------------- caratteri
const fontsReady = delayRender('font');
const loadFont = (family: string, file: string, style = 'normal', weight = '400 600') =>
  new FontFace(family, `url(${staticFile('fonts/' + file)}) format('woff2')`, { style, weight }).load()
    .then((f) => document.fonts.add(f));
Promise.all([
  loadFont('Bodoni Moda', 'bodoni-moda-normal-latin.woff2'),
  loadFont('Bodoni Moda', 'bodoni-moda-italic-latin.woff2', 'italic', '400 500'),
  loadFont('Inter', 'inter-normal-latin.woff2'),
]).then(() => continueRender(fontsReady));

// ---------------------------------------------------------------- palette SL
const SILVER = 'linear-gradient(100deg, #8d8f94 0%, #f4f4f5 28%, #b9bbc0 52%, #ffffff 74%, #9a9ca1 100%)';
const SERIF = "'Bodoni Moda', serif";
const SANS = "'Inter', sans-serif";
const ease = Easing.bezier(0.45, 0, 0.2, 1);

const sec = (f: number) => f / FPS;

/** valore interpolato fra fotogrammi chiave [t, v] con curva morbida */
function keyed(t: number, keys: [number, number][]) {
  const ts = keys.map((k) => k[0]);
  const vs = keys.map((k) => k[1]);
  return interpolate(t, ts, vs, { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

// ---------------------------------------------------------------- riprese
type Cam = { zoom: [number, number][]; ax: number; ay: [number, number][] };

const CAM_A: Cam = {
  zoom: [[0, 1.08], [8.8, 1.0], [13.9, 1.0], [15.3, 1.12], [15.45, 1.12], [16.2, 1.0], [16.95, 1.0], [18.0, 1.12], [18.1, 1.12], [18.75, 1.0], [19.6, 1.0], [21.4, 1.07]],
  ax: 540,
  ay: [[0, 700], [12, 700], [13.9, 640], [16.95, 600], [19.6, 520]],
};
const CAM_B: Cam = {
  zoom: [[0, 1.0], [1.2, 1.0], [2.9, 1.12]],
  ax: 540,
  ay: [[0, 860]],
};

const Shot: React.FC<{ src: string; cam: Cam; localT: number }> = ({ src, cam, localT }) => {
  const z = keyed(localT, cam.zoom);
  const ay = cam.ay.length > 1 ? keyed(localT, cam.ay) : cam.ay[0][1];
  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        style={{
          width: 1080, height: 1920, position: 'absolute', left: 0, top: 0,
          transformOrigin: `${cam.ax}px ${ay}px`, transform: `scale(${z})`,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- testi
const appear = (t: number, from: number, to: number, fade = 0.32) => {
  const inP = interpolate(t, [from, from + fade], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const outP = interpolate(t, [to - fade * 0.8, to], [1, 0], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return Math.min(inP, outP);
};

/** "EXTRA" in argento, il resto in bianco */
const renderLine = (line: string) => {
  const parts = line.split(/(EXTRA)/);
  return parts.map((p, i) => p === 'EXTRA'
    ? <span key={i} style={{ fontFamily: SANS, fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.86em', background: SILVER, WebkitBackgroundClip: 'text', color: 'transparent' }}>EXTRA</span>
    : <React.Fragment key={i}>{p}</React.Fragment>);
};

const TitleView: React.FC<{ title: Title; t: number }> = ({ title, t }) => {
  const o = appear(t, title.from, title.to);
  if (o <= 0) return null;
  const rise = (1 - appear(t, title.from, title.to + 99)) * 22;

  if (title.kind === 'hook') {
    // gancio: card di vetro nero con filo d'argento, al centro, sopra la landing oscurata
    return (
      <div style={{ position: 'absolute', left: 110, width: 860, top: 640, display: 'flex', justifyContent: 'center', opacity: o, transform: `translateY(${rise}px)` }}>
        <div style={{ padding: 2, borderRadius: 34, background: SILVER, boxShadow: '0 0 90px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ borderRadius: 32, background: 'rgba(10,10,12,0.9)', padding: '40px 64px 46px', textAlign: 'center' }}>
            {title.lines.map((l, i) => (
              <div key={i} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 80, lineHeight: 1.14, color: '#fff', whiteSpace: 'nowrap' }}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (title.kind === 'end') {
    return (
      <div style={{ position: 'absolute', top: 1060, left: 90, width: 900, textAlign: 'center', opacity: o, transform: `translateY(${rise}px)` }}>
        {title.lines.map((l, i) => (
          <div key={i} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 76, lineHeight: 1.16, color: '#fff' }}>{renderLine(l)}</div>
        ))}
      </div>
    );
  }

  // terzo inferiore: vetro nero con filo d'argento
  const single = title.lines.length === 1 && title.lines[0].includes('·');
  return (
    <div style={{ position: 'absolute', left: 130, width: 820, bottom: 1920 - 1272, display: 'flex', justifyContent: 'center', opacity: o, transform: `translateY(${rise}px)` }}>
      <div style={{ padding: 2, borderRadius: 30, background: SILVER, boxShadow: '0 0 70px 40px rgba(0,0,0,0.45)' }}>
        <div style={{ borderRadius: 28, background: 'rgba(10,10,12,0.88)', padding: single ? '30px 44px' : '28px 50px 32px', textAlign: 'center' }}>
          {single ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, whiteSpace: 'nowrap' }}>
              <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 60, color: '#fff' }}>Il Rustico</span>
              <span style={{ fontFamily: SERIF, fontSize: 44, color: '#c9cbd0' }}>·</span>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, letterSpacing: '0.18em', textTransform: 'uppercase', background: SILVER, WebkitBackgroundClip: 'text', color: 'transparent' }}>Progetto realizzato</span>
            </div>
          ) : title.lines.map((l, i) => (
            <div key={i} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 56, lineHeight: 1.16, color: '#fff', whiteSpace: 'nowrap' }}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CaptionView: React.FC<{ c: Caption; t: number }> = ({ c, t }) => {
  const o = appear(t, c.from, c.to, 0.16);
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 140, width: 800, bottom: 1920 - 1440, display: 'flex', justifyContent: 'center', opacity: o }}>
      <div style={{
        fontFamily: SANS, fontWeight: 600, fontSize: 43, lineHeight: 1.28, color: '#fff', textAlign: 'center',
        background: 'rgba(0,0,0,0.86)', padding: '12px 26px 14px', borderRadius: 22, maxWidth: 800,
        boxShadow: '0 0 34px 22px rgba(0,0,0,0.55)', textShadow: '0 2px 10px rgba(0,0,0,0.85)',
      }}>{c.text}</div>
    </div>
  );
};

// ---------------------------------------------------------------- chiusura SL
const Chiusura: React.FC<{ t: number }> = ({ t }) => {
  const s = t - 24.4;
  const logoIn = interpolate(s, [0.15, 1.2], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = 0.94 + 0.06 * logoIn + 0.012 * Math.max(0, s - 1.2) / 8; // solo scala uniforme: il logo non si deforma
  const rule = interpolate(s, [0.5, 1.6], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sweep = interpolate(s, [1.0, 3.2], [-0.4, 1.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 70% 42% at 50% 36%, rgba(120,122,128,0.20) 0%, rgba(0,0,0,0) 70%)', opacity: logoIn }} />
      <div style={{ position: 'absolute', top: 330, left: 540 - 250, width: 500, height: 500, opacity: logoIn, transform: `scale(${scale})` }}>
        <Img src={staticFile('logo-sl.png')} style={{ width: 500, height: 500 }} />
        {/* riflesso argento che attraversa il logo una sola volta, solo luce: il disegno non cambia */}
        <div style={{
          position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.35,
          WebkitMaskImage: `url(${staticFile('logo-sl.png')})`, WebkitMaskSize: '100% 100%',
          background: `linear-gradient(115deg, rgba(255,255,255,0) ${sweep * 100 - 12}%, rgba(255,255,255,0.9) ${sweep * 100}%, rgba(255,255,255,0) ${sweep * 100 + 12}%)`,
        }} />
      </div>
      <div style={{ position: 'absolute', top: 905, left: 0, width: 1080, display: 'flex', justifyContent: 'center', gap: 28, alignItems: 'center' }}>
        <div style={{ width: 150 * rule, height: 1.5, background: SILVER, opacity: 0.85 }} />
        <div style={{ width: 8, height: 8, transform: 'rotate(45deg)', background: SILVER, opacity: rule }} />
        <div style={{ width: 150 * rule, height: 1.5, background: SILVER, opacity: 0.85 }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- tocco (ripresa B)
const Tap: React.FC<{ localT: number }> = ({ localT }) => {
  const d = localT - TAP_B_LOCAL;
  if (d < -0.12 || d > 0.7) return null;
  const p = interpolate(d, [-0.12, 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const o = interpolate(d, [-0.12, 0, 0.7], [0, 0.85, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const r = 40 + 70 * p;
  return (
    <div style={{
      position: 'absolute', left: 160 - r, top: 786 - r, width: r * 2, height: r * 2, borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.95)', background: 'rgba(255,255,255,0.18)', opacity: o,
      boxShadow: '0 0 24px rgba(0,0,0,0.25)',
    }} />
  );
};

// ---------------------------------------------------------------- composizione
export const SLReel: React.FC = () => {
  const frame = useCurrentFrame();
  const t = sec(frame);
  const f = (s: number) => Math.round(s * FPS);

  const hookDark = keyed(t, [[0, 0.42], [7.0, 0.42], [8.7, 0]]);
  const bIn = 1; // stacco netto fra le due riprese
  const toBlack = interpolate(t, [24.05, 24.5], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // velatura morbida dietro i testi, solo quando ci sono testi sul sito
  const scrim = interpolate(t, [0.15, 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Sequence from={0} durationInFrames={f(SHOT_A.to)}>
        <Shot src={SHOT_A.src} cam={CAM_A} localT={t} />
      </Sequence>
      <Sequence from={f(SHOT_B.from)} durationInFrames={f(SHOT_B.to - SHOT_B.from)}>
        <AbsoluteFill style={{ opacity: bIn }}>
          <Shot src={SHOT_B.src} cam={CAM_B} localT={t - SHOT_B.from} />
          <Tap localT={t - SHOT_B.from} />
        </AbsoluteFill>
      </Sequence>

      {/* gancio: landing leggermente oscurata, poi emerge */}
      <AbsoluteFill style={{ backgroundColor: '#000', opacity: hookDark }} />
      {/* fascia nera sfumata dietro titoli e sottotitoli: i testi restano leggibili su ogni sfondo */}
      <div style={{
        position: 'absolute', left: 0, top: 940, width: 1080, height: 740, opacity: scrim,
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 22%, rgba(0,0,0,0.66) 38%, rgba(0,0,0,0.70) 62%, rgba(0,0,0,0.38) 82%, rgba(0,0,0,0) 100%)',
      }} />

      <AbsoluteFill style={{ backgroundColor: '#000', opacity: toBlack }} />
      <Sequence from={f(24.4)}>
        <Chiusura t={t} />
      </Sequence>

      {TITLES.map((ti, i) => <TitleView key={i} title={ti} t={t} />)}
      {CAPTIONS.map((c, i) => <CaptionView key={i} c={c} t={t} />)}
    </AbsoluteFill>
  );
};
