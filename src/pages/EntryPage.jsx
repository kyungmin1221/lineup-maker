import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, ArrowRight, Trash2 } from 'lucide-react';
import { ensureSignedIn } from '../firebase/auth';
import {
  createLineup,
  findMyLineups,
  getLineup,
  updateLineup,
  deleteLineup,
} from '../firebase/lineupService';
import { makeQuarter, C } from '../constants';
import { trackEvent } from '../lib/analytics';

const CACHE_KEY = 'lineup-maker:my-lineup-id';

function buildEmptyLineup() {
  return {
    teamName: '',
    squad: [],
    quarters: [makeQuarter('1쿼터', [])],
  };
}

function parseLineupId(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/(?:edit|view)\/([A-Za-z0-9]+)/);
  if (match) return match[1];
  if (/^[A-Za-z0-9]+$/.test(trimmed)) return trimmed;
  return null;
}

export default function EntryPage() {
  const navigate = useNavigate();
  const [myLineups, setMyLineups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openInput, setOpenInput] = useState('');
  const [openError, setOpenError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const uid = await ensureSignedIn();

        // ownerId 없는 옛 라인업이 캐시되어 있으면 본인 것으로 클레임
        const cachedId = localStorage.getItem(CACHE_KEY);
        if (cachedId) {
          const cached = await getLineup(cachedId);
          if (cached && !cached.ownerId) {
            await updateLineup(cachedId, { ownerId: uid }).catch(() => {});
          }
        }

        const items = await findMyLineups(uid);
        setMyLineups(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const uid = await ensureSignedIn();
      const id = await createLineup(buildEmptyLineup(), uid);
      trackEvent('create_lineup');
      navigate(`/edit/${id}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  const handleDelete = async (lineup) => {
    const label = lineup.teamName || '이름 없는 라인업';
    const ok = window.confirm(`"${label}" 라인업을 삭제할까요?\n삭제하면 되돌릴 수 없어요.`);
    if (!ok) return;
    try {
      await deleteLineup(lineup.id);
      setMyLineups((prev) => prev.filter((x) => x.id !== lineup.id));
      if (localStorage.getItem(CACHE_KEY) === lineup.id) {
        localStorage.removeItem(CACHE_KEY);
      }
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleOpenById = (e) => {
    e.preventDefault();
    const id = parseLineupId(openInput);
    if (!id) {
      setOpenError('올바른 링크 또는 ID를 입력해주세요');
      return;
    }
    navigate(`/view/${id}`);
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '64px 24px 48px' }}>
        {/* Hero */}
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.sub,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Make your LineUp
        </p>
        <h1
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: C.accentSoft,
            lineHeight: 1.05,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          Lineup Maker
        </h1>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: C.sub,
            marginTop: 24,
            marginBottom: 32,
          }}
        >
          포메이션을 직접 짜고,
          <br />
          링크 하나로 팀원들에게 공유하세요.
        </p>

        {/* Primary CTA */}
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            width: '100%',
            background: C.accent,
            color: C.accentInk,
            border: 'none',
            borderRadius: 14,
            padding: '20px 24px',
            fontSize: 17,
            fontWeight: 700,
            cursor: creating ? 'wait' : 'pointer',
            transition: 'transform 0.15s, background 0.15s',
            opacity: creating ? 0.7 : 1,
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {creating ? '생성 중...' : '라인업 만들기'}
        </button>
        <p
          style={{
            fontSize: 12,
            color: C.muted,
            textAlign: 'center',
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          가입 없이 바로 시작 · 라인업은 자동 저장됩니다
        </p>

        {/* My Lineups List */}
        {(loading || myLineups.length > 0) && (
          <div style={{ marginTop: 48 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.text,
                marginTop: 0,
                marginBottom: 12,
              }}
            >
              내가 만든 라인업
            </h2>
            {loading ? (
              <div
                style={{
                  background: C.surface,
                  borderRadius: 12,
                  padding: '16px 20px',
                  fontSize: 13,
                  color: C.muted,
                }}
              >
                불러오는 중...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myLineups.map((lu) => (
                  <div
                    key={lu.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/edit/${lu.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/edit/${lu.id}`);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: '12px 12px 12px 20px',
                      color: C.text,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = C.borderMid;
                      e.currentTarget.style.background = C.raised;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.background = C.surface;
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: lu.teamName ? C.text : C.muted,
                      }}
                    >
                      {lu.teamName || '이름 없는 라인업'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: C.sub }}>
                        열기
                        <ArrowRight size={14} />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(lu);
                        }}
                        aria-label="라인업 삭제"
                        title="라인업 삭제"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 32,
                          height: 32,
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 8,
                          color: C.muted,
                          cursor: 'pointer',
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
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Open by share link / ID */}
        <div style={{ marginTop: 40 }}>
          <form onSubmit={handleOpenById}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: C.sub,
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              <Link2 size={14} />
              공유 링크(ID)로 라인업 열기
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={openInput}
                onChange={(e) => {
                  setOpenInput(e.target.value);
                  if (openError) setOpenError('');
                }}
                placeholder="링크 또는 ID 붙여넣기"
                style={{
                  flex: 1,
                  background: C.surface,
                  border: `1px solid ${openError ? '#ef4444' : C.border}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: C.text,
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  cursor: 'pointer',
                }}
              >
                열기
              </button>
            </div>
            {openError && (
              <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6, marginBottom: 0 }}>
                {openError}
              </p>
            )}
          </form>
        </div>

        {/* Footer hint */}
        <p
          style={{
            fontSize: 12,
            color: C.muted,
            textAlign: 'center',
            marginTop: 56,
            marginBottom: 0,
          }}
        >
          곧 로그인 · 친구 라인업 둘러보기 기능이 추가될 예정입니다
        </p>
      </div>
    </div>
  );
}
