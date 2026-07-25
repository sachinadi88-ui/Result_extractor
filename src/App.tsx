import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ResultsTable } from './components/ResultsTable';
import { UploadModal } from './components/UploadModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { LoginPage } from './components/LoginPage';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { StudentRecord, AuthUser } from './types';
import { getStoredStudentRecords, saveStudentRecords, exportToCsv } from './utils/storage';
import { getEffectiveStatus } from './utils/statusHelper';
import {
  saveRecordToFirestore,
  saveMultipleRecordsToFirestore,
  fetchStudentRecordsFromFirestore,
  deleteRecordFromFirestore
} from './lib/firebase';
import { CheckCircle2, FileSpreadsheet, Plus, ShieldCheck, Database } from 'lucide-react';

const AUTH_STORAGE_KEY = 'vtu_auth_user_session_v1';

export default function App() {
  // Current Logged In Google User
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Student Records linked to current user's email
  const [records, setRecords] = useState<StudentRecord[]>(() => {
    if (!currentUser) return [];
    const stored = getStoredStudentRecords(currentUser.email);
    return stored.filter((r) => !r.id.startsWith('sample-'));
  });

  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState<boolean>(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState<boolean>(false);

  // Sync session & load user records from Firestore and LocalStorage when currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      const localStored = getStoredStudentRecords(currentUser.email).filter((r) => !r.id.startsWith('sample-'));
      setRecords(localStored);

      // Fetch persistent records from Firebase Firestore
      setIsSyncingFirebase(true);
      fetchStudentRecordsFromFirestore(currentUser.email).then((remoteRecords) => {
        setIsSyncingFirebase(false);
        if (remoteRecords && remoteRecords.length > 0) {
          // Merge local and remote records avoiding duplicates by ID or USN
          setRecords((prev) => {
            const map = new Map<string, StudentRecord>();
            prev.forEach((r) => map.set(r.id, r));
            remoteRecords.forEach((r) => map.set(r.id, r));
            const merged = Array.from(map.values());
            saveStudentRecords(merged, currentUser.email);
            return merged;
          });
        }
      }).catch((err) => {
        setIsSyncingFirebase(false);
        console.error('Error syncing from Firebase Firestore:', err);
      });
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setRecords([]);
    }
  }, [currentUser]);

  // Save records locally
  useEffect(() => {
    if (currentUser) {
      saveStudentRecords(records, currentUser.email);
    }
  }, [records, currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    showToast(`Welcome back, ${user.name}! Logged in as ${user.email}`);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    showToast('Successfully signed out.');
  };

  const handleExtractionSuccess = (
    newStudents: Omit<StudentRecord, 'id' | 'uploadedAt'>[],
    imageBase64: string
  ) => {
    if (!currentUser) return;

    const createdRecords: StudentRecord[] = newStudents.map((s, idx) => ({
      ...s,
      status: getEffectiveStatus(s),
      id: `rec-${Date.now()}-${idx}`,
      uploadedAt: new Date().toISOString(),
      imageUrl: imageBase64,
    }));

    // Update React state
    setRecords((prev) => [...createdRecords, ...prev]);

    // Automatically store extracted student details into Firebase database!
    saveMultipleRecordsToFirestore(createdRecords, currentUser.email);

    showToast(`Successfully extracted & saved ${createdRecords.length} student record(s) to Firebase for ${currentUser.name}!`);
  };

  const handleSaveStudent = (updated: StudentRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (selectedStudent && selectedStudent.id === updated.id) {
      setSelectedStudent(updated);
    }

    if (currentUser) {
      saveRecordToFirestore(updated, currentUser.email);
    }
    showToast('Student record updated & synced to Firebase.');
  };

  const handleDeleteStudent = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    deleteRecordFromFirestore(id, currentUser?.email);
    if (selectedStudent && selectedStudent.id === id) {
      setIsDetailOpen(false);
      setSelectedStudent(null);
    }
    showToast('Student record deleted from Firebase.');
  };

  const handleClearAll = () => {
    setIsClearAllConfirmOpen(true);
  };

  const confirmClearAll = () => {
    if (!currentUser) return;
    records.forEach((r) => deleteRecordFromFirestore(r.id, currentUser.email));
    setRecords([]);
    setIsClearAllConfirmOpen(false);
    showToast('All student records cleared from Firebase.');
  };

  const handleExportCsv = () => {
    exportToCsv(records);
    showToast('Exporting student results to CSV format...');
  };

  const handleSaveToDatabase = async () => {
    if (!currentUser) return;
    if (records.length === 0) {
      showToast('No student records to save.');
      return;
    }
    setIsSyncingFirebase(true);
    try {
      await saveMultipleRecordsToFirestore(records, currentUser.email);
      showToast(`Saved ${records.length} student record(s) to Firebase database!`);
    } catch (err) {
      console.error('Error saving to Firebase database:', err);
      showToast('Failed to save records to database.');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  // IF NOT LOGGED IN: Render Simple Google Login Page
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // IF LOGGED IN: Render Full Extraction Dashboard
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      
      {/* Top Header with User Profile Photo & Name */}
      <Header
        records={records}
        currentUser={currentUser}
        onOpenUpload={() => setIsUploadOpen(true)}
        onPasteClipboard={() => setIsUploadOpen(true)}
        onExportCsv={handleExportCsv}
        onSaveToDatabase={handleSaveToDatabase}
        onClearAll={handleClearAll}
        onSignOut={handleSignOut}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Info & Account Isolation Status Banner */}
        <div className="mb-6 p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3 text-xs text-slate-700">
            <img
              src={currentUser.picture}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover border border-emerald-500 shrink-0"
            />
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                <span>Logged in as:</span>
                <span className="text-emerald-700 font-semibold">{currentUser.name}</span>
                <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                  {currentUser.email}
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-medium">
                  <Database className="w-3 h-3 text-orange-500" />
                  <span>{isSyncingFirebase ? 'Syncing Firebase...' : 'Firebase Database Active'}</span>
                </span>
              </p>
              <p className="text-slate-500 mt-0.5">
                Upload university mark sheet screenshots. AI extracts <strong className="text-slate-800">USN</strong>, <strong className="text-slate-800">Name</strong>, <strong className="text-slate-800">Subjects</strong>, <strong className="text-slate-800">Marks</strong>, and <strong className="text-slate-800">Results</strong> into structured rows tied to your account.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Screenshot</span>
          </button>
        </div>

        {/* Results Table Section */}
        <ResultsTable
          records={records}
          onSelectStudent={(student) => {
            setSelectedStudent(student);
            setIsDetailOpen(true);
          }}
          onDeleteStudent={handleDeleteStudent}
          onOpenUpload={() => setIsUploadOpen(true)}
        />

      </main>

      {/* Footer bar */}
      <footer className="h-8 bg-slate-900 flex items-center justify-between px-6 text-[10px] text-slate-400 font-medium tracking-tight mt-auto">
        <span>RESULT EXTRACTOR AI • GOOGLE SIGNED-IN SESSION</span>
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>ACTIVE USER: {currentUser.email}</span>
        </div>
      </footer>

      {/* Screenshot Extraction Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onExtractionSuccess={handleExtractionSuccess}
        onSuccess={handleExtractionSuccess}
      />

      {/* Student Record Detail / Edit Modal */}
      <StudentDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onSave={handleSaveStudent}
        onDelete={handleDeleteStudent}
      />

      {/* Clear All Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isClearAllConfirmOpen}
        title="Clear All Records?"
        message={`Are you sure you want to delete ALL ${records.length} student record(s) for ${currentUser?.name}? This action cannot be undone.`}
        onConfirm={confirmClearAll}
        onCancel={() => setIsClearAllConfirmOpen(false)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
