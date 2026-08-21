import React from 'react';
import { X, FileSpreadsheet, FileText, Download, Table2, Layers, Award } from 'lucide-react';
import { StudentRecord } from '../types';
import { filterRecordsBySemester, getAvailableSemesters } from '../utils/statusHelper';

interface ExportFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportExcel: (overrideSemester?: string) => void;
  onExportPDF: (overrideSemester?: string) => void;
  onExportPDFLandscape: (overrideSemester?: string) => void;
  onExportPDFCreditsLandscape: (overrideSemester?: string) => void;
  selectedSemester?: string;
  onSemesterChange?: (sem: string) => void;
  records?: StudentRecord[];
}

export const ExportFormatModal: React.FC<ExportFormatModalProps> = ({
  isOpen,
  onClose,
  onExportExcel,
  onExportPDF,
  onExportPDFLandscape,
  onExportPDFCreditsLandscape,
  selectedSemester = 'ALL',
  onSemesterChange,
  records = [],
}) => {
  if (!isOpen) return null;

  const availableSemesters = getAvailableSemesters(records);
  const exportRecords = filterRecordsBySemester(records, selectedSemester);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Export Student Records</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Select semester filter & format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content Body */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5">
          {/* Semester Scope Banner */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-red-50/90 border border-red-200 space-y-2">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-xs font-bold text-red-600">
                  Semester Scope:
                </span>
              </div>
              {onSemesterChange && (
                <select
                  value={selectedSemester}
                  onChange={(e) => onSemesterChange(e.target.value)}
                  className="bg-white text-red-600 font-bold py-1 px-2.5 rounded-md border border-red-200 focus:outline-none focus:border-red-500 shadow-2xs text-xs cursor-pointer w-full xs:w-auto"
                >
                  <option value="ALL">All Semesters</option>
                  {availableSemesters.map((sem) => (
                    <option key={sem} value={sem}>
                      Sem {sem.replace(/^sem\s*/i, '')}
                    </option>
                  ))}
                  {['1', '2', '3', '4', '5', '6', '7', '8'].map((s) => (
                    !availableSemesters.includes(s) && !availableSemesters.some((x) => x.toLowerCase().includes(s)) && (
                      <option key={`opt-${s}`} value={s}>
                        Sem {s}
                      </option>
                    )
                  ))}
                </select>
              )}
            </div>
            <p className="text-[11px] text-slate-600">
              Exporting <span className="font-bold text-red-700">{exportRecords.length} student record{exportRecords.length !== 1 ? 's' : ''}</span> for{' '}
              <span className="font-bold text-red-700">
                {selectedSemester === 'ALL' ? 'All Semesters' : `Semester ${selectedSemester}`}
              </span>.
            </p>
          </div>

          {/* Format Selector Cards */}
          <div className="space-y-2.5 sm:space-y-3">
            {/* Excel Export Card */}
            <button
              onClick={() => {
                onExportExcel(selectedSemester);
                onClose();
              }}
              className="w-full text-left flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 transition-all cursor-pointer group"
            >
              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-100 transition-colors shrink-0">
                <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors leading-tight">
                  Microsoft Excel (.xlsx)
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed">
                  Exports formatted .xlsx spreadsheet filtered for {selectedSemester === 'ALL' ? 'all semesters' : `Semester ${selectedSemester}`}.
                </p>
              </div>
            </button>

            {/* PDF Export Card (Portrait) */}
            <button
              onClick={() => {
                onExportPDF(selectedSemester);
                onClose();
              }}
              className="w-full text-left flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl border border-slate-200 hover:border-red-500 bg-white hover:bg-red-50/20 transition-all cursor-pointer group"
            >
              <div className="p-2.5 sm:p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 group-hover:bg-red-100 transition-colors shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-red-700 transition-colors leading-tight">
                  PDF Summary Report (Portrait)
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed">
                  Formatted PDF summary report filtered for {selectedSemester === 'ALL' ? 'all semesters' : `Semester ${selectedSemester}`}.
                </p>
              </div>
            </button>

            {/* PDF Detailed Register (Landscape) */}
            <button
              onClick={() => {
                onExportPDFLandscape(selectedSemester);
                onClose();
              }}
              className="w-full text-left flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/20 transition-all cursor-pointer group"
            >
              <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-100 transition-colors shrink-0">
                <Table2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors leading-tight">
                  PDF Detailed Register (Landscape)
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed">
                  Detailed wide register with all subject marks breakdown for {selectedSemester === 'ALL' ? 'all semesters' : `Semester ${selectedSemester}`}.
                </p>
              </div>
            </button>

            {/* PDF Credits Register (Landscape) */}
            <button
              onClick={() => {
                onExportPDFCreditsLandscape(selectedSemester);
                onClose();
              }}
              className="w-full text-left flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl border border-slate-200 hover:border-violet-500 bg-white hover:bg-violet-50/20 transition-all cursor-pointer group"
            >
              <div className="p-2.5 sm:p-3 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 group-hover:bg-violet-100 transition-colors shrink-0">
                <Award className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-violet-700 transition-colors leading-tight flex items-center gap-1.5">
                  <span>PDF Credits Register (Landscape)</span>
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed">
                  Wide register with subject credits earned (0 credits & red highlight for failed subjects) for {selectedSemester === 'ALL' ? 'all semesters' : `Semester ${selectedSemester}`}.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
