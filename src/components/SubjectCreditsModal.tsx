import React, { useState, useEffect } from 'react';
import { StudentRecord } from '../types';
import { Award, Lock, Unlock, Save, X, BookOpen, Check, RefreshCw, Layers } from 'lucide-react';
import { sanitizeSubject } from '../utils/statusHelper';

interface SubjectCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: StudentRecord[];
  selectedSemester: string;
  onSaveCredits: (updatedRecords: StudentRecord[]) => Promise<void> | void;
  isLocked?: boolean;
  onRequestUnlock?: () => void;
}

interface SubjectCreditItem {
  key: string;
  code: string;
  name: string;
  credits: string;
  isNonCredit: boolean;
  studentCount: number;
}

export const SubjectCreditsModal: React.FC<SubjectCreditsModalProps> = ({
  isOpen,
  onClose,
  records,
  selectedSemester,
  onSaveCredits,
  isLocked,
  onRequestUnlock,
}) => {
  // Current semester being inspected/edited in modal
  const [activeSem, setActiveSem] = useState<string>(selectedSemester || 'ALL');
  const [creditsMap, setCreditsMap] = useState<{ [key: string]: string }>({});
  const [nonCreditMap, setNonCreditMap] = useState<{ [key: string]: boolean }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Discover all semesters available in records
  const availableSemesters: string[] = Array.from(
    new Set<string>(
      records
        .map((r) => (r.semester || '').trim())
        .filter(Boolean)
        .map((s) => s.replace(/^sem\s*/i, ''))
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Keep activeSem synchronized with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      if (selectedSemester && selectedSemester !== '') {
        setActiveSem(selectedSemester.replace(/^sem\s*/i, ''));
      } else if (availableSemesters.length > 0) {
        setActiveSem(availableSemesters[0]);
      } else {
        setActiveSem('ALL');
      }
      setSaveSuccessMsg(null);
    }
  }, [isOpen, selectedSemester]);

  // Load existing credits from records & localStorage
  useEffect(() => {
    if (isOpen) {
      const initialCredits: { [key: string]: string } = {};
      const initialNonCredit: { [key: string]: boolean } = {};

      let savedStorageCredits: { [key: string]: string } = {};
      try {
        const stored = localStorage.getItem('smvcer_credits_mapping');
        if (stored) savedStorageCredits = JSON.parse(stored);
      } catch (e) {}

      records.forEach((rec) => {
        rec.subjects?.forEach((rawSub) => {
          const s = sanitizeSubject(rawSub);
          const code = (s.subjectCode || '').trim();
          const name = (s.subjectName || '').trim();
          if (!code && !name) return;
          const key = code ? code.toUpperCase() : name.toLowerCase();

          if (s.credits !== undefined && s.credits !== null && String(s.credits).trim() !== '') {
            initialCredits[key] = String(s.credits).trim();
          } else if (savedStorageCredits[key] && !initialCredits[key]) {
            initialCredits[key] = savedStorageCredits[key];
          }

          if (s.isNonCredit !== undefined) {
            initialNonCredit[key] = !!s.isNonCredit;
          }
        });
      });

      setCreditsMap(initialCredits);
      setNonCreditMap(initialNonCredit);
    }
  }, [isOpen, records]);

  if (!isOpen) return null;

  // Filter student records matching the activeSem tab
  const semRecords = records.filter((r) => {
    if (activeSem === 'ALL' || !activeSem) return true;
    const rSem = (r.semester || '').trim().toLowerCase();
    const target = activeSem.toLowerCase();
    return (
      rSem === target ||
      rSem === `sem ${target}` ||
      rSem.includes(`${target}th`) ||
      rSem.includes(`${target}st`) ||
      rSem.includes(`${target}nd`) ||
      rSem.includes(`${target}rd`)
    );
  });

  // Extract unique subjects for this semester
  const subjectMap = new Map<string, SubjectCreditItem>();

  semRecords.forEach((rec) => {
    rec.subjects?.forEach((rawSub) => {
      const s = sanitizeSubject(rawSub);
      const code = (s.subjectCode || '').trim();
      const name = (s.subjectName || '').trim();
      if (!code && !name) return;

      const key = code ? code.toUpperCase() : name.toLowerCase();

      if (!subjectMap.has(key)) {
        const storedCredit = creditsMap[key] !== undefined ? creditsMap[key] : (s.credits || '');
        const isNonCred = nonCreditMap[key] !== undefined ? nonCreditMap[key] : !!s.isNonCredit;
        subjectMap.set(key, {
          key,
          code,
          name,
          credits: storedCredit,
          isNonCredit: isNonCred,
          studentCount: 1,
        });
      } else {
        const item = subjectMap.get(key)!;
        item.studentCount += 1;
      }
    });
  });

  const subjectsList = Array.from(subjectMap.values());

  // Calculate total credits for this semester
  const totalCredits = subjectsList.reduce((acc, sub) => {
    const credStr = creditsMap[sub.key] !== undefined ? creditsMap[sub.key] : sub.credits;
    const isNonCred = nonCreditMap[sub.key] !== undefined ? nonCreditMap[sub.key] : sub.isNonCredit;
    if (isNonCred) return acc;
    const num = parseFloat(credStr);
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  const handleCreditChange = (key: string, val: string) => {
    if (isLocked && onRequestUnlock) {
      onRequestUnlock();
      return;
    }
    setCreditsMap((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleToggleNonCredit = (key: string, isNonCredit: boolean) => {
    if (isLocked && onRequestUnlock) {
      onRequestUnlock();
      return;
    }
    setNonCreditMap((prev) => ({
      ...prev,
      [key]: isNonCredit,
    }));
    if (isNonCredit) {
      setCreditsMap((prev) => ({
        ...prev,
        [key]: '0',
      }));
    }
  };

  const handleSave = async () => {
    if (isLocked && onRequestUnlock) {
      onRequestUnlock();
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      // 1. Cache credits in localStorage
      try {
        localStorage.setItem('smvcer_credits_mapping', JSON.stringify(creditsMap));
      } catch (e) {}

      // 2. Update all matching student records
      const updatedRecords: StudentRecord[] = records.map((student) => {
        if (!student.subjects || student.subjects.length === 0) return student;

        let hasChange = false;
        const updatedSubjects = student.subjects.map((rawSub) => {
          const sub = sanitizeSubject(rawSub);
          const code = (sub.subjectCode || '').trim();
          const name = (sub.subjectName || '').trim();
          const key = code ? code.toUpperCase() : name.toLowerCase();

          const mappedCredit = creditsMap[key] !== undefined ? creditsMap[key] : sub.credits;
          const mappedNonCredit = nonCreditMap[key] !== undefined ? nonCreditMap[key] : sub.isNonCredit;

          if (mappedCredit !== sub.credits || mappedNonCredit !== sub.isNonCredit) {
            hasChange = true;
            return {
              ...sub,
              credits: mappedCredit,
              isNonCredit: mappedNonCredit,
            };
          }
          return sub;
        });

        if (hasChange) {
          return {
            ...student,
            subjects: updatedSubjects,
          };
        }
        return student;
      });

      await onSaveCredits(updatedRecords);
      setSaveSuccessMsg('Credits successfully updated & saved to database!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error updating credits:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[95vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/90 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <Award className="w-4 h-4 sm:w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Subject Credits</h2>
                <span className="px-1.5 sm:px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] sm:text-[11px] font-bold shrink-0">
                  {activeSem === 'ALL' ? 'All Semesters' : `Sem ${activeSem.replace(/^sem\s*/i, '')}`}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 hidden xs:block truncate sm:whitespace-normal">
                Enter credit points for each subject to apply across all students.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lock Notice if Locked */}
        {isLocked && (
          <div className="mx-3 sm:mx-5 mt-2.5 sm:mt-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-amber-50 border border-amber-200 flex flex-col xs:flex-row xs:items-center justify-between text-xs text-amber-800 gap-2 shrink-0">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Locked:</strong> Unlock to edit subject credits.
              </span>
            </div>
            {onRequestUnlock && (
              <button
                onClick={onRequestUnlock}
                className="inline-flex items-center justify-center space-x-1 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer active:scale-95"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock</span>
              </button>
            )}
          </div>
        )}

        {/* Semester Tabs / Selector */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          {/* Semester Selector Pills - Horizontal scroll on mobile */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 mr-0.5 sm:mr-1 flex items-center gap-1 shrink-0">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Sem:
            </span>
            <button
              onClick={() => setActiveSem('ALL')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeSem === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            {(availableSemesters.length > 0 ? availableSemesters : ['1', '2', '3', '4', '5', '6', '7', '8']).map((s) => (
              <button
                key={s}
                onClick={() => setActiveSem(s)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  activeSem === s || activeSem === `Sem ${s}`
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Sem {s}
              </button>
            ))}
          </div>

          <div className="text-[10px] sm:text-xs text-slate-500 font-medium hidden md:block">
            Select an option or type credit value directly
          </div>
        </div>

        {/* Subjects List & Credit Entry Table */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {subjectsList.length === 0 ? (
            <div className="text-center py-10 sm:py-12 text-slate-400 space-y-2">
              <BookOpen className="w-9 h-9 sm:w-10 sm:h-10 mx-auto text-slate-300" />
              <p className="text-xs sm:text-sm font-semibold text-slate-700">No subjects found for Semester {activeSem}</p>
              <p className="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto px-4">
                Upload student mark sheets for Semester {activeSem} or switch to another semester tab.
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE VIEW (< 640px): Card list layout */}
              <div className="block sm:hidden space-y-2.5">
                {subjectsList.map((sub) => {
                  const currentVal = creditsMap[sub.key] !== undefined ? creditsMap[sub.key] : (sub.credits || '');
                  const isNonCred = nonCreditMap[sub.key] !== undefined ? nonCreditMap[sub.key] : sub.isNonCredit;

                  return (
                    <div
                      key={sub.key}
                      className={`p-3 rounded-xl border transition-all ${
                        isNonCred
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-white border-slate-200 shadow-2xs'
                      }`}
                    >
                      {/* Top: Code + Non-Credit Badge */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono font-bold text-slate-900 text-xs">
                          {sub.code || '-'}
                        </span>
                        {isNonCred && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-800 border border-amber-200 font-bold">
                            Non-Credit
                          </span>
                        )}
                      </div>

                      {/* Middle: Subject Name */}
                      <p className="text-xs font-medium text-slate-800 mb-2.5 line-clamp-2 leading-relaxed">
                        {sub.name}
                      </p>

                      {/* Bottom: Credits Controls */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600">Credits:</span>
                          <label
                            className="inline-flex items-center space-x-1 text-[11px] text-slate-600 cursor-pointer select-none font-semibold"
                            title="Mark subject as Non-Credit / Audit"
                          >
                            <input
                              type="checkbox"
                              checked={isNonCred}
                              onChange={(e) => handleToggleNonCredit(sub.key, e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span>Non-Credit (NC)</span>
                          </label>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Direct Input */}
                          <div className="relative w-16 shrink-0">
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={isLocked}
                              value={currentVal}
                              onChange={(e) => handleCreditChange(sub.key, e.target.value)}
                              onClick={() => {
                                if (isLocked && onRequestUnlock) onRequestUnlock();
                              }}
                              placeholder="0"
                              className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center font-bold font-mono transition-colors ${
                                isLocked
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-pointer'
                                  : isNonCred
                                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                                  : currentVal
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-1 ring-emerald-300/50'
                                  : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none'
                              }`}
                            />
                          </div>

                          {/* Quick Options */}
                          <div className="flex items-center gap-1 flex-1 overflow-x-auto py-0.5">
                            {[
                              { label: '4', val: '4' },
                              { label: '3', val: '3' },
                              { label: '2', val: '2' },
                              { label: '1.5', val: '1.5' },
                              { label: '1', val: '1' },
                              { label: '0', val: '0' },
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => {
                                  handleCreditChange(sub.key, opt.val);
                                  if (opt.val === '0') {
                                    handleToggleNonCredit(sub.key, true);
                                  } else if (isNonCred) {
                                    handleToggleNonCredit(sub.key, false);
                                  }
                                }}
                                className={`px-2 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                                  currentVal === opt.val
                                    ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP / TABLET VIEW (>= 640px): Table layout */}
              <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-3 w-[130px] md:w-[140px] border-r border-slate-800">Subject Code</th>
                      <th className="px-3 py-3 border-r border-slate-800">Subject Name</th>
                      <th className="px-3 py-3 w-[310px] md:w-[340px] text-center">Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {subjectsList.map((sub, idx) => {
                      const currentVal = creditsMap[sub.key] !== undefined ? creditsMap[sub.key] : (sub.credits || '');
                      const isNonCred = nonCreditMap[sub.key] !== undefined ? nonCreditMap[sub.key] : sub.isNonCredit;

                      return (
                        <tr
                          key={sub.key}
                          className={`transition-colors ${
                            isNonCred ? 'bg-amber-50/40' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                          } hover:bg-indigo-50/30`}
                        >
                          {/* 1st Column: Subject Code */}
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900 border-r border-slate-100">
                            <div className="flex items-center space-x-1.5">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                                {sub.code || '-'}
                              </span>
                            </div>
                          </td>

                          {/* 2nd Column: Subject Name */}
                          <td className="px-3 py-2.5 font-medium text-slate-800 border-r border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="line-clamp-2" title={sub.name}>
                                {sub.name}
                              </span>
                              {isNonCred && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-800 border border-amber-200 font-bold shrink-0">
                                  Non-Credit
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3rd Column: Credits (Input Field + Preset Options) */}
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center space-x-1.5 md:space-x-2">
                              {/* Direct Number Input Field */}
                              <div className="relative w-16 md:w-20 shrink-0">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  disabled={isLocked}
                                  value={currentVal}
                                  onChange={(e) => handleCreditChange(sub.key, e.target.value)}
                                  onClick={() => {
                                    if (isLocked && onRequestUnlock) onRequestUnlock();
                                  }}
                                  placeholder="e.g. 4"
                                  className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center font-bold font-mono transition-colors ${
                                    isLocked
                                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-pointer'
                                      : isNonCred
                                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                                      : currentVal
                                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-1 ring-emerald-300/50'
                                      : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none'
                                  }`}
                                />
                              </div>

                              {/* Preset Options to fill the credits easily */}
                              <div className="flex items-center space-x-1">
                                {[
                                  { label: '4', val: '4' },
                                  { label: '3', val: '3' },
                                  { label: '2', val: '2' },
                                  { label: '1.5', val: '1.5' },
                                  { label: '1', val: '1' },
                                  { label: '0', val: '0' },
                                ].map((opt) => (
                                  <button
                                    key={opt.val}
                                    type="button"
                                    onClick={() => {
                                      handleCreditChange(sub.key, opt.val);
                                      if (opt.val === '0') {
                                        handleToggleNonCredit(sub.key, true);
                                      } else if (isNonCred) {
                                        handleToggleNonCredit(sub.key, false);
                                      }
                                    }}
                                    className={`px-1.5 md:px-2 py-1 rounded-md text-[10px] md:text-[11px] font-bold transition-all cursor-pointer ${
                                      currentVal === opt.val
                                        ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>

                              {/* Non-Credit Toggle Checkbox */}
                              <label
                                className="inline-flex items-center space-x-1 text-[10px] md:text-[11px] text-slate-500 ml-1 cursor-pointer select-none font-semibold shrink-0"
                                title="Mark subject as Non-Credit / Audit"
                              >
                                <input
                                  type="checkbox"
                                  checked={isNonCred}
                                  onChange={(e) => handleToggleNonCredit(sub.key, e.target.checked)}
                                  className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                />
                                <span>NC</span>
                              </label>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer Summary & Save */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-3.5 sm:px-5 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/90 gap-2.5 sm:gap-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium text-[11px] sm:text-xs">
                Subjects: <strong className="text-slate-900">{subjectsList.length}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-medium text-[11px] sm:text-xs">
                Total Credits:{' '}
                <strong className="text-emerald-700 font-bold font-mono text-xs sm:text-sm">
                  {totalCredits}
                </strong>
              </span>
            </div>
            {saveSuccessMsg && (
              <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold text-[11px] sm:text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-fade-in">
                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 justify-end">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg sm:rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || subjectsList.length === 0}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs font-semibold text-white shadow-xs transition-all duration-150 cursor-pointer active:scale-95 ${
                isLocked
                  ? 'bg-slate-400 hover:bg-slate-500'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{isLocked ? 'Unlock & Save' : 'Save Credits'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

