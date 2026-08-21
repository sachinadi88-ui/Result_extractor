import React, { useState } from 'react';
import { FileSpreadsheet, Upload, Download, GraduationCap, LogOut, ShieldCheck, Database, Save, BarChart3, RefreshCw, DatabaseBackup, Lock, Unlock, Layers, Bot } from 'lucide-react';
import { StudentRecord, AuthUser } from '../types';
import { isStudentPass, getDepartmentFromUsn, filterRecordsBySemester, getAvailableSemesters } from '../utils/statusHelper';
import { ExportFormatModal } from './ExportFormatModal';

interface HeaderProps {
  records: StudentRecord[];
  currentUser: AuthUser;
  onOpenUpload: () => void;
  onOpenStatus: () => void;
  onOpenChat?: () => void;
  onPasteClipboard: () => void;
  onExportExcel: (overrideSemester?: string) => void;
  onExportPDF: (overrideSemester?: string) => void;
  onExportPDFLandscape: (overrideSemester?: string) => void;
  onExportPDFCreditsLandscape?: (overrideSemester?: string) => void;
  onSaveToDatabase: () => void;
  onReloadDatabase: () => void;
  onClearAll: () => void;
  onSignOut: () => void;
  onOpenBackup: () => void;
  onOpenNewView?: () => void;
  currentView?: 'main' | 'newView';
  isLocked: boolean;
  onLock: () => void;
  onUnlockClick: () => void;
  selectedSemester?: string;
  onSemesterChange?: (sem: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  records,
  currentUser,
  onOpenUpload,
  onOpenStatus,
  onOpenChat,
  onPasteClipboard,
  onExportExcel,
  onExportPDF,
  onExportPDFLandscape,
  onExportPDFCreditsLandscape = () => {},
  onSaveToDatabase,
  onReloadDatabase,
  onClearAll,
  onSignOut,
  onOpenBackup,
  onOpenNewView,
  currentView = 'main',
  isLocked,
  onLock,
  onUnlockClick,
  selectedSemester = 'ALL',
  onSemesterChange,
}) => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const availableSemesters = getAvailableSemesters(records);
  const activeRecords = filterRecordsBySemester(records, selectedSemester);
  const totalStudents = activeRecords.length;
  const uniqueSubjectsSet = new Set<string>();
  activeRecords.forEach((r) => {
    if (r.subjects && Array.isArray(r.subjects)) {
      r.subjects.forEach((sub) => {
        if (sub && sub.subjectName) {
          const code = (sub.subjectCode || '').trim().toUpperCase();
          const name = (sub.subjectName || '').trim().toUpperCase();
          const key = code ? `${code}::${name}` : name;
          if (key) {
            uniqueSubjectsSet.add(key);
          }
        }
      });
    }
  });
  const totalSubjects = uniqueSubjectsSet.size;
  const deptSet = new Set<string>();
  activeRecords.forEach((r) => {
    const dept = getDepartmentFromUsn(r.usn);
    if (dept) {
      deptSet.add(dept.short);
    }
  });
  const deptDisplay = deptSet.size > 0 ? Array.from(deptSet).join(', ') : 'N/A';

  // Find semester number from activeRecords or selectedSemester
  let semesterNumber = selectedSemester !== 'ALL' ? selectedSemester : '';
  if (!semesterNumber) {
    for (const rec of activeRecords) {
      if (rec.semester) {
        semesterNumber = String(rec.semester).trim();
        break;
      }
    }
  }

  const passCount = activeRecords.filter(r => isStudentPass(r)).length;
  const passPercentage = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

  return (
    <>
      <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-50 shadow-xs">
      <div className="w-full md:max-w-[96%] mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 sm:gap-3">
          
          {/* Top Row on Mobile / Left Section on Desktop */}
          <div className="flex items-center justify-between w-full lg:w-auto">
            {/* Brand & Title */}
            <div className="flex items-center space-x-2.5 shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                    Result<span className="text-emerald-600">Extract</span> <span className="text-slate-500 font-normal text-xs sm:text-sm">AI</span>
                  </h1>
                  <span className="hidden sm:inline-block text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Dashboard
                  </span>
                </div>
              </div>
            </div>

            {/* User Account Info on Mobile - Top Right */}
            <div className="lg:hidden flex items-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <img
                src={currentUser.picture}
                alt={currentUser.name}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-slate-300 shrink-0"
              />
              <span className="text-[11px] font-bold text-slate-800 max-w-[70px] sm:max-w-[120px] truncate">
                {currentUser.name}
              </span>
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="p-1 rounded text-[#DC2626] hover:bg-red-100/80 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 text-[#DC2626]" />
              </button>
            </div>
          </div>

          {/* Quick Stats - Desktop (XL+) */}
          {records.length > 0 && (
            <div className="hidden xl:flex items-center space-x-4 bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs shrink-0">
              <div>
                <span className="text-slate-500 block text-[11px]">Records</span>
                <span className="text-sm font-bold text-slate-900">{totalStudents}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-500 block text-[11px]">Subjects</span>
                <span className="text-sm font-bold text-emerald-600">{totalSubjects}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-500 block text-[11px]">Department</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-indigo-700 font-mono">{deptDisplay}</span>
                  {onSemesterChange ? (
                    <select
                      value={selectedSemester}
                      onChange={(e) => onSemesterChange(e.target.value)}
                      className="bg-rose-50 text-[#DC2626] font-bold text-xs py-0.5 px-1.5 rounded border border-rose-200 font-mono cursor-pointer focus:outline-none"
                    >
                      <option value="">-- Select Sem --</option>
                      <option value="ALL">ALL SEMS</option>
                      {availableSemesters.map((sem) => (
                        <option key={sem} value={sem}>
                          SEM : {sem.replace(/^sem\s*/i, '')}
                        </option>
                      ))}
                      {['1', '2', '3', '4', '5', '6', '7', '8'].map((s) => (
                        !availableSemesters.includes(s) && !availableSemesters.some((x) => x.toLowerCase().includes(s)) && (
                          <option key={`hdr-opt-${s}`} value={s}>
                            SEM : {s}
                          </option>
                        )
                      ))}
                    </select>
                  ) : (
                    semesterNumber && (
                      <span className="text-xs font-bold text-[#DC2626] font-mono bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 uppercase tracking-tight">
                        SEM : {semesterNumber}
                      </span>
                    )
                  )}
                </div>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-500 block text-[11px]">Pass Rate</span>
                <span className="text-sm font-bold text-emerald-600">{passPercentage}%</span>
              </div>
            </div>
          )}

          {/* Mobile Quick Stats Bar */}
          {records.length > 0 && (
            <div className="flex xl:hidden items-center justify-around bg-slate-50 px-1 py-1 rounded-md border border-slate-200/80 text-[11px] text-slate-600">
              <span><strong className="text-slate-900">{totalStudents}</strong> Records</span>
              <span className="text-slate-300">•</span>
              <span><strong className="text-emerald-700">{totalSubjects}</strong> Subjects</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-indigo-700 font-bold flex items-center gap-1">
                Dept:{deptDisplay}
                {onSemesterChange ? (
                  <select
                    value={selectedSemester}
                    onChange={(e) => onSemesterChange(e.target.value)}
                    className="bg-rose-50 text-[#DC2626] font-bold text-[10px] py-0 px-1 rounded border border-rose-200 cursor-pointer focus:outline-none"
                  >
                    <option value="">SEM: SELECT</option>
                    <option value="ALL">SEM: ALL</option>
                    {availableSemesters.map((sem) => (
                      <option key={sem} value={sem}>
                        SEM: {sem.replace(/^sem\s*/i, '')}
                      </option>
                    ))}
                    {['1', '2', '3', '4', '5', '6', '7', '8'].map((s) => (
                      !availableSemesters.includes(s) && !availableSemesters.some((x) => x.toLowerCase().includes(s)) && (
                        <option key={`hdr-mob-opt-${s}`} value={s}>
                          SEM: {s}
                        </option>
                      )
                    ))}
                  </select>
                ) : (
                  semesterNumber && (
                    <span className="ml-1.5 text-[#DC2626] font-bold">SEM:{semesterNumber}</span>
                  )
                )}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-800 font-bold">Pass: {passPercentage}%</span>
            </div>
          )}

          {/* Action Toolbar & Desktop User Profile */}
          <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 w-full lg:w-auto">
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 w-full lg:w-auto overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={onOpenUpload}
                className="inline-flex items-center justify-center space-x-0.5 sm:space-x-1 px-1.5 py-1.5 sm:px-2 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-95 shadow-xs cursor-pointer shrink-0"
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Upload</span>
              </button>

              <button
                onClick={onOpenStatus}
                className="inline-flex items-center justify-center space-x-0.5 sm:space-x-1 px-1.5 py-1.5 sm:px-2 sm:py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-95 shadow-xs cursor-pointer shrink-0"
              >
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Stats</span>
              </button>

              {onOpenChat && (
                <button
                  onClick={onOpenChat}
                  title="Ask AI Academic Assistant about results, toppers, backlogs, or credits"
                  className="inline-flex items-center justify-center space-x-1 px-1 py-1.5 sm:px-2 sm:py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-95 shadow-xs cursor-pointer shrink-0"
                >
                  <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Ask AI</span>
                </button>
              )}

              {totalStudents > 0 && (
                <>
                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="inline-flex items-center justify-center space-x-0.5 sm:space-x-1 px-1.5 py-1.5 sm:px-2 sm:py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-95 shadow-xs cursor-pointer animate-fade-in shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-100" />
                    <span>Export</span>
                  </button>

                  <button
                    onClick={onSaveToDatabase}
                    title="Save or sync unsaved changes to Firebase database"
                    className="inline-flex items-center justify-center space-x-0.5 sm:space-x-1 px-1.5 py-1.5 sm:px-2 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-95 shadow-xs cursor-pointer shrink-0"
                  >
                    <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Save<span className="hidden sm:inline"> to DB</span></span>
                  </button>
                </>
              )}

              <button
                onClick={onReloadDatabase}
                title="Reload latest records from Firebase database"
                className="inline-flex items-center justify-center p-1.5 sm:p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 hover:text-slate-800 transition-all duration-150 active:scale-90 shadow-xs cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={isLocked ? onUnlockClick : onLock}
                title={isLocked ? "Database locked: click to unlock modifications (password required)" : "Database unlocked: click to lock modifications"}
                className={`inline-flex items-center justify-center p-1.5 sm:p-1.5 rounded-lg border transition-all duration-150 active:scale-90 shadow-xs cursor-pointer shrink-0 ${
                  isLocked
                    ? "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600 hover:text-rose-700"
                    : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600 hover:text-emerald-700"
                }`}
              >
                {isLocked ? (
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>

              <button
                onClick={onOpenBackup}
                title="Database Backup"
                className="inline-flex items-center justify-center p-1.5 sm:p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 hover:text-slate-800 transition-all duration-150 active:scale-90 shadow-xs cursor-pointer shrink-0"
              >
                <DatabaseBackup className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Display Logged-In User Profile Photo & Name - Desktop (lg+) */}
            <div className="hidden lg:flex items-center space-x-1 bg-slate-50 px-1 py-1 rounded-lg border border-slate-200 shadow-2xs shrink-0">
              <img
                src={currentUser.picture}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover border border-slate-300 shrink-0"
              />
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="p-1 rounded-md text-[#DC2626] hover:bg-red-100/80 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 text-[#DC2626]" />
              </button>
              <div className="text-left leading-tight max-w-[110px] sm:max-w-[140px] truncate">
                <p className="text-[11px] font-bold text-slate-800 truncate">{currentUser.name}</p>
                <p className="text-[9px] text-slate-500 truncate font-mono">{currentUser.email}</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
    <ExportFormatModal
      isOpen={isExportModalOpen}
      onClose={() => setIsExportModalOpen(false)}
      onExportExcel={onExportExcel}
      onExportPDF={onExportPDF}
      onExportPDFLandscape={onExportPDFLandscape}
      onExportPDFCreditsLandscape={onExportPDFCreditsLandscape}
      selectedSemester={selectedSemester}
      onSemesterChange={onSemesterChange}
      records={records}
    />
    </>
  );
};
