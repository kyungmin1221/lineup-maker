import { Plus, Copy } from 'lucide-react';
import { C } from '../constants';

export default function QuarterTabs({ quarters, activeIdx, setActiveIdx, addQuarter, removeQuarter, readOnly }) {
  return (
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
              background: active ? C.blue : 'transparent',
              color: active ? '#fff' : C.sub,
              border: `1.5px solid ${active ? C.blue : C.border}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {q.label}
            {!readOnly && quarters.length > 1 && (
              <span
                onClick={e => { e.stopPropagation(); removeQuarter(i); }}
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
  );
}
