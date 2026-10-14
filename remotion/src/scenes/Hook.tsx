import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import {makeCue} from '../cue';
import {C, F} from '../theme';
import {Chip, paper, ramp, RiseText, Saber, SaberDefs, SceneProps, Shell, Sticker, Strike, useEnter} from '../ui';

const CHAT = [
  {who: 'JUNGLE', msg: 'XP lane ngapain??', color: C.teal},
  {who: 'GOLD', msg: 'AFK ya?', color: C.yellow},
  {who: 'ROAM', msg: 'report XP lane!', color: C.coral},
] as const;

/** Scene 1: hook. Skor tertinggal, chat tim, janji kampanye yang "ilang", lalu judul. */
export const Hook: React.FC<SceneProps> = ({vo, a, audio, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cue = makeCue(vo, a, fps);
  const tIn = cue('Lo pick');
  const tLv = cue('lawan udah level');
  const tTurtle = cue('Turtle diambil');
  const tTurret = cue('turret roboh');
  const tChat = cue('tim nyalahin lo');
  const tPoster = cue('Lo main kayak');
  const tIlang = cue('ilang. Tenang');
  const tTenang = cue('Tenang.');
  const tTitle = cue('XP lane kebal itu');
  const tDraft = cue('draft,');
  const tFarm = cue('farming,');
  const tPeta = cue('baca peta');
  const tSkip = cue('Dengerin sampai habis');

  const board = useEnter(tIn + 4);
  const lv = useEnter(tLv, 'pop');
  const phaseA = 1 - ramp(frame, tPoster - 6, tPoster + 14);
  const posterIn = useEnter(tPoster, 'pop');
  const posterOut = ramp(frame, tIlang, tIlang + 16);
  const slash = ramp(frame, tIlang, tIlang + 14, Easing.inOut(Easing.cubic));
  const tenang = useEnter(tTenang, 'pop');
  const tenangOut = ramp(frame, tTitle - 6, tTitle + 10);
  const underline = ramp(frame, tTitle + 14, tTitle + 40, Easing.inOut(Easing.cubic));

  return (
    <Shell index={1} label="Hook" audio={audio} dur={dur}>
      {/* fase A: skor dan chat */}
      <div style={{opacity: phaseA}}>
        <div style={{...paper, position: 'absolute', left: 140, top: 250, width: 760, height: 280, opacity: board, transform: `translateY(${(1 - board) * 50}px)`}}>
          {[
            {who: 'KAMU', color: C.blue, v: 3, fill: 0.46},
            {who: 'LAWAN', color: C.coral, v: 4, fill: 0.7},
          ].map((r, i) => {
            const isEnemy = i === 1;
            const popped = isEnemy ? 1 + 0.35 * (1 - Math.min(1, lv)) : 1;
            return (
              <div key={r.who} style={{position: 'absolute', left: 48, right: 48, top: 40 + i * 110}}>
                <div style={{fontFamily: F.sans, fontWeight: 800, fontSize: 34, color: C.ink}}>{r.who}</div>
                <div style={{position: 'absolute', right: 0, top: -14, fontFamily: F.sans, fontWeight: 900, fontSize: 62 * popped, color: r.color}}>
                  LV {isEnemy && frame < tLv ? 3 : r.v}
                </div>
                <div style={{marginTop: 18, height: 14, borderRadius: 7, background: 'rgba(18,21,40,0.08)'}}>
                  <div style={{width: `${(isEnemy && frame < tLv ? 0.14 : r.fill) * 100}%`, height: '100%', borderRadius: 7, background: r.color, boxShadow: `0 4px 14px ${r.color}66`}} />
                </div>
              </div>
            );
          })}
        </div>
        <Sticker text="TURTLE DIAMBIL" start={tTurtle} bg={C.coral} fg="#fff" rotate={-5} size={50} style={{left: 200, top: 600}} />
        <Sticker text="TURRET ROBOH" start={tTurret} bg={C.yellow} rotate={4} size={50} style={{left: 330, top: 740}} />
        {CHAT.map((c, i) => {
          const p = useEnter(tChat + i * 16);
          return (
            <div
              key={c.who}
              style={{
                ...paper,
                position: 'absolute',
                left: 1000,
                top: 270 + i * 130,
                width: 780,
                height: 96,
                borderRadius: 28,
                opacity: Math.min(1, p * 2),
                transform: `translateX(${(1 - p) * 120}px)`,
              }}
            >
              <div style={{position: 'absolute', left: 24, top: 28}}>
                <Chip text={c.who} start={tChat + i * 16} bg={c.color} fg={c.color === C.yellow ? C.ink : '#fff'} size={20} />
              </div>
              <div style={{position: 'absolute', left: 190, top: 24, fontFamily: F.sans, fontWeight: 600, fontSize: 38, color: C.ink}}>{c.msg}</div>
            </div>
          );
        })}
      </div>

      {/* fase B: poster janji kampanye yang "ilang" */}
      {posterIn > 0.01 && posterOut < 1 ? (
        <div
          style={{
            ...paper,
            position: 'absolute',
            left: 560,
            top: 320,
            width: 800,
            height: 440,
            opacity: Math.min(1, posterIn * 3) * (1 - posterOut),
            transform: `scale(${(0.7 + 0.3 * posterIn) * (1 - 0.35 * posterOut)}) rotate(${-2 + posterOut * 8}deg)`,
          }}
        >
          <div style={{position: 'absolute', left: 0, right: 0, top: 110, textAlign: 'center', fontFamily: F.sans, fontWeight: 900, fontSize: 84, color: C.ink, letterSpacing: -2}}>
            JANJI KAMPANYE
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 40, color: C.yellow}}>
            awalnya manis banget
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 320, textAlign: 'center', fontSize: 52, letterSpacing: 18, color: C.yellow}}>★ ★ ★ ★ ★</div>
        </div>
      ) : null}
      {slash > 0 && posterOut < 1 ? (
        <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <SaberDefs />
          <Saber d="M 480 250 L 1440 830" progress={slash} color={C.coral} width={8} />
        </svg>
      ) : null}
      {tenang > 0.01 ? (
        <Sticker text="TENANG" start={tTenang} bg={C.teal} fg="#fff" rotate={-3} size={110} style={{left: 700, top: 440, opacity: Math.min(1, tenang * 3) * (1 - tenangOut)}} />
      ) : null}

      {/* fase C: judul */}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{position: 'absolute', top: 330}}>
          <RiseText text="XP LANE KEBAL" start={tTitle} size={176} />
        </div>
      </AbsoluteFill>
      <svg width={1400} height={80} style={{position: 'absolute', left: 260, top: 590, overflow: 'visible'}}>
        <SaberDefs />
        <Saber d="M 120 40 L 1280 40" progress={underline} color={C.coral} width={7} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 710, display: 'flex', justifyContent: 'center', gap: 36}}>
        <Chip text="DRAFT" start={tDraft} bg={C.coral} size={48} />
        <Chip text="FARMING" start={tFarm} bg={C.teal} size={48} />
        <Chip text="PETA" start={tPeta} bg={C.yellow} fg={C.ink} size={48} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 860, display: 'flex', justifyContent: 'center'}}>
        <Chip text="DENGERIN SAMPAI HABIS" start={tSkip} bg={C.violet} size={34} />
      </div>
    </Shell>
  );
};
