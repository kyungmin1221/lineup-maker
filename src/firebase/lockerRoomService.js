import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
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

export async function findMyLockerRooms(ownerId) {
  const q = query(collection(db, 'lockerRooms'), where('ownerId', '==', ownerId));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      players: data.players || [],
      updatedAt: data.updatedAt?.toMillis?.() ?? 0,
    };
  });
  items.sort((a, b) => b.updatedAt - a.updatedAt);
  return items;
}
