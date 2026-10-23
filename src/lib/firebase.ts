import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore (supporting custom database id)
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Fast timeout wrapper so Firestore never hangs UI loading states
export function withFirestoreTimeout<T>(promise: Promise<T>, timeoutMs: number = 900): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Firestore request timed out'));
    }, timeoutMs);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Fire-and-forget background helper for Firestore writes
export function runFirestoreInBackground(task: () => Promise<unknown>): void {
  Promise.resolve()
    .then(() => withFirestoreTimeout(task(), 2500))
    .catch(() => {
      // Ignore background Firestore sync errors
    });
}

// Connectivity check helper
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await withFirestoreTimeout(getDocFromServer(doc(db, 'test', 'connection')), 1500);
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('timed out'))) {
      console.warn('Firestore offline / check configuration');
      return false;
    }
    // Any other response (like document not found or permission check) means server connected
    return true;
  }
}
