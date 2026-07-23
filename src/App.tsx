import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ResultsTable } from './components/ResultsTable';
import { UploadModal } from './components/UploadModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { StudentRecord } from './types';
import { getStoredStudentRecords, saveStudentRecords, exportToCsv } from './utils/storage';
import { CheckCircle2, FileSpreadsheet, Plus, AlertCircle, Info } from 'lucide-react';

export default function App() {
  const [records, setRecords] = useState<StudentRecord[]>(() => {
    const stored = getStoredStudentRecords();
    return stored.filter((r) => !r.id.startsWith('sample-'));
  });

  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    saveStudentRecords(records);
  }, [records]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExtractionSuccess = (
    newStudents: Omit<StudentRecord, 'id' | 'uploadedAt'>[],
    imageBase64: string
  ) => {
    const timestamp = new Date().toISOString();
    const createdRecords: StudentRecord[] = newStudents.map((st, i) => ({
      ...st,
      id: `student-${Date.now()}-${i}`,
      uploadedAt: timestamp,
      imageUrl: imageBase64,
    }));

    setRecords((prev) => [...createdRecords, ...prev]);
    showToast(`Successfully extracted ${createdRecords.length} student result(s)!`);
  };

  const handleSaveStudent = (updated: StudentRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    showToast(`Updated record for ${updated.name} (${updated.usn})`);
  };

  const handleDeleteStudent = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    showToast('Record deleted.');
  };

  const handleExportCsv = () => {
    exportToCsv(records);
    showToast('Exported results table to CSV.');
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all student result records?')) {
      setRecords([]);
      showToast('All records cleared.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      
      {/* Top Header */}
      <Header
        records={records}
        onOpenUpload={() => setIsUploadOpen(true)}
        onPasteClipboard={() => setIsUploadOpen(true)}
        onExportCsv={handleExportCsv}
        onClearAll={handleClearAll}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Info Banner */}
        <div className="mb-6 p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3 text-xs text-slate-700">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                Automatic Screenshot Result Extraction &amp; Tabular Display
              </p>
              <p className="text-slate-500 mt-0.5">
                Upload any university mark sheet screenshot. The AI extracts <strong className="text-slate-800">USN</strong>, <strong className="text-slate-800">Name</strong>, <strong className="text-slate-800">Subjects</strong>, <strong className="text-slate-800">Internal Marks</strong>, <strong className="text-slate-800">External Marks</strong>, <strong className="text-slate-800">Total Marks</strong>, and <strong className="text-slate-800">Results</strong> into a consolidated row.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-sm cursor-pointer"
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
        <span>RESULT EXTRACTOR AI • PROFESSIONAL OCR ENGINE</span>
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>OCR ENGINE ACTIVE</span>
        </div>
      </footer>

      {/* Upload Screenshot Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onExtractionSuccess={handleExtractionSuccess}
      />

      {/* Edit/Inspect Student Modal */}
      <StudentDetailModal
        student={selectedStudent}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedStudent(null);
        }}
        onSave={handleSaveStudent}
        onDelete={handleDeleteStudent}
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
