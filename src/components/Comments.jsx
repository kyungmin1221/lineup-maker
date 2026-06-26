import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
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

export default function Comments({ quarter, onAddComment, canDelete, onDeleteComment }) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const scrollRef = useRef(null);
  const [scrollHint, setScrollHint] = useState({ above: false, below: false });

  // 스크롤 가능 여부 + 현재 위치 감지 → 위/아래 그라데이션 표시 여부 결정
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const atTop = el.scrollTop <= 1;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      setScrollHint({
        above: !atTop,
        below: !atBottom && el.scrollHeight > el.clientHeight,
      });
    };

    update();
    el.addEventListener('scroll', update);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [quarter.comments.length]);

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
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div
          ref={scrollRef}
          style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            maxHeight: 220, overflowY: 'auto', scrollbarWidth: 'none',
          }}
        >
        {quarter.comments.length === 0 ? (
          <p style={{ fontSize: 14, color: C.muted }}>아직 코멘트가 없어요.</p>
        ) : (
          quarter.comments.map((c, i) => (
            <div key={c.createdAt ?? i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Initial name={c.name} />
              <div style={{
                flex: 1, position: 'relative',
                padding: '9px 13px',
                paddingRight: canDelete ? 32 : 13,
                borderRadius: '4px 12px 12px 12px',
                background: C.surface, border: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.blueLight, marginRight: 8 }}>{c.name}</span>
                <span style={{ fontSize: 13, color: C.text }}>{c.text}</span>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('댓글을 삭제하시겠습니까?')) {
                        onDeleteComment?.(i);
                      }
                    }}
                    aria-label="댓글 삭제"
                    title="댓글 삭제"
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 24, height: 24,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none',
                      borderRadius: 6, padding: 0,
                      color: C.muted, cursor: 'pointer',
                      transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = C.muted;
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        </div>

        {/* 스크롤 위 그라데이션 — 위에 더 많은 콘텐츠 있을 때 */}
        {scrollHint.above && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 24,
            background: `linear-gradient(to bottom, ${C.bg}, transparent)`,
            pointerEvents: 'none',
            borderRadius: '4px 4px 0 0',
          }} />
        )}

        {/* 스크롤 아래 그라데이션 — 아래에 더 많은 콘텐츠 있을 때 */}
        {scrollHint.below && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
            background: `linear-gradient(to bottom, transparent, ${C.bg})`,
            pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', bottom: 4, left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 10, color: C.sub,
              background: C.surface,
              padding: '2px 8px', borderRadius: 999,
              border: `1px solid ${C.border}`,
              whiteSpace: 'nowrap',
            }}>
              ↓ 더 보기
            </div>
          </div>
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
