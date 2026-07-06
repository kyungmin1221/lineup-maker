import { useState, useCallback } from 'react';
import {
  STARTER_SQUAD,
  STARTER_LAYOUT,
  makeQuarter,
  nextId,
  FORMATIONS,
  DEFAULT_OPPONENTS,
  DEFAULT_BALL,
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
  const [phase, setPhase] = useState('base'); // 'base' | 'attack' | 'defense' | 'move'
  const [animStepIdx, setAnimStepIdx] = useState(0);

  const quarter = quarters[activeIdx];
  const placedIds = new Set(quarter.players.map((p) => p.playerId));
  const bench = squad.filter((p) => !placedIds.has(p.id));

  const animSteps = quarter.animSteps || [];
  const clampedAnimIdx = animSteps.length > 0
    ? Math.min(animStepIdx, animSteps.length - 1)
    : 0;

  // phase에 따라 표시할 좌표로 변환
  const baseFallback = quarter.players.map((p) => ({
    playerId: p.playerId,
    x: p.x,
    y: p.y,
    ...(p.label ? { label: p.label } : {}),
  }));

  const displayPlayers = (() => {
    if (phase === 'move') {
      if (animSteps.length === 0) return baseFallback;
      return animSteps[clampedAnimIdx]?.players ?? baseFallback;
    }
    return quarter.players;
  })();

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
        let x = 50, y = 50;
        for (let i = 0; i < 12; i++) {
          const tx = 20 + ((i * 17) % 60);
          const ty = 30 + ((i * 13) % 40);
          if (!taken.has(`${Math.round(tx / 8)}-${Math.round(ty / 8)}`)) {
            x = tx; y = ty; break;
          }
        }
        const newEntry = { playerId: player.id, x, y };
        return qs.map((q2, i) => {
          if (i !== activeIdx) return q2;
          // 움직임 모드일 때 모든 animStep에도 선수 추가
          const updatedAnimSteps = (q2.animSteps || []).map((step) => ({
            ...step,
            players: [...step.players, { ...newEntry }],
          }));
          return {
            ...q2,
            players: [...q2.players, newEntry],
            animSteps: updatedAnimSteps,
          };
        });
      });
    },
    [activeIdx]
  );

  const removeFromPitch = useCallback(
    (playerId) => {
      setQuarters((qs) =>
        qs.map((q, i) => {
          if (i !== activeIdx) return q;
          return {
            ...q,
            players: q.players.filter((p) => p.playerId !== playerId),
            animSteps: (q.animSteps || []).map((step) => ({
              ...step,
              players: step.players.filter((p) => p.playerId !== playerId),
            })),
          };
        })
      );
    },
    [activeIdx]
  );

  const applyFormation = useCallback(
    (formationKey) => {
      const slots = FORMATIONS[formationKey];
      if (!slots) return;

      setQuarters((qs) =>
        qs.map((q, i) => {
          if (i !== activeIdx) return q;

          const slotToPlayerId = new Array(slots.length).fill(null);
          const remaining = q.players.map((p) => p);
          slots.forEach((slot, slotIdx) => {
            if (remaining.length === 0) return;
            let bestI = 0, bestDist = Infinity;
            remaining.forEach((p, ri) => {
              const d = (p.x - slot.x) ** 2 + (p.y - slot.y) ** 2;
              if (d < bestDist) { bestDist = d; bestI = ri; }
            });
            slotToPlayerId[slotIdx] = remaining[bestI].playerId;
            remaining.splice(bestI, 1);
          });

          const placedIds2 = new Set(q.players.map((p) => p.playerId));
          const benchPlayers = squad.filter((p) => !placedIds2.has(p.id));
          let benchIdx = 0;
          slots.forEach((_, slotIdx) => {
            if (slotToPlayerId[slotIdx] !== null) return;
            if (benchIdx >= benchPlayers.length) return;
            slotToPlayerId[slotIdx] = benchPlayers[benchIdx++].id;
          });

          const updatedExisting = q.players.map((p) => {
            const slotIdx = slotToPlayerId.indexOf(p.playerId);
            if (slotIdx === -1) return p;
            return { ...p, x: slots[slotIdx].x, y: slots[slotIdx].y };
          });

          const newFromBench = [];
          slots.forEach((slot, slotIdx) => {
            const pid = slotToPlayerId[slotIdx];
            if (!pid || placedIds2.has(pid)) return;
            newFromBench.push({ playerId: pid, x: slot.x, y: slot.y });
          });

          const newPlayers = [...updatedExisting, ...newFromBench];

          const updatedAnimSteps = (q.animSteps || []).map((step) => {
            const stepPlayerIds = new Set(step.players.map((p) => p.playerId));
            const movedPlayers = step.players.map((sp) => {
              const matched = newPlayers.find((np) => np.playerId === sp.playerId);
              return matched ? { ...sp, x: matched.x, y: matched.y } : sp;
            });
            const newlyAdded = newFromBench
              .filter((p) => !stepPlayerIds.has(p.playerId))
              .map((p) => ({ playerId: p.playerId, x: p.x, y: p.y }));
            return { ...step, players: [...movedPlayers, ...newlyAdded] };
          });

          return {
            ...q,
            players: newPlayers,
            formations: { ...(q.formations || {}), base: formationKey },
            animSteps: updatedAnimSteps,
          };
        })
      );
    },
    [activeIdx, squad]
  );

  const setPlayerLabel = useCallback(
    (playerId, label) => {
      setQuarters((qs) =>
        qs.map((q, i) => {
          if (i !== activeIdx) return q;
          const trimmed = (label ?? '').trim();
          const applyLabel = (p) => {
            if (p.playerId !== playerId) return p;
            if (!trimmed) { const { label: _omit, ...rest } = p; return rest; }
            return { ...p, label: trimmed };
          };
          return {
            ...q,
            players: q.players.map(applyLabel),
            animSteps: (q.animSteps || []).map((step) => ({
              ...step,
              players: step.players.map(applyLabel),
            })),
          };
        })
      );
    },
    [activeIdx]
  );

  const dragPlayer = useCallback(
    (playerId, x, y) => {
      if (phase === 'move') {
        setQuarters((qs) => {
          const q = qs[activeIdx];
          const steps = q.animSteps || [];
          const si = Math.min(animStepIdx, steps.length - 1);
          if (si < 0) return qs;
          return qs.map((q2, i) => i !== activeIdx ? q2 : {
            ...q2,
            animSteps: steps.map((s, idx) => idx !== si ? s : {
              ...s,
              players: s.players.map((p) =>
                p.playerId === playerId ? { ...p, x, y } : p
              ),
            }),
          });
        });
        return;
      }
      setQuarters((qs) =>
        qs.map((q, i) =>
          i === activeIdx
            ? {
                ...q,
                players: q.players.map((p) =>
                  p.playerId !== playerId ? p : { ...p, x, y }
                ),
                animSteps: (q.animSteps || []).map((step) => ({
                  ...step,
                  players: step.players.map((p) =>
                    p.playerId === playerId ? { ...p, x, y } : p
                  ),
                })),
              }
            : q
        )
      );
    },
    [activeIdx, phase, animStepIdx]
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

  // 움직임 phase 진입 시 첫 스텝 자동 생성 (아직 없는 경우)
  const initAnimSteps = useCallback(() => {
    setQuarters((qs) =>
      qs.map((q, i) => {
        if (i !== activeIdx) return q;
        if (q.animSteps && q.animSteps.length > 0) {
          const [firstStep, ...restSteps] = q.animSteps;
          // label 동기화 헬퍼: base players의 label을 animStep player에 반영
          const syncLabel = (sp) => {
            const base = q.players.find((bp) => bp.playerId === sp.playerId);
            if (!base) return sp;
            if (base.label) return { ...sp, label: base.label };
            const { label: _omit, ...rest } = sp;
            return rest;
          };
          // 스텝 1: 기본 포메이션 위치(x,y) + label 동기화
          const syncedFirst = {
            ...firstStep,
            players: firstStep.players.map((sp) => {
              const base = q.players.find((bp) => bp.playerId === sp.playerId);
              if (!base) return sp;
              const synced = { ...sp, x: base.x, y: base.y };
              if (base.label) synced.label = base.label;
              else delete synced.label;
              return synced;
            }),
            opponents: firstStep.opponents || DEFAULT_OPPONENTS.map((o) => ({ ...o })),
            ball: firstStep.ball || { ...DEFAULT_BALL },
          };
          // 스텝 2+: label만 동기화 (x,y 커스텀 유지)
          const migratedRest = restSteps.map((step) => ({
            ...step,
            players: step.players.map(syncLabel),
            opponents: step.opponents || DEFAULT_OPPONENTS.map((o) => ({ ...o })),
            ball: step.ball || { ...DEFAULT_BALL },
          }));
          return { ...q, animSteps: [syncedFirst, ...migratedRest] };
        }
        const firstStep = {
          id: nextId(),
          players: q.players.map((p) => ({
            playerId: p.playerId,
            x: p.x,
            y: p.y,
            ...(p.label ? { label: p.label } : {}),
          })),
          opponents: DEFAULT_OPPONENTS.map((o) => ({ ...o })),
          ball: { ...DEFAULT_BALL },
        };
        return { ...q, animSteps: [firstStep] };
      })
    );
    setAnimStepIdx(0);
  }, [activeIdx]);

  const addAnimStep = useCallback(() => {
    const currentLen = (quarter.animSteps || []).length;
    setQuarters((qs) => {
      const q = qs[activeIdx];
      const steps = q.animSteps || [];
      const lastStep = steps[steps.length - 1];
      const basePlayers = lastStep
        ? lastStep.players.map((p) => ({ ...p }))
        : q.players.map((p) => ({
            playerId: p.playerId,
            x: p.x,
            y: p.y,
            ...(p.label ? { label: p.label } : {}),
          }));
      const newStep = {
        id: nextId(),
        players: basePlayers,
        opponents: (lastStep?.opponents || DEFAULT_OPPONENTS).map((o) => ({ ...o })),
        ball: lastStep?.ball ? { ...lastStep.ball } : { ...DEFAULT_BALL },
      };
      return qs.map((q2, i) =>
        i !== activeIdx ? q2 : { ...q2, animSteps: [...steps, newStep] }
      );
    });
    setAnimStepIdx(currentLen);
  }, [activeIdx, quarter.animSteps]);

  const dragOpponent = useCallback((oppId, x, y) => {
    setQuarters((qs) => {
      const q = qs[activeIdx];
      const steps = q.animSteps || [];
      const si = Math.min(animStepIdx, steps.length - 1);
      if (si < 0) return qs;
      return qs.map((q2, i) => i !== activeIdx ? q2 : {
        ...q2,
        animSteps: steps.map((s, idx) => idx !== si ? s : {
          ...s,
          opponents: (s.opponents || DEFAULT_OPPONENTS).map((o) =>
            o.id === oppId ? { ...o, x, y } : o
          ),
        }),
      });
    });
  }, [activeIdx, animStepIdx]);

  const dragBall = useCallback((x, y) => {
    setQuarters((qs) => {
      const q = qs[activeIdx];
      const steps = q.animSteps || [];
      const si = Math.min(animStepIdx, steps.length - 1);
      if (si < 0) return qs;
      return qs.map((q2, i) => i !== activeIdx ? q2 : {
        ...q2,
        animSteps: steps.map((s, idx) => idx !== si ? s : {
          ...s,
          ball: { x, y },
        }),
      });
    });
  }, [activeIdx, animStepIdx]);

  const removeAnimStep = useCallback((idx) => {
    setQuarters((qs) => {
      const q = qs[activeIdx];
      const steps = q.animSteps || [];
      if (steps.length <= 1) return qs;
      return qs.map((q2, i) =>
        i !== activeIdx ? q2 : {
          ...q2,
          animSteps: steps.filter((_, si) => si !== idx),
        }
      );
    });
    setAnimStepIdx((prev) => Math.max(0, idx <= prev ? prev - 1 : prev));
  }, [activeIdx]);

  const addComment = useCallback(
    (name, text) => {
      setQuarters((qs) =>
        qs.map((q, i) =>
          i === activeIdx
            ? { ...q, comments: [...q.comments, { name, text, createdAt: Date.now() }] }
            : q
        )
      );
    },
    [activeIdx]
  );

  const deleteComment = useCallback(
    (commentIdx) => {
      setQuarters((qs) =>
        qs.map((q, i) => {
          if (i !== activeIdx) return q;
          const comments = [...q.comments];
          comments.splice(commentIdx, 1);
          return { ...q, comments };
        })
      );
    },
    [activeIdx]
  );

  const syncRemoteComments = useCallback((remoteQuarters) => {
    setQuarters((prev) =>
      prev.map((q, i) => ({
        ...q,
        comments: remoteQuarters[i]?.comments ?? q.comments,
      }))
    );
  }, []);

  const currentStep = animSteps[clampedAnimIdx];
  const displayOpponents = phase === 'move' ? (currentStep?.opponents || DEFAULT_OPPONENTS) : [];
  const displayBall = phase === 'move' ? (currentStep?.ball || null) : null;

  return {
    teamName, setTeamName,
    squad, quarters, activeIdx, setActiveIdx,
    phase, setPhase,
    animStepIdx: clampedAnimIdx,
    setAnimStepIdx,
    animSteps,
    quarter, bench, displayPlayers, displayOpponents, displayBall,
    addToPitch, removeFromPitch, dragPlayer, setPlayerLabel, applyFormation,
    deleteFromSquad, addPlayer,
    addQuarter, removeQuarter,
    initAnimSteps, addAnimStep, removeAnimStep,
    dragOpponent, dragBall,
    addComment, deleteComment, syncRemoteComments,
  };
}
