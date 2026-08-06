import React, { useState, useMemo } from 'react';
import { X, Search, BookOpen, Percent, Users, CheckCircle, AlertCircle, Trophy, Award, Crown, Sparkles, ChevronDown, ChevronUp, Layers, Info } from 'lucide-react';
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
  const [collapsedSemKeys, setCollapsedSemKeys] = useState<Record<string, boolean>>({});

  // Top 3 students who scored highest (only passed students)
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

  // Group subject statistics semester-wise
  const semesterGroups = useMemo(() => {
    const groupsMap = new Map<string, {
      semKey: string;
      semNumberDisplay: string;
      records: StudentRecord[];
      statsMap: Map<string, {
        subjectCode: string;
        subjectName: string;
        totalStudents: number;
        totalPass: number;
        totalFail: number;
        isNonCredit: boolean;
      }>;
    }>();

    records.forEach((student) => {
      const semRaw = (student.semester || '').trim();
      const semKey = semRaw ? semRaw.toLowerCase().replace(/^sem\s*/i, '') : 'unassigned';
      const semNumberDisplay = semRaw ? semRaw.replace(/^sem\s*/i, '') : 'Unassigned';

      if (!groupsMap.has(semKey)) {
        groupsMap.set(semKey, {
          semKey,
          semNumberDisplay,
          records: [],
          statsMap: new Map(),
        });
      }

      const group = groupsMap.get(semKey)!;
      group.records.push(student);

      if (student.subjects && Array.isArray(student.subjects)) {
        student.subjects.forEach((sub) => {
          if (!sub || !sub.subjectName) return;
          const code = (sub.subjectCode || '').trim();
          const name = (sub.subjectName || '').trim();
          const isNC = !!(sub.isNonCredit || sub.credits === '0' || (sub.credits && sub.credits.toLowerCase().includes('non')));
          const key = code ? `${code.toUpperCase()}::${name.toUpperCase()}` : name.toUpperCase();

          const isPass = isSubjectPass(sub);

          if (!group.statsMap.has(key)) {
            group.statsMap.set(key, {
              subjectCode: code,
              subjectName: name,
              totalStudents: 0,
              totalPass: 0,
              totalFail: 0,
              isNonCredit: isNC,
            });
          } else if (isNC) {
            group.statsMap.get(key)!.isNonCredit = true;
          }

          const current = group.statsMap.get(key)!;
          current.totalStudents += 1;
          if (isPass) {
            current.totalPass += 1;
          } else {
            current.totalFail += 1;
          }
        });
      }
    });

    return Array.from(groupsMap.values())
      .map((grp) => {
        const subjectStatsList = Array.from(grp.statsMap.values()).map((stat) => {
          const passPct = stat.totalStudents > 0 ? (stat.totalPass / stat.totalStudents) * 100 : 0;
          return {
            ...stat,
            passPercentage: Math.round(passPct * 10) / 10,
          };
        });

        const totalStudentsCount = grp.records.length;
        const passStudentsCount = grp.records.filter(r => isStudentPass(r)).length;
        const semPassPct = totalStudentsCount > 0 ? Math.round((passStudentsCount / totalStudentsCount) * 100) : 0;
        const nonCreditCount = subjectStatsList.filter(s => s.isNonCredit).length;

        // Calculate Top 3 Students for this specific semester
        const semTopStudents = grp.records
          .map((student) => {
            const totalInfo = getStudentTotalMarks(student);
            return {
              student,
              sum: totalInfo.sum,
              display: totalInfo.display,
              hasValid: totalInfo.hasValid,
            };
          })
          .filter((item) => item.hasValid && isStudentPass(item.student))
          .sort((a, b) => b.sum - a.sum)
          .slice(0, 3);

        return {
          semKey: grp.semKey,
          semNumberDisplay: grp.semNumberDisplay,
          studentsCount: totalStudentsCount,
          passStudentsCount,
          failStudentsCount: totalStudentsCount - passStudentsCount,
          semPassPct,
          subjectStatsList,
          nonCreditCount,
          semTopStudents,
        };
      })
      .sort((a, b) => a.semNumberDisplay.localeCompare(b.semNumberDisplay, undefined, { numeric: true }));
  }, [records]);

  // Total subjects across all semester groups
  const totalSubjectsAll = useMemo(() => {
    return semesterGroups.reduce((acc, grp) => acc + grp.subjectStatsList.length, 0);
  }, [semesterGroups]);

  // Filter subject statistics based on search query
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return semesterGroups;

    return semesterGroups
      .map((group) => {
        const filteredSubjects = group.subjectStatsList.filter(
          (stat) =>
            stat.subjectCode.toLowerCase().includes(query) ||
            stat.subjectName.toLowerCase().includes(query)
        );
        return {
          ...group,
          subjectStatsList: filteredSubjects,
        };
      })
      .filter((group) => group.subjectStatsList.length > 0);
  }, [semesterGroups, searchQuery]);

  // Total subjects shown after filtering
  const totalSubjectsFiltered = useMemo(() => {
    return filteredGroups.reduce((acc, grp) => acc + grp.subjectStatsList.length, 0);
  }, [filteredGroups]);

  const toggleSemGroup = (semKey: string) => {
    setCollapsedSemKeys((prev) => ({
      ...prev,
      [semKey]: !prev[semKey],
    }));
  };

  const isGroupExpanded = (semKey: string) => {
    // If user is searching, force open all matching groups
    if (searchQuery.trim().length > 0) return true;
    return !collapsedSemKeys[semKey];
  };

  const toggleExpandAll = () => {
    const allCollapsed = semesterGroups.every((g) => collapsedSemKeys[g.semKey]);
    if (allCollapsed) {
      setCollapsedSemKeys({});
    } else {
      const nextCollapsed: Record<string, boolean> = {};
      semesterGroups.forEach((g) => {
        nextCollapsed[g.semKey] = true;
      });
      setCollapsedSemKeys(nextCollapsed);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-indigo-100 flex items-center justify-between bg-indigo-50 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-2xs shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-base font-bold text-slate-900 truncate">Subject Performance & Pass Rate Status</h3>
              <p className="text-[10px] sm:text-[11px] text-indigo-700 font-semibold opacity-90 truncate">
                Semester-wise analysis aggregated from {records.length} student record(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-900 hover:bg-indigo-100/85 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Search Bar & Accordion Controls */}
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 shrink-0">
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
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-[10px] sm:text-[11px] text-slate-500 font-medium shrink-0">
            <span>Showing {totalSubjectsFiltered} of {totalSubjectsAll} subjects</span>
            {semesterGroups.length > 1 && (
              <button
                onClick={toggleExpandAll}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer text-[10px] sm:text-[11px]"
              >
                <Layers className="w-3 h-3 text-indigo-600" />
                <span>
                  {semesterGroups.every((g) => collapsedSemKeys[g.semKey]) ? 'Expand All' : 'Collapse All'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 sm:space-y-4">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-10 sm:py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-medium">No subject statistics found</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                {records.length === 0 ? "Upload student records first to see statistics." : "Try adjusting your search query."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {filteredGroups.map((grp) => {
                const expanded = isGroupExpanded(grp.semKey);

                return (
                  <div
                    key={grp.semKey}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs transition-all"
                  >
                    {/* Semester Accordion Header */}
                    <div
                      onClick={() => toggleSemGroup(grp.semKey)}
                      className="w-full flex items-center justify-between p-2.5 sm:p-3.5 bg-slate-50 hover:bg-indigo-50/40 border-b border-slate-200 cursor-pointer select-none transition-colors gap-2"
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                        <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-slate-900 text-white font-black text-[11px] sm:text-xs font-mono shrink-0 shadow-2xs">
                          {grp.semNumberDisplay !== 'Unassigned' ? `Sem ${grp.semNumberDisplay}` : 'Unassigned'}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 text-xs truncate">
                              {grp.studentsCount} Student{grp.studentsCount !== 1 ? 's' : ''}
                            </span>
                            <span className="text-slate-300 hidden sm:inline">•</span>
                            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                              {grp.subjectStatsList.length} Subject{grp.subjectStatsList.length !== 1 ? 's' : ''}
                              {grp.nonCreditCount > 0 && (
                                <span className="ml-1 text-amber-600 font-bold">
                                  ({grp.nonCreditCount} NC)
                                </span>
                              )}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            Ratio: <strong className="text-emerald-700">{grp.passStudentsCount} Pass</strong> | <strong className="text-red-600">{grp.failStudentsCount} Fail</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
                        <span
                          className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold border ${
                            grp.semPassPct >= 75
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : grp.semPassPct >= 40
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          {grp.semPassPct}% Pass
                        </span>
                        <div className="p-0.5 sm:p-1 text-slate-400 hover:text-slate-700">
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Semester Subjects Table & Toppers (Expanded) */}
                    {expanded && (
                      <div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="px-3 sm:px-4 py-2 min-w-[180px] sm:min-w-[220px] border-r border-slate-200">Subject Information</th>
                                <th className="px-2 sm:px-4 py-2 text-center min-w-[80px] sm:min-w-[100px] border-r border-slate-200">
                                  <div className="flex items-center justify-center space-x-1">
                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Students</span>
                                  </div>
                                </th>
                                <th className="px-2 sm:px-4 py-2 text-center min-w-[80px] sm:min-w-[100px] border-r border-slate-200">
                                  <div className="flex items-center justify-center space-x-1 text-emerald-600">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Pass</span>
                                  </div>
                                </th>
                                <th className="px-2 sm:px-4 py-2 text-center min-w-[80px] sm:min-w-[100px] border-r border-slate-200">
                                  <div className="flex items-center justify-center space-x-1 text-[#DC2626]">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>Fail</span>
                                  </div>
                                </th>
                                <th className="px-2 sm:px-4 py-2 text-center min-w-[80px] sm:min-w-[100px]">
                                  <div className="flex items-center justify-center space-x-1 text-emerald-700">
                                    <Percent className="w-3.5 h-3.5" />
                                    <span>Pass %</span>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {grp.subjectStatsList.map((stat, idx) => {
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
                                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                    {/* Subject Info */}
                                    <td className="px-3 sm:px-4 py-2 border-r border-slate-100">
                                      <div className="flex flex-col gap-0.5 max-w-[360px]">
                                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                          {stat.subjectCode && (
                                            <span className="font-mono font-extrabold text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-sm uppercase">
                                              {stat.subjectCode}
                                            </span>
                                          )}
                                          {stat.isNonCredit && (
                                            <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 rounded">
                                              * Non-Credit
                                            </span>
                                          )}
                                        </div>
                                        <span className="font-semibold text-slate-800 leading-snug break-words">
                                          {stat.subjectName}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Total Students */}
                                    <td className="px-2 sm:px-4 py-2 text-center font-bold text-slate-700 border-r border-slate-100">
                                      {stat.totalStudents}
                                    </td>

                                    {/* Total Pass */}
                                    <td className="px-2 sm:px-4 py-2 text-center font-extrabold text-emerald-700 border-r border-slate-100 bg-emerald-50/10">
                                      {stat.totalPass}
                                    </td>

                                    {/* Total Fail */}
                                    <td className="px-2 sm:px-4 py-2 text-center font-extrabold text-red-600 border-r border-slate-100 bg-red-50/10">
                                      {stat.totalFail}
                                    </td>

                                    {/* Pass % */}
                                    <td className="px-2 sm:px-4 py-2 text-center font-mono">
                                      <span className={`inline-flex items-center font-extrabold text-xs px-2 py-0.5 rounded-full border ${pctBg} ${pctBorder}`}>
                                        {stat.passPercentage}%
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Top Scorers for this semester inside accordion */}
                        {grp.semTopStudents.length > 0 && (
                          <div className="p-2.5 sm:p-3 bg-indigo-50/30 border-t border-slate-200">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center space-x-1.5 min-w-0">
                                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 uppercase tracking-tight truncate">
                                  Top Scorers — {grp.semNumberDisplay !== 'Unassigned' ? `Sem ${grp.semNumberDisplay}` : 'Unassigned Sem'}
                                </span>
                              </div>
                              <span 
                                className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-white/90 border border-slate-200/80 px-1.5 py-0.5 rounded font-medium shrink-0 cursor-help"
                                title="Only students with overall PASS status are eligible for toppers"
                              >
                                <Info className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="hidden xs:inline">Only PASS students eligible</span>
                                <span className="xs:hidden">PASS only</span>
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {grp.semTopStudents.map((item, idx) => {
                                const rankThemes = [
                                  {
                                    rowBg: 'bg-amber-50/80 border-amber-200 text-amber-950',
                                    badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
                                    icon: <Crown className="w-3.5 h-3.5 text-amber-600" />,
                                    label: '1st Rank',
                                  },
                                  {
                                    rowBg: 'bg-indigo-50/80 border-indigo-200 text-indigo-950',
                                    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
                                    icon: <Award className="w-3.5 h-3.5 text-indigo-600" />,
                                    label: '2nd Rank',
                                  },
                                  {
                                    rowBg: 'bg-emerald-50/80 border-emerald-200 text-emerald-950',
                                    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                                    icon: <Sparkles className="w-3.5 h-3.5 text-emerald-600" />,
                                    label: '3rd Rank',
                                  },
                                ];
                                const theme = rankThemes[idx] || rankThemes[2];

                                return (
                                  <div
                                    key={item.student.id || idx}
                                    className={`flex items-center justify-between p-2 rounded-lg border ${theme.rowBg} text-xs shadow-3xs gap-2 min-w-0`}
                                  >
                                    <div className="flex items-center space-x-2 min-w-0">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border shrink-0 flex items-center gap-1 ${theme.badgeBg}`}>
                                        {theme.icon}
                                        {theme.label}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="font-bold text-xs truncate leading-tight">{item.student.name}</p>
                                        <p className="text-[10px] font-mono opacity-80 truncate">{item.student.usn}</p>
                                      </div>
                                    </div>
                                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-white/90 border border-slate-200 shrink-0">
                                      {item.display}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Top Performing Students Section (Semester-Wise Cards) */}
          {semesterGroups.some((g) => g.semTopStudents.length > 0) && (
            <div className="mt-5 sm:mt-6 border-t border-slate-200 pt-4 sm:pt-5 shrink-0 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight uppercase">
                    Top Performing Students (Semester-Wise)
                  </h3>
                </div>
                <div 
                  className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-600 bg-slate-100/90 border border-slate-200/90 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium cursor-help shadow-2xs self-start sm:self-auto max-w-full"
                  title="Only students with overall PASS status are eligible for toppers"
                >
                  <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Only overall <strong>PASS</strong> students eligible</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                {semesterGroups.map((grp) => {
                  if (grp.semTopStudents.length === 0) return null;

                  return (
                    <div key={grp.semKey} className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 sm:p-3.5 space-y-2 sm:space-y-2.5 shadow-3xs">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-black text-[10px] font-mono shrink-0 shadow-2xs">
                            {grp.semNumberDisplay !== 'Unassigned' ? `Sem ${grp.semNumberDisplay}` : 'Unassigned'}
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate">
                            Top Scorers
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold shrink-0">
                          {grp.passStudentsCount} Passed Student{grp.passStudentsCount !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="space-y-1.5 sm:space-y-2">
                        {grp.semTopStudents.map((item, idx) => {
                          const rankThemes = [
                            {
                              rowBg: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200',
                              badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
                              textColor: 'text-amber-950',
                              subTextColor: 'text-amber-700',
                              valColor: 'text-amber-900',
                              icon: <Crown className="w-3.5 h-3.5 text-amber-600" />,
                              label: '1st Rank',
                            },
                            {
                              rowBg: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200',
                              badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
                              textColor: 'text-indigo-950',
                              subTextColor: 'text-indigo-700',
                              valColor: 'text-indigo-900',
                              icon: <Award className="w-3.5 h-3.5 text-indigo-600" />,
                              label: '2nd Rank',
                            },
                            {
                              rowBg: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200',
                              badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                              textColor: 'text-emerald-950',
                              subTextColor: 'text-emerald-700',
                              valColor: 'text-emerald-900',
                              icon: <Sparkles className="w-3.5 h-3.5 text-emerald-600" />,
                              label: '3rd Rank',
                            },
                          ];

                          const theme = rankThemes[idx] || rankThemes[2];

                          return (
                            <div
                              key={item.student.id || idx}
                              className={`flex items-center justify-between p-2 sm:p-2.5 rounded-lg border ${theme.rowBg} transition-colors gap-2 shadow-3xs min-w-0`}
                            >
                              <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
                                <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] font-extrabold border shrink-0 ${theme.badgeBg}`}>
                                  {theme.icon}
                                  {theme.label}
                                </span>
                                <div className="min-w-0">
                                  <h4 className={`text-xs font-black truncate leading-tight ${theme.textColor}`}>
                                    {item.student.name}
                                  </h4>
                                  <p className={`text-[10px] font-mono font-bold truncate ${theme.subTextColor}`}>
                                    USN: {item.student.usn}
                                  </p>
                                </div>
                              </div>

                              <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md bg-white/90 border border-slate-200 shrink-0 ${theme.valColor}`}>
                                {item.display}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 text-[10px] sm:text-[11px] text-slate-500 shrink-0">
          <p className="leading-tight">
            * Note: Absent (AB/A) or withheld status values are automatically evaluated as failures.
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-3xs transition-colors cursor-pointer text-center shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

