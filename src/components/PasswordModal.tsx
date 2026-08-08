import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(false);
      setSuccess(false);
      // Auto-focus input on open
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);

    if (password === '1979') {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    } else {
      setError(true);
      setPassword('');
      // Trigger subtle haptic vibration in browser if supported
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4 transition-all duration-300 transform ${
          error ? 'animate-shake border-red-300' : 'animate-scale-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border shrink-0 transition-colors ${
              success
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : error
                ? 'bg-red-50 text-red-600 border-red-100'
                : 'bg-indigo-50 text-indigo-600 border-indigo-100'
            }`}>
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">System Authentication</h3>
              <p className="text-xs text-slate-500 font-normal">Enter the security password to unlock modifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="password"
                required
                placeholder="••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                disabled={success}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm font-mono tracking-widest text-slate-950 bg-slate-50 focus:bg-white focus:outline-none transition-all ${
                  success
                    ? 'border-emerald-300 bg-emerald-50/20 text-emerald-800'
                    : error
                    ? 'border-red-300 focus:border-red-500 bg-red-50/20 text-red-800'
                    : 'border-slate-200 focus:border-indigo-600'
                }`}
              />
            </div>
          </div>

          {/* Feedback message */}
          {error && (
            <div className="flex items-center space-x-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="font-medium">Incorrect password. Please try again.</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span className="font-semibold">Access Granted! Unlocking system...</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={success}
            className={`w-full py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all duration-200 cursor-pointer text-white active:scale-[0.98] ${
              success
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {success ? 'Unlocked' : 'Unlock Database'}
          </button>
        </form>
      </div>
    </div>
  );
};
