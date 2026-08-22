import React, { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  ArrowUpDown,
  CheckCheck,
  Award,
  Layers,
  Filter,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { StudentRecord } from '../types';
import { sanitizeSubject, isSubjectPass, getDepartmentFromUsn, getAvailableSemesters } from '../utils/statusHelper';
import { fetchStudentRecordsFromFirestore } from '../lib/firebase';
import ExcelJS from 'exceljs';

interface EligibilityViewProps {
  records: StudentRecord[];
  userEmail?: string;
  onBackToMain: () => void;
  onSelectStudent?: (student: StudentRecord) => void;
}

export interface StudentEligibilityResult {
  usn: string;
  name: string;
  college: string;
  deptShort: string;
  sem1Name: string;
  sem1Credits: number;
  sem1MaxCredits: number;
  sem2Name: string;
  sem2Credits: number;
  sem2MaxCredits: number;
  totalCredits: number;
  totalMaxCredits: number;
  isEligible: boolean; // totalCredits > 23 (i.e. >= 24)
  matchedStudent?: StudentRecord;
}

export const EligibilityView: React.FC<EligibilityViewProps> = ({
  records: initialRecords,
  userEmail,
  onBackToMain,
  onSelectStudent,
}) => {
  // All combined records (may contain initialRecords plus any fetched semester records)
  const [allLoadedRecords, setAllLoadedRecords] = useState<StudentRecord[]>(initialRecords);
  const [isLoadingSems, setIsLoadingSems] = useState<boolean>(false);

  // Extract all available semesters across current loaded records
  const availableSemesters = useMemo(() => {
    const sems = getAvailableSemesters(allLoadedRecords).map((s) => s.replace(/^sem\s*/i, '').trim());
    const unique = Array.from(new Set<string>(sems)).filter(Boolean);
    if (unique.length === 0) {
      return ['1', '2', '3', '4', '5', '6', '7', '8'];
    }
    // Sort numerically
    return unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allLoadedRecords]);

  // Selected Semesters for comparison (defaults to empty: no semester preselected)
  const [sem1, setSem1] = useState<string>('');
  const [sem2, setSem2] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterEligibility, setFilterEligibility] = useState<'ALL' | 'ELIGIBLE' | 'NOT_ELIGIBLE'>('ALL');
  const [sortField, setSortField] = useState<'usn' | 'name' | 'totalCredits'>('usn');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Sync state if initial records update
  useEffect(() => {
    if (initialRecords && initialRecords.length > 0) {
      setAllLoadedRecords((prev) => {
        const map = new Map<string, StudentRecord>();
        prev.forEach((r) => map.set(r.id, r));
        initialRecords.forEach((r) => map.set(r.id, r));
        return Array.from(map.values());
      });
    }
  }, [initialRecords]);

  // Fetch full records from Firestore across selected semesters if user is authenticated
  useEffect(() => {
    if (!userEmail || (!sem1 && !sem2)) return;

    const fetchNeededSems = async () => {
      setIsLoadingSems(true);
      try {
        const promises: Promise<StudentRecord[] | null>[] = [];
        if (sem1) promises.push(fetchStudentRecordsFromFirestore(userEmail, sem1));
        if (sem2 && sem2 !== sem1) promises.push(fetchStudentRecordsFromFirestore(userEmail, sem2));

        const fetchedArrays = await Promise.all(promises);

        setAllLoadedRecords((prev) => {
          const map = new Map<string, StudentRecord>();
          prev.forEach((r) => map.set(r.id, r));
          fetchedArrays.forEach((arr) => {
            if (arr) arr.forEach((r) => map.set(r.id, r));
          });
          return Array.from(map.values());
        });
      } catch (err) {
        console.warn('Notice: Background semester fetch error in EligibilityView:', err);
      } finally {
        setIsLoadingSems(false);
      }
    };

    fetchNeededSems();
  }, [userEmail, sem1, sem2]);

  // Load custom local credits map if configured by user
  const localCreditsMap = useMemo(() => {
    let map: { [key: string]: string } = {};
    try {
      const stored = localStorage.getItem('smvcer_credits_mapping');
      if (stored) map = JSON.parse(stored);
    } catch (e) {}
    return map;
  }, []);

  // Helper to compute credits for a student record in a specific semester
  const calculateStudentSemCredits = (student: StudentRecord): { earned: number; max: number } => {
    let earned = 0;
    let max = 0;

    if (!student.subjects || !Array.isArray(student.subjects)) {
      return { earned, max };
    }

    student.subjects.forEach((rawSub) => {
      const sub = sanitizeSubject(rawSub);
      if (!sub || sub.isNonCredit) return;

      const code = (sub.subjectCode || '').trim().toUpperCase();
      const name = (sub.subjectName || '').trim().toLowerCase();
      const subKey = code || name;

      const creditStr = (sub.credits !== undefined && sub.credits !== null && String(sub.credits).trim() !== '')
        ? String(sub.credits).trim()
        : (localCreditsMap[subKey] || '');

      const creditNum = parseFloat(creditStr);
      if (!isNaN(creditNum) && creditNum > 0) {
        max += creditNum;
        if (isSubjectPass(sub)) {
          earned += creditNum;
        }
      }
    });

    return {
      earned: Math.round(earned * 100) / 100,
      max: Math.round(max * 100) / 100,
    };
  };

  // Build unified student list merged by normalized USN
  const eligibilityResults: StudentEligibilityResult[] = useMemo(() => {
    if (!sem1 && !sem2) return [];

    const normSem1 = sem1.trim().toLowerCase();
    const normSem2 = sem2.trim().toLowerCase();

    // Map USN -> { sem1Record, sem2Record, anyRecord }
    const studentMap = new Map<string, {
      usn: string;
      name: string;
      college: string;
      sem1Rec?: StudentRecord;
      sem2Rec?: StudentRecord;
      primaryRec: StudentRecord;
    }>();

    allLoadedRecords.forEach((rec) => {
      const usn = (rec.usn || '').trim().toUpperCase();
      if (!usn) return;

      const recSem = (rec.semester || '').replace(/^sem\s*/i, '').trim().toLowerCase();

      if (!studentMap.has(usn)) {
        studentMap.set(usn, {
          usn,
          name: rec.name || '',
          college: rec.college || '',
          primaryRec: rec,
        });
      }

      const entry = studentMap.get(usn)!;
      if (!entry.name && rec.name) entry.name = rec.name;
      if (!entry.college && rec.college) entry.college = rec.college;

      // Check if matches sem1
      if (
        normSem1 && (
          recSem === normSem1 ||
          recSem.includes(`sem ${normSem1}`) ||
          recSem.includes(`${normSem1}th`) ||
          recSem.includes(`${normSem1}st`) ||
          recSem.includes(`${normSem1}nd`) ||
          recSem.includes(`${normSem1}rd`)
        )
      ) {
        entry.sem1Rec = rec;
      }

      // Check if matches sem2
      if (
        normSem2 && (
          recSem === normSem2 ||
          recSem.includes(`sem ${normSem2}`) ||
          recSem.includes(`${normSem2}th`) ||
          recSem.includes(`${normSem2}st`) ||
          recSem.includes(`${normSem2}nd`) ||
          recSem.includes(`${normSem2}rd`)
        )
      ) {
        entry.sem2Rec = rec;
      }
    });

    const results: StudentEligibilityResult[] = [];

    studentMap.forEach((entry) => {
      const sem1Stats = entry.sem1Rec ? calculateStudentSemCredits(entry.sem1Rec) : { earned: 0, max: 0 };
      const sem2Stats = entry.sem2Rec ? calculateStudentSemCredits(entry.sem2Rec) : { earned: 0, max: 0 };

      // Combined total credits earned across both chosen semesters
      const totalEarned = Math.round((sem1Stats.earned + sem2Stats.earned) * 100) / 100;
      const totalMax = Math.round((sem1Stats.max + sem2Stats.max) * 100) / 100;

      // Rule: Above 23 credits (i.e. >= 24) => ELIGIBLE, otherwise NOT ELIGIBLE
      const isEligible = totalEarned > 23;

      const dept = getDepartmentFromUsn(entry.usn);

      results.push({
        usn: entry.usn,
        name: entry.name,
        college: entry.college,
        deptShort: dept?.short || '',
        sem1Name: `Sem ${sem1}`,
        sem1Credits: sem1Stats.earned,
        sem1MaxCredits: sem1Stats.max,
        sem2Name: `Sem ${sem2}`,
        sem2Credits: sem2Stats.earned,
        sem2MaxCredits: sem2Stats.max,
        totalCredits: totalEarned,
        totalMaxCredits: totalMax,
        isEligible,
        matchedStudent: entry.sem2Rec || entry.sem1Rec || entry.primaryRec,
      });
    });

    return results;
  }, [allLoadedRecords, sem1, sem2, localCreditsMap]);

  // Filtering & Sorting
  const filteredAndSortedList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return eligibilityResults
      .filter((item) => {
        const matchesSearch =
          !q ||
          item.usn.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.college.toLowerCase().includes(q);

        const matchesEligibility =
          filterEligibility === 'ALL' ||
          (filterEligibility === 'ELIGIBLE' && item.isEligible) ||
          (filterEligibility === 'NOT_ELIGIBLE' && !item.isEligible);

        return matchesSearch && matchesEligibility;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'usn') {
          cmp = a.usn.localeCompare(b.usn, undefined, { numeric: true });
        } else if (sortField === 'name') {
          cmp = a.name.localeCompare(b.name);
        } else if (sortField === 'totalCredits') {
          cmp = a.totalCredits - b.totalCredits;
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [eligibilityResults, searchQuery, filterEligibility, sortField, sortAsc]);

  // Metrics
  const totalCount = eligibilityResults.length;
  const eligibleCount = eligibilityResults.filter((r) => r.isEligible).length;
  const notEligibleCount = totalCount - eligibleCount;
  const eligiblePercentage = totalCount > 0 ? Math.round((eligibleCount / totalCount) * 1000) / 10 : 0;

  // Export to Excel using ExcelJS
  const handleExportExcel = async () => {
    if (filteredAndSortedList.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Eligibility Sem ${sem1}-${sem2}`);

    // Define columns
    worksheet.columns = [
      { header: 'S.No.', key: 'sno', width: 8 },
      { header: 'USN', key: 'usn', width: 16 },
      { header: 'Student Name', key: 'name', width: 28 },
      { header: `Sem ${sem1} Credits Earned`, key: 'sem1Credits', width: 22 },
      { header: `Sem ${sem2} Credits Earned`, key: 'sem2Credits', width: 22 },
      { header: `Total Credits Earned (Sem ${sem1} + Sem ${sem2})`, key: 'totalCredits', width: 32 },
      { header: 'Min Required Credits', key: 'minRequired', width: 20 },
      { header: 'Eligibility Status', key: 'status', width: 20 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    // Add Data Rows
    filteredAndSortedList.forEach((r, idx) => {
      const row = worksheet.addRow({
        sno: idx + 1,
        usn: r.usn,
        name: r.name || '-',
        sem1Credits: r.sem1Credits,
        sem2Credits: r.sem2Credits,
        totalCredits: r.totalCredits,
        minRequired: 24,
        status: r.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE',
      });

      row.alignment = { vertical: 'middle' };
      row.getCell('sno').alignment = { horizontal: 'center' };
      row.getCell('usn').alignment = { horizontal: 'center' };
      row.getCell('sem1Credits').alignment = { horizontal: 'center' };
      row.getCell('sem2Credits').alignment = { horizontal: 'center' };
      row.getCell('totalCredits').alignment = { horizontal: 'center' };
      row.getCell('minRequired').alignment = { horizontal: 'center' };
      row.getCell('status').alignment = { horizontal: 'center' };

      const statusCell = row.getCell('status');
      if (r.isEligible) {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1FAE5' },
        };
        statusCell.font = { bold: true, color: { argb: 'FF065F46' } };
      } else {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        };
        statusCell.font = { bold: true, color: { argb: 'FF991B1B' } };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SMVCER_Credit_Eligibility_Sem_${sem1}_and_${sem2}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Title & Back Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToMain}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <CheckCheck className="w-4.5 h-4.5 text-violet-600" />
                  <span>Credit Eligibility View</span>
                </h1>
                <span className="bg-violet-100 text-violet-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-200">
                  Threshold &gt; 23 Credits (Min 24)
                </span>
                {isLoadingSems && (
                  <span className="inline-flex items-center space-x-1 text-[11px] text-slate-400">
                    <RefreshCw className="w-3 h-3 animate-spin text-violet-600" />
                    <span>Syncing...</span>
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5">
                Automatically calculates cumulative credits earned across two selected semesters for student academic progression.
              </p>
            </div>
          </div>

          {/* Action Button: Download Excel */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportExcel}
              disabled={filteredAndSortedList.length === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all duration-150 shadow-xs cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>

        </div>

        {/* Dual Semester Selectors & Criteria Banner */}
        <div className="mt-3.5 grid grid-cols-2 md:grid-cols-12 gap-2 sm:gap-3 pt-3 border-t border-slate-100 items-center">
          
          {/* Semester 1 Selector */}
          <div className="col-span-1 md:col-span-4 bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200">
            <label className="block text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
              <span className="truncate">First Semester</span>
              <span className="text-violet-600 font-bold text-[9px] bg-violet-50 px-1.5 py-0.2 rounded shrink-0 ml-1">Sem 1</span>
            </label>
            <select
              value={sem1}
              onChange={(e) => setSem1(e.target.value)}
              className="w-full bg-white border border-slate-300 hover:border-violet-500 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer shadow-2xs"
            >
              <option value="">Select Semester</option>
              {availableSemesters.map((s) => (
                <option key={`view-sem1-${s}`} value={s}>
                  Semester {s}
                </option>
              ))}
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((s) => (
                !availableSemesters.includes(s) && (
                  <option key={`view-sem1-def-${s}`} value={s}>
                    Semester {s}
                  </option>
                )
              ))}
            </select>
          </div>

          {/* Semester 2 Selector */}
          <div className="col-span-1 md:col-span-4 bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200">
            <label className="block text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
              <span className="truncate">Second Semester</span>
              <span className="text-violet-600 font-bold text-[9px] bg-violet-50 px-1.5 py-0.2 rounded shrink-0 ml-1">Sem 2</span>
            </label>
            <select
              value={sem2}
              onChange={(e) => setSem2(e.target.value)}
              className="w-full bg-white border border-slate-300 hover:border-violet-500 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer shadow-2xs"
            >
              <option value="">Select Semester</option>
              {availableSemesters.map((s) => (
                <option key={`view-sem2-${s}`} value={s}>
                  Semester {s}
                </option>
              ))}
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((s) => (
                !availableSemesters.includes(s) && (
                  <option key={`view-sem2-def-${s}`} value={s}>
                    Semester {s}
                  </option>
                )
              ))}
            </select>
          </div>

          {/* Evaluation Criterion Info Box (Hidden on Mobile, Visible on md+) */}
          <div className="hidden md:flex md:col-span-4 bg-violet-50/80 border border-violet-200 p-2.5 rounded-xl items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-violet-800 uppercase block">
                Rule Check
              </span>
              <p className="text-[11px] text-violet-950 font-semibold">
                Credits ({sem1 ? `Sem ${sem1}` : 'Sem ?'} + {sem2 ? `Sem ${sem2}` : 'Sem ?'}) &gt; 23
              </p>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-500 uppercase block font-semibold">Pass Rate</span>
              <span className="text-sm font-extrabold text-emerald-600 font-mono">
                {eligiblePercentage}%
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* KPI Cards Row (2x2 on Mobile, 12-col layout on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-2.5">
        <div className="bg-white px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between col-span-1 lg:col-span-2">
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold leading-tight">Total Students Evaluated</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900">{totalCount}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono font-medium">
              {sem1 || sem2 ? `Sem ${sem1 || '-'} & ${sem2 || '-'}` : 'No Sem Selected'}
            </span>
          </div>
        </div>

        <div className="bg-emerald-50/70 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between col-span-1 lg:col-span-3">
          <span className="text-[10px] sm:text-[11px] text-emerald-800 font-semibold leading-tight flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Eligible Students (&gt; 23 Cr)</span>
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg sm:text-xl font-extrabold text-emerald-700">{eligibleCount}</span>
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 font-mono">{eligiblePercentage}%</span>
          </div>
        </div>

        <div className="bg-rose-50/70 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between col-span-1 lg:col-span-3">
          <span className="text-[10px] sm:text-[11px] text-rose-800 font-semibold leading-tight flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Not Eligible Students (&le; 23 Cr)</span>
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg sm:text-xl font-extrabold text-rose-700">{notEligibleCount}</span>
            <span className="text-[10px] sm:text-[11px] font-bold text-rose-600 font-mono">
              {totalCount > 0 ? (Math.round((notEligibleCount / totalCount) * 1000) / 10) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between col-span-1 lg:col-span-4">
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold leading-tight">Vertical Progression Cutoff</span>
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between mt-1 gap-1">
            <span className="text-[11px] sm:text-xs md:text-sm font-bold text-slate-800 whitespace-nowrap">&ge; 24 Credits Earned</span>
            <span className="px-1.5 sm:px-2 py-0.5 bg-violet-100 text-violet-800 text-[9px] sm:text-[10px] font-bold rounded">VTU Norm</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by USN or Student Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs shrink-0">
          <button
            onClick={() => setFilterEligibility('ALL')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              filterEligibility === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilterEligibility('ELIGIBLE')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              filterEligibility === 'ELIGIBLE'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Eligible ({eligibleCount})
          </button>
          <button
            onClick={() => setFilterEligibility('NOT_ELIGIBLE')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              filterEligibility === 'NOT_ELIGIBLE'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            Not Eligible ({notEligibleCount})
          </button>
        </div>

      </div>

      {/* Main Eligibility Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredAndSortedList.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              {!sem1 && !sem2 ? 'Please Select Semesters' : 'No Student Records Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {!sem1 && !sem2
                ? 'Choose two semesters from the dropdowns above to evaluate cumulative credit eligibility.'
                : `No students match the current search query or filter for ${sem1 ? `Semester ${sem1}` : ''}${sem1 && sem2 ? ' and ' : ''}${sem2 ? `Semester ${sem2}` : ''}.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold">
                  <th className="py-3 px-3.5 w-12 text-center">#</th>
                  <th
                    onClick={() => {
                      if (sortField === 'usn') setSortAsc(!sortAsc);
                      else {
                        setSortField('usn');
                        setSortAsc(true);
                      }
                    }}
                    className="py-3 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>USN</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (sortField === 'name') setSortAsc(!sortAsc);
                      else {
                        setSortField('name');
                        setSortAsc(true);
                      }
                    }}
                    className="py-3 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Student Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-center bg-slate-800">
                    {sem1 ? `Sem ${sem1} Credits Earned` : 'First Sem Credits'}
                  </th>
                  <th className="py-3 px-3.5 text-center bg-slate-800">
                    {sem2 ? `Sem ${sem2} Credits Earned` : 'Second Sem Credits'}
                  </th>
                  <th
                    onClick={() => {
                      if (sortField === 'totalCredits') setSortAsc(!sortAsc);
                      else {
                        setSortField('totalCredits');
                        setSortAsc(false);
                      }
                    }}
                    className="py-3 px-3.5 text-center cursor-pointer hover:bg-slate-800 transition-colors bg-slate-800/90"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Total Earned ({sem1 && sem2 ? `Sem ${sem1} + Sem ${sem2}` : 'Combined'})</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-center">Eligibility Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white font-medium">
                {filteredAndSortedList.map((item, idx) => {
                  return (
                    <tr
                      key={`eligibility-table-row-${item.usn}`}
                      onClick={() => {
                        if (item.matchedStudent && onSelectStudent) {
                          onSelectStudent(item.matchedStudent);
                        }
                      }}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        !item.isEligible ? 'bg-rose-50/25' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {item.usn}
                      </td>
                      <td className="py-3 px-3.5 text-slate-800 font-semibold">
                        {item.name || '-'}
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold text-slate-700">
                        <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 font-mono">
                          {item.sem1Credits}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold text-slate-700">
                        <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 font-mono">
                          {item.sem2Credits}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg font-extrabold font-mono text-xs ${
                          item.isEligible
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {item.totalCredits} Credits
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {item.isEligible ? (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ELIGIBLE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold shadow-2xs">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>NOT ELIGIBLE</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Showing <strong>{filteredAndSortedList.length}</strong> of <strong>{totalCount}</strong> students
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span>Click on any student row to view complete subject grade card</span>
          </div>
        </div>

      </div>

    </div>
  );
};
