import React from 'react';
import { X, FileSpreadsheet, FileText, Download, Table2 } from 'lucide-react';

interface ExportFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onExportPDFLandscape: () => void;
}

export const ExportFormatModal: React.FC<ExportFormatModalProps> = ({
  isOpen,
  onClose,
  onExportExcel,
  onExportPDF,
  onExportPDFLandscape,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Export Student Records</h3>
              <p className="text-[11px] text-slate-500">Select your preferred document format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector Cards */}
        <div className="space-y-3">
          {/* Excel Export Card */}
          <button
            onClick={() => {
              onExportExcel();
              onClose();
            }}
            className="w-full text-left flex items-start space-x-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 transition-all cursor-pointer group"
          >
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-100 transition-colors shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                Microsoft Excel (.xlsx)
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Best for calculations, data analysis, and importing into other spreadsheet software. Includes subject metrics and color indicators.
              </p>
            </div>
          </button>

          {/* PDF Export Card (Portrait) */}
          <button
            onClick={() => {
              onExportPDF();
              onClose();
            }}
            className="w-full text-left flex items-start space-x-4 p-4 rounded-xl border border-slate-200 hover:border-red-500 bg-white hover:bg-red-50/20 transition-all cursor-pointer group"
          >
            <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 group-hover:bg-red-100 transition-colors shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 group-hover:text-red-700 transition-colors">
                PDF Summary Report (Portrait)
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Best for printing, archiving, and sharing a polished, formatted report. Includes ranking charts, college headers, and subject statistics.
              </p>
            </div>
          </button>

          {/* PDF Export Card (Landscape) */}
          <button
            onClick={() => {
              onExportPDFLandscape();
              onClose();
            }}
            className="w-full text-left flex items-start space-x-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/20 transition-all cursor-pointer group"
          >
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-100 transition-colors shrink-0">
              <Table2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                PDF Detailed Register (Landscape)
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Detailed wide sheet with student USN, Name, subject-wise total marks, and overall results. Features a space-efficient layout and subject code headers.
              </p>
            </div>
          </button>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
