// players: 라커룸 선수 명단, lineups: subscribeToTeamLineups 결과(각 record 포함)
// archivedRecord: 삭제된 라인업들의 기록을 보관해둔 맵({ playerId: { present, late, absent, goals, assists, mvpCount } })
// statsBaseline: 시즌 초기화 시점의 스냅샷 — 이 값만큼을 최종 합계에서 차감해 "그 이후" 기록만 보이게 함
// 선수별 출석/골/도움/MVP를 합산해 반환 (정렬은 호출부에서 선택한 기준으로 수행)
export function aggregateTeamRecords(players, lineups, archivedRecord = {}, statsBaseline = {}) {
  const stats = new Map(
    players.map((p) => [
      p.id,
      { playerId: p.id, name: p.name, number: p.number, present: 0, late: 0, absent: 0, goals: 0, assists: 0, mvpCount: 0 },
    ])
  );

  for (const lineup of lineups) {
    const record = lineup.record || {};
    const attendance = record.attendance || {};
    const mvpPlayerId = record.mvpPlayerId ?? null;

    // 골/도움: 쿼터별 합산. 쿼터 record가 없으면 구버전 최상위 record에서 읽음
    const quarters = lineup.quarters || [];
    const hasQuarterRecords = quarters.some((q) => q.record);
    let goals, assists;
    if (hasQuarterRecords) {
      goals = {};
      assists = {};
      for (const q of quarters) {
        for (const [pid, count] of Object.entries(q.record?.goals || {})) goals[pid] = (goals[pid] || 0) + count;
        for (const [pid, count] of Object.entries(q.record?.assists || {})) assists[pid] = (assists[pid] || 0) + count;
      }
    } else {
      goals = record.goals || {};
      assists = record.assists || {};
    }

    for (const [playerId, status] of Object.entries(attendance)) {
      const s = stats.get(playerId);
      if (!s || !['present', 'late', 'absent'].includes(status)) continue;
      s[status] += 1;
    }
    for (const [playerId, count] of Object.entries(goals)) {
      const s = stats.get(playerId);
      if (s) s.goals += count;
    }
    for (const [playerId, count] of Object.entries(assists)) {
      const s = stats.get(playerId);
      if (s) s.assists += count;
    }
    if (mvpPlayerId && stats.has(mvpPlayerId)) {
      stats.get(mvpPlayerId).mvpCount += 1;
    }
  }

  for (const [playerId, d] of Object.entries(archivedRecord)) {
    const s = stats.get(playerId);
    if (!s) continue;
    s.present += d.present || 0;
    s.late += d.late || 0;
    s.absent += d.absent || 0;
    s.goals += d.goals || 0;
    s.assists += d.assists || 0;
    s.mvpCount += d.mvpCount || 0;
  }

  for (const s of stats.values()) {
    const base = statsBaseline[s.playerId];
    if (!base) continue;
    s.present = Math.max(0, s.present - (base.present || 0));
    s.late = Math.max(0, s.late - (base.late || 0));
    s.absent = Math.max(0, s.absent - (base.absent || 0));
    s.goals = Math.max(0, s.goals - (base.goals || 0));
    s.assists = Math.max(0, s.assists - (base.assists || 0));
    s.mvpCount = Math.max(0, s.mvpCount - (base.mvpCount || 0));
  }

  return Array.from(stats.values());
}

// 라인업 삭제 직전, 그 라인업의 기록을 라커룸에 보관하기 위한 델타로 변환
// lineup: 전체 라인업 문서 (record + quarters 포함)
export function buildArchiveDelta(lineup) {
  const delta = {};
  const ensure = (playerId) => {
    if (!delta[playerId]) delta[playerId] = { present: 0, late: 0, absent: 0, goals: 0, assists: 0, mvpCount: 0 };
    return delta[playerId];
  };

  const record = lineup?.record || {};

  for (const [playerId, status] of Object.entries(record.attendance || {})) {
    if (['present', 'late', 'absent'].includes(status)) ensure(playerId)[status] += 1;
  }
  if (record.mvpPlayerId) {
    ensure(record.mvpPlayerId).mvpCount += 1;
  }

  const quarters = lineup?.quarters || [];
  const hasQuarterRecords = quarters.some((q) => q.record);
  if (hasQuarterRecords) {
    for (const q of quarters) {
      for (const [pid, count] of Object.entries(q.record?.goals || {})) ensure(pid).goals += count;
      for (const [pid, count] of Object.entries(q.record?.assists || {})) ensure(pid).assists += count;
    }
  } else {
    for (const [playerId, count] of Object.entries(record.goals || {})) ensure(playerId).goals += count;
    for (const [playerId, count] of Object.entries(record.assists || {})) ensure(playerId).assists += count;
  }

  return delta;
}

// 특정 선수의 "총합" 수치를 경기 구분 없이 직접 보정할 때 씀.
// 화면에 보이는 합계(currentTotal)를 기준으로 delta만큼 바꾸되, 합계가 음수로
// 내려가지 않게 막고 그만큼만 보관 기록(archivedRecord)에 오프셋으로 더함.
export function adjustArchivedStat(archivedRecord, playerId, field, delta, currentTotal) {
  const nextTotal = Math.max(0, currentTotal + delta);
  const actualDelta = nextTotal - currentTotal;
  const current = archivedRecord[playerId] || { present: 0, late: 0, absent: 0, goals: 0, assists: 0, mvpCount: 0 };
  return {
    ...archivedRecord,
    [playerId]: { ...current, [field]: (current[field] || 0) + actualDelta },
  };
}

// 기존 보관 기록에 델타를 누적
export function mergeArchivedRecord(current, delta) {
  const merged = { ...current };
  for (const [playerId, d] of Object.entries(delta)) {
    const c = merged[playerId] || { present: 0, late: 0, absent: 0, goals: 0, assists: 0, mvpCount: 0 };
    merged[playerId] = {
      present: c.present + d.present,
      late: c.late + d.late,
      absent: c.absent + d.absent,
      goals: c.goals + d.goals,
      assists: c.assists + d.assists,
      mvpCount: c.mvpCount + d.mvpCount,
    };
  }
  return merged;
}
