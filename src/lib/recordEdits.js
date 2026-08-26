// 경기 기록(record) 하나를 불변으로 갱신하는 순수 함수 모음.
// useLineup.js(편집 화면)와 LockerRoomPage.jsx(팀 기록 화면에서 과거 경기 수정)가 함께 씀.

export function withAttendance(record, playerId, status) {
  const attendance = { ...record.attendance };
  if (status) attendance[playerId] = status;
  else delete attendance[playerId];
  return { ...record, attendance };
}

export function withGoalsDelta(record, playerId, delta) {
  const next = Math.max(0, (record.goals[playerId] || 0) + delta);
  const goals = { ...record.goals };
  if (next === 0) delete goals[playerId];
  else goals[playerId] = next;
  return { ...record, goals };
}

export function withAssistsDelta(record, playerId, delta) {
  const next = Math.max(0, (record.assists[playerId] || 0) + delta);
  const assists = { ...record.assists };
  if (next === 0) delete assists[playerId];
  else assists[playerId] = next;
  return { ...record, assists };
}

export function withMvp(record, playerId) {
  return { ...record, mvpPlayerId: record.mvpPlayerId === playerId ? null : playerId };
}
