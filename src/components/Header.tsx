import React from 'react';
import { FileSpreadsheet, Upload, Clipboard, Download, Trash2, GraduationCap, CheckCircle2 } from 'lucide-react';
import { StudentRecord } from '../types';

interface HeaderProps {
  records: StudentRecord[];
  onOpenUpload: () => void;
  onPasteClipboard: () => void;
  onExportCsv: () => void;
  onClearAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  records,
  onOpenUpload,
  onPasteClipboard,
  onExportCsv,
  onClearAll,
}) => {
  const totalStudents = records.length;
  const totalSubjects = records.reduce((acc, r) => acc + (r.subjects ? r.subjects.length : 0), 0);
  const passCount = records.filter(r => r.status?.toUpperCase().includes('PASS') || r.subjects.every(s => !s.result.toUpperCase().includes('FAIL'))).length;
  const passPercentage = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Result<span className="text-emerald-600">Extract</span> <span className="text-slate-500 font-normal text-sm">AI</span>
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  OCR Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated screenshot extraction for student USN, Name, and subject-wise grades
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          {totalStudents > 0 && (
            <div className="hidden lg:flex items-center space-x-6 bg-slate-50 px-4 py-1.5 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Total Students</span>
                <span className="text-sm font-bold text-slate-900">{totalStudents}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-500 block text-[11px]">Extracted Subjects</span>
                <span className="text-sm font-bold text-emerald-600">{totalSubjects}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-500 block text-[11px]">Pass Rate</span>
                <span className="text-sm font-bold text-emerald-600">{passPercentage}%</span>
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Screenshot</span>
            </button>

            <button
              onClick={onPasteClipboard}
              title="Click or press Ctrl+V to extract from clipboard"
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-medium border border-slate-200 transition-colors cursor-pointer shadow-sm"
            >
              <Clipboard className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Paste Image</span>
            </button>

            {totalStudents > 0 && (
              <>
                <button
                  onClick={onExportCsv}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export Excel/CSV</span>
                </button>

                <button
                  onClick={onClearAll}
                  className="p-2 rounded-lg bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition-colors cursor-pointer shadow-sm"
                  title="Clear all student records"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
