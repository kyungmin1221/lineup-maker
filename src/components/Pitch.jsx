import { useRef, useEffect, useState } from 'react';
import { C } from '../constants';

export default function Pitch({ placedPlayers, squad, onDrag, onRemove, readOnly, phase, setPhase }) {
  const pitchRef = useRef(null);
  const dragging = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => {
    const move = e => {
      if (!dragging.current) return;
      e.preventDefault();
      const rect = pitchRef.current.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      const x = Math.max(5, Math.min(95, ((pt.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(5, Math.min(95, ((pt.clientY - rect.top) / rect.height) * 100));
      onDrag(dragging.current, x, y);
    };
    const up = () => {
      dragging.current = null;
      setDraggingId(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [onDrag]);

  const byId = id => squad.find(p => p.id === id);
  const L = C.pitchLine;

  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div
        ref={pitchRef}
        style={{
          position: 'relative', width: '100%', aspectRatio: '2/3',
          borderRadius: 16, overflow: 'hidden', userSelect: 'none',
          background: `repeating-linear-gradient(180deg,${C.pitchDark} 0%,${C.pitchDark} 12.5%,${C.pitchLight} 12.5%,${C.pitchLight} 25%)`,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* border */}
        <div style={{ position:'absolute', inset:0, borderRadius:16, border:`1.5px solid ${L}`, pointerEvents:'none', zIndex:5 }} />

        {/* phase toggle (기본/공격/수비) */}
        {phase && setPhase && (
          <div
            style={{
              position: 'absolute', top: 10, right: 10, zIndex: 20,
              display: 'flex',
              background: 'rgba(11,17,32,0.7)',
              border: `1px solid ${C.borderMid}`,
              borderRadius: 999,
              padding: 3,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            {[
              { key: 'base', label: '기본' },
              { key: 'attack', label: '공격' },
              { key: 'defense', label: '수비' },
            ].map(({ key, label }) => {
              const active = phase === key;
              return (
                <button
                  key={key}
                  onClick={() => setPhase(key)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 999,
                    border: 'none',
                    background: active ? C.accent : 'transparent',
                    color: active ? C.accentInk : C.sub,
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* halfway */}
        <div style={{ position:'absolute', left:0, right:0, top:'50%', height:1, background:L }} />

        {/* center circle */}
        <div style={{ position:'absolute', left:'50%', top:'50%', width:'26%', height:'17%', border:`1px solid ${L}`, borderRadius:'50%', transform:'translate(-50%,-50%)' }} />
        <div style={{ position:'absolute', left:'50%', top:'50%', width:5, height:5, background:L, borderRadius:'50%', transform:'translate(-50%,-50%)' }} />

        {/* top box */}
        <div style={{ position:'absolute', left:'20%', top:0, width:'60%', height:'16%', border:`1px solid ${L}`, borderTop:'none' }} />
        <div style={{ position:'absolute', left:'36%', top:0, width:'28%', height:'7%', border:`1px solid ${L}`, borderTop:'none' }} />

        {/* bottom box */}
        <div style={{ position:'absolute', left:'20%', bottom:0, width:'60%', height:'16%', border:`1px solid ${L}`, borderBottom:'none' }} />
        <div style={{ position:'absolute', left:'36%', bottom:0, width:'28%', height:'7%', border:`1px solid ${L}`, borderBottom:'none' }} />

        {/* players */}
        {placedPlayers.map(p => {
          const info = byId(p.playerId);
          if (!info) return null;
          return (
            <div
              key={p.playerId}
              className="lm-token"
              onPointerDown={readOnly ? undefined : e => {
                e.preventDefault();
                dragging.current = p.playerId;
                setDraggingId(p.playerId);
              }}
              style={{
                position: 'absolute',
                left: `${p.x}%`, top: `${p.y}%`,
                transform: 'translate(-50%,-50%)',
                transition: draggingId === p.playerId ? 'none' : 'left 0.3s ease, top 0.3s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: readOnly ? 'default' : 'grab',
                zIndex: 10,
              }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 38, height: 38,
                  borderRadius: '50%',
                  background: C.blue,
                  border: `2.5px solid ${C.blueLight}`,
                  boxShadow: `0 0 0 3px ${C.blue}35, 0 3px 10px rgba(0,0,0,0.5)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: info.number.length > 2 ? 11 : 14,
                  color: '#fff',
                }}>
                  {info.number}
                </div>

                {!readOnly && (
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onRemove(p.playerId); }}
                    style={{
                      position: 'absolute', top: -5, right: -5,
                      width: 16, height: 16, borderRadius: '50%',
                      background: C.bg, border: `1.5px solid ${C.borderMid}`,
                      color: C.sub, fontSize: 9, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div style={{
                marginTop: 4, padding: '2px 7px',
                borderRadius: 6,
                background: 'rgba(11,17,32,0.82)',
                backdropFilter: 'blur(4px)',
                fontSize: 10, fontWeight: 500,
                color: '#C8DCFF', whiteSpace: 'nowrap',
              }}>
                {info.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
