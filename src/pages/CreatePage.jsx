import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import QuarterTabs from '../components/QuarterTabs';
import FormationChips from '../components/FormationChips';
import Pitch from '../components/Pitch';
import AnimBar from '../components/AnimBar';
import ScenarioTabs from '../components/ScenarioTabs';
import Bench from '../components/Bench';
import Comments from '../components/Comments';
import Toast from '../components/Toast';
import { useLineup } from '../hooks/useLineup';
import { useToast } from '../hooks/useToast';
import {
  getLineup,
  updateLineup,
  addComment as saveComment,
  deleteComment as removeComment,
  subscribeToLineup,
  getOrCreateEditToken,
} from '../firebase/lineupService';
import { ensureSignedIn } from '../firebase/auth';
import { trackEvent } from '../lib/analytics';
import { C, nextId } from '../constants';

const CACHE_KEY = 'lineup-maker:my-lineup-id';

// 옛 nextId 버그로 인한 squad 중복 ID 자동 복구
function dedupeSquadIds(squad) {
  if (!Array.isArray(squad)) return { squad, changed: false };
  const seen = new Set();
  let changed = false;
  const cleaned = squad.map((p) => {
    if (seen.has(p.id)) {
      changed = true;
      return { ...p, id: nextId() };
    }
    seen.add(p.id);
    return p;
  });
  return { squad: cleaned, changed };
}

export default function CreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [initialData, setInitialData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // 진입 시 로그인 보장 + 라인업 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = await ensureSignedIn();
        const urlToken = searchParams.get('token');
        const data = await getLineup(id);
        if (cancelled) return;
        if (!data) {
          setLoadError(true);
          return;
        }
        const ownerMatch = !data.ownerId || data.ownerId === uid;
        const tokenMatch = urlToken && data.editToken && urlToken === data.editToken;
        // 소유자도 아니고 토큰도 맞지 않으면 진입 차단
        if (!ownerMatch && !tokenMatch) {
          navigate('/', { replace: true });
          return;
        }
        if (ownerMatch) {
          // ownerId 없는 옛 라인업은 현재 사용자 것으로 클레임
          if (!data.ownerId) {
            await updateLineup(id, { ownerId: uid }).catch(() => {});
            data.ownerId = uid;
          }
          // squad 중복 ID 복구 (있을 경우 Firestore에도 즉시 반영)
          const dedup = dedupeSquadIds(data.squad);
          if (dedup.changed) {
            data.squad = dedup.squad;
            await updateLineup(id, { squad: dedup.squad }).catch(console.error);
          }
          setIsOwner(true);
        }
        localStorage.setItem(CACHE_KEY, id);
        setInitialData(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, searchParams]);

  if (loadError) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: C.blueLight, marginBottom: 8 }}>404</div>
          <div style={{ fontSize: 14, color: C.muted }}>라인업을 찾을 수 없습니다.</div>
        </div>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: C.muted }}>불러오는 중...</div>
      </div>
    );
  }

  return <Editor id={id} initialData={initialData} isOwner={isOwner} />;
}

