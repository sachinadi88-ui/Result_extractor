import React from 'react';
import { Layers, GraduationCap, ArrowRight, CheckCircle2, Sparkles, X, Filter } from 'lucide-react';
import { StudentRecord } from '../types';
import { getAvailableSemesters } from '../utils/statusHelper';

interface SemesterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSemester: (semester: string) => void;
  records: StudentRecord[];
  currentSemester?: string;
}

export const SemesterSelectModal: React.FC<SemesterSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectSemester,
  records,
  currentSemester = '',
}) => {
  if (!isOpen) return null;

  const availableSemesters = getAvailableSemesters(records);

  // Calculate count per semester
  const semesterCountMap = new Map<string, number>();
  records.forEach((rec) => {
    const rawSem = (rec.semester || '').trim().replace(/^sem\s*/i, '');
    if (rawSem) {
      semesterCountMap.set(rawSem, (semesterCountMap.get(rawSem) || 0) + 1);
    }
  });

  const standardSemesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Combine standard 1-8 with any custom semesters present
  const allSemKeys = Array.from(
    new Set([
      ...availableSemesters.map((s) => s.replace(/^sem\s*/i, '').trim()),
      ...standardSemesters,
    ])
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const handleChoose = (sem: string) => {
    onSelectSemester(sem);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 sm:space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                Select Semester to Begin
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Choose a semester to view student marksheets & result analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Information banner */}
          <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-100 text-xs text-indigo-900 flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <p className="text-xs font-medium">Select a semester to load student marksheets.</p>
          </div>

          {/* Quick Grid of Semesters */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
              Available Semesters
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {allSemKeys.map((semNum) => {
                const count = semesterCountMap.get(semNum) || 0;
                const isSelected = currentSemester === semNum;
                const hasData = count > 0;

                return (
                  <button
                    key={`modal-sem-${semNum}`}
                    type="button"
                    onClick={() => handleChoose(semNum)}
                    className={`p-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer flex items-center justify-between group active:scale-95 active:shadow-inner ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                        : hasData
                        ? 'bg-emerald-50/50 hover:bg-emerald-100/70 border-emerald-200 text-slate-800 hover:border-emerald-400 shadow-2xs hover:shadow-md'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 min-w-0 pr-1">
                      <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        Sem {semNum}
                      </span>
                      {hasData && (
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md transition-all ${
                            isSelected
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200 group-hover:bg-emerald-200'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                    <ArrowRight
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 ${
                        isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* All Semesters Option */}
          <div className="pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleChoose('ALL')}
              className={`w-full p-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer flex items-center justify-between group active:scale-95 active:shadow-inner ${
                currentSemester === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-400'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={`p-1.5 rounded-md ${
                    currentSemester === 'ALL'
                      ? 'bg-slate-800 text-emerald-400'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">
                    View All Semesters
                  </h4>
                  <p
                    className={`text-[10px] ${
                      currentSemester === 'ALL' ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    Load all combined records ({records.length} records)
                  </p>
                </div>
              </div>
              <ArrowRight
                className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-1 ${
                  currentSemester === 'ALL' ? 'text-white' : 'text-slate-400'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          <p className="text-[11px] text-slate-500">
            You can change the semester anytime from the header dropdown.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
