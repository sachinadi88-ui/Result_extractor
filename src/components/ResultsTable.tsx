import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Sparkles,
  Upload,
  LayoutList,
  Grid,
  Table as TableIcon,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal
} from 'lucide-react';
import { StudentRecord, SubjectResult } from '../types';
import { isSubjectPass, isStudentPass, getEffectiveStatus } from '../utils/statusHelper';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface ResultsTableProps {
  records: StudentRecord[];
  onSelectStudent: (student: StudentRecord) => void;
  onDeleteStudent: (id: string) => void;
  onOpenUpload: () => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  records,
  onSelectStudent,
  onDeleteStudent,
  onOpenUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'row-summary' | 'matrix' | 'cards'>('matrix');
  const [copiedUsn, setCopiedUsn] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'usn' | 'name' | 'uploadedAt'>('usn');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [deletingStudent, setDeletingStudent] = useState<StudentRecord | null>(null);

  const handleCopyUsn = (usn: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(usn);
    setCopiedUsn(usn);
    setTimeout(() => setCopiedUsn(null), 2000);
  };

  // Filter records
  const filteredRecords = records.filter((rec) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      rec.usn?.toLowerCase().includes(query) ||
      rec.name?.toLowerCase().includes(query) ||
      rec.college?.toLowerCase().includes(query) ||
      rec.subjects?.some(
        (s) =>
          (s.subjectName || '').toLowerCase().includes(query) ||
          (s.subjectCode || '').toLowerCase().includes(query) ||
          (s.result || '').toLowerCase().includes(query)
      );

    const isPass = isStudentPass(rec);
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PASS' && isPass) ||
      (statusFilter === 'FAIL' && !isPass);

    return matchesQuery && matchesStatus;
  });

  // Sort records
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (sortField === 'uploadedAt') {
      valA = a.uploadedAt;
      valB = b.uploadedAt;
    }
    const cmp = valA.toString().localeCompare(valB.toString());
    return sortAsc ? cmp : -cmp;
  });

  // Calculate dynamic maximum subject count for matrix view
  const maxSubjects = records.reduce((max, r) => Math.max(max, r.subjects ? r.subjects.length : 0), 0);

  // Sync horizontal scrolling refs for Matrix view
  const topScrollRef = useRef<HTMLDivElement>(null);
  const matrixTableScrollRef = useRef<HTMLDivElement>(null);
  const matrixTableRef = useRef<HTMLTableElement>(null);
  const [matrixTableWidth, setMatrixTableWidth] = useState<number>(0);
  const isSyncingScroll = useRef<boolean>(false);

  useEffect(() => {
    if (viewMode !== 'matrix') return;

    const updateWidth = () => {
      if (matrixTableRef.current) {
        setMatrixTableWidth(matrixTableRef.current.scrollWidth);
      } else if (matrixTableScrollRef.current) {
        setMatrixTableWidth(matrixTableScrollRef.current.scrollWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (matrixTableRef.current) {
      observer.observe(matrixTableRef.current);
    }
    if (matrixTableScrollRef.current) {
      observer.observe(matrixTableScrollRef.current);
    }

    return () => observer.disconnect();
  }, [viewMode, records, searchQuery, statusFilter, sortField, sortAsc]);

  const handleTopScroll = () => {
    if (isSyncingScroll.current) return;
    if (topScrollRef.current && matrixTableScrollRef.current) {
      isSyncingScroll.current = true;
      matrixTableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  };

  const handleMatrixTableScroll = () => {
    if (isSyncingScroll.current) return;
    if (topScrollRef.current && matrixTableScrollRef.current) {
      isSyncingScroll.current = true;
      topScrollRef.current.scrollLeft = matrixTableScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  };

  // Mouse drag panning handlers for Matrix view
  const isMouseDown = useRef<boolean>(false);
  const startX = useRef<number>(0);
  const scrollLeftStart = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, a, select')) return;
    isMouseDown.current = true;
    isDragging.current = false;
    startX.current = e.clientX;
    if (matrixTableScrollRef.current) {
      scrollLeftStart.current = matrixTableScrollRef.current.scrollLeft;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current || !matrixTableScrollRef.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 5) {
      isDragging.current = true;
    }
    if (isDragging.current) {
      matrixTableScrollRef.current.scrollLeft = scrollLeftStart.current - dx;
    }
  };

  const handleMouseUp = () => {
    isMouseDown.current = false;
    setTimeout(() => {
      isDragging.current = false;
    }, 50);
  };

  const scrollMatrixLeft = () => {
    if (matrixTableScrollRef.current) {
      matrixTableScrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollMatrixRight = () => {
    if (matrixTableScrollRef.current) {
      matrixTableScrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  if (records.length === 0) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-10 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
          <GraduationCap className="w-9 h-9" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">No Student Results Extracted Yet</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Upload a screenshot of any student mark sheet or VTU result card to extract USN, Name, and subject-wise results automatically.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Screenshot</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search USN, Name, Subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-xs transition-colors"
          />
        </div>

        {/* Filter & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('PASS')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'PASS' ? 'bg-emerald-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pass
            </button>
            <button
              onClick={() => setStatusFilter('FAIL')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'FAIL' ? 'bg-red-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fail
            </button>
          </div>

          {/* View Toggles */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('matrix')}
              title="Expanded Subject Columns Matrix"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'matrix' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('row-summary')}
              title="Standard Single Row Table View"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'row-summary' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              title="Card View"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'cards' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* VIEW MODE 1: Standard Single-Row Table */}
      {viewMode === 'row-summary' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th
                    className="px-4 py-3.5 w-36 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => {
                      if (sortField === 'usn') setSortAsc(!sortAsc);
                      else { setSortField('usn'); setSortAsc(true); }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>USN</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3.5 w-48 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => {
                      if (sortField === 'name') setSortAsc(!sortAsc);
                      else { setSortField('name'); setSortAsc(true); }
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Student Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-4 py-3.5">
                    <span>Subjects (Column 1) &amp; Results (Next Column)</span>
                  </th>
                  <th className="px-4 py-3.5 w-28 text-center">
                    <span>Overall Status</span>
                  </th>
                  <th className="px-4 py-3.5 w-24 text-right">
                    <span>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRecords.map((student) => {
                  const isPass = isStudentPass(student);
                  const displayStatus = getEffectiveStatus(student);

                  return (
                    <tr
                      key={student.id}
                      onClick={() => onSelectStudent(student)}
                      className={`transition-all duration-150 cursor-pointer group hover:shadow-md relative ${
                        !isPass
                          ? 'bg-amber-50/30 hover:bg-amber-200/80 border-b border-amber-200/60'
                          : 'hover:bg-emerald-200/70 border-b border-slate-100'
                      }`}
                    >
                      {/* USN Column */}
                      <td className="px-4 py-4 align-top font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2 py-1 rounded bg-emerald-50 group-hover:bg-white text-emerald-700 border border-emerald-200 transition-colors">
                            {student.usn || 'N/A'}
                          </span>
                          <button
                            onClick={(e) => handleCopyUsn(student.usn, e)}
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy USN"
                          >
                            {copiedUsn === student.usn ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Student Name Column */}
                      <td className="px-4 py-4 align-top font-semibold text-slate-900">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-950 transition-colors">{student.name}</div>
                        {student.college && (
                          <div className="text-[11px] text-slate-500 mt-0.5 font-normal truncate max-w-[180px]">
                            {student.college}
                          </div>
                        )}
                        {student.semester && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {student.semester}
                          </div>
                        )}
                      </td>

                      {/* Subjects & Results Column */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-wrap gap-2 max-w-3xl">
                          {student.subjects && student.subjects.length > 0 ? (
                            student.subjects.map((s, idx) => {
                              const subPass = isSubjectPass(s);
                              const hasMarks = s.internalMarks || s.externalMarks || s.totalMarks;

                              return (
                                <div
                                  key={idx}
                                  className={`inline-flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-2.5 py-1.5 rounded-lg text-xs border transition-all duration-150 group-hover:scale-[1.01] ${
                                    subPass
                                      ? 'bg-white border-slate-200 text-slate-800 group-hover:border-emerald-300 group-hover:shadow-xs'
                                      : 'bg-red-50 border-red-200 text-red-900 group-hover:bg-red-100 group-hover:border-red-300'
                                  }`}
                                >
                                  <span className="font-bold text-slate-900">
                                    {s.subjectCode ? `${s.subjectCode}: ` : ''}{s.subjectName}
                                  </span>

                                  {hasMarks && (
                                    <div className="inline-flex items-center space-x-1.5 text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 shadow-2xs">
                                      {s.internalMarks && <span><strong className="text-slate-400 font-sans text-[10px]">INT:</strong> {s.internalMarks}</span>}
                                      {s.internalMarks && s.externalMarks && <span className="text-slate-300">|</span>}
                                      {s.externalMarks && <span><strong className="text-slate-400 font-sans text-[10px]">EXT:</strong> {s.externalMarks}</span>}
                                      {(s.internalMarks || s.externalMarks) && s.totalMarks && <span className="text-slate-300">|</span>}
                                      {s.totalMarks && <span><strong className="text-slate-400 font-sans text-[10px]">TOT:</strong> <strong className="text-slate-900 font-bold">{s.totalMarks}</strong></span>}
                                    </div>
                                  )}

                                  <span
                                    className={`font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wide self-start sm:self-auto ${
                                      subPass
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : 'bg-red-600 text-white font-black'
                                    }`}
                                  >
                                    {s.result}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-slate-400 italic">No subject data extracted</span>
                          )}
                        </div>
                      </td>

                      {/* Overall Status Column */}
                      <td className="px-4 py-4 align-top text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isPass
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {isPass ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                          )}
                          <span>{displayStatus}</span>
                        </span>
                        {student.sgpa && (
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            SGPA: <span className="font-bold text-slate-800">{student.sgpa}</span>
                          </div>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-4 py-4 align-top text-right">
                        <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectStudent(student)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                            title="View / Edit details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingStudent(student)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>Displaying {sortedRecords.length} student record(s)</span>
            <span className="font-medium text-slate-600">Double click or select row to inspect OCR source</span>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Column Matrix View */}
      {viewMode === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
          {/* Matrix Top Control & Pan Bar - Sticky below main nav header */}
          <div className="sticky top-[65px] z-40 bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center space-x-2.5 rounded-t-xl shadow-2xs">
            <button
              type="button"
              onClick={scrollMatrixLeft}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs transition-colors shrink-0 cursor-pointer flex items-center space-x-1 text-xs font-semibold"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Left</span>
            </button>

            <div
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="flex-1 overflow-x-auto overflow-y-hidden py-1 cursor-ew-resize scrollbar-thin"
              title="Scroll or drag horizontally"
            >
              <div style={{ width: matrixTableWidth ? `${matrixTableWidth}px` : '100%' }} className="h-2 min-w-full bg-slate-300 rounded-full" />
            </div>

            <button
              type="button"
              onClick={scrollMatrixRight}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs transition-colors shrink-0 cursor-pointer flex items-center space-x-1 text-xs font-semibold"
              title="Scroll Right"
            >
              <span className="hidden sm:inline">Right</span>
              <ChevronRight className="w-4 h-4 text-emerald-600" />
            </button>

            <span className="text-[11px] text-slate-600 font-medium shrink-0 hidden md:inline-flex items-center space-x-1 px-2 py-1 bg-slate-200/80 rounded border border-slate-300/80">
              <MoveHorizontal className="w-3.5 h-3.5 text-slate-600" />
              <span>Pan Table</span>
            </span>
          </div>

          <div
            ref={matrixTableScrollRef}
            onScroll={handleMatrixTableScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="overflow-x-auto relative cursor-grab active:cursor-grabbing select-none"
          >
            <table ref={matrixTableRef} className="w-full text-xs text-left text-slate-700 border-collapse">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[12px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-1 py-2 w-[38px] min-w-[38px] max-w-[38px] text-center relative md:sticky left-auto md:left-0 z-20 bg-slate-100 border-r border-slate-200 shadow-none md:shadow-[3px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    S.N.
                  </th>
                  <th className="px-1.5 py-2 w-[110px] min-w-[110px] max-w-[110px] relative md:sticky left-auto md:left-[38px] z-20 bg-slate-100 border-r border-slate-200 shadow-none md:shadow-[3px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    USN
                  </th>
                  <th className="px-2 py-2 w-[150px] min-w-[150px] max-w-[150px] relative md:sticky left-auto md:left-[148px] z-20 bg-slate-100 border-r border-slate-300 shadow-none md:shadow-[3px_0_5px_-2px_rgba(0,0,0,0.12)]">
                    Student Name
                  </th>
                  {Array.from({ length: maxSubjects }).map((_, i) => (
                    <th key={i} className="px-3 py-2 w-[180px] min-w-[180px] max-w-[180px] border-r border-slate-200">
                      Subject #{i + 1}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center min-w-[90px]">Status</th>
                  <th className="px-3 py-2 text-right min-w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRecords.map((student, index) => {
                  const isPass = isStudentPass(student);
                  const displayStatus = getEffectiveStatus(student);

                  return (
                    <tr
                      key={student.id}
                      onClick={() => {
                        if (isDragging.current) return;
                        onSelectStudent(student);
                      }}
                      className={`group cursor-pointer transition-all duration-150 relative hover:shadow-md ${
                        !isPass
                          ? 'bg-amber-50/50 hover:bg-amber-200/80 border-b border-amber-200/60'
                          : 'hover:bg-emerald-200/70 border-b border-slate-100'
                      }`}
                    >
                      <td className={`px-1 py-1.5 w-[38px] min-w-[38px] max-w-[38px] text-center relative md:sticky left-auto md:left-0 z-10 font-mono text-slate-600 text-[11px] font-semibold border-r border-slate-200 shadow-none md:shadow-[3px_0_5px_-2px_rgba(0,0,0,0.1)] truncate transition-colors ${
                        !isPass ? 'bg-amber-100 group-hover:bg-amber-200' : 'bg-white group-hover:bg-emerald-100'
                      }`}>
                        {index + 1}
                      </td>
                      <td className={`px-1.5 py-1.5 w-[110px] min-w-[110px] max-w-[110px] relative md:sticky left-auto md:left-[38px] z-10 font-mono font-bold text-emerald-800 text-[13px] border-r border-slate-200 shadow-none md:shadow-[3px_0_5px_-2px_rgba(0,0,0,0.1)] truncate transition-colors ${
                        !isPass ? 'bg-amber-100 group-hover:bg-amber-200' : 'bg-white group-hover:bg-emerald-100'
                      }`}>
                        {student.usn}
                      </td>
                      <td className={`px-2 py-1.5 w-[150px] min-w-[150px] max-w-[150px] relative md:sticky left-auto md:left-[148px] z-10 font-semibold text-slate-900 text-[12px] border-r border-slate-300 shadow-none md:shadow-[3px_0_5px_-2px_rgba(0,0,0,0.12)] whitespace-normal break-words leading-tight transition-colors ${
                        !isPass ? 'bg-amber-100 group-hover:bg-amber-200' : 'bg-white group-hover:bg-emerald-100'
                      }`}>
                        {student.name}
                      </td>
                      {Array.from({ length: maxSubjects }).map((_, i) => {
                        const sub = student.subjects?.[i];
                        if (!sub) {
                          return <td key={i} className="px-3 py-1.5 text-slate-400 text-[10px] italic border-r border-slate-100/60 w-[180px] min-w-[180px] max-w-[180px]">-</td>;
                        }
                        const pass = isSubjectPass(sub);
                        return (
                          <td key={i} className="px-2 py-1.5 border-r border-slate-100/80 w-[180px] min-w-[180px] max-w-[180px]">
                            <div className="p-1.5 rounded-lg border border-transparent transition-all duration-150 group-hover:bg-white group-hover:border-slate-200 group-hover:shadow-2xs">
                              <div className="font-bold text-slate-900 text-[11px] truncate max-w-[164px] leading-tight" title={sub.subjectName}>
                                {sub.subjectCode ? `${sub.subjectCode} ` : ''}{sub.subjectName}
                              </div>
                              {(sub.internalMarks || sub.externalMarks || sub.totalMarks) && (
                                <div className="text-[10px] text-slate-600 font-mono leading-tight mt-0.5">
                                  Int: <span className="font-semibold">{sub.internalMarks || '-'}</span> | Ext: <span className="font-semibold">{sub.externalMarks || '-'}</span> | Tot: <strong className="text-slate-900 font-bold">{sub.totalMarks || '-'}</strong>
                                </div>
                              )}
                              <div className={`font-bold text-[10px] leading-tight mt-0.5 ${pass ? 'text-emerald-700' : 'text-red-700 font-black'}`}>
                                Result: {sub.result}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectStudent(student)}
                            className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                            title="View / Edit details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingStudent(student)}
                            className="p-1 rounded-lg bg-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sticky Bottom Horizontal Scrollbar & Footer Bar */}
          <div className="sticky bottom-0 z-30 bg-slate-50/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 shadow-xs flex items-center justify-between text-xs text-slate-500 rounded-b-xl">
            <span className="font-medium text-slate-600">
              Displaying {sortedRecords.length} student record(s) • Click & drag or use Left/Right buttons to pan table
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={scrollMatrixLeft}
                className="px-2 py-1 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer text-xs font-medium flex items-center space-x-1"
                title="Scroll Left"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>Left</span>
              </button>
              <button
                type="button"
                onClick={scrollMatrixRight}
                className="px-2 py-1 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer text-xs font-medium flex items-center space-x-1"
                title="Scroll Right"
              >
                <span>Right</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: Cards Grid View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedRecords.map((student) => {
            const isPass = isStudentPass(student);
            const displayStatus = getEffectiveStatus(student);

            return (
              <div
                key={student.id}
                onClick={() => onSelectStudent(student)}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-300 transition-all cursor-pointer shadow-sm flex flex-col justify-between group hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 inline-block mb-1">
                        {student.usn}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {student.name}
                      </h3>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${
                        isPass
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {displayStatus}
                    </span>
                  </div>

                  {student.college && (
                    <p className="text-xs text-slate-500 mb-3 truncate">{student.college}</p>
                  )}

                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Extracted Subjects ({student.subjects?.length || 0})
                    </span>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {student.subjects?.map((s, idx) => (
                        <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-100 space-y-1 text-xs">
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-slate-900 font-bold truncate max-w-[180px]" title={s.subjectName}>
                              {s.subjectCode ? `${s.subjectCode} ` : ''}{s.subjectName}
                            </span>
                            <span
                              className={`font-bold font-mono text-[10px] px-1.5 py-0.5 rounded ${
                                !isSubjectPass(s)
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {s.result}
                            </span>
                          </div>
                          {(s.internalMarks || s.externalMarks || s.totalMarks) && (
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
                              {s.internalMarks && <span>Int: <strong className="text-slate-800">{s.internalMarks}</strong></span>}
                              {s.externalMarks && <span>Ext: <strong className="text-slate-800">{s.externalMarks}</strong></span>}
                              {s.totalMarks && <span>Tot: <strong className="text-slate-900 font-bold">{s.totalMarks}</strong></span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 text-xs text-slate-500">
                  <span>SGPA: <strong className="text-slate-800">{student.sgpa || 'N/A'}</strong></span>
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectStudent(student)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      title="Inspect / Edit Data"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setDeletingStudent(student)}
                      className="p-1.5 rounded-md bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete student record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!deletingStudent}
        studentName={deletingStudent?.name}
        usn={deletingStudent?.usn}
        onConfirm={() => {
          if (deletingStudent) {
            onDeleteStudent(deletingStudent.id);
            setDeletingStudent(null);
          }
        }}
        onCancel={() => setDeletingStudent(null)}
      />

    </div>
  );
};
