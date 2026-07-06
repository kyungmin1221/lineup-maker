import { useState, useRef } from 'react';
import { C } from '../constants';

export default function ScenarioTabs({ scenarios, activeIdx, onSwitch, onAdd, onRemove, onRename, readOnly }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  const startEdit = (idx, currentLabel) => {
    setEditingIdx(idx);
    setEditValue(currentLabel);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    if (editingIdx !== null && editValue.trim()) {
      onRename?.(editingIdx, editValue.trim());
    }
    setEditingIdx(null);
  };

  return (
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
                onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
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
  );
}
