import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Check, ArrowRight, Share2, ChevronDown, Pencil } from 'lucide-react';
import { C, nextId } from '../constants';
import { subscribeToLockerRoom, updateLockerRoom, joinLockerRoom } from '../firebase/lockerRoomService';
import { subscribeToTeamLineups } from '../firebase/lineupService';
import { aggregateTeamRecords, adjustArchivedStat } from '../lib/teamStats';
import { ensureSignedIn } from '../firebase/auth';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { share, getTossShareLink } from '@apps-in-toss/web-framework';
import { Stepper } from '../components/MatchRecord';

const TABS = [
  { key: 'players', label: '선수단' },
  { key: 'lineups', label: '라인업' },
  { key: 'stats', label: '기록' },
];

export default function LockerRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [players, setPlayers] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [memberIds, setMemberIds] = useState([]);
  const [archivedRecord, setArchivedRecord] = useState({});
  const [uid, setUid] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const { toast, showToast } = useToast();
  const skipNextSave = useRef(false);
  // 페이지 진입 시점의 tab 파라미터만 고정 캡처 — 이후 탭 클릭으로 URL이
  // 바뀌어도 이 값은 그대로라, "공유 링크로 들어왔는지"와 "안에서 탭을
  // 눌러 기록 탭으로 이동했는지"를 구분할 수 있음
  const [entryTab] = useState(() => searchParams.get('tab'));
  const isSharedRecordView = entryTab === 'stats';
  const [tab, setTab] = useState(
    TABS.some((t) => t.key === entryTab) ? entryTab : 'players'
  );
  const [teamLineups, setTeamLineups] = useState([]);
  const [lineupsState, setLineupsState] = useState('idle'); // 'idle' | 'loading' | 'loaded'
  const needsLineups = tab !== 'players';

  // 로그인(익명) 식별 — 합류 여부·삭제 권한 판단에 사용
  useEffect(() => {
    ensureSignedIn().then(setUid).catch(() => {});
  }, []);

  // 라커룸 실시간 구독 — 다른 관리자의 변경이나 자기 자신의 저장 결과가 즉시 반영됨
  useEffect(() => {
    const unsub = subscribeToLockerRoom(id, (data) => {
      if (!data) { navigate('/my', { replace: true }); return; }
      skipNextSave.current = true;
      setName(data.name || '');
      setPlayers(data.players || []);
      setOwnerId(data.ownerId || null);
      setMemberIds(data.memberIds || []);
      setArchivedRecord(data.archivedRecord || {});
      setLoaded(true);
    });
    return unsub;
  }, [id, navigate]);

  // 선수 목록 자동 저장 (구독이 되돌려준 갱신은 다시 저장하지 않음)
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    const timer = setTimeout(() => {
      updateLockerRoom(id, { players }).catch(console.error);
    }, 800);
    return () => clearTimeout(timer);
  }, [id, players, loaded]);

  // "라인업"/"기록" 탭에 있는 동안만 팀 라인업을 실시간 구독
  useEffect(() => {
    if (!needsLineups) return;
    setLineupsState('loading');
    const unsub = subscribeToTeamLineups(id, (items) => {
      setTeamLineups(items);
      setLineupsState('loaded');
    });
    return unsub;
  }, [needsLineups, id]);

  const handleNameBlur = () => {
    updateLockerRoom(id, { name }).catch(console.error);
  };

  const handleTabChange = (key) => {
    setTab(key);
    setSearchParams(key === 'players' ? {} : { tab: key }, { replace: true });
  };

  const handleJoin = async () => {
    try {
      await joinLockerRoom(id, uid);
      showToast('라커룸에 합류했어요! 이제 내 목록에서도 관리할 수 있어요.');
    } catch (err) {
      console.error(err);
      showToast('합류 중 오류가 발생했습니다.');
    }
  };

  // 기록만 보이는 열람 전용 링크 — 팀원 누구에게나 공유
  const handleShare = async () => {
    try {
      const path = `/locker-room/${id}?tab=stats`;
      if (window.location.hostname.includes('tossmini.com')) {
        const tossLink = await getTossShareLink(`intoss://lineupmaker${path}`, 'https://lineup-maker-tau.vercel.app/og-image.png');
        await share({ message: `${name || '팀'} 팀기록\n${tossLink}` });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        showToast('기록 링크가 복사됐어요!');
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error(err);
      showToast('공유 중 오류가 발생했습니다.');
    }
  };

  // 탭 없는 전체 링크 — 열면 "합류하기" 배너가 떠서 관리자로 합류 가능
  const handleInvite = async () => {
    try {
      const path = `/locker-room/${id}`;
      if (window.location.hostname.includes('tossmini.com')) {
        const tossLink = await getTossShareLink(`intoss://lineupmaker${path}`, 'https://lineup-maker-tau.vercel.app/og-image.png');
        await share({ message: `${name || '팀'} 라커룸 관리자로 초대해요\n${tossLink}` });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        showToast('관리자 초대 링크가 복사됐어요!');
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error(err);
      showToast('공유 중 오류가 발생했습니다.');
    }
  };

  const handleAddPlayer = () => {
    if (!newName.trim()) return;
    setPlayers(prev => [
      ...prev,
      { id: nextId(), name: newName.trim(), number: newNumber.trim() || '-' },
    ]);
    setNewName('');
    setNewNumber('');
  };

  const handleDeletePlayer = (pid) => {
    setPlayers(prev => prev.filter(p => p.id !== pid));
  };

  const handleEditStart = (p) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditNumber(p.number === '-' ? '' : p.number);
  };

  const handleEditDone = () => {
    if (!editName.trim()) return;
    setPlayers(prev => prev.map(p =>
      p.id === editingId
        ? { ...p, name: editName.trim(), number: editNumber.trim() || '-' }
        : p
    ));
    setEditingId(null);
  };

  if (!loaded) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: C.muted }}>불러오는 중...</div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 24px 60px' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 32 }}>
          <button
            onClick={() => navigate('/my')}
            style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', padding: '4px 0 0', flexShrink: 0, display: 'flex' }}
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              {isSharedRecordView ? '팀 기록' : '라커룸'}
            </p>
            {isSharedRecordView ? (
              <p style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name || '이름 없는 팀'}
              </p>
            ) : (
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                placeholder="라커룸 이름"
                style={{
                  background: 'transparent', border: 'none',
                  borderBottom: `2px solid ${C.accent}`,
                  outline: 'none', fontSize: 24, fontWeight: 800,
                  color: C.text, width: '100%', paddingBottom: 2,
                }}
              />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: 22, flexShrink: 0 }}>
            <button
              onClick={handleShare}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: C.accent, color: C.accentInk,
                border: 'none', borderRadius: 999,
                padding: '10px 16px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              <Share2 size={14} />
              공유
            </button>
            {!isSharedRecordView && (
              <button
                onClick={handleInvite}
                style={{
                  fontSize: 11, fontWeight: 500, color: C.sub,
                  background: 'none', border: `1px solid ${C.border}`,
                  borderRadius: 999, padding: '5px 12px',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderMid; e.currentTarget.style.color = C.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.sub; }}
              >
                관리자 초대 링크
              </button>
            )}
          </div>
        </div>

        {/* 합류 안내 — 다른 사람이 만든 라커룸에 관리자로 들어온 경우에만 노출 */}
        {!isSharedRecordView && uid && ownerId && uid !== ownerId && !memberIds.includes(uid) && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            background: C.raised, border: `1px solid ${C.borderMid}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 24,
          }}>
            <p style={{ fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.5 }}>
              이 라커룸에 아직 합류하지 않았어요.<br />합류하면 내 목록에도 추가되고 함께 관리할 수 있어요.
            </p>
            <button
              onClick={handleJoin}
              style={{
                flexShrink: 0, background: C.blue, color: '#fff',
                border: 'none', borderRadius: 999, padding: '9px 16px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              합류하기
            </button>
          </div>
        )}

        {/* 탭 — 공유 링크로 들어온 경우 기록만 보여주고 숨김 */}
        {!isSharedRecordView && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                style={{
                  padding: '6px 14px', borderRadius: 99,
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  background: active ? C.accent : 'transparent',
                  color: active ? C.accentInk : C.sub,
                  border: `1.5px solid ${active ? C.accent : C.border}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        )}

        {!isSharedRecordView && tab === 'players' && (
        <>
        {/* 선수단 레이블 */}
        <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          선수단{' '}
          {players.length > 0 && <span style={{ color: C.blueBright }}>{players.length}명</span>}
        </p>

        {/* 선수 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {players.length === 0 && (
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>아직 선수가 없어요. 아래에서 추가하세요.</p>
          )}
          {players.map(p =>
            editingId === p.id ? (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: C.surface, border: `1px solid ${C.accent}`,
                  borderRadius: 12, padding: '8px 12px',
                }}
              >
                <input
                  value={editNumber}
                  onChange={e => setEditNumber(e.target.value)}
                  placeholder="#"
                  style={{
                    width: 36, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, fontWeight: 700, color: C.blueBright, textAlign: 'center',
                  }}
                />
                <div style={{ width: 1, height: 18, background: C.borderMid, flexShrink: 0 }} />
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEditDone()}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 14, color: C.text,
                  }}
                />
                <button onClick={handleEditDone} style={{ background: 'none', border: 'none', color: C.blueBright, cursor: 'pointer', display: 'flex', padding: 4 }}>
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                key={p.id}
                onClick={() => handleEditStart(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: '12px 16px',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.borderMid}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: C.raised, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: C.blueLight,
                }}>
                  {p.number || '-'}
                </span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: C.text }}>{p.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); handleDeletePlayer(p.id); }}
                  style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', padding: 4 }}
                >
                  <X size={14} />
                </button>
              </div>
            )
          )}
        </div>

        {/* 선수 추가 폼 */}
        <div style={{
          display: 'flex', alignItems: 'center',
          borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`,
          overflow: 'hidden', paddingLeft: 12,
        }}>
          <input
            value={newNumber}
            onChange={e => setNewNumber(e.target.value)}
            placeholder="#"
            style={{
              width: 36, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 13, fontWeight: 700, color: C.blueBright, textAlign: 'center',
            }}
          />
          <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
            placeholder="선수 이름 입력"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              padding: '13px 10px', fontSize: 14, color: C.text,
            }}
          />
          <button
            onClick={handleAddPlayer}
            style={{
              width: 46, height: 46, background: C.blue, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Plus size={18} color="#fff" />
          </button>
        </div>

        <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 16 }}>
          선수를 탭하면 수정할 수 있어요 · 자동 저장됩니다
        </p>
        </>
        )}

        {!isSharedRecordView && tab === 'lineups' && (
          <LineupsTab lineups={teamLineups} loading={lineupsState === 'loading'} navigate={navigate} />
        )}

        {(isSharedRecordView || tab === 'stats') && (
          <StatsTab
            teamId={id}
            players={players}
            lineups={teamLineups}
            archivedRecord={archivedRecord}
            loading={lineupsState === 'loading'}
            canEdit={!!uid && (uid === ownerId || memberIds.includes(uid))}
          />
        )}
      </div>
      <Toast message={toast} />
    </div>
  );
}

function LineupsTab({ lineups, loading, navigate }) {
  if (loading) {
    return <p style={{ fontSize: 13, color: C.muted }}>불러오는 중...</p>;
  }
  if (lineups.length === 0) {
    return <p style={{ fontSize: 13, color: C.muted }}>이 팀에 연결된 라인업이 없어요. 라인업 편집 화면에서 "팀 연결"로 이어줄 수 있어요.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lineups.map((lu) => (
        <div
          key={lu.id}
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/view/${lu.id}`)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/view/${lu.id}`); } }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '12px 12px 12px 20px',
            color: C.text, fontSize: 15, fontWeight: 600,
            cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderMid; e.currentTarget.style.background = C.raised; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: lu.teamName ? C.text : C.muted }}>
            {lu.teamName || '이름 없는 라인업'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: C.sub, flexShrink: 0, marginLeft: 12 }}>
            보기 <ArrowRight size={14} />
          </span>
        </div>
      ))}
    </div>
  );
}

const STATS_SORT_TABS = [
  { key: 'goals', label: '골' },
  { key: 'assists', label: '도움' },
  { key: 'attendance', label: '출석' },
  { key: 'mvp', label: 'MVP' },
];

function sortStats(stats, sortBy) {
  const sorted = [...stats];
  if (sortBy === 'assists') sorted.sort((a, b) => b.assists - a.assists);
  else if (sortBy === 'attendance') sorted.sort((a, b) => b.present - a.present);
  else if (sortBy === 'mvp') sorted.sort((a, b) => b.mvpCount - a.mvpCount);
  else sorted.sort((a, b) => b.goals - a.goals);
  return sorted;
}

function StatsTab({ teamId, players, lineups, archivedRecord, loading, canEdit }) {
  const [sortBy, setSortBy] = useState('goals');
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);

  if (loading) {
    return <p style={{ fontSize: 13, color: C.muted }}>불러오는 중...</p>;
  }
  if (players.length === 0) {
    return <p style={{ fontSize: 13, color: C.muted }}>선수단을 먼저 등록해주세요.</p>;
  }

  const stats = sortStats(aggregateTeamRecords(players, lineups, archivedRecord), sortBy);
  const highlight = (s) => {
    if (sortBy === 'assists') return `${s.assists}도움`;
    if (sortBy === 'attendance') return `${s.present}출석`;
    if (sortBy === 'mvp') return `MVP ${s.mvpCount}`;
    return `${s.goals}골`;
  };

  return (
    <div>
      {/* 정렬 기준 탭 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {STATS_SORT_TABS.map((t) => {
          const active = sortBy === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSortBy(t.key)}
              style={{
                padding: '5px 14px', borderRadius: 99,
                fontSize: 12, fontWeight: active ? 600 : 500,
                background: active ? C.accent : 'transparent',
                color: active ? C.accentInk : C.sub,
                border: `1.5px solid ${active ? C.accent : C.border}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stats.map((s, i) => {
          const expanded = expandedPlayerId === s.playerId;
          return (
            <div
              key={s.playerId}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '12px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 18, flexShrink: 0, fontSize: 12, fontWeight: 700, color: C.muted, textAlign: 'right' }}>
                  {i + 1}
                </span>
                <span style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: C.raised, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: C.blueLight,
                }}>
                  {s.number || '-'}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.blueBright, flexShrink: 0, minWidth: 44, textAlign: 'right' }}>
                  {highlight(s)}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setExpandedPlayerId(expanded ? null : s.playerId)}
                    aria-label="기록 직접 수정"
                    title="기록 직접 수정"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      background: expanded ? C.raised : 'transparent',
                      border: `1px solid ${expanded ? C.borderMid : 'transparent'}`,
                      color: C.sub, cursor: 'pointer',
                    }}
                  >
                    {expanded ? <ChevronDown size={14} /> : <Pencil size={13} />}
                  </button>
                )}
              </div>
              <div style={{ paddingLeft: 74, fontSize: 11, color: C.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                골 {s.goals} · 도움 {s.assists} · 출석 {s.present} · 지각 {s.late} · 결석 {s.absent} · MVP {s.mvpCount}
              </div>
              {expanded && canEdit && (
                <StatAdjustPanel stat={s} teamId={teamId} archivedRecord={archivedRecord} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ADJUST_FIELDS = [
  { key: 'goals', label: '골', color: undefined },
  { key: 'assists', label: '도움', color: undefined },
  { key: 'present', label: '출석', color: '#2ecc71' },
  { key: 'late', label: '지각', color: '#f0ad4e' },
  { key: 'absent', label: '결석', color: '#c43f3f' },
  { key: 'mvpCount', label: 'MVP', color: '#f0ad4e' },
];

// 경기 단위가 아니라 선수의 "총합"을 그 자리에서 바로 보정. 어느 경기에서
// 난 기록인지는 따지지 않고, 보이는 합계를 델타만큼 조정해 팀 문서에 저장함
function StatAdjustPanel({ stat, teamId, archivedRecord }) {
  const handleChange = (field, delta) => {
    const currentTotal = stat[field] || 0;
    const next = adjustArchivedStat(archivedRecord, stat.playerId, field, delta, currentTotal);
    updateLockerRoom(teamId, { archivedRecord: next }).catch(console.error);
  };

  return (
    <div style={{ paddingLeft: 74, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
      {ADJUST_FIELDS.map((f) => (
        <Stepper
          key={f.key}
          label={f.label}
          count={stat[f.key] || 0}
          onChange={(d) => handleChange(f.key, d)}
          color={f.color}
        />
      ))}
    </div>
  );
}
