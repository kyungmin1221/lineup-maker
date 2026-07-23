import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import QuarterTabs from '../components/QuarterTabs';
import Pitch from '../components/Pitch';
import AnimBar from '../components/AnimBar';
import ScenarioTabs from '../components/ScenarioTabs';
import Bench from '../components/Bench';
import Comments from '../components/Comments';
import Toast from '../components/Toast';
import {
  subscribeToLineup,
  addComment as saveComment,
  deleteComment as removeComment,
} from '../firebase/lineupService';
import { ensureSignedIn } from '../firebase/auth';
import { useToast } from '../hooks/useToast';
import { trackEvent } from '../lib/analytics';
import { C } from '../constants';
import { share, getTossShareLink } from '@apps-in-toss/web-framework';

export default function ViewPage() {
  const { id } = useParams();
  const [lineup, setLineup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [phase, setPhase] = useState('base');
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [animStepIdx, setAnimStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uid, setUid] = useState(null);
  const [moveHint, setMoveHint] = useState(true);
  const { toast, showToast } = useToast();
  const viewTracked = useRef(false);

  // 현재 사용자 식별 — 본인 라인업이면 댓글 삭제 권한 부여
  useEffect(() => {
    ensureSignedIn().then(setUid).catch(() => {});
  }, []);

  // Firestore 실시간 구독 — 라인업·댓글 모두 자동 반영
  useEffect(() => {
    const unsub = subscribeToLineup(id, (data) => {
      setLineup(data);
      setLoading(false);
      // 라인업이 실제로 로드된 첫 순간에 view_lineup 한 번만 전송
      if (data && !viewTracked.current) {
        viewTracked.current = true;
        trackEvent('view_lineup');
      }
    });
    return unsub;
  }, [id]);

  const handleSetPhase = (newPhase) => {
    setPhase(newPhase);
    setIsPlaying(false);
    if (newPhase === 'move') setMoveHint(false);
    setAnimStepIdx(0);
    setActiveScenarioIdx(0);
    if (newPhase === 'move') {
      const q = lineup?.quarters[activeIdx];
      const scens = q?.scenarios ?? (q?.animSteps?.length > 0 ? [{ steps: q.animSteps }] : []);
      const steps = scens[0]?.steps || [];
      if (steps.length >= 2) setTimeout(() => setIsPlaying(true), 300);
    }
  };

  // 애니메이션 타이머
  useEffect(() => {
    if (!isPlaying || phase !== 'move') return;
    const q = lineup?.quarters[activeIdx];
    const scens = q?.scenarios ?? (q?.animSteps?.length > 0 ? [{ steps: q.animSteps }] : []);
    const steps = scens[Math.min(activeScenarioIdx, Math.max(0, scens.length - 1))]?.steps || [];
    if (steps.length < 2) { setIsPlaying(false); return; }
    const timer = setInterval(() => {
      setAnimStepIdx((prev) => {
        const next = prev + 1;
        if (next >= steps.length) { setIsPlaying(false); return 0; }
        return next;
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [isPlaying, phase, lineup, activeIdx, activeScenarioIdx]);

  const handleAddComment = async (name, text) => {
    try {
      await saveComment(id, activeIdx, { name, text });
      trackEvent('add_comment', { role: 'viewer' });
      // Firestore onSnapshot이 자동으로 상태를 업데이트하므로 별도 setState 불필요
    } catch {
      showToast('댓글 등록에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentIdx) => {
    try {
      await removeComment(id, activeIdx, commentIdx);
      // onSnapshot이 자동 반영
    } catch {
      showToast('댓글 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: C.muted }}>불러오는 중...</div>
      </div>
    );
  }

  if (!lineup) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: C.blueLight, marginBottom: 8 }}>404</div>
          <div style={{ fontSize: 14, color: C.muted }}>라인업을 찾을 수 없습니다.</div>
        </div>
      </div>
    );
  }

  const quarter = lineup.quarters[activeIdx];
  const placedIds = new Set(quarter.players.map((p) => p.playerId));
  const bench = (lineup.squad || []).filter((p) => !placedIds.has(p.id));
  const isOwner = !!uid && lineup.ownerId === uid;

  // 구버전(animSteps) 호환 + 신버전(scenarios) 지원
  const scenarios = quarter.scenarios
    ?? (quarter.animSteps?.length > 0 ? [{ id: 'legacy', label: '움직임 1', steps: quarter.animSteps }] : []);
  const hasMeaningfulMovement = scenarios.some(sc => (sc.steps || []).length >= 2);
  const clampedScenarioIdx = scenarios.length > 0 ? Math.min(activeScenarioIdx, scenarios.length - 1) : 0;
  const activeScenario = scenarios[clampedScenarioIdx] ?? null;
  const animSteps = activeScenario?.steps || [];
  const clampedAnimIdx = animSteps.length > 0 ? Math.min(animStepIdx, animSteps.length - 1) : 0;
  const currentStep = animSteps[clampedAnimIdx];

  const displayPlayers = phase === 'move'
    ? (currentStep?.players ?? quarter.players.map(p => ({ playerId: p.playerId, x: p.x, y: p.y })))
    : quarter.players;

  const displayOpponents = phase === 'move' ? (currentStep?.opponents || []) : [];
  const displayBall = phase === 'move' ? (currentStep?.ball || null) : null;

  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.text }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Header
          teamName={lineup.teamName}
          onShare={async () => {
            try {
              if (window.location.hostname.includes('tossmini.com')) {
                const tossLink = await getTossShareLink(`intoss://lineupmaker/view/${id}`, 'https://lineup-maker-tau.vercel.app/og-image.png');
                await share({ message: `${lineup.teamName} 라인업\n${tossLink}` });
              } else {
                await navigator.clipboard.writeText(window.location.href);
                showToast('링크가 복사됐어요!');
              }
            } catch {
              showToast('공유 중 오류가 발생했습니다.');
            }
          }}
          readOnly
        />

        <QuarterTabs
          quarters={lineup.quarters}
          activeIdx={activeIdx}
          setActiveIdx={setActiveIdx}
          readOnly
        />

        {phase === 'move' && !hasMeaningfulMovement && (
          <div style={{
            margin: '12px 24px 0',
            padding: '14px 18px',
            borderRadius: 12,
            background: C.surface,
            border: `1px solid ${C.border}`,
            textAlign: 'center',
            fontSize: 13,
            color: C.muted,
          }}>
            아직 움직임이 존재하지 않습니다
          </div>
        )}

        {phase === 'move' && hasMeaningfulMovement && scenarios.length > 0 && (
          <ScenarioTabs
            scenarios={scenarios}
            activeIdx={clampedScenarioIdx}
            onSwitch={(idx) => { setActiveScenarioIdx(idx); setAnimStepIdx(0); setIsPlaying(false); }}
            readOnly
          />
        )}

        {phase === 'move' && hasMeaningfulMovement && animSteps.length > 0 && (
          <AnimBar
            steps={animSteps}
            activeIdx={clampedAnimIdx}
            onSetIdx={(i) => { setAnimStepIdx(i); setIsPlaying(false); }}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onAddStep={() => {}}
            onRemoveStep={() => {}}
            readOnly
          />
        )}

        <Pitch
          placedPlayers={displayPlayers}
          squad={lineup.squad}
          onDrag={() => {}}
          onRemove={() => {}}
          readOnly
          phase={phase}
          setPhase={handleSetPhase}
          formation={quarter.formations?.[phase]}
          opponents={displayOpponents}
          ball={displayBall}
          moveHint={moveHint}
          onDismissMoveHint={() => setMoveHint(false)}
          moveDisabled={!hasMeaningfulMovement}
          showOpponents={lineup.showOpponents ?? true}
        />

        <div style={{ height: 1, background: C.border, margin: '20px 24px 0' }} />

        <Bench bench={bench} readOnly />

        <div style={{ height: 1, background: C.border, margin: '20px 24px 0' }} />

        <Comments
          quarter={quarter}
          onAddComment={handleAddComment}
          canDelete={isOwner}
          onDeleteComment={handleDeleteComment}
        />
      </div>

      <Toast message={toast} />
    </div>
  );
}
