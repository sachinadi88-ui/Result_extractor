import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc
} from "firebase/firestore";
import {
  getDatabase,
  ref,
  set,
  get,
  child,
  remove
} from "firebase/database";
import { StudentRecord } from "../types";

// Primary provisioned Firebase config with Firestore Database ID
const primaryConfig = {
  apiKey: "AIzaSyBmqi5QS8fMuTKOsb7rXAoRzOPVSU-2dg0",
  authDomain: "psyched-star-xcff3.firebaseapp.com",
  projectId: "psyched-star-xcff3",
  storageBucket: "psyched-star-xcff3.firebasestorage.app",
  messagingSenderId: "764220476228",
  appId: "1:764220476228:web:d07893f48df75e30dae511",
  firestoreDatabaseId: "ai-studio-studentresultext-ae759918-5ce3-4205-bebd-2dc5cab06d89"
};

// Secondary config for RTDB if specified
const rtdbConfig = {
  apiKey: "AIzaSyBSRrmol6HkekNpATVIH4NrVBZQfovSL5g",
  authDomain: "student-result-extractor.firebaseapp.com",
  databaseURL: "https://student-result-extractor-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "student-result-extractor",
  storageBucket: "student-result-extractor.firebasestorage.app",
  messagingSenderId: "835969367322",
  appId: "1:835969367322:web:fa3e7157ebed7e8e15c0a3"
};

// Initialize Primary App for Firestore & Auth
const app = getApps().length === 0 ? initializeApp(primaryConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app, primaryConfig.firestoreDatabaseId);

// Initialize RTDB App
let rtdb: any = null;
try {
  const rtdbApp = getApps().find(a => a.name === "rtdbApp") || initializeApp(rtdbConfig, "rtdbApp");
  rtdb = getDatabase(rtdbApp);
} catch (e) {
  console.warn("RTDB initialization skipped:", e);
}

export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutFirebase() {
  await firebaseSignOut(auth);
}

// Helper to sanitize key for RTDB
function sanitizeEmailKey(email: string): string {
  return email.replace(/[.#$[\]]/g, '_');
}

// Firestore & Realtime Database Helper Functions for Student Records
export async function saveRecordToFirestore(record: StudentRecord, userEmail: string): Promise<void> {
  const docData = {
    ...record,
    extractedByEmail: userEmail,
    updatedAt: new Date().toISOString()
  };

  // 1. Save to Firestore (Primary)
  try {
    const recordRef = doc(db, "student_records", record.id);
    await setDoc(recordRef, docData, { merge: true });
    console.log(`Saved student record ${record.id} (${record.usn}) to Firestore.`);
  } catch (error) {
    console.warn("Firestore save error:", error);
  }

  // 2. Try Realtime Database safely without throwing permission errors
  if (rtdb) {
    try {
      const userKey = sanitizeEmailKey(userEmail);
      const rtdbRef = ref(rtdb, `student_records/${userKey}/${record.id}`);
      await set(rtdbRef, docData);
      console.log(`Saved student record ${record.id} (${record.usn}) to Realtime Database.`);
    } catch (rtdbErr: any) {
      // Gracefully log as warning if RTDB rules are non-public
      console.warn("Realtime DB write skipped (check RTDB rules if needed):", rtdbErr?.message || rtdbErr);
    }
  }
}

export async function saveMultipleRecordsToFirestore(records: StudentRecord[], userEmail: string): Promise<void> {
  try {
    const promises = records.map((rec) => saveRecordToFirestore(rec, userEmail));
    await Promise.all(promises);
    console.log(`Successfully saved ${records.length} records to Firebase database.`);
  } catch (error) {
    console.warn("Error saving multiple records to Firebase database:", error);
  }
}

export async function fetchStudentRecordsFromFirestore(userEmail: string): Promise<StudentRecord[]> {
  const recordsMap = new Map<string, StudentRecord>();

  // 1. Fetch from Firestore (Primary)
  try {
    const recordsCol = collection(db, "student_records");
    const q = query(recordsCol, where("extractedByEmail", "==", userEmail));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as StudentRecord;
      if (data && data.id) {
        recordsMap.set(data.id, data);
      }
    });
  } catch (error) {
    console.warn("Firestore fetch notice:", error);
  }

  // 2. Fetch from Realtime Database if accessible
  if (rtdb) {
    try {
      const userKey = sanitizeEmailKey(userEmail);
      const dbRef = ref(rtdb);
      const snapshot = await get(child(dbRef, `student_records/${userKey}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.values(data).forEach((rec: any) => {
          if (rec && rec.id) {
            recordsMap.set(rec.id, rec as StudentRecord);
          }
        });
      }
    } catch (rtdbErr: any) {
      console.warn("Realtime DB read skipped (check RTDB rules if needed):", rtdbErr?.message || rtdbErr);
    }
  }

  return Array.from(recordsMap.values());
}

export async function deleteRecordFromFirestore(recordId: string, userEmail?: string): Promise<void> {
  // 1. Firestore delete
  try {
    const recordRef = doc(db, "student_records", recordId);
    await deleteDoc(recordRef);
  } catch (error) {
    console.warn("Firestore delete notice:", error);
  }

  // 2. Realtime DB delete
  if (rtdb && userEmail) {
    try {
      const userKey = sanitizeEmailKey(userEmail);
      const rtdbRef = ref(rtdb, `student_records/${userKey}/${recordId}`);
      await remove(rtdbRef);
    } catch (rtdbErr: any) {
      console.warn("Realtime DB delete skipped:", rtdbErr?.message || rtdbErr);
    }
  }
}

export { onAuthStateChanged };
export type { FirebaseUser };

