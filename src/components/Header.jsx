import { Share2 } from 'lucide-react';
import { C } from '../constants';

export default function Header({
  teamName,
  setTeamName,
  editingTeam,
  setEditingTeam,
  onShare,
  readOnly,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 24px 20px' }}>
      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: C.muted,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        ></p>
        {!readOnly && editingTeam ? (
          <input
            autoFocus
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onBlur={() => setEditingTeam(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingTeam(false)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${C.blue}`,
              outline: 'none',
              fontSize: 26,
              fontWeight: 800,
              color: C.text,
              width: '100%',
              paddingBottom: 2,
            }}
          />
        ) : (
          <button
            onClick={() => !readOnly && setEditingTeam(true)}
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: C.text,
              background: 'none',
              border: 'none',
              textAlign: 'left',
              width: '100%',
              cursor: readOnly ? 'default' : 'text',
              padding: 0,
            }}
          >
            {teamName}
          </button>
        )}
      </div>

      <button
        onClick={onShare}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: C.blue,
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          padding: '9px 16px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          shrink: 0,
          marginTop: 20,
          whiteSpace: 'nowrap',
        }}
      >
        <Share2 size={14} />
        공유
      </button>
    </div>
  );
}
