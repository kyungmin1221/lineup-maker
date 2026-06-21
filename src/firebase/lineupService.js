import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export async function createLineup(lineupData) {
  const id = generateId();
  const ref = doc(db, "lineups", id);
  await setDoc(ref, {
    ...lineupData,
    id,
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
