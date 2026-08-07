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
  deleteDoc,
  writeBatch
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

// Primary user-specified Firebase config (student-result-extractor)
const userFirebaseConfig = {
  apiKey: "AIzaSyBSRrmol6HkekNpATVIH4NrVBZQfovSL5g",
  authDomain: "student-result-extractor.firebaseapp.com",
  databaseURL: "https://student-result-extractor-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "student-result-extractor",
  storageBucket: "student-result-extractor.firebasestorage.app",
  messagingSenderId: "835969367322",
  appId: "1:835969367322:web:fa3e7157ebed7e8e15c0a3"
};

// Provisioned AI Studio config
const provisionedConfig = {
  apiKey: "AIzaSyBmqi5QS8fMuTKOsb7rXAoRzOPVSU-2dg0",
  authDomain: "psyched-star-xcff3.firebaseapp.com",
  projectId: "psyched-star-xcff3",
  storageBucket: "psyched-star-xcff3.firebasestorage.app",
  messagingSenderId: "764220476228",
  appId: "1:764220476228:web:d07893f48df75e30dae511",
  firestoreDatabaseId: "ai-studio-studentresultext-ae759918-5ce3-4205-bebd-2dc5cab06d89"
};

// Initialize Primary App (student-result-extractor)
const app = getApps().length === 0 ? initializeApp(userFirebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// Initialize Provisioned Firestore App (secondary) - DEACTIVATED/DISABLED
let dbProvisioned: any = null;
/*
try {
  const provApp = getApps().find(a => a.name === "provisionedApp") || initializeApp(provisionedConfig, "provisionedApp");
  dbProvisioned = getFirestore(provApp, provisionedConfig.firestoreDatabaseId);
} catch (e) {
  console.warn("Provisioned DB init notice:", e);
}
*/

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

  // 1. Save to Firestore Primary (student-result-extractor)
  try {
    const recordRef = doc(db, "student_records", record.id);
    await setDoc(recordRef, docData, { merge: true });
    console.log(`Saved student record ${record.id} (${record.usn}) to student-result-extractor Firestore.`);
  } catch (error) {
    console.warn("Primary Firestore save notice:", error);
  }

  // 2. Save to Provisioned Firestore if active
  if (dbProvisioned) {
    try {
      const provRef = doc(dbProvisioned, "student_records", record.id);
      await setDoc(provRef, docData, { merge: true });
    } catch (error) {
      console.warn("Provisioned Firestore save notice:", error);
    }
  }

  // 3. Save to Realtime Database - DEACTIVATED to avoid dual-write overhead/free-tier limits
  /*
  if (rtdb) {
    try {
      const userKey = sanitizeEmailKey(userEmail);
      const rtdbRef = ref(rtdb, `student_records/${userKey}/${record.id}`);
      await set(rtdbRef, docData);
      console.log(`Saved student record ${record.id} (${record.usn}) to Realtime Database.`);
    } catch (rtdbErr: any) {
      console.warn("Realtime DB write notice:", rtdbErr?.message || rtdbErr);
    }
  }
  */
}

export async function saveMultipleRecordsToFirestore(records: StudentRecord[], userEmail: string): Promise<void> {
  if (records.length === 0) return;

  const chunkSize = 500;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);

    // Batch for primary Firestore
    try {
      const batch = writeBatch(db);
      chunk.forEach((record) => {
        const docData = {
          ...record,
          extractedByEmail: userEmail,
          updatedAt: new Date().toISOString()
        };
        const recordRef = doc(db, "student_records", record.id);
        batch.set(recordRef, docData, { merge: true });
      });
      await batch.commit();
      console.log(`Saved chunk of ${chunk.length} records to primary Firestore.`);
    } catch (error) {
      console.error("Error committing primary Firestore batch:", error);
      // Fallback to sequential saves if batch fails
      for (const record of chunk) {
        try {
          await saveRecordToFirestore(record, userEmail);
        } catch (singleErr) {
          console.warn("Fallback save failed for record:", record.id, singleErr);
        }
      }
    }

    // Batch for provisioned Firestore if active
    if (dbProvisioned) {
      try {
        const batchProv = writeBatch(dbProvisioned);
        chunk.forEach((record) => {
          const docData = {
            ...record,
            extractedByEmail: userEmail,
            updatedAt: new Date().toISOString()
          };
          const provRef = doc(dbProvisioned, "student_records", record.id);
          batchProv.set(provRef, docData, { merge: true });
        });
        await batchProv.commit();
        console.log(`Saved chunk of ${chunk.length} records to provisioned Firestore.`);
      } catch (error) {
        console.error("Error committing provisioned Firestore batch:", error);
      }
    }
  }
}

import { filterRecordsBySemester } from "../utils/statusHelper";

