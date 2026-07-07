import { useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { C } from '../constants';

function ConfirmDialog({ label, onConfirm, onCancel }) {
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
          <strong style={{ color: C.accentInk }}>{label}</strong>을 삭제할까요?<br />
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

export default function ScenarioTabs({ scenarios, activeIdx, onSwitch, onAdd, onRemove, onRename, readOnly }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [pendingRemove, setPendingRemove] = useState(null);
  const inputRef = useRef(null);

  const startEdit = (idx, currentLabel) => {
    flushSync(() => {
      setEditingIdx(idx);
      setEditValue(currentLabel);
    });
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  const commitEdit = () => {
    if (editingIdx !== null && editValue.trim()) {
      onRename?.(editingIdx, editValue.trim());
    }
    setEditingIdx(null);
  };

  return (
    <>
      {pendingRemove !== null && (
        <ConfirmDialog
          label={scenarios[pendingRemove]?.label}
          onConfirm={() => { onRemove(pendingRemove); setPendingRemove(null); }}
          onCancel={() => setPendingRemove(null)}
        />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 24px 0',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {scenarios.map((sc, idx) => {
          const active = idx === activeIdx;
          return (
            <div
              key={sc.id}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                borderRadius: 99,
                background: active ? '#F59E0B' : C.raised,
                border: `1.5px solid ${active ? '#F59E0B' : C.border}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => {
                if (!active) onSwitch(idx);
                else if (!readOnly && editingIdx !== idx) startEdit(idx, sc.label);
              }}
            >
              {editingIdx === idx ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditingIdx(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  maxLength={10}
                  style={{
                    width: Math.max(60, editValue.length * 9),
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#0B1120',
                    padding: 0,
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#0B1120' : C.sub,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sc.label}
                </span>
              )}

              {!readOnly && active && scenarios.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPendingRemove(idx); }}
                  style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.2)', border: 'none',
                    color: '#0B1120', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0, padding: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}

        {!readOnly && (
          <button
            onClick={onAdd}
            style={{
              flexShrink: 0,
              width: 28, height: 28, borderRadius: '50%',
              background: 'transparent',
              border: `1.5px solid ${C.border}`,
              color: C.sub, fontSize: 16, fontWeight: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            +
          </button>
        )}

        {!readOnly && (
          <span style={{ fontSize: 10, color: C.muted, flexShrink: 0, marginLeft: 2 }}>
            선택된 탭 탭하여 이름 수정
          </span>
        )}
      </div>
    </>
  );
}
