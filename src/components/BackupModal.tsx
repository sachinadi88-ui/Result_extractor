import React, { useState, useRef } from 'react';
import { X, DatabaseBackup, Download, Upload, Loader2, CheckCircle2, AlertCircle, Info, Lock } from 'lucide-react';
import { StudentRecord, AuthUser } from '../types';
import { saveMultipleRecordsToFirestore } from '../lib/firebase';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: StudentRecord[];
  currentUser: AuthUser | null;
  onRestoreSuccess: (updatedRecords: StudentRecord[]) => void;
  isLocked: boolean;
  onUnlockRequired: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  records,
  currentUser,
  onRestoreSuccess,
  isLocked,
  onUnlockRequired,
}) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownload = () => {
    try {
      if (records.length === 0) {
        setStatus({ type: 'error', message: 'No records available to backup.' });
        return;
      }

      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student_records_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus({ type: 'success', message: 'Backup file downloaded successfully!' });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to download backup.' });
    }
  };

  const handleUploadClick = () => {
    setStatus({ type: null, message: '' });
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsRestoring(true);
        setStatus({ type: null, message: '' });

        const text = event.target?.result as string;
        if (!text) {
          throw new Error('The uploaded file is empty.');
        }

        const parsed = JSON.parse(text);

        // Validation
        if (!Array.isArray(parsed)) {
          throw new Error('Backup format invalid. The file must contain a list of student records.');
        }

        if (parsed.length === 0) {
          throw new Error('The backup file does not contain any student records.');
        }

        // Validate basic fields
        const isValid = parsed.every(
          (item) => typeof item === 'object' && item !== null && ('usn' in item || 'name' in item)
        );

        if (!isValid) {
          throw new Error('Some records in the backup file are invalid or malformed.');
        }

        // Process records to ensure they have IDs and valid timestamps
        const validatedRecords: StudentRecord[] = parsed.map((r, idx) => ({
          ...r,
          id: r.id || `rec-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          uploadedAt: r.uploadedAt || new Date().toISOString(),
          subjects: Array.isArray(r.subjects) ? r.subjects : [],
        }));

        if (currentUser) {
          // Save to Firebase Firestore
          await saveMultipleRecordsToFirestore(validatedRecords, currentUser.email);

          // Merge with current state records to prevent duplicates based on ID
          const mergedMap = new Map<string, StudentRecord>();
          records.forEach((rec) => mergedMap.set(rec.id, rec));
          validatedRecords.forEach((rec) => mergedMap.set(rec.id, rec));
          const updatedList = Array.from(mergedMap.values());

          onRestoreSuccess(updatedList);
          setStatus({
            type: 'success',
            message: `Successfully restored and synced ${validatedRecords.length} record(s) to your Firestore database!`,
          });
        } else {
          throw new Error('Please sign in to restore records to the database.');
        }
      } catch (err: any) {
        console.error('Restoration error:', err);
        setStatus({
          type: 'error',
          message: err.message || 'Failed to parse and restore backup file.',
        });
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset input
        }
      }
    };

    reader.onerror = () => {
      setStatus({ type: 'error', message: 'Failed to read the backup file.' });
      setIsRestoring(false);
    };

    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
              <DatabaseBackup className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-sans leading-snug">Database Backup</h3>
              <p className="text-xs text-slate-500 font-normal">Export or import student records securely</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Check Warning */}
        {!currentUser ? (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>Please sign in with Google to use database backup and restoration features.</span>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Authenticated as:</span>
              <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={currentUser.email}>
                {currentUser.email}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Current active records:</span>
              <span className="font-bold text-slate-900 bg-slate-200/60 px-2 py-0.5 rounded-md">
                {records.length} {records.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>
        )}

        {/* Lock Warning Banner */}
        {currentUser && isLocked && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs flex items-start space-x-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 animate-pulse" />
            <div className="leading-relaxed">
              <strong className="font-bold">Database Locked:</strong> Restoration requires verification. Please click <strong>"Restore Backup"</strong> to authenticate.
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={!currentUser || records.length === 0 || isRestoring}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 text-center cursor-pointer group ${
              !currentUser || records.length === 0 || isRestoring
                ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/30'
            }`}
          >
            <div className={`p-2.5 rounded-lg mb-2 transition-colors duration-200 ${
              !currentUser || records.length === 0 || isRestoring
                ? 'bg-slate-100 text-slate-400'
                : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100/70'
            }`}>
              <Download className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Download JSON</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Export database records</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={isLocked ? onUnlockRequired : handleUploadClick}
            disabled={!currentUser || isRestoring}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 text-center cursor-pointer group ${
              !currentUser || isRestoring
                ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                : isLocked
                ? 'bg-rose-50/20 border-rose-100 hover:bg-rose-50/40 hover:border-rose-200 text-rose-800'
                : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/30'
            }`}
          >
            <div className={`p-2.5 rounded-lg mb-2 transition-colors duration-200 ${
              !currentUser || isRestoring
                ? 'bg-slate-100 text-slate-400'
                : isLocked
                ? 'bg-rose-100 text-rose-600'
                : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100/70'
            }`}>
              {isRestoring ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLocked ? (
                <Lock className="w-5 h-5 animate-pulse" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>
            <span className="text-xs font-bold text-slate-800">
              {isLocked ? 'Unlock & Restore' : 'Restore Backup'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              {isLocked ? 'Enter password to import' : 'Upload a JSON backup file'}
            </span>
          </button>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>

        {/* Status/Feedback Messages */}
        {status.type && (
          <div className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 animate-fade-in ${
            status.type === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}>
            {status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            )}
            <span className="font-medium leading-normal">{status.message}</span>
          </div>
        )}

        {/* Disclaimer / Guidance */}
        <div className="flex items-start space-x-2 text-[11px] text-slate-400 bg-slate-50/50 p-3 rounded-lg border border-slate-150">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
          <span className="leading-normal">
            Restoring from backup merges the files automatically with your current Firestore dataset, replacing records with matching IDs and appending any new entries.
          </span>
        </div>
      </div>
    </div>
  );
};
