import React, { useState, useMemo } from 'react';
import { X, Search, BookOpen, Percent, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { StudentRecord } from '../types';
import { isSubjectPass } from '../utils/statusHelper';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: StudentRecord[];
}

export const StatusModal: React.FC<StatusModalProps> = ({
  isOpen,
  onClose,
  records,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate subject statistics
  const subjectStatsList = useMemo(() => {
    const statsMap = new Map<string, {
      subjectCode: string;
      subjectName: string;
      totalStudents: number;
      totalPass: number;
      totalFail: number;
    }>();

    records.forEach((student) => {
      if (student.subjects && Array.isArray(student.subjects)) {
        student.subjects.forEach((sub) => {
          if (!sub || !sub.subjectName) return;
          const code = (sub.subjectCode || '').trim();
          const name = (sub.subjectName || '').trim();
          // Group by unique code and/or name
          const key = code ? `${code.toUpperCase()}::${name.toUpperCase()}` : name.toUpperCase();

          const isPass = isSubjectPass(sub);

          if (!statsMap.has(key)) {
            statsMap.set(key, {
              subjectCode: code,
              subjectName: name,
              totalStudents: 0,
              totalPass: 0,
              totalFail: 0,
            });
          }

          const current = statsMap.get(key)!;
          current.totalStudents += 1;
          if (isPass) {
            current.totalPass += 1;
          } else {
            current.totalFail += 1;
          }
        });
      }
    });

    return Array.from(statsMap.values()).map((stat) => {
      const passPct = stat.totalStudents > 0 ? (stat.totalPass / stat.totalStudents) * 100 : 0;
      return {
        ...stat,
        passPercentage: Math.round(passPct * 10) / 10, // Round to 1 decimal place
      };
    });
  }, [records]);

  // Filter based on search query
  const filteredStats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return subjectStatsList;
    return subjectStatsList.filter(
      (stat) =>
        stat.subjectCode.toLowerCase().includes(query) ||
        stat.subjectName.toLowerCase().includes(query)
    );
  }, [subjectStatsList, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Subject Performance & Pass Rate Status</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Analysis aggregated from {records.length} active student record(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar / Filters */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by subject code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-slate-800 transition-all shadow-2xs outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-500 font-medium shrink-0">
            <span>Showing {filteredStats.length} of {subjectStatsList.length} subjects</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredStats.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
              <p className="text-xs text-slate-600 font-medium">No subject statistics found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {records.length === 0 ? "Upload student records first to see statistics." : "Try adjusting your search query."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-3xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 min-w-[200px] border-r border-slate-100">Subject Information</th>
                    <th className="px-4 py-3 text-center min-w-[100px] border-r border-slate-100">
                      <div className="flex items-center justify-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Total Students</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center min-w-[100px] border-r border-slate-100">
                      <div className="flex items-center justify-center space-x-1 text-emerald-600">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Total Pass</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center min-w-[100px] border-r border-slate-100">
                      <div className="flex items-center justify-center space-x-1 text-[#DC2626]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Total Fail</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center min-w-[100px]">
                      <div className="flex items-center justify-center space-x-1 text-emerald-700">
                        <Percent className="w-3.5 h-3.5" />
                        <span>Pass %</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStats.map((stat, idx) => {
                    // Determine percentage color styling
                    let pctBg = 'bg-emerald-50 text-emerald-800';
                    let pctBorder = 'border-emerald-200';
                    if (stat.passPercentage < 40) {
                      pctBg = 'bg-red-50 text-red-800';
                      pctBorder = 'border-red-200';
                    } else if (stat.passPercentage < 75) {
                      pctBg = 'bg-amber-50 text-amber-800';
                      pctBorder = 'border-amber-200';
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        {/* Column 1: Subject Code & Name */}
                        <td className="px-4 py-3.5 border-r border-slate-100">
                          <div className="flex flex-col gap-0.5 max-w-[340px]">
                            {stat.subjectCode && (
                              <span className="font-mono font-extrabold text-[11px] text-emerald-800 bg-emerald-50/80 border border-emerald-100 px-1.5 py-0.5 rounded-sm w-fit uppercase">
                                {stat.subjectCode}
                              </span>
                            )}
                            <span className="font-semibold text-slate-800 leading-snug break-words">
                              {stat.subjectName}
                            </span>
                          </div>
                        </td>

                        {/* Column 2: Total Students */}
                        <td className="px-4 py-3.5 text-center font-bold text-slate-700 border-r border-slate-100">
                          {stat.totalStudents}
                        </td>

                        {/* Column 3: Total Pass */}
                        <td className="px-4 py-3.5 text-center font-extrabold text-emerald-700 border-r border-slate-100 bg-emerald-50/10">
                          {stat.totalPass}
                        </td>

                        {/* Column 4: Total Fail */}
                        <td className="px-4 py-3.5 text-center font-extrabold text-red-600 border-r border-slate-100 bg-red-50/10">
                          {stat.totalFail}
                        </td>

                        {/* Column 5: Pass Percentage */}
                        <td className="px-4 py-3.5 text-center font-mono">
                          <span className={`inline-flex items-center font-extrabold text-xs px-2.5 py-1 rounded-full border ${pctBg} ${pctBorder}`}>
                            {stat.passPercentage}%
                          </span>
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
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <p>
            * Note: Absent (AB/A) or withheld status values are automatically evaluated as failures.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-3xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
