import { useState } from 'react';
import { C } from '../constants';

function Initial({ name }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      background: C.raised, border: `1px solid ${C.borderMid}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: C.blueLight,
    }}>
      {name[0]}
    </div>
  );
}

export default function Comments({ quarter, onAddComment }) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAddComment(name.trim() || '익명', text.trim());
    setText('');
  };

  return (
    <div style={{ padding: '20px 24px 48px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {quarter.label} 코멘트
        </p>
        {quarter.comments.length > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            padding: '1px 7px', borderRadius: 99,
            background: `${C.blue}25`, color: C.blueBright,
          }}>
            {quarter.comments.length}
          </span>
        )}
      </div>

      {/* list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 220, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {quarter.comments.length === 0 ? (
          <p style={{ fontSize: 14, color: C.muted }}>아직 코멘트가 없어요.</p>
        ) : (
          quarter.comments.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Initial name={c.name} />
              <div style={{
                flex: 1, padding: '9px 13px',
                borderRadius: '4px 12px 12px 12px',
                background: C.surface, border: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.blueLight, marginRight: 8 }}>{c.name}</span>
                <span style={{ fontSize: 13, color: C.text }}>{c.text}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* input */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderRadius: 12, overflow: 'hidden',
        background: C.surface, border: `1px solid ${C.border}`,
      }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="이름"
          style={{
            width: 64, background: 'transparent', border: 'none', outline: 'none',
            padding: '12px 10px', fontSize: 14, color: C.text,
          }}
        />
        <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="의견을 남겨보세요"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            padding: '12px 12px', fontSize: 14, color: C.text,
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          style={{
            padding: '0 16px', height: 44, flexShrink: 0,
            background: text.trim() ? C.blue : C.raised,
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            fontSize: 13, fontWeight: 600, color: text.trim() ? '#fff' : C.muted,
            transition: 'all 0.15s',
          }}
        >
          등록
        </button>
      </div>
    </div>
  );
}
