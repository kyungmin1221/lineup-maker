import { useState } from 'react';
import Header from '../components/Header';
import QuarterTabs from '../components/QuarterTabs';
import Pitch from '../components/Pitch';
import Bench from '../components/Bench';
import Comments from '../components/Comments';
import Toast from '../components/Toast';
import { useLineup } from '../hooks/useLineup';
import { useToast } from '../hooks/useToast';
import { createLineup, updateLineup } from '../firebase/lineupService';
import { C } from '../constants';

export default function CreatePage() {
  const [editingTeam, setEditingTeam] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const { toast, showToast } = useToast();

  const {
    teamName, setTeamName,
    squad, quarters, activeIdx, setActiveIdx,
    quarter, bench,
    addToPitch, removeFromPitch, dragPlayer,
    deleteFromSquad, addPlayer,
    addQuarter, removeQuarter,
    addComment,
  } = useLineup();

  const handleShare = async () => {
    setSaving(true);
    try {
      const data = { teamName, squad, quarters };
      let id = savedId;
      if (!id) {
        id = await createLineup(data);
        setSavedId(id);
      } else {
        await updateLineup(id, data);
      }

      const url = `${window.location.origin}/view/${id}`;

      // 모바일: 네이티브 공유 시트 사용
      if (navigator.share) {
        await navigator.share({ title: `${teamName} 라인업`, url });
        showToast('공유 완료!');
      } else {
        // PC: 클립보드 복사
        await navigator.clipboard.writeText(url);
        showToast('링크가 복사됐어요!');
      }
    } catch (err) {
      // 공유 취소는 에러가 아님
      if (err?.name === 'AbortError') return;
      console.error(err);
      showToast('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
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

        <div style={{ margin: '20px 16px 0', height: 1, background: C.border }} />

        <Bench
          bench={bench} onAddToPitch={addToPitch}
          onDeleteFromSquad={deleteFromSquad} onAddPlayer={addPlayer} readOnly={false}
        />

        <div style={{ margin: '20px 16px 0', height: 1, background: C.border }} />

        <Comments quarter={quarter} onAddComment={addComment} />
      </div>

      {saving && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,17,32,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:40 }}>
          <div style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:'14px 24px', fontSize:14, fontWeight:500, color:C.text }}>
            저장 중...
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
