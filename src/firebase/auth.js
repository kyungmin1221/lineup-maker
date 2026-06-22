import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "./config";

let signInPromise = null;

export function ensureSignedIn() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);
  if (signInPromise) return signInPromise;

  signInPromise = new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve(user.uid);
      }
    });
    signInAnonymously(auth).catch((err) => {
      unsub();
      signInPromise = null;
      reject(err);
    });
  });

  return signInPromise;
}
