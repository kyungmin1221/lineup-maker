import { useState } from 'react';
import { Share2, ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { C } from '../constants';
import Onboarding from './Onboarding';
import { trackEvent } from '../lib/analytics';

export default function Header({
  teamName,
  setTeamName,
  editingTeam,
  setEditingTeam,
  onShare,
  onShareEdit,
  readOnly,
}) {
  const navigate = useNavigate();
  const [showGuide, setShowGuide] = useState(false);

  const openGuide = () => {
    trackEvent('view_onboarding_again', { from: 'header' });
    setShowGuide(true);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 24px 20px' }}>
      {showGuide && <Onboarding onComplete={() => setShowGuide(false)} />}
      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginBottom: 8,
        }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: C.muted,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {readOnly ? '라인업 보기' : '라인업 편집'}
          </p>
          <button
            onClick={openGuide}
            aria-label="사용가이드 보기"
            title="사용가이드 보기"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 9px 3px 7px',
              marginLeft: 4,
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: 99,
              color: C.sub,
              fontSize: 10, fontWeight: 600,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.borderMid;
              e.currentTarget.style.color = C.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.color = C.sub;
            }}
          >
            <BookOpen size={11} />
            서비스소개
          </button>
        </div>
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
              placeholder="팀명을 입력하세요."
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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: 28 }}>
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
            whiteSpace: 'nowrap',
          }}
        >
          <Share2 size={14} />
          공유
        </button>
        {onShareEdit && (
          <button
            onClick={onShareEdit}
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: C.sub,
              background: 'none',
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              padding: '5px 12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.borderMid;
              e.currentTarget.style.color = C.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.color = C.sub;
            }}
          >
            편집 링크 복사
          </button>
        )}
      </div>
    </div>
  );
}
