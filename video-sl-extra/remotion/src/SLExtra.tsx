import React from 'react';
import {
  AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, continueRender, delayRender,
  interpolate, staticFile, useCurrentFrame,
} from 'remotion';
import TL from './timeline.json';
import SCHEDE from '../public/schede/schede.json';
import { scrollAt } from './scroll';

// ---------------------------------------------------------------- caratteri
const fontsReady = delayRender('font');
new FontFace('Catamaran', `url(${staticFile('fonts/catamaran-latin.woff2')}) format('woff2')`, { weight: '100 900' })
  .load().then((f) => { document.fonts.add(f); continueRender(fontsReady); });

// ---------------------------------------------------------------- formati
// Ambiente: fotogramma pulito del video KnowledgeDesk (1080x1920).
// 4:5 (feed Instagram / LinkedIn): inquadrato da y=230, 1080x1350.
// 9:16 (TikTok / Reel): inquadratura intera, titoli e invito dentro le zone sicure delle app
// (niente testi nei ~250 px in alto, nei ~460 px in basso e a ridosso del bordo destro).
export type Format = '4x5' | '9x16';
type Layout = {
  y0: number; screen: { x: number; y: number; w: number; h: number }; anchor: { x: number; y: number };
  box: { w: number; h: number; cx: number; cy: number }; titleTop: number; captionTop: number;
  cta: { top: number; side: number }; shade: string;
};
function layoutFor(format: Format): Layout {
  const y0 = format === '4x5' ? 230 : 0;
  const screen = { x: 42, y: 699 - y0, w: 992, h: 494 }; // area attiva dello schermo (bordo interno del monitor)
  const anchor = { x: 540, y: screen.y + screen.h / 2 };
  return format === '4x5'
    ? { y0, screen, anchor, box: { w: 660, h: 720, cx: 540, cy: 772 }, titleTop: 112, captionTop: 1162,
        cta: { top: 1028, side: 96 }, shade: 'linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.12) 26%, rgba(0,0,0,0) 36%)' }
    : { y0, screen, anchor, box: { w: 660, h: 720, cx: 540, cy: 1000 }, titleTop: 300, captionTop: 1392,
        cta: { top: 1252, side: 120 }, shade: 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.14) 24%, rgba(0,0,0,0) 32%)' };
}
const CSS2PX = 992 / 1280; // viewport della ripresa: 1280x637 nello schermo largo 992 px

const FONT = "'Catamaran', sans-serif";
const WHITE = '#F4EFE8';
const GOLD = 'linear-gradient(180deg, #EFD9B0 0%, #D8B985 55%, #C49E66 100%)';

const easeIO = Easing.bezier(0.45, 0, 0.2, 1);
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function keyed(t: number, keys: [number, number][], easing = easeIO) {
  return interpolate(t, keys.map((k) => k[0]), keys.map((k) => k[1]), { easing, ...clamp });
}
const ramp = (t: number, a: number, b: number, easing = easeIO) => interpolate(t, [a, b], [0, 1], { easing, ...clamp });

// ---------------------------------------------------------------- camera
// Come nel riferimento: leggero arretramento iniziale, poi avvicinamenti lenti e continui.
const CAM: [number, number][] = [[0, 1.065], [3.2, 1.02], [10, 1.034], [16.5, 1.026], [20.6, 1.05], [21.3, 1.03], [26, 1.048]];

// ---------------------------------------------------------------- schede
type CardName = keyof typeof TL.cards;
type CardCfg = { rect: number[]; out: number; back?: number; recede?: number; gone?: number; caption?: string };

function cardSize(name: CardName, BOX: Layout['box']) {
  const m = (SCHEDE as Record<string, { w: number; h: number; radius: number }>)[name];
  const s = Math.min(BOX.w / m.w, BOX.h / m.h);
  return { w: m.w * s, h: m.h * s, r: m.radius * s };
}

