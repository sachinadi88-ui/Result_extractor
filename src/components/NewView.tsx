import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Layers,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  BookOpen,
  Sparkles,
  School
} from 'lucide-react';
import { StudentRecord } from '../types';
import { isStudentPass, isSubjectPass, getEffectiveStatus, getDepartmentFromUsn, getStudentTotalMarks } from '../utils/statusHelper';

function formatClearedDate(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

interface NewViewProps {
  records: StudentRecord[];
  onBackToMain: () => void;
  onExportPDF?: () => void;
  onExportPDFLandscape?: () => void;
  onExportExcel?: () => void;
  onSelectStudent?: (student: StudentRecord) => void;
}

export const NewView: React.FC<NewViewProps> = ({
  records,
  onBackToMain,
  onExportPDF,
  onExportPDFLandscape,
  onExportExcel,
  onSelectStudent,
}) => {
  const [usnSearchQuery, setUsnSearchQuery] = useState<string>('');
  const [expandedUsn, setExpandedUsn] = useState<string | null>(null);
  const [expandedSemMap, setExpandedSemMap] = useState<Record<string, string | null>>({});

  // Group records by Semester
  const semesterBreakdown = useMemo(() => {
    const semMap = new Map<string, {
      semester: string;
      students: StudentRecord[];
      passCount: number;
      failCount: number;
      totalMarksSum: number;
      validMarksCount: number;
      topScorer: { student: StudentRecord; score: number } | null;
      subjectsMap: Map<string, { code: string; isNonCredit: boolean }>;
    }>();

    records.forEach((rec) => {
      const semKey = (rec.semester || 'Unassigned').trim();
      if (!semMap.has(semKey)) {
        semMap.set(semKey, {
          semester: semKey,
          students: [],
          passCount: 0,
          failCount: 0,
          totalMarksSum: 0,
          validMarksCount: 0,
          topScorer: null,
          subjectsMap: new Map(),
        });
      }

      const item = semMap.get(semKey)!;
      item.students.push(rec);

      const isPass = isStudentPass(rec);
      if (isPass) item.passCount += 1;
      else item.failCount += 1;

      const mInfo = getStudentTotalMarks(rec);
      if (mInfo.hasValid) {
        item.totalMarksSum += mInfo.sum;
        item.validMarksCount += 1;
        if (!item.topScorer || mInfo.sum > item.topScorer.score) {
          item.topScorer = { student: rec, score: mInfo.sum };
        }
      }

      if (rec.subjects && Array.isArray(rec.subjects)) {
        rec.subjects.forEach((s) => {
          if (s.subjectCode) {
            const rawCode = s.subjectCode.trim();
            const key = rawCode.toUpperCase();
            const isNC = !!(s.isNonCredit || s.credits === '0' || (s.credits && s.credits.toLowerCase().includes('non')));
            if (!item.subjectsMap.has(key)) {
              item.subjectsMap.set(key, { code: rawCode, isNonCredit: isNC });
            } else if (isNC) {
              item.subjectsMap.get(key)!.isNonCredit = true;
            }
          }
        });
      }
    });

    return Array.from(semMap.values()).map((s) => {
      const total = s.students.length;
      const passRate = total > 0 ? Math.round((s.passCount / total) * 1000) / 10 : 0;
      const avgScore = s.validMarksCount > 0 ? Math.round((s.totalMarksSum / s.validMarksCount) * 10) / 10 : 0;
      const subjectList = Array.from(s.subjectsMap.values());
      const nonCreditCount = subjectList.filter((sub) => sub.isNonCredit).length;

      return {
        ...s,
        total,
        passRate,
        avgScore,
        subjectList,
        nonCreditCount,
      };
    }).sort((a, b) => a.semester.localeCompare(b.semester, undefined, { numeric: true }));
  }, [records]);

  // Group records by USN for Consolidated Multi-Semester Profiles
  const consolidatedUsnProfiles = useMemo(() => {
    const usnMap = new Map<string, {
      usn: string;
      name: string;
      college?: string;
      department?: { short: string; long: string } | null;
      records: StudentRecord[];
      overallPass: boolean;
      totalSubjectsCount: number;
    }>();

    records.forEach((rec) => {
      const cleanUsn = (rec.usn || 'NO-USN').trim().toUpperCase();
      if (!usnMap.has(cleanUsn)) {
        usnMap.set(cleanUsn, {
          usn: cleanUsn,
          name: rec.name || 'Unknown Student',
          college: rec.college,
          department: getDepartmentFromUsn(cleanUsn),
          records: [],
          overallPass: true,
          totalSubjectsCount: 0,
        });
      }

      const prof = usnMap.get(cleanUsn)!;
      prof.records.push(rec);
      if (!isStudentPass(rec)) {
        prof.overallPass = false;
      }
      prof.totalSubjectsCount += rec.subjects?.length || 0;
    });

    // Sort student records inside each profile by semester
    usnMap.forEach((prof) => {
      prof.records.sort((a, b) => (a.semester || '').localeCompare(b.semester || '', undefined, { numeric: true }));
    });

    return Array.from(usnMap.values());
  }, [records]);

  // Filter USN profiles
  const filteredProfiles = useMemo(() => {
    const q = usnSearchQuery.trim().toLowerCase();
    if (!q) return consolidatedUsnProfiles;
    return consolidatedUsnProfiles.filter((p) =>
      p.usn.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.college && p.college.toLowerCase().includes(q))
    );
  }, [consolidatedUsnProfiles, usnSearchQuery]);

  // Global Multi-Sem metrics
  const totalStudentsCount = records.length;
  const overallPassRate = totalStudentsCount > 0
    ? Math.round((records.filter(isStudentPass).length / totalStudentsCount) * 1000) / 10
    : 0;

  const toggleSemExpand = (usn: string, recId: string) => {
    setExpandedSemMap((prev) => ({
      ...prev,
      [usn]: prev[usn] === recId ? null : recId,
    }));
  };

  return (
    <div className="w-full flex flex-col space-y-6 animate-fade-in pb-12">
      
      {/* View Header / Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Comparative Semester Analytics
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-extrabold uppercase tracking-wide">
                Multi-Sem Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare pass rates across semesters, explore consolidated USN profiles, and export comparison reports.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onExportPDF && (
            <button
              onClick={() => onExportPDF()}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>PDF Report</span>
            </button>
          )}

          {onExportPDFLandscape && (
            <button
              onClick={() => onExportPDFLandscape()}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Landscape PDF</span>
            </button>
          )}

          {onExportExcel && (
            <button
              onClick={() => onExportExcel()}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel Export</span>
            </button>
          )}

          <button
            onClick={onBackToMain}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-300 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Main Results Table</span>
          </button>
        </div>
      </div>

      {/* Top Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Semesters</p>
            <p className="text-2xl font-black text-slate-900">{semesterBreakdown.length}</p>
            <p className="text-[10px] text-slate-500">{totalStudentsCount} Marksheet Records</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Pass Rate</p>
            <p className="text-2xl font-black text-emerald-600">{overallPassRate}%</p>
            <p className="text-[10px] text-slate-500">Across all uploaded semesters</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unique Students (USNs)</p>
            <p className="text-2xl font-black text-slate-900">{consolidatedUsnProfiles.length}</p>
            <p className="text-[10px] text-slate-500">Consolidated USN Profiles</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Performing Sem</p>
            {semesterBreakdown.length > 0 ? (
              (() => {
                const bestSem = [...semesterBreakdown].sort((a, b) => b.passRate - a.passRate)[0];
                return (
                  <>
                    <p className="text-xl font-black text-amber-700 truncate">Sem {bestSem.semester}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">{bestSem.passRate}% Pass Rate</p>
                  </>
                );
              })()
            ) : (
              <p className="text-sm font-bold text-slate-400">N/A</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: COMPARATIVE SEMESTER BREAKDOWN GRID */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Semester-Wise Pass Rates & Metrics Comparison
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Side-by-side semester comparison
          </span>
        </div>

        {semesterBreakdown.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No semester data available. Upload marksheets with semester information to view comparative statistics.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {semesterBreakdown.map((sem) => {
              const isHighPass = sem.passRate >= 75;
              const isMidPass = sem.passRate >= 50 && sem.passRate < 75;

              return (
                <div
                  key={sem.semester}
                  className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-3 hover:border-indigo-300 transition-colors shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-black text-xs">
                        Sem {sem.semester.replace(/^sem\s*/i, '')}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {sem.total} Student{sem.total > 1 ? 's' : ''}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full font-black text-xs ${
                      isHighPass
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : isMidPass
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {sem.passRate}% Pass
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Pass / Fail Ratio</span>
                      <span>{sem.passCount} Pass | {sem.failCount} Fail</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${sem.passRate}%` }}
                      />
                      <div
                        className="bg-red-400 h-full transition-all duration-500"
                        style={{ width: `${100 - sem.passRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Key Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[10px] block font-medium">Average Total Score</span>
                      <span className="font-bold text-slate-800">{sem.avgScore > 0 ? `${sem.avgScore} Mks` : 'N/A'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[10px] block font-medium">Subjects Logged</span>
                      <div className="flex items-baseline space-x-1.5 flex-wrap">
                        <span className="font-bold text-slate-800">{sem.subjectList.length} Subjects</span>
                        <span className={`text-[10px] ${sem.nonCreditCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-400 font-medium'}`}>
                          {sem.nonCreditCount > 0 ? `(${sem.nonCreditCount} Non-Credit)` : '(0 Non-Credit)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Scorer Pill */}
                  {sem.topScorer && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-[11px] flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-bold text-emerald-900 truncate">{sem.topScorer.student.name}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-800 shrink-0 ml-1">
                        {sem.topScorer.score} Mks
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: CONSOLIDATED STUDENT USN PROFILES (MULTI-SEM ACCORDION) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Consolidated Student USN Profiles
              </h3>
              <p className="text-xs text-slate-500">
                Multi-semester student transcripts grouped by Register Number / USN
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search USN, Name or College..."
              value={usnSearchQuery}
              onChange={(e) => setUsnSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-2xs transition-colors"
            />
          </div>
        </div>

        {filteredProfiles.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No matching student USN profile found for query &ldquo;{usnSearchQuery}&rdquo;.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProfiles.map((prof) => {
              const isUsnExpanded = expandedUsn === prof.usn;
              const activeSemRecId = expandedSemMap[prof.usn] || (prof.records[0]?.id || null);

              return (
                <div
                  key={prof.usn}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs hover:border-indigo-200 transition-all"
                >
                  {/* Student USN Profile Header Bar */}
                  <div
                    onClick={() => setExpandedUsn(isUsnExpanded ? null : prof.usn)}
                    className="p-3.5 sm:p-4 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors select-none"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="p-2 rounded-xl bg-slate-900 text-white font-mono font-black text-xs shadow-2xs shrink-0">
                        {prof.usn}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-slate-900 truncate">{prof.name}</h4>
                          {prof.department && (
                            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200">
                              {prof.department.short}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {prof.college || 'Institution'} • {prof.records.length} Semester{prof.records.length > 1 ? 's' : ''} Uploaded
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                        prof.overallPass
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {prof.overallPass ? 'ALL PASS' : 'CONTAINS FAILS'}
                      </span>
                      {isUsnExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Multi-Sem Accordion Body */}
                  {isUsnExpanded && (
                    <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Semester Marksheets ({prof.records.length})
                      </p>

                      <div className="space-y-2">
                        {prof.records.map((rec) => {
                          const isSemExpanded = activeSemRecId === rec.id;
                          const isPass = isStudentPass(rec);
                          const marksInfo = getStudentTotalMarks(rec);

                          return (
                            <div
                              key={rec.id}
                              className={`border rounded-lg overflow-hidden transition-all ${
                                isSemExpanded
                                  ? 'border-indigo-400 bg-white ring-2 ring-indigo-100'
                                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                              }`}
                            >
                              <div
                                onClick={() => toggleSemExpand(prof.usn, rec.id)}
                                className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none text-xs"
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-extrabold text-[11px]">
                                    Sem {rec.semester || 'N/A'}
                                  </span>
                                  <span className="font-bold text-slate-800">
                                    {rec.examination || 'Semester Examination'}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {isPass ? 'PASS' : 'FAIL'}
                                  </span>
                                  <span className="font-bold text-slate-700">
                                    {marksInfo.hasValid ? `${marksInfo.sum} Marks` : '-'}
                                  </span>
                                  {isSemExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                              </div>

                              {/* Semester Detailed Subjects Table */}
                              {isSemExpanded && (
                                <div className="p-3 bg-white border-t border-slate-100 space-y-3">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                    <div>
                                      <span className="text-slate-400 block font-medium">SGPA</span>
                                      <span className="font-bold text-slate-900">{rec.sgpa || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block font-medium">CGPA</span>
                                      <span className="font-bold text-slate-900">{rec.cgpa || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block font-medium">Subjects Count</span>
                                      <span className="font-bold text-slate-900">{rec.subjects?.length || 0}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block font-medium">Uploaded Date</span>
                                      <span className="font-medium text-slate-700">
                                        {new Date(rec.uploadedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Subjects Table */}
                                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-xs text-left text-slate-700">
                                      <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                                        <tr>
                                          <th className="px-3 py-2">Subject Code</th>
                                          <th className="px-3 py-2">Subject Name</th>
                                          <th className="px-3 py-2">Internal</th>
                                          <th className="px-3 py-2">External</th>
                                          <th className="px-3 py-2">Total</th>
                                          <th className="px-3 py-2 text-center">Result</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200">
                                        {rec.subjects?.map((sub, idx) => {
                                          const subPass = isSubjectPass(sub);
                                          return (
                                            <tr key={idx} className="hover:bg-slate-50/80">
                                              <td className="px-3 py-2 font-mono font-bold text-slate-900">
                                                {sub.subjectCode || '-'}
                                              </td>
                                              <td className="px-3 py-2 font-medium">
                                                {sub.subjectName}
                                                {sub.isNonCredit && (
                                                  <span className="ml-1 text-[10px] text-amber-600 font-bold">* Non-Credit</span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 font-mono">{sub.internalMarks || '-'}</td>
                                              <td className="px-3 py-2 font-mono">{sub.externalMarks || '-'}</td>
                                              <td className="px-3 py-2 font-mono font-bold text-slate-900">
                                                {sub.totalMarks || '-'}
                                              </td>
                                              <td className="px-3 py-2 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold inline-flex items-center gap-1 ${
                                                  subPass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                  <span>{sub.result}</span>
                                                  {sub.clearedAt && (
                                                    <span
                                                      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#dc2626] text-white text-[9px] font-serif font-bold italic cursor-help shrink-0"
                                                      title={`Updated/Cleared from ${sub.previousResult || 'FAIL'} to PASS on ${formatClearedDate(sub.clearedAt)}`}
                                                    >
                                                      i
                                                    </span>
                                                  )}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {onSelectStudent && (
                                    <div className="text-right pt-1">
                                      <button
                                        onClick={() => onSelectStudent(rec)}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                                      >
                                        Open Full Record Modal
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
