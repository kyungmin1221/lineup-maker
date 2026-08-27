import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Check, ArrowRight, Share2, ChevronDown, Pencil } from 'lucide-react';
import { C, nextId } from '../constants';
import { subscribeToLockerRoom, updateLockerRoom, joinLockerRoom, addMatch, deleteMatch } from '../firebase/lockerRoomService';
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
  const [statsBaseline, setStatsBaseline] = useState({});
  const [matches, setMatches] = useState([]);
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
      setStatsBaseline(data.statsBaseline || {});
      setMatches(data.matches || []);
      setLoaded(true);
    });
    return unsub;
  }, [id, navigate]);

  // 페이지 타이틀 동적 업데이트 — 네이티브 공유 시 "lineupmaker" 대신 팀이름이 나오도록
  useEffect(() => {
    if (!name) return;
    document.title = `${name} 팀기록`;
    return () => { document.title = 'lineupmaker'; };
  }, [name]);

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

  // 경기 기록 추가/삭제 — 실시간 구독이 matches를 다시 채워주므로 별도 setState 불필요
  const handleAddMatch = async (match) => {
    try {
      await addMatch(id, match);
    } catch (err) {
      console.error(err);
      showToast('경기 기록 추가에 실패했습니다.');
    }
  };

  const handleDeleteMatch = async (matchId) => {
    try {
      await deleteMatch(id, matchId);
    } catch (err) {
      console.error(err);
      showToast('삭제에 실패했습니다.');
    }
  };

  // 새 시즌 시작 시 선수 기록만 0으로 — 지금까지의 합계를 기준점(statsBaseline)으로
  // 저장해두고, 이후로는 그 기준점 이후 증가분만 보여줌. 시즌 전적(matches)은 그대로 유지
  const handleResetSeason = async () => {
    const ok = window.confirm(
      '선수 기록을 초기화할까요?\n골·도움·참석·MVP가 모두 0부터 다시 시작돼요.\n(시즌 전적 기록은 그대로 남아요)'
    );
    if (!ok) return;
    try {
      const rawStats = aggregateTeamRecords(players, teamLineups, archivedRecord);
      const baseline = {};
      for (const s of rawStats) {
        baseline[s.playerId] = {
          present: s.present, late: s.late, absent: s.absent,
          goals: s.goals, assists: s.assists, mvpCount: s.mvpCount,
        };
      }
      await updateLockerRoom(id, { statsBaseline: baseline });
      showToast('선수 기록이 초기화됐어요.');
    } catch (err) {
      console.error(err);
      showToast('초기화에 실패했습니다.');
    }
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
        await share({ message: `${name || '팀'} 기록\n${tossLink}` });
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
            statsBaseline={statsBaseline}
            loading={lineupsState === 'loading'}
            canEdit={!!uid && (uid === ownerId || memberIds.includes(uid))}
            matches={matches}
            onAddMatch={handleAddMatch}
            onDeleteMatch={handleDeleteMatch}
            onResetSeason={handleResetSeason}
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
  { key: 'attendance', label: '참석' },
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

function StatsTab({ teamId, players, lineups, archivedRecord, statsBaseline, loading, canEdit, matches, onAddMatch, onDeleteMatch, onResetSeason }) {
  // 경기 기록이 쌓일수록 선수 기록을 보려고 계속 스크롤해야 하는 걸 막기 위해
  // "선수 기록"과 "시즌 전적"을 같은 화면에 다 펼치지 않고 서브탭으로 분리
  const [view, setView] = useState('players');
  const [sortBy, setSortBy] = useState('goals');
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);

  const ready = !loading && players.length > 0;
  const stats = ready ? sortStats(aggregateTeamRecords(players, lineups, archivedRecord, statsBaseline), sortBy) : [];
  const highlight = (s) => {
    if (sortBy === 'assists') return `${s.assists}도움`;
    if (sortBy === 'attendance') return `${s.present}참석`;
    if (sortBy === 'mvp') return `MVP ${s.mvpCount}`;
    return `${s.goals}골`;
  };

  return (
    <div>
      {/* 총 경기 수 — 기록된 매치 개수에서 그대로 파생 (직접 입력 X) */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '12px 16px', marginBottom: 16,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.sub }}>
          총{' '}
          <span style={{ fontSize: 15, fontWeight: 800, color: C.blueBright }}>{matches.length}</span>
          경기
        </span>
      </div>

      {/* 서브탭 — 선수 기록 / 시즌 전적 (동시에 안 펼치고 하나씩만 보여줌) */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        {[{ key: 'players', label: '선수 기록' }, { key: 'matches', label: '시즌 전적' }].map((t) => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
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

      {view === 'matches' && (
        <MatchHistory
          players={players}
          matches={matches}
          canEdit={canEdit}
          onAddMatch={onAddMatch}
          onDeleteMatch={onDeleteMatch}
        />
      )}

      {view === 'players' && (loading ? (
        <p style={{ fontSize: 13, color: C.muted }}>불러오는 중...</p>
      ) : players.length === 0 ? (
        <p style={{ fontSize: 13, color: C.muted }}>선수단을 먼저 등록해주세요.</p>
      ) : (
      <>
      {canEdit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            type="button"
            onClick={onResetSeason}
            style={{
              fontSize: 11, fontWeight: 600, color: '#c43f3f',
              background: 'transparent', border: '1px solid #c43f3f40',
              borderRadius: 99, padding: '5px 12px', cursor: 'pointer',
            }}
          >
            시즌 초기화
          </button>
        </div>
      )}
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
                골 {s.goals} · 도움 {s.assists} · 참석 {s.present} · 지각 {s.late} · 불참 {s.absent} · MVP {s.mvpCount}
              </div>
              {expanded && canEdit && (
                <StatAdjustPanel stat={s} teamId={teamId} archivedRecord={archivedRecord} />
              )}
            </div>
          );
        })}
      </div>
      </>
      ))}
    </div>
  );
}