// posizione della scheda dentro lo schermo (coordinate del fotogramma) all'istante t
function originPose(L: Layout, name: CardName, t: number) {
  const SCREEN = L.screen;
  const c = TL.cards[name] as CardCfg;
  const { w } = cardSize(name, L.box);
  const [rx, ry, rw] = c.rect;
  const ox = SCREEN.x + rx * CSS2PX;
  const oy = SCREEN.y + (ry - scrollAt(t)) * CSS2PX;
  const ow = rw * CSS2PX;
  const s = Math.min(ow / w, 0.6);
  const { h } = cardSize(name, L.box);
  const top = Math.max(oy, SCREEN.y + 6);
  const cy = Math.min(top + (h * s) / 2, SCREEN.y + SCREEN.h - (h * s) / 2 + 30);
  return { x: ox + ow / 2, y: cy, s, rx: 14, ry: 0, light: 1 };
}

type Pose = { x: number; y: number; s: number; rx: number; ry: number; light: number };
const FRONT = (L: Layout): Pose => ({ x: L.box.cx, y: L.box.cy, s: 1, rx: 0, ry: 0, light: 1 });
const SIDE = (L: Layout, dir: -1 | 1): Pose => ({ x: L.box.cx + dir * 318, y: L.box.cy + 10, s: 0.6, rx: 0, ry: -dir * 24, light: 0.5 });
const mix = (a: Pose, b: Pose, p: number): Pose => ({
  x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, s: a.s + (b.s - a.s) * p,
  rx: a.rx + (b.rx - a.rx) * p, ry: a.ry + (b.ry - a.ry) * p, light: a.light + (b.light - a.light) * p,
});

const LIFT = 1.0; // durata dell'uscita dallo schermo
const BACK = 0.75; // durata del rientro
const SIDE_DUR = 0.8;

function cardState(L: Layout, name: CardName, t: number, side: -1 | 1) {
  const c = TL.cards[name] as CardCfg;
  if (t < c.out) return null;
  let pose: Pose; let opacity = 1; let z = 10; let shadow = 1;
  const pOut = ramp(t, c.out, c.out + LIFT, easeOut);
  pose = mix(originPose(L, name, c.out), FRONT(L), pOut);
  opacity = interpolate(pOut, [0, 0.22], [0, 1], clamp);
  shadow = pOut;
  if (c.recede !== undefined && t >= c.recede) {
    const p = ramp(t, c.recede, c.recede + SIDE_DUR);
    pose = mix(FRONT(L), SIDE(L, side), p);
    z = 5;
  }
  if (c.gone !== undefined && t >= c.gone) {
    const p = ramp(t, c.gone, c.gone + 0.7);
    pose = mix(SIDE(L, side), { ...SIDE(L, side), x: L.box.cx + side * 560, s: 0.5 }, p);
    opacity = 1 - p;
    z = 2;
  }
  if (c.back !== undefined && t >= c.back) {
    const from = c.recede !== undefined && t >= c.recede ? SIDE(L, side) : FRONT(L);
    const p = ramp(t, c.back, c.back + BACK, Easing.bezier(0.55, 0, 0.45, 1));
    pose = mix(from, originPose(L, name, c.back + BACK), p);
    opacity = interpolate(p, name === 'orari' ? [0.3, 0.68] : [0.45, 0.9], [opacity, 0], clamp);
    shadow = 1 - p;
    if (p >= 1) return null;
  }
  return { pose, opacity, z, shadow };
}

