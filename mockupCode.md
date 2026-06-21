import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, X, Share2, MessageCircle, Copy, UserPlus, Trash2 } from "lucide-react";

const COLORS = {
  shell: "#12161A",
  panel: "#1B2127",
  panelLight: "#232A31",
  pitchDark: "#1E5631",
  pitchLight: "#226B3A",
  line: "rgba(255,255,255,0.55)",
  gold: "#F2B705",
  goldDark: "#C99A04",
  textMuted: "#8A9199",
};

let uid = 100;
const nextId = () => ++uid;

const STARTER_SQUAD = [
  { id: 1, name: "김도윤", number: 1 },
  { id: 2, name: "이준서", number: 2 },
  { id: 3, name: "박현우", number: 3 },
  { id: 4, name: "정민재", number: 4 },
  { id: 5, name: "최우진", number: 5 },
  { id: 6, name: "강태양", number: 6 },
  { id: 7, name: "윤성호", number: 7 },
  { id: 8, name: "한지훈", number: 8 },
  { id: 9, name: "오승민", number: 9 },
  { id: 10, name: "신유준", number: 10 },
  { id: 11, name: "임태형", number: 11 },
  { id: 12, name: "김도현", number: 12 },
  { id: 13, name: "이성민", number: 13 },
];

const STARTER_LAYOUT = [
  { playerId: 1, x: 50, y: 90 },
  { playerId: 2, x: 18, y: 76 },
  { playerId: 3, x: 38, y: 80 },
  { playerId: 4, x: 62, y: 80 },
  { playerId: 5, x: 82, y: 76 },
  { playerId: 6, x: 30, y: 56 },
  { playerId: 7, x: 50, y: 60 },
  { playerId: 8, x: 70, y: 56 },
  { playerId: 9, x: 25, y: 30 },
  { playerId: 10, x: 50, y: 22 },
  { playerId: 11, x: 75, y: 30 },
];

function makeQuarter(label, players = []) {
  return { id: nextId(), label, players, comments: [] };
}

