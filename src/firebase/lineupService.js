import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "./config";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export async function createLineup(lineupData, ownerId) {
  const id = generateId();
  const ref = doc(db, "lineups", id);
  await setDoc(ref, {
    ...lineupData,
    id,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function getLineup(id) {
  const ref = doc(db, "lineups", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

export async function updateLineup(id, data) {
  const ref = doc(db, "lineups", id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

// 특정 사용자의 라인업 1개의 id를 반환 (없으면 null)
export async function findMyLineupId(ownerId) {
  const q = query(
    collection(db, "lineups"),
    where("ownerId", "==", ownerId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

// 실시간 구독 - unsubscribe 함수 반환
export function subscribeToLineup(id, callback) {
  const ref = doc(db, "lineups", id);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function addComment(lineupId, quarterIdx, comment) {
  const snap = await getDoc(doc(db, "lineups", lineupId));
  if (!snap.exists()) throw new Error("Lineup not found");
  const data = snap.data();
  const quarters = [...data.quarters];
  quarters[quarterIdx] = {
    ...quarters[quarterIdx],
    comments: [
      ...(quarters[quarterIdx].comments || []),
      { ...comment, createdAt: Date.now() },
    ],
  };
  await updateDoc(doc(db, "lineups", lineupId), {
    quarters,
    updatedAt: serverTimestamp(),
  });
}
