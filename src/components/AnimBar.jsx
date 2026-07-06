import { Play, Pause, Plus } from 'lucide-react';
import { C } from '../constants';

export default function AnimBar({
  steps,
  activeIdx,
  onSetIdx,
  isPlaying,
  onTogglePlay,
  onAddStep,
  onRemoveStep,
  readOnly,
}) {
  const canPlay = steps.length >= 2;

  return (
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
                onClick={(e) => { e.stopPropagation(); onRemoveStep(i); }}
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
  );
}
