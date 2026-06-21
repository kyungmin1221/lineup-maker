import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import QuarterTabs from '../components/QuarterTabs';
import Pitch from '../components/Pitch';
import Comments from '../components/Comments';
import Toast from '../components/Toast';
import { getLineup, addComment as firebaseAddComment } from '../firebase/lineupService';
import { useToast } from '../hooks/useToast';
import { C } from '../constants';

export default function ViewPage() {
  const { id } = useParams();
  const [lineup, setLineup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const { toast, showToast } = useToast();

  useEffect(() => {
    getLineup(id)
      .then(setLineup)
      .catch(() => showToast('라인업을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddComment = async (name, text) => {
    try {
      await firebaseAddComment(id, activeIdx, { name, text });
      setLineup((prev) => {
        const quarters = prev.quarters.map((q, i) =>
          i === activeIdx ? { ...q, comments: [...(q.comments || []), { name, text, createdAt: Date.now() }] } : q
        );
        return { ...prev, quarters };
      });
    } catch {
      showToast('댓글 등록에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="lm-body flex items-center justify-center min-h-screen" style={{ background: C.bg }}>
        <div className="text-sm" style={{ color: C.textMuted }}>불러오는 중...</div>
      </div>
    );
  }

  if (!lineup) {
    return (
      <div className="lm-body flex items-center justify-center min-h-screen" style={{ background: C.bg }}>
        <div className="text-center">
          <div className="lm-display text-4xl mb-2" style={{ color: C.blueLight }}>404</div>
          <div className="text-sm" style={{ color: C.textMuted }}>라인업을 찾을 수 없습니다.</div>
        </div>
      </div>
    );
  }

  const quarter = lineup.quarters[activeIdx];

  return (
    <div className="lm-body min-h-full" style={{ background: C.bg, color: C.text }}>
      <div className="max-w-md mx-auto">
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
          placedPlayers={quarter.players}
          squad={lineup.squad}
          onDrag={() => {}}
          onRemove={() => {}}
          readOnly
        />

        <div style={{ height: 1, background: C.border, margin: '20px 16px 0' }} />

        <Comments quarter={quarter} onAddComment={handleAddComment} />
      </div>

      <Toast message={toast} />
    </div>
  );
}