const Card: React.FC<{ L: Layout; name: CardName; t: number; side: -1 | 1 }> = ({ L, name, t, side }) => {
  const st = cardState(L, name, t, side);
  if (!st) return null;
  const { w, h, r } = cardSize(name, L.box);
  const { pose, opacity, z, shadow } = st;
  return (
    <div
      style={{
        position: 'absolute', left: pose.x - w / 2, top: pose.y - h / 2, width: w, height: h, zIndex: z,
        transform: `scale(${pose.s}) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg)`,
        transformOrigin: '50% 50%', opacity, borderRadius: r,
        boxShadow: `0 ${8 + 34 * shadow}px ${18 + 60 * shadow}px rgba(0,0,0,${0.18 + 0.5 * shadow}), 0 ${2 + 6 * shadow}px ${6 + 10 * shadow}px rgba(0,0,0,${0.25 * shadow})`,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, borderRadius: r, overflow: 'hidden', filter: `brightness(${pose.light})` }}>
        <Img src={staticFile(`schede/${name}.png`)} style={{ width: '100%', height: '100%', display: 'block' }} />
        {/* riflesso morbido, come le schede in vetro del riferimento */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(125deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 38%)' }} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- schermo
const Screen: React.FC<{ SCREEN: Layout['screen']; t: number }> = ({ SCREEN, t }) => {
  // velatura dello schermo mentre una scheda e' in primo piano (attenzione sulla scheda)
  const dim = interpolate(t, [6.85, 7.3, 9.6, 10.1, 11.25, 11.7, 17.1, 17.6], [0, 0.42, 0.42, 0, 0, 0.42, 0.42, 0], clamp);
  const L = TL.logo;
  const off = ramp(t, L.screenOff, L.screenOff + 0.45);
  const logoIn = ramp(t, L.logoIn, L.logoIn + 0.9, easeOut);
  const shine = ramp(t, L.logoIn + 1.0, L.logoIn + 2.2, easeIO);
  return (
    <div style={{ position: 'absolute', left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h, overflow: 'hidden', background: '#050505' }}>
      <Sequence durationInFrames={Math.round(TL.screenCaptureUntil * TL.fps)}>
        <OffthreadVideo src={staticFile('footage/schermo.mp4')} muted
          style={{ width: SCREEN.w, height: SCREEN.h, filter: 'brightness(0.9) contrast(1.02)' }} />
      </Sequence>
      <AbsoluteFill style={{ background: `rgba(8,6,5,${dim})` }} />
      {/* chiusura: logo SL argentato su fondo nero */}
      <AbsoluteFill style={{ background: '#000', opacity: off }} />
      {logoIn > 0 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: logoIn }}>
          <div style={{ position: 'relative', width: 400, height: 400, transform: `scale(${0.93 + 0.07 * logoIn})` }}>
            <Img src={staticFile('logo-sl.png')} style={{ width: 400, height: 400 }} />
            <div style={{
              position: 'absolute', inset: 0,
              WebkitMaskImage: `url(${staticFile('logo-sl.png')})`, WebkitMaskSize: '100% 100%',
              background: `linear-gradient(105deg, rgba(255,255,255,0) ${shine * 140 - 40}%, rgba(255,255,255,0.55) ${shine * 140 - 25}%, rgba(255,255,255,0) ${shine * 140 - 10}%)`,
              mixBlendMode: 'screen',
            }} />
          </div>
        </AbsoluteFill>
      )}
      {/* vetro dello schermo */}
      <AbsoluteFill style={{ background: 'linear-gradient(118deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 34%, rgba(255,255,255,0) 52%)' }} />
    </div>
  );
};

// ---------------------------------------------------------------- titoli
const TITLE_SIZE = 68;
const Title: React.FC<{ top: number; t: number; from: number; to: number; lines: string[] }> = ({ top, t, from, to, lines }) => {
  if (t < from - 0.01 || t > to + 0.05) return null;
  const out = ramp(t, to - 0.4, to);
  let k = 0;
  return (
    <div style={{
      position: 'absolute', left: 84, right: 60, top, fontFamily: FONT, fontWeight: 600,
      fontSize: TITLE_SIZE, lineHeight: 1.08, letterSpacing: '-0.012em',
      opacity: 1 - out, filter: `blur(${out * 6}px)`, transform: `translateY(${-10 * out}px)`,
    }}>
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: 'nowrap' }}>
          {line.split(' ').map((word, wi) => {
            const d = from + 0.09 * k++;
            const p = ramp(t, d, d + 0.5, easeOut);
            const style: React.CSSProperties = {
              display: 'inline-block', marginRight: '0.24em', opacity: p,
              transform: `translateY(${(1 - p) * 24}px)`, filter: `blur(${(1 - p) * 9}px)`,
              textShadow: '0 2px 18px rgba(0,0,0,0.35)',
            };
            if (li === 1) Object.assign(style, { backgroundImage: GOLD, WebkitBackgroundClip: 'text', color: 'transparent', textShadow: 'none' });
            else style.color = WHITE;
            return <span key={wi} style={style}>{word}</span>;
          })}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- didascalie delle schede (8-13 s)
