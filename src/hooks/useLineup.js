import { useState, useCallback } from 'react';
import {
  STARTER_SQUAD,
  STARTER_LAYOUT,
  makeQuarter,
  nextId,
  FORMATIONS,
} from '../constants';

export function useLineup(initialData) {
  const [teamName, setTeamName] = useState(
    initialData?.teamName ?? '이름없음 FC'
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

  // 현재 쿼터의 현재 phase에 포메이션 적용
  // 1) 필드 선수를 가장 가까운 슬롯에 그리디 매칭
  // 2) 남은 빈 슬롯에 벤치 선수를 순서대로 자동 배치
  // 3) 그래도 부족하면 ghost로 남김
  const applyFormation = useCallback(
    (formationKey) => {
      const slots = FORMATIONS[formationKey];
      if (!slots) return;

      setQuarters((qs) =>
        qs.map((q, i) => {
          if (i !== activeIdx) return q;

          const phaseCoords = (p) => {
            if (phase === 'attack') return { x: p.attackX ?? p.x, y: p.attackY ?? p.y };
            if (phase === 'defense') return { x: p.defenseX ?? p.x, y: p.defenseY ?? p.y };
            return { x: p.x, y: p.y };
          };

          // Step 1: 슬롯별 선수 할당 (slotIdx -> playerId)
          const slotToPlayerId = new Array(slots.length).fill(null);

          // 기존 필드 선수를 가장 가까운 슬롯에 그리디 매칭
          const remaining = q.players.map((p) => p);
          slots.forEach((slot, slotIdx) => {
            if (remaining.length === 0) return;
            let bestI = 0;
            let bestDist = Infinity;
            remaining.forEach((p, ri) => {
              const c = phaseCoords(p);
              const d = (c.x - slot.x) ** 2 + (c.y - slot.y) ** 2;
              if (d < bestDist) {
                bestDist = d;
                bestI = ri;
              }
            });
            slotToPlayerId[slotIdx] = remaining[bestI].playerId;
            remaining.splice(bestI, 1);
          });

          // Step 2: 빈 슬롯에 벤치 선수 순서대로 채우기
          const placedIds = new Set(q.players.map((p) => p.playerId));
          const benchPlayers = squad.filter((p) => !placedIds.has(p.id));
          let benchIdx = 0;
          slots.forEach((_, slotIdx) => {
            if (slotToPlayerId[slotIdx] !== null) return;
            if (benchIdx >= benchPlayers.length) return;
            slotToPlayerId[slotIdx] = benchPlayers[benchIdx++].id;
          });

          // Step 3: 기존 선수 위치 갱신
          const updatedExisting = q.players.map((p) => {
            const slotIdx = slotToPlayerId.indexOf(p.playerId);
            if (slotIdx === -1) return p; // 11명 초과 시 미배정 선수는 그대로
            const slot = slots[slotIdx];
            if (phase === 'attack') return { ...p, attackX: slot.x, attackY: slot.y };
            if (phase === 'defense') return { ...p, defenseX: slot.x, defenseY: slot.y };
            return { ...p, x: slot.x, y: slot.y };
          });

          // Step 4: 벤치에서 새로 들여온 선수 추가
          const newFromBench = [];
          slots.forEach((slot, slotIdx) => {
            const pid = slotToPlayerId[slotIdx];
            if (!pid) return;
            if (placedIds.has(pid)) return; // 기존 선수는 이미 처리됨
            const entry = { playerId: pid, x: slot.x, y: slot.y };
            if (phase === 'attack') {
              entry.attackX = slot.x;
              entry.attackY = slot.y;
            } else if (phase === 'defense') {
              entry.defenseX = slot.x;
              entry.defenseY = slot.y;
            }
            newFromBench.push(entry);
          });

          return {
            ...q,
            players: [...updatedExisting, ...newFromBench],
            formations: {
              ...(q.formations || {}),
              [phase]: formationKey,
            },
          };
        })
      );
    },
    [activeIdx, phase, squad]
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
    applyFormation,
    deleteFromSquad,
    addPlayer,
    addQuarter,
    removeQuarter,
    addComment,
    syncRemoteComments,
  };
}
