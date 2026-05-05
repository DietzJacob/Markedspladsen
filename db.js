import { db } from "./firebase-config.js";
import {
  collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const userRef       = (uid) => doc(db, "users", uid);
const pipelineCol   = (uid) => collection(db, "users", uid, "pipeline");
const wonCol        = (uid) => collection(db, "users", uid, "won");
const pipelineDoc   = (uid, id) => doc(db, "users", uid, "pipeline", id);
const wonDoc        = (uid, id) => doc(db, "users", uid, "won", id);

export function watchPipeline(uid, cb, onError) {
  return onSnapshot(pipelineCol(uid),
    (snap) => {
      const out = [];
      snap.forEach(d => out.push({ id: d.id, ...d.data() }));
      cb(out);
    },
    (err) => onError && onError(err)
  );
}

export function watchWon(uid, cb, onError) {
  return onSnapshot(wonCol(uid),
    (snap) => {
      const out = [];
      snap.forEach(d => out.push({ id: d.id, ...d.data() }));
      cb(out);
    },
    (err) => onError && onError(err)
  );
}

export function watchUserDoc(uid, cb, onError) {
  return onSnapshot(userRef(uid),
    (snap) => cb(snap.exists() ? snap.data() : {}),
    (err) => onError && onError(err)
  );
}

export async function createCard(uid, data) {
  const ref = await addDoc(pipelineCol(uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCard(uid, id, patch) {
  await updateDoc(pipelineDoc(uid, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCard(uid, id) {
  await deleteDoc(pipelineDoc(uid, id));
}

export async function createWon(uid, data) {
  const ref = await addDoc(wonCol(uid), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateWon(uid, id, patch) {
  await updateDoc(wonDoc(uid, id), patch);
}

export async function deleteWon(uid, id) {
  await deleteDoc(wonDoc(uid, id));
}

export async function setPrefs(uid, prefs) {
  await setDoc(userRef(uid), { prefs }, { merge: true });
}

export async function isUserEmpty(uid) {
  const [pipeSnap, wonSnap] = await Promise.all([
    getDocs(pipelineCol(uid)),
    getDocs(wonCol(uid)),
  ]);
  return pipeSnap.empty && wonSnap.empty;
}

export async function seedDemoData(uid, pipeline, wonDeals, prefs) {
  const tasks = [];
  for (const c of pipeline) {
    const { id, ...rest } = c;
    tasks.push(addDoc(pipelineCol(uid), {
      ...rest,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  }
  for (const d of wonDeals) {
    const { id, ...rest } = d;
    tasks.push(addDoc(wonCol(uid), {
      ...rest,
      createdAt: serverTimestamp(),
    }));
  }
  if (prefs) tasks.push(setDoc(userRef(uid), { prefs }, { merge: true }));
  await Promise.all(tasks);
}
