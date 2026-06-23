import { useRef, useEffect, useState } from 'react';
import { C } from '../constants';

const TAP_MOVE_THRESHOLD = 5; // 픽셀: 이만큼 안 움직였으면 탭으로 간주

export default function Pitch({ placedPlayers, squad, onDrag, onRemove, onLabelChange, readOnly, phase, setPhase }) {
  const pitchRef = useRef(null);
  const dragging = useRef(null);
  const downPos = useRef(null);     // pointerdown 시점 좌표
  const didMove = useRef(false);    // 임계값 이상 움직였는지
  const [draggingId, setDraggingId] = useState(null);
  const [editingPlayerId, setEditingPlayerId] = useState(null);

  useEffect(() => {
    const move = e => {
      if (!dragging.current) return;
      const pt = e.touches ? e.touches[0] : e;

      // 움직임 임계값 검사 — 탭/드래그 구분
      if (!didMove.current && downPos.current) {
        const dx = Math.abs(pt.clientX - downPos.current.x);
        const dy = Math.abs(pt.clientY - downPos.current.y);
        if (dx > TAP_MOVE_THRESHOLD || dy > TAP_MOVE_THRESHOLD) {
          didMove.current = true;
        }
      }

      // 실제로 움직였을 때만 드래그 처리 + preventDefault
      if (didMove.current) {
        e.preventDefault();
        const rect = pitchRef.current.getBoundingClientRect();
        const x = Math.max(5, Math.min(95, ((pt.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(5, Math.min(95, ((pt.clientY - rect.top) / rect.height) * 100));
        onDrag(dragging.current, x, y);
      }
    };
    const up = () => {
      // 탭으로 끝났다면 라벨 편집 모달 열기
      if (dragging.current && !didMove.current && !readOnly && onLabelChange) {
        setEditingPlayerId(dragging.current);
      }
      dragging.current = null;
      downPos.current = null;
      didMove.current = false;
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
  }, [onDrag, onLabelChange, readOnly]);

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

        {/* empty state hint */}
        {placedPlayers.length === 0 && !readOnly && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 6,
            }}
          >
            <div
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 14,
                fontWeight: 500,
                background: 'rgba(11,17,32,0.35)',
                padding: '8px 16px',
                borderRadius: 999,
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            >
              선수를 추가해보세요
            </div>
          </div>
        )}

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
                downPos.current = { x: e.clientX, y: e.clientY };
                didMove.current = false;
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
                  fontWeight: 700,
                  fontSize: ((p.label || info.number) + '').length > 2 ? 11 : 14,
                  color: '#fff',
                }}>
                  {p.label || info.number}
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

      {editingPlayerId && (() => {
        const target = placedPlayers.find((p) => p.playerId === editingPlayerId);
        const info = target ? byId(target.playerId) : null;
        if (!target || !info) return null;
        return (
          <LabelEditModal
            playerName={info.name}
            currentLabel={target.label || ''}
            defaultLabel={info.number}
            onSave={(newLabel) => {
              onLabelChange(editingPlayerId, newLabel);
              setEditingPlayerId(null);
            }}
            onReset={() => {
              onLabelChange(editingPlayerId, '');
              setEditingPlayerId(null);
            }}
            onClose={() => setEditingPlayerId(null)}
          />
        );
      })()}
    </div>
  );
}

function LabelEditModal({ playerName, currentLabel, defaultLabel, onSave, onReset, onClose }) {
  const [value, setValue] = useState(currentLabel);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.surface,
          border: `1px solid ${C.borderMid}`,
          borderRadius: 16,
          padding: '24px 24px 20px',
          width: '100%', maxWidth: 320,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <p style={{ margin: 0, marginBottom: 4, fontSize: 13, color: C.sub }}>
          이번 쿼터 라벨
        </p>
        <p style={{ margin: 0, marginBottom: 16, fontSize: 18, fontWeight: 700, color: C.text }}>
          {playerName}
        </p>

        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave(value);
            if (e.key === 'Escape') onClose();
          }}
          maxLength={4}
          placeholder={`기본값: ${defaultLabel || '-'}`}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: C.bg, border: `1px solid ${C.borderMid}`,
            borderRadius: 10, padding: '12px 14px',
            fontSize: 16, color: C.text, outline: 'none',
            marginBottom: 8,
          }}
        />
        <p style={{ margin: 0, marginBottom: 20, fontSize: 11, color: C.muted }}>
          비워두면 기본값 ({defaultLabel || '-'}) 사용
        </p>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onReset}
            style={{
              padding: '8px 14px', borderRadius: 8,
              border: 'none', background: 'transparent',
              color: C.sub, fontSize: 13, cursor: 'pointer',
            }}
          >
            기본값으로
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: `1px solid ${C.borderMid}`, background: 'transparent',
                color: C.sub, fontSize: 13, cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              onClick={() => onSave(value)}
              style={{
                padding: '8px 18px', borderRadius: 8,
                border: 'none', background: C.accent,
                color: C.accentInk, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