const Caption: React.FC<{ top: number; t: number; text: string; from: number; to: number }> = ({ top, t, text, from, to }) => {
  const a = ramp(t, from, from + 0.45, easeOut) * (1 - ramp(t, to - 0.3, to));
  if (a <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top, textAlign: 'center', fontFamily: FONT, fontWeight: 600,
      fontSize: 46, letterSpacing: '0.005em', color: WHITE, opacity: a, transform: `translateY(${(1 - ramp(t, from, from + 0.45, easeOut)) * 16}px)`,
      textShadow: '0 2px 6px rgba(0,0,0,0.85), 0 0 28px rgba(0,0,0,0.9)',
    }}>{text}</div>
  );
};

// ---------------------------------------------------------------- invito finale
const Cta: React.FC<{ pos: Layout['cta']; t: number }> = ({ pos, t }) => {
  const L = TL.logo; const C = TL.cta;
  const panel = ramp(t, L.cta - 0.2, L.cta + 0.5, easeOut);
  const a = ramp(t, L.cta, L.cta + 0.55, easeOut);
  const b = ramp(t, L.firma, L.firma + 0.55, easeOut);
  if (panel <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: pos.side, right: pos.side, top: pos.top, height: 196, borderRadius: 24,
      background: 'rgba(18,16,14,0.58)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.09)',
      opacity: panel, transform: `translateY(${(1 - panel) * 18}px)`, fontFamily: FONT, textAlign: 'center',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10,
    }}>
      <div style={{ fontWeight: 700, fontSize: 58, color: WHITE, opacity: a, transform: `translateY(${(1 - a) * 12}px)`, letterSpacing: '0.004em' }}>
        {C.pre}<span style={{ backgroundImage: GOLD, WebkitBackgroundClip: 'text', color: 'transparent' }}>{C.key}</span>{C.post}
      </div>
      <div style={{ fontWeight: 400, fontSize: 29, color: '#D9D1C6', opacity: b, letterSpacing: '0.01em' }}>{C.firma}</div>
    </div>
  );
};

// ---------------------------------------------------------------- composizione
export const SLExtra: React.FC<{ format: Format }> = ({ format }) => {
  const L = layoutFor(format);
  const { anchor: ANCHOR } = L;
  const frame = useCurrentFrame();
  const t = frame / TL.fps;
  const z = keyed(t, CAM);
  const fadeIn = 1 - ramp(t, 0, 0.45);
  const cards = TL.cards;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transformOrigin: `${ANCHOR.x}px ${ANCHOR.y}px`, transform: `scale(${z})` }}>
        <Img src={staticFile('ambiente.png')} style={{ position: 'absolute', left: 0, top: -L.y0, width: 1080, height: 1920 }} />
        <Screen SCREEN={L.screen} t={t} />
        <AbsoluteFill style={{ perspective: 1700, perspectiveOrigin: `${ANCHOR.x}px ${ANCHOR.y}px` }}>
          <Card L={L} name="momento" t={t} side={-1} />
          <Card L={L} name="colazione" t={t} side={-1} />
          <Card L={L} name="essenza" t={t} side={1} />
          <Card L={L} name="orari" t={t} side={1} />
        </AbsoluteFill>
      </AbsoluteFill>
      {/* leggera ombra in alto per la leggibilita' dei titoli, come nel riferimento */}
      <AbsoluteFill style={{ background: L.shade }} />
      {TL.titles.map((ti, i) => <Title key={i} top={L.titleTop} t={t} {...ti} />)}
      <Caption top={L.captionTop} t={t} text={cards.colazione.caption} from={cards.colazione.out + 0.35} to={cards.colazione.recede} />
      <Caption top={L.captionTop} t={t} text={cards.essenza.caption} from={cards.essenza.out + 0.35} to={cards.essenza.recede} />
      <Caption top={L.captionTop} t={t} text={cards.orari.caption} from={cards.orari.out + 0.35} to={cards.orari.back} />
      <Cta pos={L.cta} t={t} />
      <AbsoluteFill style={{ background: '#000', opacity: fadeIn }} />
    </AbsoluteFill>
  );
};
