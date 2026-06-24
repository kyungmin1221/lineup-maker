import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import QuarterTabs from '../components/QuarterTabs';
import Pitch from '../components/Pitch';
import Bench from '../components/Bench';
import Comments from '../components/Comments';
import Toast from '../components/Toast';
import { subscribeToLineup, addComment as saveComment } from '../firebase/lineupService';
import { useToast } from '../hooks/useToast';
import { trackEvent } from '../lib/analytics';
import { C } from '../constants';

export default function ViewPage() {
  const { id } = useParams();
  const [lineup, setLineup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [phase, setPhase] = useState('base');
  const { toast, showToast } = useToast();
  const viewTracked = useRef(false);

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

  const handleAddComment = async (name, text) => {
    try {
      await saveComment(id, activeIdx, { name, text });
      trackEvent('add_comment', { role: 'viewer' });
      // Firestore onSnapshot이 자동으로 상태를 업데이트하므로 별도 setState 불필요
    } catch {
      showToast('댓글 등록에 실패했습니다.');
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
  const displayPlayers = quarter.players.map((p) => {
    if (phase === 'attack') return { ...p, x: p.attackX ?? p.x, y: p.attackY ?? p.y };
    if (phase === 'defense') return { ...p, x: p.defenseX ?? p.x, y: p.defenseY ?? p.y };
    return p;
  });

  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.text }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Header
          teamName={lineup.teamName}
          onShare={async () => {
            const url = window.location.href;
            if (navigator.share) {
              await navigator.share({ title: `${lineup.teamName} 라인업`, url }).catch(() => {});
            } else {
              await navigator.clipboard.writeText(url);
              showToast('링크가 복사됐어요!');
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

        <Pitch
          placedPlayers={displayPlayers}
          squad={lineup.squad}
          onDrag={() => {}}
          onRemove={() => {}}
          readOnly
          phase={phase}
          setPhase={setPhase}
          formation={quarter.formations?.[phase]}
        />

        <div style={{ height: 1, background: C.border, margin: '20px 24px 0' }} />

        <Bench bench={bench} readOnly />

        <div style={{ height: 1, background: C.border, margin: '20px 24px 0' }} />

        <Comments quarter={quarter} onAddComment={handleAddComment} />
      </div>

      <Toast message={toast} />
    </div>
  );
}
