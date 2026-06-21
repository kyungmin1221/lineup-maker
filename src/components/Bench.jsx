import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { C } from '../constants';

export default function Bench({ bench, onAddToPitch, onDeleteFromSquad, onAddPlayer, readOnly }) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAddPlayer(name.trim(), number.trim() || '-');
    setName('');
    setNumber('');
  };

  return (
    <div style={{ padding: '20px 24px 0' }}>
      {/* label */}
      <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
        대기 선수 {bench.length > 0 && <span style={{ color: C.blueBright }}>{bench.length}</span>}
      </p>

      {/* chips */}
      {bench.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
          {bench.map(p => (
            <div
              key={p.id}
              onClick={() => !readOnly && onAddToPitch(p)}
              style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px 7px 8px',
                borderRadius: 12,
                background: C.surface,
                border: `1px solid ${C.border}`,
                cursor: readOnly ? 'default' : 'pointer',
              }}
            >
              {/* number badge */}
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: C.raised,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: C.blueLight,
                flexShrink: 0,
              }}>
                {p.number}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              {!readOnly && (
                <X
                  size={12}
                  onClick={e => { e.stopPropagation(); onDeleteFromSquad(p.id); }}
                  style={{ color: C.muted, cursor: 'pointer', flexShrink: 0, marginLeft: 2 }}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: C.muted, paddingBottom: 4 }}>전원 필드에 배치됨</p>
      )}

      {/* add player form */}
      {!readOnly && (
        <div
          style={{
            display: 'flex', alignItems: 'center',
            marginTop: 12,
            borderRadius: 12,
            background: C.surface,
            border: `1px solid ${C.border}`,
            overflow: 'hidden',
          }}
        >
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="선수 이름"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              padding: '12px 14px', fontSize: 14, color: C.text,
            }}
          />
          <div style={{ width: 1, height: 20, background: C.border }} />
          <input
            value={number}
            onChange={e => setNumber(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="번호"
            style={{
              width: 52, background: 'transparent', border: 'none', outline: 'none',
              padding: '12px 8px', fontSize: 14, color: C.text, textAlign: 'center',
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              width: 44, height: 44,
              background: C.blue, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Plus size={18} color="#fff" />
          </button>
        </div>
      )}
    </div>
  );
}
