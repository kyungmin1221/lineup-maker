import { useState } from 'react';
import { Play, Pause, Plus, Eye, EyeOff } from 'lucide-react';
import { C } from '../constants';

function ConfirmDialog({ stepLabel, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(228, 14, 14, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.surface,
          border: `1px solid ${C.borderMid}`,
          borderRadius: 14, padding: '24px 28px',
          display: 'flex', flexDirection: 'column', gap: 20,
          minWidth: 260, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6 }}>
          <strong style={{ color: C.accentInk }}>{stepLabel}</strong>을 삭제할까요?<br />
          <span style={{ color: C.sub, fontSize: 12 }}>삭제 후 되돌릴 수 없습니다.</span>
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '7px 18px', borderRadius: 8,
              border: `1px solid ${C.borderMid}`, background: 'transparent',
              color: C.sub, fontSize: 13, cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '7px 18px', borderRadius: 8,
              border: 'none', background: '#c0392b',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnimBar({
  steps,
  activeIdx,
  onSetIdx,
  isPlaying,
  onTogglePlay,
  onAddStep,
  onRemoveStep,
  readOnly,
  showOpponents = true,
  onToggleOpponents,
}) {
  const [pendingRemove, setPendingRemove] = useState(null);
  const canPlay = steps.length >= 2;

  return (
    <>
      {pendingRemove !== null && (
        <ConfirmDialog
          stepLabel={`스텝 ${pendingRemove + 1}`}
          onConfirm={() => { onRemoveStep(pendingRemove); setPendingRemove(null); }}
          onCancel={() => setPendingRemove(null)}
        />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 24px',
          borderTop: `1px solid ${C.border}`,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {/* 재생/일시정지 버튼 */}
        <button
          onClick={onTogglePlay}
          disabled={!canPlay}
          title={isPlaying ? '일시정지' : '재생'}
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: 'none',
            background: canPlay ? C.accent : C.border,
            color: canPlay ? C.accentInk : C.muted,
            cursor: canPlay ? 'pointer' : 'default',
            transition: 'background 0.15s',
          }}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: 1 }} />}
        </button>

        {/* 상대팀 표시 토글 */}
        {onToggleOpponents && (
          <button
            onClick={onToggleOpponents}
            title={showOpponents ? '상대 숨기기' : '상대 보이기'}
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: `1.5px solid ${showOpponents ? C.accent : C.border}`,
              background: showOpponents ? `${C.accent}22` : 'transparent',
              color: showOpponents ? C.accent : C.muted,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {showOpponents ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        )}

        {/* 스텝 탭들 */}
        {steps.map((step, i) => {
          const active = i === activeIdx;
          return (
            <button
              key={step.id}
              onClick={() => !isPlaying && onSetIdx(i)}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                background: active ? '#F59E0B' : 'transparent',
                color: active ? '#0B1120' : C.sub,
                border: `1.5px solid ${active ? '#F59E0B' : C.border}`,
                cursor: isPlaying ? 'default' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {i + 1}
              {!readOnly && !isPlaying && steps.length > 1 && (
                <span
                  onClick={(e) => { e.stopPropagation(); setPendingRemove(i); }}
                  style={{ fontSize: 9, opacity: 0.6, lineHeight: 1, display: 'flex', alignItems: 'center' }}
                >
                  ✕
                </span>
              )}
            </button>
          );
        })}

        {/* 스텝 추가 버튼 */}
        {!readOnly && !isPlaying && (
          <button
            onClick={onAddStep}
            title="스텝 추가"
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: `1.5px solid ${C.border}`,
              background: 'transparent',
              color: C.sub,
              cursor: 'pointer',
            }}
          >
            <Plus size={13} />
          </button>
        )}
      </div>
    </>
  );
}
