import { useState, useCallback } from 'react';
import {
  STARTER_SQUAD,
  STARTER_LAYOUT,
  makeQuarter,
  nextId,
} from '../constants';

export function useLineup(initialData) {
  const [teamName, setTeamName] = useState(
    initialData?.teamName ?? '매탄동 FC'
  );
  const [squad, setSquad] = useState(initialData?.squad ?? STARTER_SQUAD);
  const [quarters, setQuarters] = useState(
    initialData?.quarters ?? [
      makeQuarter(
        '1쿼터',
        STARTER_LAYOUT.map((p) => ({ ...p }))
      ),
    ]
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [phase, setPhase] = useState('base'); // 'base' | 'attack' | 'defense'

  const quarter = quarters[activeIdx];
  const placedIds = new Set(quarter.players.map((p) => p.playerId));
  const bench = squad.filter((p) => !placedIds.has(p.id));

  // phase에 따라 표시할 좌표로 변환 (없으면 기본 좌표 fallback)
  const displayPlayers = quarter.players.map((p) => {
    if (phase === 'attack') {
      return { ...p, x: p.attackX ?? p.x, y: p.attackY ?? p.y };
    }
    if (phase === 'defense') {
      return { ...p, x: p.defenseX ?? p.x, y: p.defenseY ?? p.y };
    }
    return p;
  });

  const updatePlayers = useCallback(
    (players) => {
      setQuarters((qs) =>
        qs.map((q, i) => (i === activeIdx ? { ...q, players } : q))
      );
    },
    [activeIdx]
  );

  const addToPitch = useCallback(
    (player) => {
      setQuarters((qs) => {
        const q = qs[activeIdx];
        if (q.players.some((p) => p.playerId === player.id)) return qs;
        const taken = new Set(
          q.players.map((p) => `${Math.round(p.x / 8)}-${Math.round(p.y / 8)}`)
        );
        let x = 50,
          y = 50;
        for (let i = 0; i < 12; i++) {
          const tx = 20 + ((i * 17) % 60);
          const ty = 30 + ((i * 13) % 40);
          if (!taken.has(`${Math.round(tx / 8)}-${Math.round(ty / 8)}`)) {
            x = tx;
            y = ty;
            break;
          }
        }
        return qs.map((q2, i) =>
          i === activeIdx
            ? { ...q2, players: [...q2.players, { playerId: player.id, x, y }] }
            : q2
        );
      });
    },
    [activeIdx]
  );

  const removeFromPitch = useCallback(
    (playerId) => {
      updatePlayers(quarter.players.filter((p) => p.playerId !== playerId));
    },
    [quarter, updatePlayers]
  );

  // 현재 쿼터에서만 해당 선수의 라벨 override (빈 값이면 라벨 제거 → 기본값으로 복귀)
  const setPlayerLabel = useCallback(
    (playerId, label) => {
      setQuarters((qs) =>
        qs.map((q, i) => {
          if (i !== activeIdx) return q;
          return {
            ...q,
            players: q.players.map((p) => {
              if (p.playerId !== playerId) return p;
              const trimmed = (label ?? '').trim();
              if (!trimmed) {
                const { label: _omit, ...rest } = p;
                return rest;
              }
              return { ...p, label: trimmed };
            }),
          };
        })
      );
    },
    [activeIdx]
  );

  const dragPlayer = useCallback(
    (playerId, x, y) => {
      setQuarters((qs) =>
        qs.map((q, i) =>
          i === activeIdx
            ? {
                ...q,
                players: q.players.map((p) => {
                  if (p.playerId !== playerId) return p;
                  if (phase === 'attack') return { ...p, attackX: x, attackY: y };
                  if (phase === 'defense') return { ...p, defenseX: x, defenseY: y };
                  return { ...p, x, y };
                }),
              }
            : q
        )
      );
    },
    [activeIdx, phase]
  );

  const deleteFromSquad = useCallback((playerId) => {
    setSquad((s) => s.filter((p) => p.id !== playerId));
    setQuarters((qs) =>
      qs.map((q) => ({
        ...q,
        players: q.players.filter((p) => p.playerId !== playerId),
      }))
    );
  }, []);

  const addPlayer = useCallback((name, number) => {
    const id = nextId();
    setSquad((s) => [...s, { id, name, number }]);
  }, []);

  const addQuarter = useCallback(
    (copy) => {
      const label = `${quarters.length + 1}쿼터`;
      const players = copy ? quarter.players.map((p) => ({ ...p })) : [];
      const newQ = makeQuarter(label, players);
      setQuarters((qs) => [...qs, newQ]);
      setActiveIdx(quarters.length);
    },
    [quarters, quarter]
  );

  const removeQuarter = useCallback((idx) => {
    setQuarters((qs) => {
      if (qs.length === 1) return qs;
      return qs.filter((_, i) => i !== idx);
    });
    setActiveIdx((cur) => (idx <= cur ? Math.max(0, cur - 1) : cur));
  }, []);

  const addComment = useCallback(
    (name, text) => {
      setQuarters((qs) =>
        qs.map((q, i) =>
          i === activeIdx
            ? {
                ...q,
                comments: [
                  ...q.comments,
                  { name, text, createdAt: Date.now() },
                ],
              }
            : q
        )
      );
    },
    [activeIdx]
  );

  // Firestore에서 받은 댓글을 로컬 상태에 반영 (선수 배치는 덮어쓰지 않음)
  const syncRemoteComments = useCallback((remoteQuarters) => {
    setQuarters((prev) =>
      prev.map((q, i) => ({
        ...q,
        comments: remoteQuarters[i]?.comments ?? q.comments,
      }))
    );
  }, []);

  return {
    teamName,
    setTeamName,
    squad,
    quarters,
    activeIdx,
    setActiveIdx,
    phase,
    setPhase,
    quarter,
    bench,
    displayPlayers,
    addToPitch,
    removeFromPitch,
    dragPlayer,
    setPlayerLabel,
    deleteFromSquad,
    addPlayer,
    addQuarter,
    removeQuarter,
    addComment,
    syncRemoteComments,
  };
}
