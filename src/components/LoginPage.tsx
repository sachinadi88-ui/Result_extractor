import React from 'react';
import { GraduationCap, ShieldCheck, FileSpreadsheet, Zap, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { AuthUser } from '../types';

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const handleSignIn = () => {
    const defaultUser: AuthUser = {
      id: `google-${Date.now()}`,
      name: 'Sachin Adi',
      email: 'sachinadi88@gmail.com',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };
    onLogin(defaultUser);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans antialiased relative overflow-hidden">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">
                Result<span className="text-emerald-400">Extract</span> AI
              </span>
              <p className="text-[11px] text-slate-400">Student Marksheet OCR &amp; Result Extractor</p>
            </div>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Authentication Required</span>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col lg:flex-row items-center justify-between gap-12 z-10 my-auto">
        
        {/* Left Side: Product Showcase */}
        <div className="flex-1 space-y-6 max-w-lg">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>User-Isolated Cloud Storage</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
            Extract student results with <span className="text-emerald-400">AI Accuracy</span>
          </h1>

          <p className="text-base text-slate-400 leading-relaxed">
            Upload university marksheet screenshots and extract student USN, Name, Subject Codes, Internal, External, Total Marks, and Overall Pass/Fail status automatically.
          </p>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">User Account Isolation</h4>
                <p className="text-xs text-slate-400">Your extracted student data is strictly linked to your signed-in Google account.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-0.5 shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Exportable Spreadsheets</h4>
                <p className="text-xs text-slate-400">Download consolidated subject marks into structured CSV files with one click.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-0.5 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Instant OCR Extraction</h4>
                <p className="text-xs text-slate-400">Extract multiple marksheets simultaneously from image files or your clipboard.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Google Login Card */}
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white mb-4 shadow-inner">
              {/* Google Icon SVG */}
              <svg className="w-8 h-8" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to Continue</h2>
            <p className="text-xs text-slate-400 mt-1.5">Sign in with Google to enable student marksheet extraction</p>
          </div>

          {/* Primary Google Sign In Button */}
          <button
            onClick={handleSignIn}
            className="w-full py-4 px-6 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-base flex items-center justify-center space-x-3 shadow-xl transition-all cursor-pointer group hover:scale-[1.02]"
          >
            {/* Google Icon SVG */}
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="text-[11px] text-slate-500 text-center mt-6">
            Protected by Google OAuth • Only authenticated users can access student data
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-600">
        <span>Result Extractor AI &copy; {new Date().getFullYear()} • Secure Single Sign-On</span>
      </footer>

    </div>
  );
};

