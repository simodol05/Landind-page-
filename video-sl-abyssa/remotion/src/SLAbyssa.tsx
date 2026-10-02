import React from 'react';
import {
  AbsoluteFill, Easing, Img, OffthreadVideo, continueRender, delayRender,
  interpolate, staticFile, useCurrentFrame,
} from 'remotion';
import TL from './timeline.json';
import SCHEDE from '../public/schede/schede.json';
import { scrollAt } from './scroll';

// ---------------------------------------------------------------- caratteri
const fontsReady = delayRender('font');
new FontFace('Catamaran', `url(${staticFile('fonts/catamaran-latin.woff2')}) format('woff2')`, { weight: '100 900' })
  .load().then((f) => { document.fonts.add(f); continueRender(fontsReady); });

// ---------------------------------------------------------------- formato 4:5 (1080x1350)
// Stesso ambiente del video SL "servizi extra" (1080x1920), inquadrato da y=230.
const Y0 = 230;
const SCREEN = { x: 42, y: 699 - Y0, w: 992, h: 494 }; // area attiva dello schermo (bordo interno del monitor)
const ANCHOR = { x: 540, y: SCREEN.y + SCREEN.h / 2 };
const BOX = { w: 860, h: 660, cx: 540, cy: 792 }; // pannelli in primo piano
const TITLE_TOP = 112;
const SHADE = 'linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.14) 26%, rgba(0,0,0,0) 36%)';
const CSS2PX = SCREEN.w / 1280; // viewport della ripresa: 1280x637 nello schermo largo 992 px

const FONT = "'Catamaran', sans-serif";
const WHITE = '#F4EFE8';
const SOFT = '#D9D1C6';
const GOLD = 'linear-gradient(180deg, #EFD9B0 0%, #D8B985 55%, #C49E66 100%)';
const goldText: React.CSSProperties = { backgroundImage: GOLD, WebkitBackgroundClip: 'text', color: 'transparent' };

const easeIO = Easing.bezier(0.45, 0, 0.2, 1);
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function keyed(t: number, keys: [number, number][], easing = easeIO) {
  return interpolate(t, keys.map((k) => k[0]), keys.map((k) => k[1]), { easing, ...clamp });
}
const ramp = (t: number, a: number, b: number, easing = easeIO) => interpolate(t, [a, b], [0, 1], { easing, ...clamp });

// ---------------------------------------------------------------- camera
// Ingresso con arretramento, avvicinamento sul problema, vista ampia sul risultato,
// chiusura con la camera che si alza e si allarga sulla scrivania.
const ZOOM: [number, number][] = [
  [0, 1.13], [3.0, 1.03], [6.9, 1.1], [8.6, 1.06], [11.8, 1.075], [16.9, 1.1], [19.0, 1.0], [21.3, 1.015], [23.5, 1.0], [26, 1.0],
];
const LIFT_Y: [number, number][] = [[0, 0], [21.3, 0], [23.6, 92], [26, 100]]; // la scena scende: piu' parete sopra il monitor

// ---------------------------------------------------------------- pannelli (finestre reali del sito)
type CardName = keyof typeof TL.cards;
type CardCfg = { origin: number[]; fixed: boolean; out: number; back: number };
type Pose = { x: number; y: number; s: number; rx: number };

function cardSize(name: CardName) {
  const m = (SCHEDE as Record<string, { w: number; h: number; radius: number }>)[name];
  const s = Math.min(BOX.w / m.w, BOX.h / m.h);
  return { w: m.w * s, h: m.h * s, r: m.radius * s };
}
// posizione dell'elemento d'origine dentro lo schermo all'istante t
function originPose(name: CardName, t: number): Pose {
  const c = TL.cards[name] as CardCfg;
  const { w } = cardSize(name);
  const [rx, ry, rw, rh] = c.origin;
  const top = c.fixed ? ry : ry - scrollAt(t);
  return { x: SCREEN.x + (rx + rw / 2) * CSS2PX, y: SCREEN.y + (top + rh / 2) * CSS2PX, s: (rw * CSS2PX) / w, rx: 12 };
}
const FRONT: Pose = { x: BOX.cx, y: BOX.cy, s: 1, rx: 0 };
const mix = (a: Pose, b: Pose, p: number): Pose => ({
  x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, s: a.s + (b.s - a.s) * p, rx: a.rx + (b.rx - a.rx) * p,
});
const LIFT = 1.0; // uscita dallo schermo
const BACK = 0.75; // rientro

