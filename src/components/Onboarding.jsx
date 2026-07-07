import { useState, useEffect } from 'react';
import { ChevronRight, ArrowRight, Share2, Plus, Play } from 'lucide-react';
import { C, FORMATIONS } from '../constants';

// 미니 축구장 (온보딩 시각용)
function MiniPitch({ formation = '4-3-3', players, width = 220, dotColor, dotBorder, children }) {
  const L = C.pitchLine;
  // players prop이 있으면 그걸 사용 (빈 배열 포함), 없으면 formation slots 사용
  const slots = players ?? FORMATIONS[formation] ?? [];
  return (
    <div style={{
      position: 'relative', width, aspectRatio: '2/3',
      borderRadius: 14, overflow: 'hidden',
      background: `repeating-linear-gradient(180deg,${C.pitchDark} 0%,${C.pitchDark} 12.5%,${C.pitchLight} 12.5%,${C.pitchLight} 25%)`,
      border: `1.5px solid ${L}`,
      boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
    }}>
      {/* halfway */}
      <div style={{ position:'absolute', left:0, right:0, top:'50%', height:1, background:L }} />
      {/* center circle */}
      <div style={{ position:'absolute', left:'50%', top:'50%', width:'26%', height:'17%', border:`1px solid ${L}`, borderRadius:'50%', transform:'translate(-50%,-50%)' }} />
      <div style={{ position:'absolute', left:'50%', top:'50%', width:4, height:4, background:L, borderRadius:'50%', transform:'translate(-50%,-50%)' }} />
      {/* boxes */}
      <div style={{ position:'absolute', left:'20%', top:0, width:'60%', height:'16%', border:`1px solid ${L}`, borderTop:'none' }} />
      <div style={{ position:'absolute', left:'36%', top:0, width:'28%', height:'7%', border:`1px solid ${L}`, borderTop:'none' }} />
      <div style={{ position:'absolute', left:'20%', bottom:0, width:'60%', height:'16%', border:`1px solid ${L}`, borderBottom:'none' }} />
      <div style={{ position:'absolute', left:'36%', bottom:0, width:'28%', height:'7%', border:`1px solid ${L}`, borderBottom:'none' }} />

      {/* players */}
      {slots.map((slot, i) => (
        <div key={slot.key ?? i} style={{
          position: 'absolute',
          left: `${slot.x}%`, top: `${slot.y}%`,
          transform: 'translate(-50%,-50%)',
          width: 22, height: 22, borderRadius: '50%',
          background: dotColor || C.blue,
          border: `2px solid ${dotBorder || C.blueLight}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          transition: 'left 0.4s ease, top 0.4s ease',
        }}>
          {slot.label ?? (i + 1)}
        </div>
      ))}

      {children}
    </div>
  );
}

// 슬라이드 2 — 실제 앱 화면처럼 보이는 정적 레이아웃
function AddAndFormationStatic() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* 포메이션 프리셋 chips */}
      <div style={{ display: 'flex', gap: 6 }}>
        {['4-3-3', '4-4-2', '3-5-2'].map((f, i) => {
          const active = i === 0;
          return (
            <div key={f} style={{
              padding: '5px 11px', borderRadius: 99,
              fontSize: 11, fontWeight: active ? 700 : 500,
              background: active ? C.accent : 'transparent',
              color: active ? C.accentInk : C.sub,
              border: `1.5px solid ${active ? C.accent : C.border}`,
            }}>{f}</div>
          );
        })}
      </div>

      {/* 미니 경기장 — 4-3-3 11명 배치 */}
      <MiniPitch formation="4-3-3" width={170} />

      {/* 대기 선수 영역 */}
      <div style={{ width: 220 }}>
        <p style={{
          fontSize: 10, fontWeight: 600, color: C.muted,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          margin: 0, marginBottom: 6,
        }}>
          대기 선수 <span style={{ color: C.blueBright }}>2</span>
        </p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {['호날두', '네이마르'].map((name) => (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 8px 4px 5px',
              borderRadius: 8,
              background: C.surface, border: `1px solid ${C.border}`,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 5,
                background: C.raised,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: C.blueLight,
              }}>교체</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: C.text }}>{name}</span>
            </div>
          ))}
        </div>

        {/* 입력 mockup */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, overflow: 'hidden',
          height: 34,
        }}>
          <div style={{
            flex: 1, padding: '0 12px',
            fontSize: 12, color: C.text,
            display: 'flex', alignItems: 'center',
          }}>
            메시
          </div>
          <div style={{
            width: 34, height: 34, flexShrink: 0,
            background: C.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.accentInk,
          }}>
            <Plus size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MovementVisual() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep(s => (s + 1) % 3), 1100);
    return () => clearInterval(timer);
  }, []);

  const positions = [
    [
      { x: 50, y: 78 }, { x: 28, y: 58 }, { x: 72, y: 58 },
      { x: 50, y: 42 }, { x: 22, y: 22 }, { x: 78, y: 22 },
    ],
    [
      { x: 50, y: 78 }, { x: 18, y: 48 }, { x: 82, y: 48 },
      { x: 50, y: 32 }, { x: 18, y: 14 }, { x: 78, y: 14 },
    ],
    [
      { x: 50, y: 78 }, { x: 14, y: 38 }, { x: 86, y: 38 },
      { x: 50, y: 22 }, { x: 14, y: 8  }, { x: 86, y: 8  },
    ],
  ];

  const ballPositions = [
    { x: 50, y: 70 },
    { x: 28, y: 42 },
    { x: 22, y: 16 },
  ];

  const ball = ballPositions[step];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {/* 시나리오 탭 mock */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {['빌드업', '역습'].map((label, i) => (
          <div key={label} style={{
            padding: '4px 12px', borderRadius: 99,
            fontSize: 11, fontWeight: i === 0 ? 700 : 500,
            background: i === 0 ? '#F59E0B' : 'transparent',
            color: i === 0 ? '#0B1120' : C.sub,
            border: `1.5px solid ${i === 0 ? '#F59E0B' : C.border}`,
          }}>{label}</div>
        ))}
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          border: `1.5px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.sub, fontSize: 14,
        }}>+</div>
      </div>

      {/* 미니 경기장 */}
      <MiniPitch
        players={positions[step].map((p, i) => ({ ...p, label: i + 1 }))}
        width={170}
      >
        {/* 공 */}
        <div style={{
          position: 'absolute',
          left: `${ball.x}%`, top: `${ball.y}%`,
          transform: 'translate(-50%,-50%)',
          width: 10, height: 10, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #fff, #ccc)',
          border: '1px solid rgba(0,0,0,0.4)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
          transition: 'left 0.9s ease-in-out, top 0.9s ease-in-out',
          zIndex: 12,
        }} />
      </MiniPitch>

      {/* AnimBar mock */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 10,
        background: C.surface, border: `1px solid ${C.border}`,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: C.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Play size={11} color={C.accentInk} style={{ marginLeft: 1 }} />
        </div>
        {[0, 1, 2].map((n) => (
          <div key={n} style={{
            padding: '3px 10px', borderRadius: 99,
            fontSize: 12, fontWeight: n === step ? 700 : 500,
            background: n === step ? '#F59E0B' : 'transparent',
            color: n === step ? '#0B1120' : C.sub,
            border: `1.5px solid ${n === step ? '#F59E0B' : C.border}`,
            transition: 'all 0.25s',
          }}>{n + 1}</div>
        ))}
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          border: `1.5px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.sub, fontSize: 14,
        }}>+</div>
      </div>
    </div>
  );
}

const SLIDES = [
  {
    title: '축구 라인업 위한\n최고의 앱',
    description: '라인업을 만들고\n팀원들에게 공유하세요',
    visual: <MiniPitch />,
  },
  {
    title: '선수 추가하기',
    description: '직접 입력하여 추가하거나\n포메이션 버튼으로 자동 배치하세요',
    visual: <AddAndFormationStatic />,
  },
  {
    title: '전술 움직임 시뮬레이션',
    description: '빌드업, 역습 등 상황별 움직임을 만들고\n스텝별로 재생해보세요',
    visual: <MovementVisual />,
  },
  {
    title: '공유하고 소통하기',
    description: '링크를 공유하고\n우리팀과 의견을 남겨요',
    visual: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{
          width: 70, height: 70, borderRadius: '50%',
          background: C.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 24px ${C.accent}55`,
        }}>
          <Share2 size={30} color={C.accentInk} />
        </div>
        <ArrowRight size={22} color={C.sub} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { name: '민', text: '4-3-3 은 어때?', color: C.blueLight },
            { name: '경', text: '나 공격수할래!', color: C.accentSoft },
            { name: '박', text: '좋은데?', color: C.blueLight },
          ].map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: C.raised, border: `1px solid ${C.borderMid}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: c.color,
                flexShrink: 0,
              }}>{c.name}</div>
              <div style={{
                padding: '5px 10px', borderRadius: '4px 12px 12px 12px',
                background: C.surface, border: `1px solid ${C.border}`,
                fontSize: 11, color: C.text, whiteSpace: 'nowrap',
              }}>{c.text}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function Onboarding({ onComplete }) {
  const [current, setCurrent] = useState(0);

  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];

  const next = () => {
    if (isLast) onComplete();
    else setCurrent((c) => c + 1);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: C.bg, color: C.text,
      display: 'flex', flexDirection: 'column',
      padding: '16px 24px 24px',
      overflow: 'hidden',
    }}>
      {/* Skip button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 36 }}>
        {!isLast && (
          <button
            onClick={onComplete}
            style={{
              background: 'none', border: 'none',
              color: C.sub, fontSize: 13, fontWeight: 500,
              padding: '8px 12px', cursor: 'pointer',
            }}
          >
            건너뛰기
          </button>
        )}
      </div>

      {/* Visual — 콘텐츠가 클 경우 내부 스크롤, 작으면 가운데 정렬 유지 */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        scrollbarWidth: 'none',
      }}>
        <div style={{
          minHeight: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '12px 0',
        }}>
          {slide.visual}
        </div>
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 8 }}>
        <h2 style={{
          fontSize: 22, fontWeight: 800,
          color: C.text, margin: 0, marginBottom: 10,
          lineHeight: 1.3, whiteSpace: 'pre-line',
          letterSpacing: '-0.01em',
        }}>
          {slide.title}
        </h2>
        <p style={{
          fontSize: 14, lineHeight: 1.6,
          color: C.sub, margin: 0,
          whiteSpace: 'pre-line',
        }}>
          {slide.description}
        </p>
      </div>

      {/* Dots */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        gap: 6, marginBottom: 20,
      }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: i === current ? 22 : 6, height: 6,
              borderRadius: 999,
              background: i === current ? C.accent : C.borderMid,
              cursor: 'pointer',
              transition: 'width 0.25s, background 0.25s',
            }}
          />
        ))}
      </div>

      {/* Continue button */}
      <button
        onClick={next}
        style={{
          width: '100%',
          padding: '16px 24px', borderRadius: 14,
          background: C.accent, color: C.accentInk,
          border: 'none', fontSize: 16, fontWeight: 700,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6,
          boxShadow: `0 8px 24px ${C.accent}40`,
          transition: 'transform 0.15s',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isLast ? '시작하기' : '계속'}
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
