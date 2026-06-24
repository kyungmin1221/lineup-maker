import { FORMATION_KEYS, C } from '../constants';

export default function FormationChips({ activeFormation, onApply }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 24px 12px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          fontSize: 11,
          fontWeight: 600,
          color: C.muted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginRight: 4,
        }}
      >
        포메이션
      </span>
      {FORMATION_KEYS.map((key) => {
        const active = key === activeFormation;
        return (
          <button
            key={key}
            onClick={() => onApply(key)}
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              background: active ? C.accent : 'transparent',
              color: active ? C.accentInk : C.sub,
              border: `1.5px solid ${active ? C.accent : C.border}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