const ADJUST_FIELDS = [
  { key: 'goals', label: '골', color: undefined },
  { key: 'assists', label: '도움', color: undefined },
  { key: 'present', label: '참석', color: '#2ecc71' },
  { key: 'late', label: '지각', color: '#f0ad4e' },
  { key: 'absent', label: '불참', color: '#c43f3f' },
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

function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-');
  return m ? `${y}년 ${Number(m)}월` : '날짜 없음';
}

// 날짜(YYYY-MM-DD) 기준 월별로 묶고, 최신 월 · 최신 경기가 먼저 오도록 정렬
function groupMatchesByMonth(matches) {
  const groups = new Map();
  for (const m of matches) {
    const key = (m.date || '').slice(0, 7) || '날짜 없음';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, items]) => [
      month,
      items.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0)),
    ]);
}

function MatchHistory({ players, matches, canEdit, onAddMatch, onDeleteMatch }) {
  const [openMonth, setOpenMonth] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const grouped = groupMatchesByMonth(matches);
  const playerName = (pid) => players.find((p) => p.id === pid)?.name || '알 수 없음';

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
          시즌 전적
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 99, padding: '5px 12px',
              fontSize: 12, fontWeight: 600, color: C.sub, cursor: 'pointer',
            }}
          >
            <Plus size={12} /> 경기 추가
          </button>
        )}
      </div>

      {grouped.length === 0 ? (
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 0 }}>아직 기록된 경기가 없어요.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {grouped.map(([month, items]) => {
            const open = openMonth === month;
            return (
              <div key={month} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setOpenMonth(open ? null : month)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'transparent', border: 'none', padding: '12px 16px',
                    fontSize: 14, fontWeight: 700, color: C.text, cursor: 'pointer',
                  }}
                >
                  <span>{monthLabel(month)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: C.sub }}>
                    {items.length}경기
                    <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                  </span>
                </button>
                {open && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map((m) => (
                      <MatchRow key={m.id} match={m} playerName={playerName} canEdit={canEdit} onDelete={() => onDeleteMatch(m.id)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddMatchModal
          players={players}
          onSave={(match) => { onAddMatch(match); setShowAddModal(false); }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

function MatchRow({ match, playerName, canEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const goalEntries = Object.entries(match.goals || {}).filter(([, c]) => c > 0);
  const assistEntries = Object.entries(match.assists || {}).filter(([, c]) => c > 0);
  const hasScorers = goalEntries.length > 0 || assistEntries.length > 0;

  return (
    <div style={{ background: C.raised, borderRadius: 10, padding: '10px 12px' }}>
      <div
        onClick={() => hasScorers && setExpanded((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: hasScorers ? 'pointer' : 'default' }}
      >
        <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{match.date || '-'}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          vs {match.opponentName || '상대팀'}
        </span>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.blueBright, flexShrink: 0 }}>
          {match.myScore} : {match.opponentScore}
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label="경기 기록 삭제"
            style={{ display: 'flex', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 2, flexShrink: 0 }}
          >
            <X size={13} />
          </button>
        )}
      </div>
      {expanded && hasScorers && (
        <div style={{ marginTop: 6, fontSize: 11, color: C.sub, lineHeight: 1.6 }}>
          {goalEntries.map(([pid, c]) => `${playerName(pid)} ${c}골`).join(' · ')}
          {goalEntries.length > 0 && assistEntries.length > 0 && ' · '}
          {assistEntries.map(([pid, c]) => `${playerName(pid)} ${c}도움`).join(' · ')}
        </div>
      )}
    </div>
  );
}

function AddMatchModal({ players, onSave, onClose }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [opponentName, setOpponentName] = useState('');
  const [myScore, setMyScore] = useState('0');
  const [opponentScore, setOpponentScore] = useState('0');
  const [goals, setGoals] = useState({});
  const [assists, setAssists] = useState({});

  const handleGoalChange = (pid, delta) => {
    setGoals((prev) => ({ ...prev, [pid]: Math.max(0, (prev[pid] || 0) + delta) }));
  };
  const handleAssistChange = (pid, delta) => {
    setAssists((prev) => ({ ...prev, [pid]: Math.max(0, (prev[pid] || 0) + delta) }));
  };

  const handleSubmit = () => {
    if (!opponentName.trim()) return;
    onSave({
      id: nextId(),
      date,
      opponentName: opponentName.trim(),
      myScore: Math.max(0, Number(myScore) || 0),
      opponentScore: Math.max(0, Number(opponentScore) || 0),
      goals,
      assists,
      createdAt: Date.now(),
    });
  };

  const inputStyle = {
    background: C.raised, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: '10px 12px', fontSize: 14, color: C.text, outline: 'none', width: '100%',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: '0 24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400, maxHeight: '85vh', overflowY: 'auto',
          background: C.surface, borderRadius: 20, padding: '24px',
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>경기 기록 추가</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          <input
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            placeholder="상대팀 이름"
            style={inputStyle}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number" min="0" value={myScore}
              onChange={(e) => setMyScore(e.target.value)}
              style={{ ...inputStyle, textAlign: 'center' }}
            />
            <span style={{ color: C.muted, fontWeight: 700 }}>:</span>
            <input
              type="number" min="0" value={opponentScore}
              onChange={(e) => setOpponentScore(e.target.value)}
              style={{ ...inputStyle, textAlign: 'center' }}
            />
          </div>
        </div>

        <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, margin: '0 0 8px' }}>골 / 도움</p>
        {players.length === 0 ? (
          <p style={{ fontSize: 13, color: C.muted }}>등록된 선수가 없어요.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
            {players.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Stepper label="골" count={goals[p.id] || 0} onChange={(d) => handleGoalChange(p.id, d)} />
                  <Stepper label="도움" count={assists[p.id] || 0} onChange={(d) => handleAssistChange(p.id, d)} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700,
              color: C.sub, cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!opponentName.trim()}
            style={{
              flex: 1, background: C.accent, border: 'none',
              borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700,
              color: C.accentInk, cursor: opponentName.trim() ? 'pointer' : 'default',
              opacity: opponentName.trim() ? 1 : 0.5,
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
