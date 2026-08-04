import React, { useState, useEffect } from 'react';
import { StudentRecord } from '../types';
import { Users, Lock, Unlock, Save, X, BookOpen, CheckCircle2 } from 'lucide-react';

interface FacultyMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: StudentRecord[];
  onSaveFacultyMapping: (updatedRecords: StudentRecord[]) => Promise<void> | void;
  isLocked: boolean;
  onRequestUnlock: () => void;
}

interface SubjectFacultyItem {
  key: string;
  code: string;
  name: string;
  facultyName: string;
  isNonCredit?: boolean;
}

export const FacultyMapModal: React.FC<FacultyMapModalProps> = ({
  isOpen,
  onClose,
  records,
  onSaveFacultyMapping,
  isLocked,
  onRequestUnlock,
}) => {
  const [facultyMap, setFacultyMap] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Extract unique subjects and initialize faculty map from current records
  const getUniqueSubjects = (): SubjectFacultyItem[] => {
    const subjectMap = new Map<string, SubjectFacultyItem>();

    records.forEach((rec) => {
      rec.subjects?.forEach((s) => {
        const code = (s.subjectCode || '').trim();
        const name = (s.subjectName || '').trim();
        if (!code && !name) return;

        const key = code ? code.toUpperCase() : name.toLowerCase();

        if (!subjectMap.has(key)) {
          subjectMap.set(key, {
            key,
            code,
            name,
            facultyName: s.facultyName || facultyMap[key] || '',
            isNonCredit: !!s.isNonCredit,
          });
        } else {
          const existing = subjectMap.get(key)!;
          if (s.facultyName && !existing.facultyName) {
            existing.facultyName = s.facultyName;
          }
          if (s.isNonCredit) {
            existing.isNonCredit = true;
          }
        }
      });
    });

    return Array.from(subjectMap.values());
  };

  const uniqueSubjects = getUniqueSubjects();

  // Load faculty names from records / local state whenever modal opens or records change
  useEffect(() => {
    if (isOpen) {
      const initialMap: { [key: string]: string } = {};
      
      // Load stored local mapping if available
      let localSaved: { [key: string]: string } = {};
      try {
        const stored = localStorage.getItem('smvcer_faculty_mapping');
        if (stored) {
          localSaved = JSON.parse(stored);
        }
      } catch (e) {}

      records.forEach((rec) => {
        rec.subjects?.forEach((s) => {
          const code = (s.subjectCode || '').trim();
          const name = (s.subjectName || '').trim();
          if (!code && !name) return;
          const key = code ? code.toUpperCase() : name.toLowerCase();
          
          if (s.facultyName) {
            initialMap[key] = s.facultyName;
          } else if (localSaved[key] && !initialMap[key]) {
            initialMap[key] = localSaved[key];
          }
        });
      });

      setFacultyMap(initialMap);
    }
  }, [isOpen, records]);

  if (!isOpen) return null;

  const handleFacultyChange = (key: string, value: string) => {
    if (isLocked) {
      onRequestUnlock();
      return;
    }
    setFacultyMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (isLocked) {
      onRequestUnlock();
      return;
    }

    setIsSaving(true);
    try {
      // Save faculty map to localStorage as backup
      try {
        localStorage.setItem('smvcer_faculty_mapping', JSON.stringify(facultyMap));
      } catch (e) {}

      // Update all student records' subjects with mapped faculty names
      const updatedRecords: StudentRecord[] = records.map((student) => {
        if (!student.subjects || student.subjects.length === 0) return student;

        const updatedSubjects = student.subjects.map((sub) => {
          const code = (sub.subjectCode || '').trim();
          const name = (sub.subjectName || '').trim();
          const key = code ? code.toUpperCase() : name.toLowerCase();

          const mappedFaculty = facultyMap[key] !== undefined ? facultyMap[key] : (sub.facultyName || '');

          return {
            ...sub,
            facultyName: mappedFaculty,
          };
        });

        return {
          ...student,
          subjects: updatedSubjects,
        };
      });

      await onSaveFacultyMapping(updatedRecords);
      onClose();
    } catch (error) {
      console.error('Error saving faculty mapping:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Map Faculty to Subjects</h2>
              <p className="text-xs text-slate-500">
                Assign faculty names to subjects. Saved mappings persist in database &amp; Portrait PDF reports.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Lock Banner if locked */}
        {isLocked && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>System is Locked:</strong> Enter password to unlock and edit faculty names.
              </span>
            </div>
            <button
              onClick={onRequestUnlock}
              className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock</span>
            </button>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {uniqueSubjects.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">No subjects found in uploaded records.</p>
              <p className="text-xs">Upload student marksheet screenshots first to map faculty.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-1/4 border-r border-slate-800">1st Col: Subject Code</th>
                    <th className="px-4 py-3 w-2/5 border-r border-slate-800">2nd Col: Subject Name</th>
                    <th className="px-4 py-3 w-1/3">3rd Col: Faculty Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {uniqueSubjects.map((sub, idx) => {
                    const currentFaculty = facultyMap[sub.key] !== undefined ? facultyMap[sub.key] : sub.facultyName;
                    
                    return (
                      <tr key={sub.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800 border-r border-slate-100">
                          {sub.code || '-'}
                          {sub.isNonCredit && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-900 rounded font-semibold">
                              Non-Credit
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 border-r border-slate-100">
                          {sub.name}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            disabled={isLocked}
                            value={currentFaculty}
                            onChange={(e) => handleFacultyChange(sub.key, e.target.value)}
                            onClick={() => {
                              if (isLocked) onRequestUnlock();
                            }}
                            placeholder={isLocked ? "Unlock to enter faculty name..." : "Enter Faculty Name..."}
                            className={`w-full px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                              isLocked
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-pointer hover:bg-slate-200/70'
                                : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none'
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/80">
          <span className="text-xs text-slate-500 font-medium">
            Total Unique Subjects: <strong>{uniqueSubjects.length}</strong>
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || uniqueSubjects.length === 0}
              className={`inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer ${
                isLocked
                  ? 'bg-slate-400 hover:bg-slate-500'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isLocked ? 'Unlock & Save' : 'Save Faculty Mapping'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
