import { useState } from 'react';
import { Plus, Copy } from 'lucide-react';
import { C } from '../constants';

function ConfirmDialog({ label, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
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
          <strong style={{ color: C.accentInk }}>{label}</strong> 쿼터를 삭제할까요?<br />
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

export default function QuarterTabs({ quarters, activeIdx, setActiveIdx, addQuarter, removeQuarter, readOnly }) {
  const [pendingRemove, setPendingRemove] = useState(null);

  function handleRemoveClick(e, i) {
    e.stopPropagation();
    setPendingRemove(i);
  }

  function handleConfirm() {
    removeQuarter(pendingRemove);
    setPendingRemove(null);
  }

  return (
    <>
      {pendingRemove !== null && (
        <ConfirmDialog
          label={quarters[pendingRemove]?.label}
          onConfirm={handleConfirm}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 24px 12px',
        overflowX: 'auto', scrollbarWidth: 'none',
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {quarters.map((q, i) => {
        const active = i === activeIdx;
        return (
          <button
            key={q.id}
            onClick={() => setActiveIdx(i)}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px',
              borderRadius: 99,
              fontSize: 13, fontWeight: active ? 600 : 500,
              background: active ? C.accent : 'transparent',
              color: active ? C.accentInk : C.sub,
              border: `1.5px solid ${active ? C.accent : C.border}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {q.label}
            {!readOnly && quarters.length > 1 && (
              <span
                onClick={e => handleRemoveClick(e, i)}
                style={{ fontSize: 10, lineHeight: 1, opacity: 0.7, display: 'flex', alignItems: 'center' }}
              >
                ✕
              </span>
            )}
          </button>
        );
      })}

      {!readOnly && (
        <>
          <button
            onClick={() => addQuarter(false)}
            title="빈 쿼터 추가"
            style={{
              flexShrink: 0, width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 99, border: `1.5px solid ${C.border}`,
              background: 'transparent', color: C.sub, cursor: 'pointer',
            }}
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => addQuarter(true)}
            title="현재 쿼터 복제"
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 99,
              border: `1.5px solid ${C.border}`, background: 'transparent',
              color: C.sub, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Copy size={12} />
            복제
          </button>
        </>
      )}
    </div>
    </>
  );
}