export default function LineupMaker() {
  const [teamName, setTeamName] = useState("우리팀 FC");
  const [editingTeam, setEditingTeam] = useState(false);
  const [squad, setSquad] = useState(STARTER_SQUAD);
  const [quarters, setQuarters] = useState([
    makeQuarter("1쿼터", STARTER_LAYOUT.map((p) => ({ ...p }))),
  ]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [draggingId, setDraggingId] = useState(null);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [toast, setToast] = useState("");
  const pitchRef = useRef(null);

  const quarter = quarters[activeIdx];
  const placedIds = new Set(quarter.players.map((p) => p.playerId));
  const bench = squad.filter((p) => !placedIds.has(p.id));

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  const updatePlayers = useCallback(
    (players) => {
      setQuarters((qs) => qs.map((q, i) => (i === activeIdx ? { ...q, players } : q)));
    },
    [activeIdx]
  );

  const addToPitch = (player) => {
    if (placedIds.has(player.id)) return;
    const taken = new Set(quarter.players.map((p) => `${Math.round(p.x / 8)}-${Math.round(p.y / 8)}`));
    let x = 50, y = 50;
    // nudge to an open-ish spot
    for (let i = 0; i < 8; i++) {
      const tx = 30 + ((i * 17) % 40);
      const ty = 45 + ((i * 13) % 30);
      if (!taken.has(`${Math.round(tx / 8)}-${Math.round(ty / 8)}`)) { x = tx; y = ty; break; }
    }
    updatePlayers([...quarter.players, { playerId: player.id, x, y }]);
  };

  const removeFromPitch = (playerId) => {
    updatePlayers(quarter.players.filter((p) => p.playerId !== playerId));
  };

  const deleteFromSquad = (playerId) => {
    setSquad((s) => s.filter((p) => p.id !== playerId));
    setQuarters((qs) => qs.map((q) => ({ ...q, players: q.players.filter((p) => p.playerId !== playerId) })));
  };

  useEffect(() => {
    if (draggingId == null) return;
    const move = (e) => {
      e.preventDefault();
      const rect = pitchRef.current.getBoundingClientRect();
      const point = e.touches ? e.touches[0] : e;
      let x = ((point.clientX - rect.left) / rect.width) * 100;
      let y = ((point.clientY - rect.top) / rect.height) * 100;
      x = Math.max(5, Math.min(95, x));
      y = Math.max(5, Math.min(95, y));
      setQuarters((qs) =>
        qs.map((q, i) =>
          i === activeIdx
            ? { ...q, players: q.players.map((p) => (p.playerId === draggingId ? { ...p, x, y } : p)) }
            : q
        )
      );
    };
    const up = () => setDraggingId(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [draggingId, activeIdx]);

  const addQuarter = (copy) => {
    const label = `${quarters.length + 1}쿼터`;
    const players = copy ? quarter.players.map((p) => ({ ...p })) : [];
    setQuarters((qs) => [...qs, makeQuarter(label, players)]);
    setActiveIdx(quarters.length);
  };

  const removeQuarter = (idx) => {
    if (quarters.length === 1) return;
    setQuarters((qs) => qs.filter((_, i) => i !== idx));
    setActiveIdx((cur) => (idx <= cur ? Math.max(0, cur - 1) : cur));
  };

  const addPlayer = () => {
    if (!newName.trim()) return;
    const id = nextId();
    setSquad((s) => [...s, { id, name: newName.trim(), number: newNumber.trim() || "-" }]);
    setNewName("");
    setNewNumber("");
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    setQuarters((qs) =>
      qs.map((q, i) =>
        i === activeIdx
          ? { ...q, comments: [...q.comments, { name: commentName.trim() || "익명", text: commentText.trim() }] }
          : q
      )
    );
    setCommentText("");
  };

  const playerById = (id) => squad.find((p) => p.id === id);

  return (
    <div style={{ background: COLORS.shell, minHeight: "100%", color: "white" }} className="w-full">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap');
        .lm-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
        .lm-body { font-family: 'Inter', sans-serif; }
        .lm-token { touch-action: none; }
      `}</style>

      <div className="lm-body max-w-md mx-auto pb-10" style={{ background: COLORS.shell }}>
        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wide" style={{ color: COLORS.textMuted }}>
              라인업 메이커
            </div>
            {editingTeam ? (
              <input
                autoFocus
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onBlur={() => setEditingTeam(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingTeam(false)}
                className="lm-display text-3xl bg-transparent outline-none w-full"
                style={{ borderBottom: `2px solid ${COLORS.gold}`, color: COLORS.gold }}
              />
            ) : (
              <button onClick={() => setEditingTeam(true)} className="lm-display text-3xl text-left truncate w-full" style={{ color: COLORS.gold }}>
                {teamName}
              </button>
            )}
          </div>
          <button
            onClick={() => showToast("공유 링크가 복사되었습니다 (프로토타입)")}
            className="flex items-center gap-1 rounded-full px-3 py-2 ml-3 shrink-0"
            style={{ background: COLORS.gold, color: "#1A1A1A" }}
          >
            <Share2 size={16} />
            <span className="text-sm font-semibold">공유</span>
          </button>
        </div>

        {/* Quarter tabs */}
        <div className="px-4 flex items-center gap-2 overflow-x-auto pb-1">
          {quarters.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setActiveIdx(i)}
              className="lm-display shrink-0 px-3 py-1.5 rounded-md text-base flex items-center gap-2"
              style={{
                background: i === activeIdx ? COLORS.gold : COLORS.panel,
                color: i === activeIdx ? "#1A1A1A" : "white",
                borderBottom: i === activeIdx ? `2px solid ${COLORS.goldDark}` : "2px solid transparent",
              }}
            >
              {q.label}
              {quarters.length > 1 && (
                <X
                  size={13}
                  onClick={(e) => { e.stopPropagation(); removeQuarter(i); }}
                  className="opacity-70"
                />
              )}
            </button>
          ))}
          <button
            onClick={() => addQuarter(false)}
            className="shrink-0 rounded-md p-2"
            style={{ background: COLORS.panel, color: COLORS.textMuted }}
            title="빈 쿼터 추가"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => addQuarter(true)}
            className="shrink-0 flex items-center gap-1 rounded-md px-2 py-2 text-xs"
            style={{ background: COLORS.panel, color: COLORS.textMuted }}
            title="현재 쿼터 복제"
          >
            <Copy size={14} /> 복제
          </button>
        </div>

        {/* Pitch */}
        <div className="px-4 mt-3">
          <div
            ref={pitchRef}
            className="relative w-full rounded-lg overflow-hidden select-none"
            style={{
              aspectRatio: "2 / 3",
              backgroundImage: `repeating-linear-gradient(0deg, ${COLORS.pitchDark} 0%, ${COLORS.pitchDark} 12.5%, ${COLORS.pitchLight} 12.5%, ${COLORS.pitchLight} 25%)`,
              border: `2px solid ${COLORS.line}`,
            }}
          >
            {/* halfway line */}
            <div className="absolute left-0 right-0" style={{ top: "50%", height: 2, background: COLORS.line }} />
            {/* center circle */}
            <div
              className="absolute rounded-full"
              style={{ left: "50%", top: "50%", width: "26%", height: "17%", border: `2px solid ${COLORS.line}`, transform: "translate(-50%,-50%)" }}
            />
            <div className="absolute rounded-full" style={{ left: "50%", top: "50%", width: 6, height: 6, background: COLORS.line, transform: "translate(-50%,-50%)" }} />
            {/* top penalty box (opponent goal) */}
            <div className="absolute" style={{ left: "20%", top: 0, width: "60%", height: "16%", borderLeft: `2px solid ${COLORS.line}`, borderRight: `2px solid ${COLORS.line}`, borderBottom: `2px solid ${COLORS.line}` }} />
            <div className="absolute" style={{ left: "36%", top: 0, width: "28%", height: "7%", borderLeft: `2px solid ${COLORS.line}`, borderRight: `2px solid ${COLORS.line}`, borderBottom: `2px solid ${COLORS.line}` }} />
            {/* bottom penalty box (own goal) */}
            <div className="absolute" style={{ left: "20%", bottom: 0, width: "60%", height: "16%", borderLeft: `2px solid ${COLORS.line}`, borderRight: `2px solid ${COLORS.line}`, borderTop: `2px solid ${COLORS.line}` }} />
            <div className="absolute" style={{ left: "36%", bottom: 0, width: "28%", height: "7%", borderLeft: `2px solid ${COLORS.line}`, borderRight: `2px solid ${COLORS.line}`, borderTop: `2px solid ${COLORS.line}` }} />

            {/* players */}
            {quarter.players.map((p) => {
              const info = playerById(p.playerId);
              if (!info) return null;
              return (
                <div
                  key={p.playerId}
                  onPointerDown={(e) => { e.preventDefault(); setDraggingId(p.playerId); }}
                  onTouchStart={() => setDraggingId(p.playerId)}
                  className="lm-token absolute flex flex-col items-center cursor-grab"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-50%)" }}
                >
                  <div className="relative">
                    <div
                      className="rounded-full flex items-center justify-center font-bold"
                      style={{ width: 36, height: 36, background: COLORS.gold, color: "#1A1A1A", border: "2px solid white" }}
                    >
                      {info.number}
                    </div>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); removeFromPitch(p.playerId); }}
                      className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
                      style={{ width: 16, height: 16, background: COLORS.shell, border: "1px solid white" }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <div
                    className="text-[10px] mt-0.5 px-1 rounded whitespace-nowrap"
                    style={{ background: "rgba(0,0,0,0.55)" }}
                  >
                    {info.name}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-xs mt-2" style={{ color: COLORS.textMuted }}>
            선수를 손가락으로 눌러 자유롭게 옮길 수 있어요. 아래 명단에서 선수를 탭하면 필드에 추가됩니다.
          </div>
        </div>

        {/* Bench / squad */}
        <div className="px-4 mt-5">
          <div className="text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>대기 명단 ({bench.length})</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {bench.map((p) => (
              <button
                key={p.id}
                onClick={() => addToPitch(p)}
                className="shrink-0 flex flex-col items-center rounded-lg px-3 py-2 relative"
                style={{ background: COLORS.panel }}
              >
                <Trash2
                  size={11}
                  onClick={(e) => { e.stopPropagation(); deleteFromSquad(p.id); }}
                  className="absolute top-1 right-1 opacity-50"
                />
                <div className="rounded-full flex items-center justify-center text-xs font-bold" style={{ width: 28, height: 28, background: COLORS.panelLight }}>
                  {p.number}
                </div>
                <div className="text-[11px] mt-1 whitespace-nowrap">{p.name}</div>
              </button>
            ))}
            {bench.length === 0 && (
              <div className="text-xs py-3" style={{ color: COLORS.textMuted }}>전원 필드에 배치됨</div>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="이름"
              className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
              style={{ background: COLORS.panel, color: "white" }}
            />
            <input
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="번호"
              className="w-16 rounded-md px-3 py-2 text-sm outline-none"
              style={{ background: COLORS.panel, color: "white" }}
            />
            <button
              onClick={addPlayer}
              className="rounded-md px-3 flex items-center justify-center"
              style={{ background: COLORS.gold, color: "#1A1A1A" }}
            >
              <UserPlus size={16} />
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="px-4 mt-6">
          <div className="text-sm font-semibold mb-2 flex items-center gap-1" style={{ color: COLORS.textMuted }}>
            <MessageCircle size={14} /> {quarter.label} 코멘트 ({quarter.comments.length})
          </div>
          <div className="rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto" style={{ background: COLORS.panel }}>
            {quarter.comments.length === 0 && (
              <div className="text-xs" style={{ color: COLORS.textMuted }}>아직 코멘트가 없어요. 지인에게 의견을 받아보세요.</div>
            )}
            {quarter.comments.map((c, i) => (
              <div key={i} className="text-sm">
                <span className="font-semibold" style={{ color: COLORS.gold }}>{c.name}</span>
                <span style={{ color: COLORS.textMuted }}> · </span>
                <span>{c.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              placeholder="이름"
              className="w-20 rounded-md px-2 py-2 text-sm outline-none"
              style={{ background: COLORS.panel, color: "white" }}
            />
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComment()}
              placeholder="이 쿼터에 대한 의견을 남겨보세요"
              className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
              style={{ background: COLORS.panel, color: "white" }}
            />
            <button onClick={addComment} className="rounded-md px-3 text-sm font-semibold" style={{ background: COLORS.gold, color: "#1A1A1A" }}>
              등록
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium"
          style={{ background: COLORS.gold, color: "#1A1A1A" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}