import React from 'react';
import { LogOut, X, AlertCircle } from 'lucide-react';

interface SignOutConfirmModalProps {
  isOpen: boolean;
  userName?: string;
  userEmail?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SignOutConfirmModal: React.FC<SignOutConfirmModalProps> = ({
  isOpen,
  userName,
  userEmail,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sign Out Confirmation</h3>
              {userEmail && <p className="text-xs font-mono font-medium text-slate-500 mt-0.5">{userEmail}</p>}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Are you sure you want to sign out{userName ? <strong className="text-slate-900">, {userName}</strong> : ''}? You will need to sign back in with your Google account to access your student records dashboard.
        </p>

        <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Confirm Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
