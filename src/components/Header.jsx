import { Share2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { C } from '../constants';

export default function Header({
  teamName,
  setTeamName,
  editingTeam,
  setEditingTeam,
  onShare,
  readOnly,
}) {
  const navigate = useNavigate();

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
            marginTop: 0,
            marginBottom: 8,
          }}
        >
          라인업 메이커
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigate('/my')}
            aria-label="뒤로"
            title="뒤로"
            style={{
              background: 'none',
              border: 'none',
              color: C.text,
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={26} strokeWidth={2.5} />
          </button>
          {!readOnly && editingTeam ? (
            <input
              autoFocus
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onBlur={() => setEditingTeam(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingTeam(false)}
              placeholder="팀명을 입력하세요"
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${C.accentSoft}`,
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
                color: teamName ? C.text : C.muted,
                background: 'none',
                border: 'none',
                borderBottom: !readOnly ? `2px solid ${C.accent}` : 'none',
                textAlign: 'left',
                width: '100%',
                cursor: readOnly ? 'default' : 'text',
                padding: 0,
                paddingBottom: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {teamName || '팀명을 입력하세요'}
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onShare}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: C.accent,
          color: C.accentInk,
          border: 'none',
          borderRadius: 999,
          padding: '10px 18px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          flexShrink: 0,
          marginTop: 28,
          whiteSpace: 'nowrap',
        }}
      >
        <Share2 size={14} />
        공유
      </button>
    </div>
  );
}