function Editor({ id, initialData, isOwner }) {
  const [editingTeam, setEditingTeam] = useState(false);
  const { toast, showToast } = useToast();

  // onSnapshot이 트리거한 상태 변경에서 자동저장이 다시 실행되는 것을 방지
  const skipNextSave = useRef(false);

  const {
    teamName, setTeamName,
    squad, quarters, activeIdx, setActiveIdx,
    phase, setPhase,
    scenarios, activeScenarioIdx, switchScenario,
    animStepIdx, setAnimStepIdx, animSteps,
    quarter, bench, displayPlayers, displayOpponents, displayBall,
    addToPitch, removeFromPitch, dragPlayer, setPlayerLabel, applyFormation,
    deleteFromSquad, addPlayer,
    addQuarter, removeQuarter,
    initAnimSteps, addAnimStep, removeAnimStep,
    addScenario, removeScenario, renameScenario,
    dragOpponent, dragBall,
    addComment, deleteComment, syncRemoteComments,
  } = useLineup(initialData);

  const [isPlaying, setIsPlaying] = useState(false);

  const handleSetPhase = useCallback((newPhase) => {
    if (newPhase === 'move') initAnimSteps();
    setIsPlaying(false);
    setPhase(newPhase);
  }, [initAnimSteps, setPhase]);

  // 애니메이션 타이머
  useEffect(() => {
    if (!isPlaying || phase !== 'move') return;
    if (animSteps.length < 2) { setIsPlaying(false); return; }
    const timer = setInterval(() => {
      setAnimStepIdx((prev) => {
        const next = prev + 1;
        if (next >= animSteps.length) { setIsPlaying(false); return 0; }
        return next;
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [isPlaying, phase, animSteps.length, setAnimStepIdx]);

  // 친구 댓글을 실시간으로 동기화
  useEffect(() => {
    const unsub = subscribeToLineup(id, (remote) => {
      if (remote?.quarters) {
        skipNextSave.current = true;
        syncRemoteComments(remote.quarters);
      }
    });
    return unsub;
  }, [id, syncRemoteComments]);

  // 라인업 변경 시 1초 후 자동 저장
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      updateLineup(id, { teamName, squad, quarters }).catch(console.error);
    }, 1000);
    return () => clearTimeout(timer);
  }, [id, teamName, squad, quarters]);

  // 편집 링크 복사 (소유자 전용)
  const handleShareEdit = async () => {
    try {
      const token = await getOrCreateEditToken(id);
      const url = `${window.location.origin}/edit/${id}?token=${token}`;
      if (navigator.share) {
        await navigator.share({ title: `${teamName} 라인업 편집`, url });
        trackEvent('share_edit_link', { method: 'native' });
      } else {
        await navigator.clipboard.writeText(url);
        trackEvent('share_edit_link', { method: 'clipboard' });
        showToast('편집 링크가 복사됐어요!');
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error(err);
      showToast('오류가 발생했습니다.');
    }
  };

  // 공유 버튼: 링크 공유만
  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/view/${id}`;
      if (navigator.share) {
        await navigator.share({ title: `${teamName} 라인업`, url });
        trackEvent('share_lineup', { method: 'native' });
      } else {
        await navigator.clipboard.writeText(url);
        trackEvent('share_lineup', { method: 'clipboard' });
        showToast('링크가 복사됐어요!');
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error(err);
      showToast('오류가 발생했습니다.');
    }
  };

  // 작성자 댓글: 로컬 + Firestore 동시 저장
  const handleAddComment = async (name, text) => {
    addComment(name, text);
    await saveComment(id, activeIdx, { name, text }).catch(console.error);
    trackEvent('add_comment', { role: 'owner' });
  };

  const handleDeleteComment = async (commentIdx) => {
    deleteComment(commentIdx);
    await removeComment(id, activeIdx, commentIdx).catch(console.error);
  };

  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.text }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Header
          teamName={teamName} setTeamName={setTeamName}
          editingTeam={editingTeam} setEditingTeam={setEditingTeam}
          onShare={handleShare} readOnly={false}
          onShareEdit={isOwner ? handleShareEdit : undefined}
        />

        <QuarterTabs
          quarters={quarters} activeIdx={activeIdx} setActiveIdx={setActiveIdx}
          addQuarter={addQuarter} removeQuarter={removeQuarter} readOnly={false}
        />

        {phase !== 'move' && (
          <FormationChips
            activeFormation={quarter.formations?.base}
            onApply={applyFormation}
          />
        )}

        {phase === 'move' && (
          <>
            <ScenarioTabs
              scenarios={scenarios}
              activeIdx={activeScenarioIdx}
              onSwitch={(idx) => { switchScenario(idx); setIsPlaying(false); initAnimSteps(); }}
              onAdd={() => { addScenario(); setIsPlaying(false); }}
              onRemove={removeScenario}
              onRename={renameScenario}
            />
            <AnimBar
              steps={animSteps}
              activeIdx={animStepIdx}
              onSetIdx={setAnimStepIdx}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onAddStep={addAnimStep}
              onRemoveStep={removeAnimStep}
              readOnly={false}
            />
          </>
        )}

        <Pitch
          placedPlayers={displayPlayers} squad={squad}
          onDrag={dragPlayer} onRemove={removeFromPitch}
          onLabelChange={setPlayerLabel}
          readOnly={false}
          phase={phase} setPhase={handleSetPhase}
          formation={quarter.formations?.[phase]}
          opponents={displayOpponents}
          ball={displayBall}
          onDragOpponent={dragOpponent}
          onDragBall={dragBall}
        />

        <div style={{ margin: '20px 24px 0', height: 1, background: C.border }} />

        <Bench
          bench={bench} onAddToPitch={addToPitch}
          onDeleteFromSquad={deleteFromSquad} onAddPlayer={addPlayer} readOnly={false}
        />

        <div style={{ margin: '20px 24px 0', height: 1, background: C.border }} />

        <Comments
          quarter={quarter}
          onAddComment={handleAddComment}
          canDelete
          onDeleteComment={handleDeleteComment}
        />
      </div>

      <Toast message={toast} />
    </div>
  );
}
