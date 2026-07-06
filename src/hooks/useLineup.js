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

// 구버전 데이터(animSteps) → 새 구조(scenarios) 마이그레이션
function migrateQuarter(q) {
  if (q.scenarios !== undefined) return q;
  const steps = q.animSteps || [];
  return {
    ...q,
    scenarios: steps.length > 0
      ? [{ id: nextId(), label: '움직임 1', steps }]
      : [],
  };
}

export function useLineup(initialData) {
  const [teamName, setTeamName] = useState(initialData?.teamName ?? '이름없음 FC');
  const [squad, setSquad] = useState(initialData?.squad ?? STARTER_SQUAD);
  const [quarters, setQuarters] = useState(
    (initialData?.quarters ?? [makeQuarter('1쿼터', STARTER_LAYOUT.map((p) => ({ ...p })))])
      .map(migrateQuarter)
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [phase, setPhase] = useState('base');
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [animStepIdx, setAnimStepIdx] = useState(0);

  const quarter = quarters[activeIdx];
  const placedIds = new Set(quarter.players.map((p) => p.playerId));
  const bench = squad.filter((p) => !placedIds.has(p.id));

  const scenarios = quarter.scenarios || [];
  const clampedScenarioIdx = scenarios.length > 0 ? Math.min(activeScenarioIdx, scenarios.length - 1) : 0;
  const activeScenario = scenarios[clampedScenarioIdx] ?? null;
  const animSteps = activeScenario?.steps || [];
  const clampedAnimIdx = animSteps.length > 0 ? Math.min(animStepIdx, animSteps.length - 1) : 0;

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

  const addToPitch = useCallback(
    (player) => {
      setQuarters((qs) => {
        const q = qs[activeIdx];
        if (q.players.some((p) => p.playerId === player.id)) return qs;
        const taken = new Set(q.players.map((p) => `${Math.round(p.x / 8)}-${Math.round(p.y / 8)}`));
        let x = 50, y = 50;
        for (let i = 0; i < 12; i++) {
          const tx = 20 + ((i * 17) % 60);
          const ty = 30 + ((i * 13) % 40);
          if (!taken.has(`${Math.round(tx / 8)}-${Math.round(ty / 8)}`)) { x = tx; y = ty; break; }
        }
        const newEntry = { playerId: player.id, x, y };
        return qs.map((q2, i) => i !== activeIdx ? q2 : {
          ...q2,
          players: [...q2.players, newEntry],
          scenarios: (q2.scenarios || []).map((sc) => ({
            ...sc,
            steps: sc.steps.map((step) => ({
              ...step,
              players: [...step.players, { ...newEntry }],
            })),
          })),
        });
      });
    },
    [activeIdx]
  );

  const removeFromPitch = useCallback(
    (playerId) => {
      setQuarters((qs) =>
        qs.map((q, i) => i !== activeIdx ? q : {
          ...q,
          players: q.players.filter((p) => p.playerId !== playerId),
          scenarios: (q.scenarios || []).map((sc) => ({
            ...sc,
            steps: sc.steps.map((step) => ({
              ...step,
              players: step.players.filter((p) => p.playerId !== playerId),
            })),
          })),
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
          const remaining = [...q.players];
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
            return slotIdx === -1 ? p : { ...p, x: slots[slotIdx].x, y: slots[slotIdx].y };
          });
          const newFromBench = [];
          slots.forEach((slot, slotIdx) => {
            const pid = slotToPlayerId[slotIdx];
            if (!pid || placedIds2.has(pid)) return;
            newFromBench.push({ playerId: pid, x: slot.x, y: slot.y });
          });
          const newPlayers = [...updatedExisting, ...newFromBench];
          const syncSteps = (steps) => steps.map((step) => {
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
            scenarios: (q.scenarios || []).map((sc) => ({ ...sc, steps: syncSteps(sc.steps) })),
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
            scenarios: (q.scenarios || []).map((sc) => ({
              ...sc,
              steps: sc.steps.map((step) => ({
                ...step,
                players: step.players.map(applyLabel),
              })),
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
          const scens = q.scenarios || [];
          const si = Math.min(activeScenarioIdx, scens.length - 1);
          if (si < 0) return qs;
          const steps = scens[si]?.steps || [];
          const stepSi = Math.min(animStepIdx, steps.length - 1);
          if (stepSi < 0) return qs;
          return qs.map((q2, i) => i !== activeIdx ? q2 : {
            ...q2,
            scenarios: scens.map((sc, sci) => sci !== si ? sc : {
              ...sc,
              steps: steps.map((s, idx) => idx !== stepSi ? s : {
                ...s,
                players: s.players.map((p) => p.playerId === playerId ? { ...p, x, y } : p),
              }),
            }),
          });
        });
        return;
      }
      // base phase: 모든 시나리오의 모든 스텝 동기화
      setQuarters((qs) =>
        qs.map((q, i) => i !== activeIdx ? q : {
          ...q,
          players: q.players.map((p) => p.playerId !== playerId ? p : { ...p, x, y }),
          scenarios: (q.scenarios || []).map((sc) => ({
            ...sc,
            steps: sc.steps.map((step) => ({
              ...step,
              players: step.players.map((p) => p.playerId === playerId ? { ...p, x, y } : p),
            })),
          })),
        })
      );
    },
    [activeIdx, phase, activeScenarioIdx, animStepIdx]
  );

  const deleteFromSquad = useCallback((playerId) => {
    setSquad((s) => s.filter((p) => p.id !== playerId));
    setQuarters((qs) =>
      qs.map((q) => ({
        ...q,
        players: q.players.filter((p) => p.playerId !== playerId),
        scenarios: (q.scenarios || []).map((sc) => ({
          ...sc,
          steps: sc.steps.map((step) => ({
            ...step,
            players: step.players.filter((p) => p.playerId !== playerId),
          })),
        })),
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

  // 움직임 탭 진입 시 시나리오가 없을 때만 첫 시나리오 생성
  const initAnimSteps = useCallback(() => {
    setQuarters((qs) =>
      qs.map((q, i) => {
        if (i !== activeIdx) return q;
        if ((q.scenarios || []).length > 0) return q; // 이미 있으면 건드리지 않음
        const firstStep = {
          id: nextId(),
          players: q.players.map((p) => ({
            playerId: p.playerId, x: p.x, y: p.y,
            ...(p.label ? { label: p.label } : {}),
          })),
          opponents: DEFAULT_OPPONENTS.map((o) => ({ ...o })),
          ball: { ...DEFAULT_BALL },
        };
        return { ...q, scenarios: [{ id: nextId(), label: '움직임 1', steps: [firstStep] }] };
      })
    );
    setAnimStepIdx(0);
  }, [activeIdx]);

  const addAnimStep = useCallback(() => {
    const currentLen = animSteps.length;
    setQuarters((qs) => {
      const q = qs[activeIdx];
      const scens = q.scenarios || [];
      const si = Math.min(activeScenarioIdx, scens.length - 1);
      if (si < 0) return qs;
      const steps = scens[si]?.steps || [];
      const lastStep = steps[steps.length - 1];
      const newStep = {
        id: nextId(),
        players: (lastStep ? lastStep.players : q.players.map((p) => ({
          playerId: p.playerId, x: p.x, y: p.y,
          ...(p.label ? { label: p.label } : {}),
        }))).map((p) => ({ ...p })),
        opponents: (lastStep?.opponents || DEFAULT_OPPONENTS).map((o) => ({ ...o })),
        ball: lastStep?.ball ? { ...lastStep.ball } : { ...DEFAULT_BALL },
      };
      return qs.map((q2, i) => i !== activeIdx ? q2 : {
        ...q2,
        scenarios: scens.map((sc, sci) =>
          sci !== si ? sc : { ...sc, steps: [...steps, newStep] }
        ),
      });
    });
    setAnimStepIdx(currentLen);
  }, [activeIdx, activeScenarioIdx, animSteps.length]);

  const removeAnimStep = useCallback((idx) => {
    setQuarters((qs) => {
      const q = qs[activeIdx];
      const scens = q.scenarios || [];
      const si = Math.min(activeScenarioIdx, scens.length - 1);
      if (si < 0) return qs;
      const steps = scens[si]?.steps || [];
      if (steps.length <= 1) return qs;
      return qs.map((q2, i) => i !== activeIdx ? q2 : {
        ...q2,
        scenarios: scens.map((sc, sci) =>
          sci !== si ? sc : { ...sc, steps: steps.filter((_, si2) => si2 !== idx) }
        ),
      });
    });
    setAnimStepIdx((prev) => Math.max(0, idx <= prev ? prev - 1 : prev));
  }, [activeIdx, activeScenarioIdx]);

  const dragOpponent = useCallback((oppId, x, y) => {
    setQuarters((qs) => {
      const q = qs[activeIdx];
      const scens = q.scenarios || [];
      const si = Math.min(activeScenarioIdx, scens.length - 1);
      if (si < 0) return qs;
      const steps = scens[si]?.steps || [];
      const stepSi = Math.min(animStepIdx, steps.length - 1);
      if (stepSi < 0) return qs;
      return qs.map((q2, i) => i !== activeIdx ? q2 : {
        ...q2,
        scenarios: scens.map((sc, sci) => sci !== si ? sc : {
          ...sc,
          steps: steps.map((s, idx) => idx !== stepSi ? s : {
            ...s,
            opponents: (s.opponents || DEFAULT_OPPONENTS).map((o) =>
              o.id === oppId ? { ...o, x, y } : o
            ),
          }),
        }),
      });
    });
  }, [activeIdx, activeScenarioIdx, animStepIdx]);

  const dragBall = useCallback((x, y) => {
    setQuarters((qs) => {
      const q = qs[activeIdx];
      const scens = q.scenarios || [];
      const si = Math.min(activeScenarioIdx, scens.length - 1);
      if (si < 0) return qs;
      const steps = scens[si]?.steps || [];
      const stepSi = Math.min(animStepIdx, steps.length - 1);
      if (stepSi < 0) return qs;
      return qs.map((q2, i) => i !== activeIdx ? q2 : {
        ...q2,
        scenarios: scens.map((sc, sci) => sci !== si ? sc : {
          ...sc,
          steps: steps.map((s, idx) => idx !== stepSi ? s : { ...s, ball: { x, y } }),
        }),
      });
    });
  }, [activeIdx, activeScenarioIdx, animStepIdx]);

  const addScenario = useCallback(() => {
    const newIdx = scenarios.length;
    setQuarters((qs) =>
      qs.map((q, i) => {
        if (i !== activeIdx) return q;
        const firstStep = {
          id: nextId(),
          players: q.players.map((p) => ({
            playerId: p.playerId, x: p.x, y: p.y,
            ...(p.label ? { label: p.label } : {}),
          })),
          opponents: DEFAULT_OPPONENTS.map((o) => ({ ...o })),
          ball: { ...DEFAULT_BALL },
        };
        return {
          ...q,
          scenarios: [...(q.scenarios || []), {
            id: nextId(),
            label: `움직임 ${(q.scenarios || []).length + 1}`,
            steps: [firstStep],
          }],
        };
      })
    );
    setActiveScenarioIdx(newIdx);
    setAnimStepIdx(0);
  }, [activeIdx, scenarios.length]);

  const removeScenario = useCallback((idx) => {
    setQuarters((qs) =>
      qs.map((q, i) => {
        if (i !== activeIdx) return q;
        if ((q.scenarios || []).length <= 1) return q;
        return { ...q, scenarios: q.scenarios.filter((_, si) => si !== idx) };
      })
    );
    setActiveScenarioIdx((cur) => (idx <= cur ? Math.max(0, cur - 1) : cur));
    setAnimStepIdx(0);
  }, [activeIdx]);

  const renameScenario = useCallback((idx, label) => {
    setQuarters((qs) =>
      qs.map((q, i) => i !== activeIdx ? q : {
        ...q,
        scenarios: (q.scenarios || []).map((sc, si) =>
          si !== idx ? sc : { ...sc, label }
        ),
      })
    );
  }, [activeIdx]);

  const switchScenario = useCallback((idx) => {
    setActiveScenarioIdx(idx);
    setAnimStepIdx(0);
  }, []);

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
    scenarios, activeScenarioIdx, switchScenario,
    animStepIdx: clampedAnimIdx, setAnimStepIdx,
    animSteps,
    quarter, bench, displayPlayers, displayOpponents, displayBall,
    addToPitch, removeFromPitch, dragPlayer, setPlayerLabel, applyFormation,
    deleteFromSquad, addPlayer,
    addQuarter, removeQuarter,
    initAnimSteps, addAnimStep, removeAnimStep,
    addScenario, removeScenario, renameScenario, switchScenario,
    dragOpponent, dragBall,
    addComment, deleteComment, syncRemoteComments,
  };
}
