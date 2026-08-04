import React from 'react';
import { Layers, ArrowLeft } from 'lucide-react';

interface NewViewProps {
  onBackToMain: () => void;
}

export const NewView: React.FC<NewViewProps> = ({ onBackToMain }) => {
  return (
    <div className="w-full flex flex-col space-y-6 animate-fade-in">
      {/* View Header / Navigation Bar */}
      <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">New View</h2>
            <p className="text-xs text-slate-500">Plain workspace area ready for custom functionality</p>
          </div>
        </div>

        <button
          onClick={onBackToMain}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-300 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Main View</span>
        </button>
      </div>

      {/* Plain Workspace Box */}
      <div className="w-full min-h-[60vh] rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 flex flex-col items-center justify-center text-center">
        <div className="max-w-md space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-700">Plain View Workspace</h3>
          <p className="text-xs text-slate-400">
            This is a separate plain page view with the sticky header maintained above.
          </p>
        </div>
      </div>
    </div>
  );
};
