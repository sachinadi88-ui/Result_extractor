import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ResultsTable } from './components/ResultsTable';
import { UploadModal } from './components/UploadModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { LoginPage } from './components/LoginPage';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { StatusModal } from './components/StatusModal';
import { SignOutConfirmModal } from './components/SignOutConfirmModal';
import { BackupModal } from './components/BackupModal';
import { PasswordModal } from './components/PasswordModal';
import { FacultyMapModal } from './components/FacultyMapModal';
import { NewView } from './components/NewView';
import { SemesterSelectModal } from './components/SemesterSelectModal';
import { StudentRecord, AuthUser } from './types';
import { getStoredStudentRecords, saveStudentRecords, exportToExcel } from './utils/storage';
import { exportToPDF, exportToPDFLandscape } from './utils/pdfExport';
import { getEffectiveStatus, getDepartmentFromUsn, filterRecordsBySemester } from './utils/statusHelper';
import {
  saveRecordToFirestore,
  saveMultipleRecordsToFirestore,
  fetchStudentRecordsFromFirestore,
  deleteRecordFromFirestore,
  deleteMultipleRecordsFromFirestore
} from './lib/firebase';
import { CheckCircle2, FileSpreadsheet, Plus, ShieldCheck, Database, BarChart3, Users } from 'lucide-react';
const smvcerLogo = "/smvcer_crest.jpg";

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
  // Exclusively retrieved from database, bypassing local storage
  const [records, setRecords] = useState<StudentRecord[]>([]);

  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState<boolean>(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState<boolean>(false);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState<boolean>(false);
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'main' | 'newView'>('main');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState<boolean>(false);
  
  // Security locks (Default to locked unless explicitly unlocked by typing password)
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return localStorage.getItem('vtu_database_locked') !== 'false';
  });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);

  // Sync session & load user records ONLY from Firebase Firestore when currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      setSelectedSemester('');
      setIsSemesterModalOpen(true);

      // Fetch persistent records from Firebase Firestore
      setIsSyncingFirebase(true);
      fetchStudentRecordsFromFirestore(currentUser.email).then((remoteRecords) => {
        setIsSyncingFirebase(false);
        if (remoteRecords) {
          setRecords(remoteRecords);
        } else {
          setRecords([]);
        }
      }).catch((err) => {
        setIsSyncingFirebase(false);
        console.error('Error syncing from Firebase Firestore:', err);
        setRecords([]);
      });
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setRecords([]);
      setSelectedSemester('');
      setIsSemesterModalOpen(false);
    }
  }, [currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    setSelectedSemester('');
    setIsSemesterModalOpen(true);
    setIsLocked(true);
    localStorage.setItem('vtu_database_locked', 'true');
    showToast(`Welcome back, ${user.name}! Logged in as ${user.email}`);
  };

  const handleSignOut = () => {
    setIsSignOutConfirmOpen(true);
  };

  const confirmSignOut = () => {
    setCurrentUser(null);
    setIsLocked(true);
    localStorage.setItem('vtu_database_locked', 'true');
    setIsSignOutConfirmOpen(false);
    showToast('Successfully signed out.');
  };

  // Lock and Unlock handlers
  const handleLock = () => {
    setIsLocked(true);
    localStorage.setItem('vtu_database_locked', 'true');
    showToast('Database locked. Editing, deletion, and uploading are now restricted.');
  };

  const handleUnlockSuccess = () => {
    setIsLocked(false);
    localStorage.setItem('vtu_database_locked', 'false');
    setIsPasswordModalOpen(false);
    showToast('System unlocked successfully! Access granted.');
  };

  const handleOpenUpload = () => {
    if (isLocked) {
      setIsPasswordModalOpen(true);
      showToast('Please unlock the system to add or upload screenshots.');
    } else {
      setIsUploadOpen(true);
    }
  };

  const handleExtractionSuccess = async (
    newStudents: Omit<StudentRecord, 'id' | 'uploadedAt'>[],
    imageBase64: string
  ) => {
    if (!currentUser) return;
    
    if (isLocked) {
      setIsPasswordModalOpen(true);
      showToast('Action Denied: System is currently locked.');
      return;
    }

    const createdRecords: StudentRecord[] = newStudents.map((s, idx) => ({
      ...s,
      status: getEffectiveStatus(s),
      id: `rec-${Date.now()}-${idx}`,
      uploadedAt: new Date().toISOString(),
      imageUrl: imageBase64,
    }));

    // Update React state
    setRecords((prev) => [...createdRecords, ...prev]);

    setIsSyncingFirebase(true);
    try {
      // Automatically store extracted student details into Firebase database!
      await saveMultipleRecordsToFirestore(createdRecords, currentUser.email);
      showToast(`Successfully extracted & saved ${createdRecords.length} student record(s) to Firebase for ${currentUser.name}!`);
    } catch (err) {
      console.error('Error auto-syncing to Firebase:', err);
      showToast('Extraction complete, but failed to sync to Firebase database.');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleBatchUpdateRecords = async (updatedRecords: StudentRecord[]) => {
    if (isLocked) {
      setIsPasswordModalOpen(true);
      showToast('System locked: Please unlock with password to modify non-credit status.');
      return;
    }
    setRecords(updatedRecords);

    setIsSyncingFirebase(true);
    try {
      if (currentUser) {
        await saveMultipleRecordsToFirestore(updatedRecords, currentUser.email);
      }
      showToast('Non-credit subjects updated & saved to database.');
    } catch (err) {
      console.error('Error saving updated records to Firebase:', err);
      showToast('Failed to save non-credit changes to database.');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleSaveStudent = async (updated: StudentRecord) => {
    if (isLocked) {
      setIsPasswordModalOpen(true);
      showToast('System locked: Saving student details is disabled.');
      return;
    }
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (selectedStudent && selectedStudent.id === updated.id) {
      setSelectedStudent(updated);
    }

    setIsSyncingFirebase(true);
    try {
      if (currentUser) {
        await saveRecordToFirestore(updated, currentUser.email);
      }
      showToast('Student record updated & synced to Firebase.');
    } catch (err) {
      console.error('Error saving student to Firebase:', err);
      showToast('Failed to sync student update to Firebase.');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (isLocked) {
      setIsPasswordModalOpen(true);
      showToast('System locked: Deleting student details is disabled.');
      return;
    }
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selectedStudent && selectedStudent.id === id) {
      setIsDetailOpen(false);
      setSelectedStudent(null);
    }
    
    setIsSyncingFirebase(true);
    try {
      await deleteRecordFromFirestore(id, currentUser?.email);
      showToast('Student record deleted from Firebase.');
    } catch (err) {
      console.error('Error deleting student from Firebase:', err);
      showToast('Failed to delete student from Firebase.');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleClearAll = () => {
    if (isLocked) {
      setIsPasswordModalOpen(true);
      showToast('System locked: Clearing records is disabled.');
      return;
    }
    setIsClearAllConfirmOpen(true);
  };

  const confirmClearAll = async () => {
    if (!currentUser) return;
    if (isLocked) {
      setIsPasswordModalOpen(true);
      showToast('System locked: Clearing records is disabled.');
      return;
    }
    setIsSyncingFirebase(true);
    try {
      const recordIds = records.map((r) => r.id);
      await deleteMultipleRecordsFromFirestore(recordIds, currentUser.email);
      setRecords([]);
      setIsClearAllConfirmOpen(false);
      showToast('All student records cleared from Firebase.');
    } catch (err) {
      console.error('Error clearing records:', err);
      showToast('Failed to clear some records from database.');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleExportExcel = (overrideSemester?: string) => {
    const semToUse = typeof overrideSemester === 'string' && overrideSemester.length > 0 ? overrideSemester : selectedSemester;
    const exportRecords = filterRecordsBySemester(records, semToUse);
    if (exportRecords.length === 0) {
      showToast(`No student records found for Semester "${semToUse}".`);
      return;
    }
    const semLabel = semToUse === 'ALL' ? 'All Semesters' : `Semester ${semToUse}`;
    exportToExcel(exportRecords);
    showToast(`Exporting ${exportRecords.length} records (${semLabel}) to formatted Excel (.xlsx)...`);
  };

  const handleExportPDF = async (overrideSemester?: string) => {
    try {
      const semToUse = typeof overrideSemester === 'string' && overrideSemester.length > 0 ? overrideSemester : selectedSemester;
      const exportRecords = filterRecordsBySemester(records, semToUse);
      if (exportRecords.length === 0) {
        showToast(`No student records found for Semester "${semToUse}".`);
        return;
      }
      const semLabel = semToUse === 'ALL' ? 'All Semesters' : `Semester ${semToUse}`;
      showToast(`Preparing PDF document for ${exportRecords.length} records (${semLabel})...`);
      await exportToPDF(exportRecords);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('Failed to export PDF document.');
    }
  };

  const handleExportPDFLandscape = async (overrideSemester?: string) => {
    try {
      const semToUse = typeof overrideSemester === 'string' && overrideSemester.length > 0 ? overrideSemester : selectedSemester;
      const exportRecords = filterRecordsBySemester(records, semToUse);
      if (exportRecords.length === 0) {
        showToast(`No student records found for Semester "${semToUse}".`);
        return;
      }
      const semLabel = semToUse === 'ALL' ? 'All Semesters' : `Semester ${semToUse}`;
      showToast(`Preparing Landscape PDF for ${exportRecords.length} records (${semLabel})...`);
      await exportToPDFLandscape(exportRecords);
    } catch (err) {
      console.error('Error generating Landscape PDF:', err);
      showToast('Failed to export Landscape PDF.');
    }
  };

  const handleSaveToDatabase = async () => {
    if (!currentUser) return;
    if (isLocked) {
      setIsPasswordModalOpen(true);
      showToast('System locked: Saving to database is disabled.');
      return;
    }
    if (records.length === 0) {
      showToast('No student records to save.');
      return;
    }
    setIsSyncingFirebase(true);
    try {
      // Fetch currently saved records to avoid duplicates
      const remoteRecords = await fetchStudentRecordsFromFirestore(currentUser.email);
      const existingIds = new Set(remoteRecords.map(r => r.id));
      const existingUsns = new Set(remoteRecords.map(r => r.usn?.trim().toUpperCase()).filter(Boolean));

      // Filter out records that already exist in the database (by ID or USN)
      const unsavedRecords = records.filter(r => {
        const hasExistingId = existingIds.has(r.id);
        const hasExistingUsn = r.usn && existingUsns.has(r.usn.trim().toUpperCase());
        return !hasExistingId && !hasExistingUsn;
      });

      const skippedCount = records.length - unsavedRecords.length;

      if (unsavedRecords.length === 0) {
        showToast(`All ${records.length} record(s) are already saved in the database.`);
        return;
      }

      await saveMultipleRecordsToFirestore(unsavedRecords, currentUser.email);

      if (skippedCount > 0) {
        showToast(`Saved ${unsavedRecords.length} new record(s) to database (${skippedCount} already in database, skipped).`);
      } else {
        showToast(`Successfully saved all ${unsavedRecords.length} student record(s) to Firebase!`);
      }
    } catch (err) {
      console.error('Error saving to Firebase database:', err);
      showToast('Failed to save records to database.');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleReloadDatabase = async () => {
    if (!currentUser) return;
    setIsSyncingFirebase(true);
    try {
      const remoteRecords = await fetchStudentRecordsFromFirestore(currentUser.email);
      if (remoteRecords) {
        setRecords(remoteRecords);
        showToast('Successfully reloaded student records from Firebase.');
      } else {
        setRecords([]);
        showToast('No student records found in Firebase database.');
      }
    } catch (err) {
      console.error('Error reloading database:', err);
      showToast('Failed to reload database records.');
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  // IF NOT LOGGED IN: Render Simple Google Login Page
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // IF LOGGED IN: Render Full Extraction Dashboard
  const deptLongNamesSet = new Set<string>();
  records.forEach((r) => {
    const dept = getDepartmentFromUsn(r.usn);
    if (dept) {
      deptLongNamesSet.add(dept.long);
    }
  });
  const deptLongNameDisplay = deptLongNamesSet.size > 0 ? Array.from(deptLongNamesSet).join(', ') : '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      
      {/* Top Header with User Profile Photo & Name */}
      <Header
        records={records}
        currentUser={currentUser}
        onOpenUpload={handleOpenUpload}
        onOpenStatus={() => setIsStatusOpen(true)}
        onPasteClipboard={handleOpenUpload}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        onExportPDFLandscape={handleExportPDFLandscape}
        onSaveToDatabase={handleSaveToDatabase}
        onReloadDatabase={handleReloadDatabase}
        onClearAll={handleClearAll}
        onSignOut={handleSignOut}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenNewView={() => setCurrentView((prev) => (prev === 'main' ? 'newView' : 'main'))}
        currentView={currentView}
        isLocked={isLocked}
        onLock={handleLock}
        onUnlockClick={() => setIsPasswordModalOpen(true)}
        selectedSemester={selectedSemester}
        onSemesterChange={setSelectedSemester}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl md:max-w-[100%] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'main' ? (
          <>
            {/* Info & Account Isolation Status Banner */}
            <div className="hidden md:flex mb-6 p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 shadow-xs">
              <div className="flex items-start sm:items-center space-x-3 text-xs text-slate-700 w-full md:w-auto">
                <div className="hidden sm:flex items-center space-x-3 shrink-0">
                  <img
                    src={currentUser.picture}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full object-cover border border-emerald-500 shrink-0"
                  />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="hidden sm:inline font-medium text-slate-500">Logged in as:</span>
                    <span className="hidden sm:inline font-bold text-slate-900">{currentUser.name}</span>
                    <span className="hidden sm:inline font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 text-[11px] truncate max-w-[180px] sm:max-w-none">
                      {currentUser.email}
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-medium shrink-0">
                      <Database className="w-3 h-3 text-orange-500" />
                      <span className="hidden xs:inline">{isSyncingFirebase ? 'Syncing...' : 'Firebase Active'}</span>
                      <span className="xs:hidden">{isSyncingFirebase ? 'Sync' : 'Active'}</span>
                    </span>
                    {deptLongNameDisplay && (
                      <span className="hidden md:inline font-bold text-indigo-800 text-[15px] ml-1">
                        {deptLongNameDisplay}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[11px] sm:text-xs leading-normal">
                    Upload university mark sheet screenshots. AI extracts <strong className="text-slate-800">USN</strong>, <strong className="text-slate-800">Name</strong>, <strong className="text-slate-800">Subjects</strong>, <strong className="text-slate-800">Marks</strong>, and <strong className="text-slate-800">Results</strong> into structured rows tied to your account.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto shrink-0">
                <button
                  onClick={() => setIsFacultyModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>MAP Faculty</span>
                </button>

                <button
                  onClick={handleOpenUpload}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Screenshot</span>
                </button>
              </div>
            </div>

            {/* Results Table Section */}
            <ResultsTable
              records={records}
              onSelectStudent={(student) => {
                setSelectedStudent(student);
                setIsDetailOpen(true);
              }}
              onDeleteStudent={handleDeleteStudent}
              onOpenUpload={handleOpenUpload}
              onUpdateRecords={handleBatchUpdateRecords}
              isLocked={isLocked}
              onRequestUnlock={() => {
                setIsPasswordModalOpen(true);
                showToast('System is locked. Please enter password to unlock editing options.');
              }}
              semesterFilter={selectedSemester}
              onSemesterChange={setSelectedSemester}
              onOpenNewView={() => setCurrentView((prev) => (prev === 'main' ? 'newView' : 'main'))}
              currentView={currentView}
              onOpenSemesterModal={() => setIsSemesterModalOpen(true)}
            />
          </>
        ) : (
          <NewView
            records={records}
            onBackToMain={() => setCurrentView('main')}
            onExportPDF={handleExportPDF}
            onExportPDFLandscape={handleExportPDFLandscape}
            onExportExcel={handleExportExcel}
            onSelectStudent={(student) => {
              setSelectedStudent(student);
              setIsDetailOpen(true);
            }}
          />
        )}
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
        allRecords={records}
        onSave={handleSaveStudent}
        onDelete={handleDeleteStudent}
        isLocked={isLocked}
        onUnlockRequired={() => setIsPasswordModalOpen(true)}
      />

      {/* Clear All Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isClearAllConfirmOpen}
        title="Clear All Records?"
        message={`Are you sure you want to delete ALL ${records.length} student record(s) for ${currentUser?.name}? This action cannot be undone.`}
        onConfirm={confirmClearAll}
        onCancel={() => setIsClearAllConfirmOpen(false)}
      />

      {/* Subject Statistics Status Modal */}
      <StatusModal
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        records={records}
      />

      {/* Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        isOpen={isSignOutConfirmOpen}
        userName={currentUser?.name}
        userEmail={currentUser?.email}
        onConfirm={confirmSignOut}
        onCancel={() => setIsSignOutConfirmOpen(false)}
      />

      {/* Database Backup Modal (Empty/Reserved for later) */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        records={records}
        currentUser={currentUser}
        onRestoreSuccess={(updatedRecords) => {
          setRecords(updatedRecords);
          showToast('Successfully restored database backup!');
        }}
        isLocked={isLocked}
        onUnlockRequired={() => setIsPasswordModalOpen(true)}
      />

      {/* Security Password Validation Modal */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handleUnlockSuccess}
      />

      {/* Synchronization Full-screen Backdrop & Loader Overlay */}
      {isSyncingFirebase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center transition-all duration-300">
          <div className="bg-white/95 p-8 rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col items-center text-center max-w-xs relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Pulsing ring background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-emerald-500/5 pointer-events-none" />
            
            {/* Spinning/pulsing logo container */}
            <div className="relative mb-4 w-24 h-24 flex items-center justify-center">
              {/* Spinning dual-color dashed border */}
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-t-amber-500 border-r-emerald-500 border-b-amber-500 border-l-emerald-500 animate-spin" style={{ animationDuration: '4s' }} />
              {/* Inner glowing effect */}
              <div className="absolute inset-2 rounded-full bg-emerald-50/50 animate-pulse" />
              {/* Logo Image */}
              <img
                src={smvcerLogo}
                alt="SMVCER"
                className="w-16 h-16 rounded-full object-cover shadow-md relative z-10 hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Custom "SMVCER" text styled in Amber and Green color with shadow effects */}
            <div className="relative">
              <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-emerald-600 to-green-600 drop-shadow-[0_4px_6px_rgba(245,158,11,0.25)] select-none">
                SMVCER
              </h2>
              {/* Subtle green reflection line */}
              <div className="w-12 h-1 bg-gradient-to-r from-amber-400 to-emerald-500 mx-auto mt-2 rounded-full opacity-80" />
            </div>
            
            <p className="mt-4 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              Database Sync
            </p>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Syncing Toast Notification - Rendered on top of backdrop (z-[60]) */}
      {isSyncingFirebase && (
        <div className="fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold shadow-xl flex items-center space-x-3 animate-bounce">
          <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping shrink-0" />
          <span className="text-slate-200">Syncing Data- Please Wait</span>
        </div>
      )}

      {/* Faculty Mapping Modal */}
      <FacultyMapModal
        isOpen={isFacultyModalOpen}
        onClose={() => setIsFacultyModalOpen(false)}
        records={records}
        onSaveFacultyMapping={handleBatchUpdateRecords}
        isLocked={isLocked}
        onRequestUnlock={() => {
          setIsPasswordModalOpen(true);
          showToast('System is locked. Please enter password to unlock faculty mapping options.');
        }}
      />

      {/* Semester Selection Popup Modal */}
      <SemesterSelectModal
        isOpen={isSemesterModalOpen}
        onClose={() => setIsSemesterModalOpen(false)}
        onSelectSemester={(sem) => {
          setSelectedSemester(sem);
          setIsSemesterModalOpen(false);
        }}
        records={records}
        currentSemester={selectedSemester}
      />

    </div>
  );
}
