import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, or, getDocs, onSnapshot, arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { buildArchiveDelta, mergeArchivedRecord } from '../lib/teamStats';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export async function createLockerRoom(name, ownerId) {
  const id = generateId();
  await setDoc(doc(db, 'lockerRooms', id), {
    id,
    name,
    players: [],
    ownerId,
    memberIds: [ownerId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

// 공유 링크로 들어온 사용자를 관리자(memberIds)로 합류시킴 — 삭제 권한은 여전히 ownerId만 보유
export async function joinLockerRoom(id, uid) {
  await updateDoc(doc(db, 'lockerRooms', id), { memberIds: arrayUnion(uid) });
}

export async function getLockerRoom(id) {
  const snap = await getDoc(doc(db, 'lockerRooms', id));
  return snap.exists() ? snap.data() : null;
}

export async function updateLockerRoom(id, data) {
  await updateDoc(doc(db, 'lockerRooms', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteLockerRoom(id) {
  await deleteDoc(doc(db, 'lockerRooms', id));
}

// 라인업이 삭제되기 직전, 그 안의 기록을 팀 문서에 보관 — 라인업이 사라져도 팀 통계에는 남음
// lineup: 전체 라인업 문서 (record + quarters 포함)
export async function archiveLineupRecord(teamId, lineup) {
  const ref = doc(db, 'lockerRooms', teamId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = snap.data().archivedRecord || {};
  const delta = buildArchiveDelta(lineup);
  await updateDoc(ref, { archivedRecord: mergeArchivedRecord(current, delta) });
}

// 실시간 구독 - unsubscribe 함수 반환
export function subscribeToLockerRoom(id, callback) {
  const ref = doc(db, 'lockerRooms', id);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

// 내가 만든(ownerId) 라커룸 + 합류한(memberIds) 라커룸을 모두 반환
// (구버전 라커룸은 memberIds가 없어서 ownerId 조건으로만 잡힘)
export async function findMyLockerRooms(uid) {
  const q = query(
    collection(db, 'lockerRooms'),
    or(where('ownerId', '==', uid), where('memberIds', 'array-contains', uid))
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      players: data.players || [],
      ownerId: data.ownerId || null,
      updatedAt: data.updatedAt?.toMillis?.() ?? 0,
    };
  });
  items.sort((a, b) => b.updatedAt - a.updatedAt);
  return items;
}