const Card: React.FC<{ name: CardName; t: number }> = ({ name, t }) => {
  const c = TL.cards[name] as CardCfg;
  if (t < c.out || t > c.back + BACK) return null;
  const pOut = ramp(t, c.out, c.out + LIFT, easeOut);
  let pose = mix(originPose(name, c.out), FRONT, pOut);
  let opacity = interpolate(pOut, [0, 0.22], [0, 1], clamp);
  let shadow = pOut;
  if (t >= c.back) {
    const p = ramp(t, c.back, c.back + BACK, Easing.bezier(0.55, 0, 0.45, 1));
    pose = mix(FRONT, originPose(name, c.back + BACK), p);
    opacity = interpolate(p, [0.4, 0.9], [1, 0], clamp);
    shadow = 1 - p;
  }
  const { w, h, r } = cardSize(name);
  return (
    <div style={{
      position: 'absolute', left: pose.x - w / 2, top: pose.y - h / 2, width: w, height: h, zIndex: 10,
      transform: `scale(${pose.s}) rotateX(${pose.rx}deg)`, transformOrigin: '50% 50%', opacity, borderRadius: r,
      boxShadow: `0 ${8 + 34 * shadow}px ${18 + 60 * shadow}px rgba(0,0,0,${0.18 + 0.5 * shadow}), 0 ${2 + 6 * shadow}px ${6 + 10 * shadow}px rgba(0,0,0,${0.25 * shadow})`,
    }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: r, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Img src={staticFile(`schede/${name}.png`)} style={{ width: '100%', height: '100%', display: 'block' }} />
        {/* riflesso morbido, come le schede in vetro del riferimento */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(125deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 38%)' }} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- schermo
const Screen: React.FC<{ t: number }> = ({ t }) => {
  const m = TL.cards.mondo; const v = TL.cards.visita; const C = TL.closing;
  // velatura mentre un pannello e' in primo piano, poi in chiusura (il sito resta visibile)
  const dim = interpolate(t,
    [m.out, m.out + 0.45, m.back + 0.1, m.back + 0.6, v.out, v.out + 0.45, v.back + 0.1, v.back + 0.6, C.logoIn - 0.3, C.logoIn + 0.6],
    [0, 0.42, 0.42, 0, 0, 0.42, 0.42, 0, 0, 0.38], clamp);
  return (
    <div style={{ position: 'absolute', left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h, overflow: 'hidden', background: '#06171d' }}>
      <OffthreadVideo src={staticFile('footage/schermo.mp4')} muted
        style={{ width: SCREEN.w, height: SCREEN.h, filter: 'brightness(0.95) contrast(1.02)' }} />
      <AbsoluteFill style={{ background: `rgba(4,8,10,${dim})` }} />
      {/* vetro dello schermo */}
      <AbsoluteFill style={{ background: 'linear-gradient(118deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 34%, rgba(255,255,255,0) 52%)' }} />
    </div>
  );
};

// ---------------------------------------------------------------- titoli (stessa animazione del riferimento)
const TITLE_SIZE = 68;
const wordIn = (t: number, d: number): React.CSSProperties => {
  const p = ramp(t, d, d + 0.5, easeOut);
  return { display: 'inline-block', marginRight: '0.24em', opacity: p, transform: `translateY(${(1 - p) * 24}px)`, filter: `blur(${(1 - p) * 9}px)` };
};
const exitStyle = (t: number, to: number): React.CSSProperties => {
  const out = ramp(t, to - 0.4, to);
  return { opacity: 1 - out, filter: `blur(${out * 6}px)`, transform: `translateY(${-10 * out}px)` };
};

const Title: React.FC<{ t: number; from: number; to: number; lines: string[]; sub?: string }> = ({ t, from, to, lines, sub }) => {
  if (t < from - 0.01 || t > to + 0.05) return null;
  let k = 0;
  const subIn = ramp(t, from + 0.55, from + 1.05, easeOut);
  return (
    <div style={{ position: 'absolute', left: 84, right: 60, top: TITLE_TOP, fontFamily: FONT, ...exitStyle(t, to) }}>
      <div style={{ fontWeight: 600, fontSize: TITLE_SIZE, lineHeight: 1.08, letterSpacing: '-0.012em' }}>
        {lines.map((line, li) => (
          <div key={li} style={{ whiteSpace: 'nowrap' }}>
            {line.split(' ').map((word, wi) => (
              <span key={wi} style={{
                ...wordIn(t, from + 0.09 * k++),
                ...(li === 1 ? goldText : { color: WHITE, textShadow: '0 2px 18px rgba(0,0,0,0.35)' }),
              }}>{word}</span>
            ))}
          </div>
        ))}
      </div>
      {sub && (
        <div style={{
          marginTop: 22, fontWeight: 500, fontSize: 36, letterSpacing: '0.01em', color: SOFT, whiteSpace: 'nowrap',
          opacity: subIn, transform: `translateY(${(1 - subIn) * 14}px)`, textShadow: '0 2px 14px rgba(0,0,0,0.5)',
        }}>{sub}</div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- funzionalita': callout in sequenza
const Callouts: React.FC<{ t: number }> = ({ t }) => {
  const C = TL.callouts;
  if (t < C.from[0] - 0.01 || t > C.to + 0.05) return null;
  return (
    <div style={{ position: 'absolute', left: 84, right: 60, top: TITLE_TOP + 4, fontFamily: FONT, ...exitStyle(t, C.to) }}>
      {C.items.map((item, i) => {
        const from = C.from[i];
        const p = ramp(t, from, from + 0.55, easeOut);
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 22, height: 78, opacity: p, whiteSpace: 'nowrap',
            transform: `translateX(${(1 - p) * -26}px)`, filter: `blur(${(1 - p) * 8}px)`,
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: 25, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(18,16,14,0.55)', border: '2px solid #D8B985',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#E6CB9A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span style={{ fontWeight: 600, fontSize: 56, letterSpacing: '-0.01em', color: WHITE, textShadow: '0 2px 18px rgba(0,0,0,0.45)' }}>{item}</span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- chiusura SL INNOVA
const Closing: React.FC<{ t: number }> = ({ t }) => {
  const C = TL.closing;
  if (t < C.logoIn) return null;
  const logo = ramp(t, C.logoIn, C.logoIn + 0.9, easeOut);
  const shine = ramp(t, C.logoIn + 0.9, C.logoIn + 2.1, easeIO);
  const name = ramp(t, C.nameIn, C.nameIn + 0.7, easeOut);
  const tag = ramp(t, C.taglineIn, C.taglineIn + 0.6, easeOut);
  const panel = ramp(t, C.ctaIn - 0.2, C.ctaIn + 0.5, easeOut);
  const cta = ramp(t, C.ctaIn, C.ctaIn + 0.55, easeOut);
  const LOGO = 176;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {/* velo morbido in alto, per staccare il marchio dalla parete */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 70% 34% at 50% 18%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)', opacity: logo }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 58, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: LOGO, height: LOGO, opacity: logo, transform: `scale(${0.9 + 0.1 * logo})`, filter: `blur(${(1 - logo) * 6}px)` }}>
          <Img src={staticFile('logo-sl.png')} style={{ width: LOGO, height: LOGO }} />
          <div style={{
            position: 'absolute', inset: 0,
            WebkitMaskImage: `url(${staticFile('logo-sl.png')})`, WebkitMaskSize: '100% 100%',
            background: `linear-gradient(105deg, rgba(255,255,255,0) ${shine * 140 - 40}%, rgba(255,255,255,0.55) ${shine * 140 - 25}%, rgba(255,255,255,0) ${shine * 140 - 10}%)`,
            mixBlendMode: 'screen',
          }} />
        </div>
        <div style={{
          marginTop: 18, fontWeight: 600, fontSize: 66, letterSpacing: `${0.34 - 0.12 * name}em`, paddingLeft: `${0.34 - 0.12 * name}em`,
          color: WHITE, opacity: name, filter: `blur(${(1 - name) * 8}px)`, textShadow: '0 2px 22px rgba(0,0,0,0.5)', whiteSpace: 'nowrap',
        }}>{C.name}</div>
        <div style={{
          marginTop: 10, fontWeight: 500, fontSize: 34, letterSpacing: '0.005em', color: SOFT, whiteSpace: 'nowrap',
          opacity: tag, transform: `translateY(${(1 - tag) * 14}px)`, textShadow: '0 2px 14px rgba(0,0,0,0.6)',
        }}>{C.tagline}</div>
      </div>
      {panel > 0 && (
        <div style={{
          position: 'absolute', left: 110, right: 110, top: 1124, height: 150, borderRadius: 24,
          background: 'rgba(18,16,14,0.62)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.10)',
          opacity: panel, transform: `translateY(${(1 - panel) * 18}px)`, textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontWeight: 700, fontSize: 56, color: WHITE, opacity: cta, transform: `translateY(${(1 - cta) * 12}px)`, letterSpacing: '0.004em', whiteSpace: 'nowrap' }}>
            {C.cta[0]}<span style={goldText}>{C.cta[1]}</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- composizione
export const SLAbyssa: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / TL.fps;
  const z = keyed(t, ZOOM);
  const lift = keyed(t, LIFT_Y);
  const fadeIn = 1 - ramp(t, 0, 0.5);
  const shade = 1 - ramp(t, TL.closing.logoIn - 0.2, TL.closing.logoIn + 0.6) * 0.4;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transformOrigin: `${ANCHOR.x}px ${ANCHOR.y}px`, transform: `translateY(${lift}px) scale(${z})` }}>
        <Img src={staticFile('ambiente.png')} style={{ position: 'absolute', left: 0, top: -Y0, width: 1080, height: 1920 }} />
        <Screen t={t} />
        <AbsoluteFill style={{ perspective: 1700, perspectiveOrigin: `${ANCHOR.x}px ${ANCHOR.y}px` }}>
          <Card name="mondo" t={t} />
          <Card name="visita" t={t} />
        </AbsoluteFill>
      </AbsoluteFill>
      {/* leggera ombra in alto per la leggibilita' dei titoli, come nel riferimento */}
      <AbsoluteFill style={{ background: SHADE, opacity: shade }} />
      {TL.titles.map((ti, i) => <Title key={i} t={t} {...ti} />)}
      <Callouts t={t} />
      <Closing t={t} />
      <AbsoluteFill style={{ background: '#000', opacity: fadeIn }} />
    </AbsoluteFill>
  );
};
