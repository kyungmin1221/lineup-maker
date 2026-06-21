import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import QuarterTabs from '../components/QuarterTabs';
import Pitch from '../components/Pitch';
import Bench from '../components/Bench';
import Comments from '../components/Comments';
import Toast from '../components/Toast';
import { useLineup } from '../hooks/useLineup';
import { useToast } from '../hooks/useToast';
import {
  createLineup,
  updateLineup,
  addComment as saveComment,
  subscribeToLineup,
} from '../firebase/lineupService';
import { C } from '../constants';

export default function CreatePage() {
  const [editingTeam, setEditingTeam] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  // onSnapshot이 트리거한 상태 변경에서 자동저장이 다시 실행되는 것을 방지
  const skipNextSave = useRef(false);

  const {
    teamName, setTeamName,
    squad, quarters, activeIdx, setActiveIdx,
    quarter, bench,
    addToPitch, removeFromPitch, dragPlayer,
    deleteFromSquad, addPlayer,
    addQuarter, removeQuarter,
    addComment, syncRemoteComments,
  } = useLineup();

  // 저장된 후: 친구 댓글을 실시간으로 동기화
  useEffect(() => {
    if (!savedId) return;
    const unsub = subscribeToLineup(savedId, (remote) => {
      if (remote?.quarters) {
        skipNextSave.current = true; // 이 상태 변경으로 인한 자동저장 건너뜀
        syncRemoteComments(remote.quarters);
      }
    });
    return unsub;
  }, [savedId, syncRemoteComments]);

  // 라인업 변경 시 1초 후 자동 저장 (remote 업데이트 제외)
  useEffect(() => {
    if (!savedId) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      updateLineup(savedId, { teamName, squad, quarters }).catch(console.error);
    }, 1000);
    return () => clearTimeout(timer);
  }, [savedId, teamName, squad, quarters]);

  // 공유 버튼: 최초엔 문서 생성, 이후엔 링크만 공유
  const handleShare = async () => {
    try {
      let id = savedId;
      if (!id) {
        setSaving(true);
        id = await createLineup({ teamName, squad, quarters });
        setSavedId(id);
        setSaving(false);
      }
      const url = `${window.location.origin}/view/${id}`;
      if (navigator.share) {
        await navigator.share({ title: `${teamName} 라인업`, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('링크가 복사됐어요!');
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error(err);
      setSaving(false);
      showToast('오류가 발생했습니다.');
    }
  };

  // 작성자 댓글: 로컬 + Firestore 동시 저장
  const handleAddComment = async (name, text) => {
    addComment(name, text);
    if (savedId) {
      await saveComment(savedId, activeIdx, { name, text }).catch(console.error);
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.text }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Header
          teamName={teamName} setTeamName={setTeamName}
          editingTeam={editingTeam} setEditingTeam={setEditingTeam}
          onShare={handleShare} readOnly={false}
        />

        <QuarterTabs
          quarters={quarters} activeIdx={activeIdx} setActiveIdx={setActiveIdx}
          addQuarter={addQuarter} removeQuarter={removeQuarter} readOnly={false}
        />

        <Pitch
          placedPlayers={quarter.players} squad={squad}
          onDrag={dragPlayer} onRemove={removeFromPitch} readOnly={false}
        />

        <div style={{ margin: '20px 24px 0', height: 1, background: C.border }} />

        <Bench
          bench={bench} onAddToPitch={addToPitch}
          onDeleteFromSquad={deleteFromSquad} onAddPlayer={addPlayer} readOnly={false}
        />

        <div style={{ margin: '20px 24px 0', height: 1, background: C.border }} />

        <Comments quarter={quarter} onAddComment={handleAddComment} />
      </div>

      {saving && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,17,32,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 24px', fontSize: 14, fontWeight: 500, color: C.text }}>
            저장 중...
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