export async function fetchStudentRecordsFromFirestore(userEmail: string, semesterFilter?: string): Promise<StudentRecord[]> {
  const recordsMap = new Map<string, StudentRecord>();

  const isSpecificSem = semesterFilter && semesterFilter !== 'ALL' && semesterFilter.trim().length > 0;
  let semVariations: string[] = [];
  if (isSpecificSem) {
    const cleanSem = semesterFilter.trim();
    semVariations = [
      cleanSem,
      `Sem ${cleanSem}`,
      `sem ${cleanSem}`,
      `Semester ${cleanSem}`,
      `SEM ${cleanSem}`,
      `${cleanSem}th Sem`,
      `${cleanSem}st Sem`,
      `${cleanSem}nd Sem`,
      `${cleanSem}rd Sem`
    ];
  }

  // 1. Fetch from Firestore Primary (student-result-extractor)
  try {
    const recordsCol = collection(db, "student_records");
    let q;
    if (isSpecificSem) {
      q = query(recordsCol, where("extractedByEmail", "==", userEmail), where("semester", "in", semVariations));
    } else {
      q = query(recordsCol, where("extractedByEmail", "==", userEmail));
    }
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as StudentRecord;
      if (data && data.id) {
        recordsMap.set(data.id, data);
      }
    });
  } catch (error) {
    console.warn("Primary Firestore targeted fetch notice:", error);
    // Fallback query by userEmail only if composite query failed
    try {
      const recordsCol = collection(db, "student_records");
      const fallbackQ = query(recordsCol, where("extractedByEmail", "==", userEmail));
      const querySnapshot = await getDocs(fallbackQ);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as StudentRecord;
        if (data && data.id) {
          recordsMap.set(data.id, data);
        }
      });
    } catch (fallbackErr) {
      console.warn("Primary fallback query error:", fallbackErr);
    }
  }

  // 2. Fetch from Provisioned Firestore if active
  if (dbProvisioned) {
    try {
      const recordsCol = collection(dbProvisioned, "student_records");
      let q;
      if (isSpecificSem) {
        q = query(recordsCol, where("extractedByEmail", "==", userEmail), where("semester", "in", semVariations));
      } else {
        q = query(recordsCol, where("extractedByEmail", "==", userEmail));
      }
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as StudentRecord;
        if (data && data.id) {
          recordsMap.set(data.id, data);
        }
      });
    } catch (error) {
      console.warn("Provisioned Firestore fetch notice:", error);
    }
  }

  let result = Array.from(recordsMap.values());
  if (isSpecificSem) {
    result = filterRecordsBySemester(result, semesterFilter);
  }
  return result;
}

export async function deleteRecordFromFirestore(recordId: string, userEmail?: string): Promise<void> {
  // 1. Primary Firestore delete
  try {
    const recordRef = doc(db, "student_records", recordId);
    await deleteDoc(recordRef);
  } catch (error) {
    console.warn("Primary Firestore delete notice:", error);
  }

  // 2. Provisioned Firestore delete
  if (dbProvisioned) {
    try {
      const recordRef = doc(dbProvisioned, "student_records", recordId);
      await deleteDoc(recordRef);
    } catch (error) {
      console.warn("Provisioned Firestore delete notice:", error);
    }
  }

  // 3. Realtime DB delete - DEACTIVATED to avoid dual-write overhead/free-tier limits
  /*
  if (rtdb && userEmail) {
    try {
      const userKey = sanitizeEmailKey(userEmail);
      const rtdbRef = ref(rtdb, `student_records/${userKey}/${recordId}`);
      await remove(rtdbRef);
    } catch (rtdbErr: any) {
      console.warn("Realtime DB delete skipped:", rtdbErr?.message || rtdbErr);
    }
  }
  */
}

export async function deleteMultipleRecordsFromFirestore(recordIds: string[], userEmail?: string): Promise<void> {
  if (recordIds.length === 0) return;

  const chunkSize = 500;
  for (let i = 0; i < recordIds.length; i += chunkSize) {
    const chunk = recordIds.slice(i, i + chunkSize);

    // Batch delete primary Firestore
    try {
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        const recordRef = doc(db, "student_records", id);
        batch.delete(recordRef);
      });
      await batch.commit();
      console.log(`Deleted chunk of ${chunk.length} records from primary Firestore.`);
    } catch (error) {
      console.error("Error committing primary Firestore delete batch:", error);
      // Fallback to sequential deletes if batch fails
      for (const id of chunk) {
        try {
          await deleteRecordFromFirestore(id, userEmail);
        } catch (singleErr) {
          console.warn("Fallback delete failed for record:", id, singleErr);
        }
      }
    }

    // Batch delete provisioned Firestore if active
    if (dbProvisioned) {
      try {
        const batchProv = writeBatch(dbProvisioned);
        chunk.forEach((id) => {
          const recordRef = doc(dbProvisioned, "student_records", id);
          batchProv.delete(recordRef);
        });
        await batchProv.commit();
        console.log(`Deleted chunk of ${chunk.length} records from provisioned Firestore.`);
      } catch (error) {
        console.error("Error committing provisioned Firestore delete batch:", error);
      }
    }
  }
}

export { onAuthStateChanged };
export type { FirebaseUser };

