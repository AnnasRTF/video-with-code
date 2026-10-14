import React from 'react';
import {Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import {makeCue} from '../cue';
import {C, F} from '../theme';
import {Check, Chip, Cursor, night, paper, ramp, RiseText, SceneProps, Shell, Slash, Sticker, Title, useEnter} from '../ui';

const POINTS = [
  {head: 'PICK SESUAI SITUASI', sub: 'Draft: fleksibel kalau duluan, counter kalau terakhir', color: C.coral, cue: 'pick sesuai situasi'},
  {head: 'AMBIL LEVEL DULUAN', sub: 'Farm, freeze, dan prioritaskan cannon', color: C.teal, cue: 'ambil level duluan'},
  {head: 'ROTASI TEPAT WAKTU', sub: 'Turtle 2:00 dan tiap 2 menit, Lord 8:00', color: C.yellow, cue: 'rotasi tepat waktu'},
  {head: 'BACA MINIMAP', sub: 'Hero musuh ilang: mundur. Jungler keliatan: push', color: C.blue, cue: 'baca minimap'},
] as const;

const Point: React.FC<{i: number; start: number} & (typeof POINTS)[number]> = ({i, start, ...r}) => {
  const frame = useCurrentFrame();
  const p = useEnter(start);
  return (
    <div style={{...paper, position: 'absolute', left: 120, top: 300 + i * 160, width: 940, height: 136, borderRadius: 32, opacity: Math.min(1, p * 2), transform: `translateX(${(1 - p) * -110}px)`}}>
      <div style={{position: 'absolute', left: 0, top: 24, width: 8, height: 88, borderRadius: 4, background: r.color}} />
      <div style={{position: 'absolute', left: 38, top: 24, fontFamily: F.sans, fontWeight: 900, fontSize: 46, color: C.ink, letterSpacing: -1.2}}>{r.head}</div>
      <div style={{position: 'absolute', left: 38, top: 86, fontFamily: F.sans, fontWeight: 600, fontSize: 24, color: C.muted}}>{r.sub}</div>
      <div style={{position: 'absolute', right: 30, top: 32}}>
        <Check progress={ramp(frame, start + 8, start + 28, Easing.inOut(Easing.cubic))} color={r.color} size={72} />
      </div>
    </div>
  );
};

/** Scene 10: ringkasan, "bukan salah lo" yang dibantah, dan ajakan share. */
export const Outro: React.FC<SceneProps> = ({vo, a, audio, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cue = makeCue(vo, a, fps);
  const tKalah = cue('Kalau tim lo masih kalah');
  const tBohong = cue('Bohong.');
  const tMasih = cue('Itu masih di lo');
  const tShare = cue('Kalau video ini ngebantu');
  const tBiar = cue('Biar mereka ikut');

  const alibi = useEnter(tKalah);
  const slash = ramp(frame, tBohong - 4, tBohong + 12, Easing.inOut(Easing.cubic));
  const share = useEnter(tShare);
  const clicked = frame >= tShare + 60;
  const credits = useEnter(tBiar + 20);

  return (
    <Shell index={10} label="Penutup" audio={audio} dur={dur} blobs="bold">
      <Title text="Ringkasnya" />
      {POINTS.map((p, i) => (
        <Point key={p.head} i={i} start={cue(p.cue)} {...p} />
      ))}
      <div style={{...paper, position: 'absolute', left: 1120, top: 300, width: 680, height: 240, opacity: alibi, transform: `translateY(${(1 - alibi) * 60}px)`}}>
        <div style={{position: 'absolute', left: 40, top: 30, fontFamily: F.mono, fontSize: 22, color: C.muted, letterSpacing: 3}}>TIM LO MASIH KALAH?</div>
        <div style={{position: 'absolute', left: 40, top: 96}}>
          <Slash progress={slash}>
            <RiseText text="BUKAN SALAH LO" start={tKalah + 8} size={66} />
          </Slash>
        </div>
      </div>
      <Sticker text="BOHONG." start={tBohong} bg={C.coral} fg="#fff" rotate={-6} size={70} style={{left: 1140, top: 492}} />
      <Sticker text="ITU MASIH DI LO" start={tMasih} bg={C.ink} fg="#fff" rotate={3} size={32} style={{left: 1400, top: 586}} />
      <div style={{...night, position: 'absolute', left: 1120, top: 690, width: 680, height: 250, opacity: share, transform: `translateY(${(1 - share) * 60}px)`}}>
        <div style={{position: 'absolute', left: 44, top: 26, fontFamily: F.sans, fontWeight: 900, fontSize: 50, lineHeight: 1.05, letterSpacing: -1.5, color: '#fff'}}>
          SHARE KE TEMEN
          <br />
          SATU TIM
        </div>
        <div
          style={{
            position: 'absolute',
            left: 44,
            top: 150,
            padding: '16px 46px',
            borderRadius: 999,
            background: clicked ? C.nTeal : C.accent,
            color: clicked ? C.night : '#fff',
            fontFamily: F.sans,
            fontWeight: 900,
            fontSize: 34,
            letterSpacing: 2,
            boxShadow: `0 12px 34px ${clicked ? C.nTeal : C.accent}77`,
          }}
        >
          {clicked ? 'TERKIRIM' : 'SHARE'}
        </div>
        <div style={{position: 'absolute', right: 40, top: 168}}>
          <Chip text="BIAR IKUT MENDERITA" start={tBiar} bg="rgba(255,255,255,0.14)" size={22} />
        </div>
      </div>
      <Cursor from={[1700, 520]} to={[1270, 872]} start={tShare + 24} />
      <div style={{position: 'absolute', left: 120, right: 120, top: 980, textAlign: 'left', fontFamily: F.mono, fontSize: 19, color: C.muted, letterSpacing: 0.5, opacity: credits}}>
        Gambar: milik Moonton, via MLBB Fandom Wiki. Data: MLBB Hub (13 Okt 2026), patch notes 2.2.16. Dicek 14 Okt 2026.
      </div>
    </Shell>
  );
};
