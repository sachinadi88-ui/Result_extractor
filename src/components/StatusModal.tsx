import React, { useState, useMemo } from 'react';
import { X, Search, BookOpen, Percent, Users, CheckCircle, AlertCircle, Trophy, Award, Crown, Sparkles } from 'lucide-react';
import { StudentRecord } from '../types';
import { isSubjectPass, getStudentTotalMarks, isStudentPass } from '../utils/statusHelper';

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

  // Get top 3 students who scored highest (only passed students)
  const topStudents = useMemo(() => {
    return [...records]
      .map(student => {
        const totalInfo = getStudentTotalMarks(student);
        return {
          student,
          sum: totalInfo.sum,
          display: totalInfo.display,
          hasValid: totalInfo.hasValid
        };
      })
      .filter(item => item.hasValid && isStudentPass(item.student))
      .sort((a, b) => b.sum - a.sum)
      .slice(0, 3);
  }, [records]);

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
        <div className="p-4 sm:p-5 border-b border-indigo-100 flex items-center justify-between bg-indigo-50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-2xs shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Subject Performance & Pass Rate Status</h3>
              <p className="text-[11px] text-indigo-700 font-semibold opacity-90">
                Analysis aggregated from {records.length} active student record(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-900 hover:bg-indigo-100/85 transition-colors cursor-pointer shrink-0"
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
                    <th className="px-4 py-1.5 min-w-[200px] border-r border-slate-100">Subject Information</th>
                    <th className="px-4 py-1.5 text-center min-w-[100px] border-r border-slate-100">
                      <div className="flex items-center justify-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Total Students</span>
                      </div>
                    </th>
                    <th className="px-4 py-1.5 text-center min-w-[100px] border-r border-slate-100">
                      <div className="flex items-center justify-center space-x-1 text-emerald-600">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Total Pass</span>
                      </div>
                    </th>
                    <th className="px-4 py-1.5 text-center min-w-[100px] border-r border-slate-100">
                      <div className="flex items-center justify-center space-x-1 text-[#DC2626]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Total Fail</span>
                      </div>
                    </th>
                    <th className="px-4 py-1.5 text-center min-w-[100px]">
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
                        <td className="px-4 py-1 border-r border-slate-100">
                          <div className="flex flex-col gap-0.5 max-w-[340px]">
                            {stat.subjectCode && (
                              <span className="font-mono font-extrabold text-[10px] text-emerald-800 bg-emerald-50/80 border border-emerald-100 px-1.5 py-0.2 rounded-sm w-fit uppercase">
                                {stat.subjectCode}
                              </span>
                            )}
                            <span className="font-semibold text-slate-800 leading-snug break-words">
                              {stat.subjectName}
                            </span>
                          </div>
                        </td>

                        {/* Column 2: Total Students */}
                        <td className="px-4 py-1 text-center font-bold text-slate-700 border-r border-slate-100">
                          {stat.totalStudents}
                        </td>

                        {/* Column 3: Total Pass */}
                        <td className="px-4 py-1 text-center font-extrabold text-emerald-700 border-r border-slate-100 bg-emerald-50/10">
                          {stat.totalPass}
                        </td>

                        {/* Column 4: Total Fail */}
                        <td className="px-4 py-1 text-center font-extrabold text-red-600 border-r border-slate-100 bg-red-50/10">
                          {stat.totalFail}
                        </td>

                        {/* Column 5: Pass Percentage */}
                        <td className="px-4 py-1 text-center font-mono">
                          <span className={`inline-flex items-center font-extrabold text-xs px-2.5 py-0.5 rounded-full border ${pctBg} ${pctBorder}`}>
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

          {/* Top Performing Students Section */}
          {topStudents.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-5 shrink-0">
              <div className="flex items-center space-x-2 mb-3.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight uppercase">
                  Top Performing Students (Top 3 Scorers)
                </h3>
              </div>
              
              <div className="flex flex-col gap-2.5">
                {topStudents.map((item, idx) => {
                  const rankThemes = [
                    {
                      rowBg: 'bg-amber-50/60 hover:bg-amber-50 border-amber-200/80',
                      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
                      textColor: 'text-amber-900',
                      subTextColor: 'text-amber-700',
                      valColor: 'text-amber-900',
                      icon: <Crown className="w-4 h-4 text-amber-600" />,
                      label: '1st Place'
                    },
                    {
                      rowBg: 'bg-indigo-50/60 hover:bg-indigo-50 border-indigo-200/80',
                      badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                      textColor: 'text-indigo-900',
                      subTextColor: 'text-indigo-700',
                      valColor: 'text-indigo-900',
                      icon: <Award className="w-4 h-4 text-indigo-600" />,
                      label: '2nd Place'
                    },
                    {
                      rowBg: 'bg-emerald-50/60 hover:bg-emerald-50 border-emerald-200/80',
                      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      textColor: 'text-emerald-900',
                      subTextColor: 'text-emerald-700',
                      valColor: 'text-emerald-900',
                      icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
                      label: '3rd Place'
                    }
                  ];

                  const theme = rankThemes[idx] || rankThemes[2];

                  return (
                    <div
                      key={item.student.id || idx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border ${theme.rowBg} transition-all duration-150 shadow-3xs gap-2 sm:gap-4`}
                    >
                      {/* Left: Rank & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${theme.badgeBg}`}>
                          {theme.icon}
                          {theme.label}
                        </span>
                        <div className="min-w-0">
                          <h4 className={`text-xs font-black truncate leading-tight ${theme.textColor}`}>
                            {item.student.name}
                          </h4>
                          <p className={`text-[10px] font-mono font-bold mt-0.5 truncate tracking-wider ${theme.subTextColor}`}>
                            USN: {item.student.usn}
                          </p>
                        </div>
                      </div>

                      {/* Right: Score */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Marks:</span>
                        <span className={`text-xs font-black font-mono px-2.5 py-1 rounded-lg bg-white/70 border border-black/5 ${theme.valColor}`}>
                          {item.display}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
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
