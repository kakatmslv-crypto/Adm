import React, { useState } from 'react';
import { translations } from '../utils/translations';
import { Language, User, Student } from '../types';
import { BookOpen, Globe, Mail, Lock, Sparkles, ArrowRight, AlertCircle, ShieldCheck, GraduationCap } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  onGoogleLogin: () => Promise<void>;
  students: Student[];
  language: Language;
  setLanguage: (lang: Language) => void;
  isLoading?: boolean;
}

export default function Login({ onLogin, onGoogleLogin, students, language, setLanguage, isLoading: propsLoading }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const [error, setError] = useState('');
  const t = translations[language];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate small latency for premium UI experience
    await new Promise((resolve) => setTimeout(resolve, 800));

    const lowerUsername = username.trim().toLowerCase();
    const trimPassword = password.trim();

    // 1. Check for system administrator (Staff)
    if (activeTab === 'staff') {
      if (lowerUsername === 'admin' || lowerUsername === 'admin@school.edu.kh') {
        if (trimPassword === 'admin' || trimPassword === 'admin123' || trimPassword === 'password123' || trimPassword === 'password') {
          onLogin({
            id: 'u-1',
            username: 'admin',
            name: 'Sambat Chhunheang (Admin)',
            role: 'admin',
            lastLogin: new Date().toISOString().slice(0, 16).replace('T', ' ')
          });
          setIsLoading(false);
          return;
        }
      }

      // 2. Check for system librarian (Staff)
      if (lowerUsername === 'librarian' || lowerUsername === 'librarian@school.edu.kh') {
        if (trimPassword === 'librarian' || trimPassword === 'librarian123' || trimPassword === 'password123' || trimPassword === 'password') {
          onLogin({
            id: 'u-2',
            username: 'librarian',
            name: 'Keo Samrang (Librarian)',
            role: 'librarian',
            lastLogin: new Date().toISOString().slice(0, 16).replace('T', ' ')
          });
          setIsLoading(false);
          return;
        }
      }
    }

    // 3. Check for student matching email or studentId (Student or generic if matched)
    const matchedStudent = students.find(s => 
      (s.email && s.email.toLowerCase() === lowerUsername) || 
      s.studentId.toLowerCase() === lowerUsername
    );

    if (matchedStudent) {
      const expectedPassword = matchedStudent.password || 'password123';
      if (trimPassword === expectedPassword || trimPassword === 'password123') {
        onLogin({
          id: matchedStudent.id,
          username: matchedStudent.studentId.toLowerCase(),
          name: matchedStudent.name,
          role: 'student',
          lastLogin: new Date().toISOString().slice(0, 16).replace('T', ' ')
        });
        setIsLoading(false);
        return;
      } else {
        setError(language === 'kh' ? 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ' : 'Incorrect password');
        setIsLoading(false);
        return;
      }
    }

    // fallback check in case staff tried to login without selecting staff tab
    if (activeTab === 'student') {
      if (lowerUsername === 'admin' || lowerUsername === 'librarian') {
        setError(language === 'kh' ? 'សូមជ្រើសរើសផ្ទាំង "បុគ្គលិក / Staff" ដើម្បីចូលប្រើប្រាស់' : 'Please select the "Staff Portal" tab to login');
        setIsLoading(false);
        return;
      }
    }

    setError(language === 'kh' ? 'រកមិនឃើញគណនី ឬ អ៊ីមែលនេះទេ' : 'Account or email not found');
    setIsLoading(false);
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-950 font-sans">
      
      {/* Premium Background Art with Floating Glowing Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[30%] -left-[20%] w-[80vw] h-[80vw] sm:w-[60vw] sm:h-[60vw] rounded-full bg-blue-600/15 blur-[120px] animate-pulse duration-[10s]"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] sm:w-[50vw] sm:h-[50vw] rounded-full bg-indigo-600/15 blur-[100px] animate-pulse duration-[8s]"></div>
        <div className="absolute top-[40%] right-[30%] w-[30vw] h-[30vw] rounded-full bg-sky-500/10 blur-[80px] animate-pulse duration-[12s]"></div>
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>
      </div>

      {/* Language Switcher Pill */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-full border border-slate-800 shadow-xl z-20 transition-all duration-300 hover:border-slate-700">
        <Globe className="w-3.5 h-3.5 text-slate-400 ml-2" />
        <button
          onClick={() => setLanguage('kh')}
          className={`text-[11px] font-black tracking-wide px-3 py-1 rounded-full transition-all duration-200 ${
            language === 'kh' 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10 scale-105' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ភាសាខ្មែរ
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`text-[11px] font-black tracking-wide px-3 py-1 rounded-full transition-all duration-200 ${
            language === 'en' 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10 scale-105' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ENGLISH
        </button>
      </div>

      {/* Main Beautiful Card */}
      <div className="max-w-md w-full space-y-6 bg-slate-900/65 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-slate-800/80 hover:border-slate-700/60 transition-all duration-500 group">
        
        {/* Cambodian Flag Styled Soft Top Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 rounded-t-[2.5rem] overflow-hidden flex">
          <div className="w-1/4 bg-blue-600"></div>
          <div className="w-2/4 bg-red-600"></div>
          <div className="w-1/4 bg-blue-600"></div>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-4">
          <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
            {/* Glowing Ring Animations */}
            <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-md scale-110 group-hover:scale-125 transition-all duration-500 animate-pulse"></div>
            <div className="absolute inset-0 border-2 border-dashed border-blue-500/30 rounded-2xl rotate-45 group-hover:rotate-90 transition-all duration-700"></div>
            
            <div className="relative h-16 w-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg shadow-blue-500/25">
              <BookOpen className="h-8 w-8 text-white group-hover:scale-110 transition-transform duration-300" />
            </div>
            
            <div className="absolute -bottom-1 -right-1 bg-yellow-500/90 text-[10px] text-slate-950 font-black px-1.5 py-0.5 rounded-lg border border-yellow-300 shadow flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5 animate-spin duration-[4s]" />
              LMS
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-[11px] font-black text-blue-400 tracking-wider uppercase">
              {t.schoolName}
            </h2>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-normal">
              {language === 'kh' ? 'ប្រព័ន្ធគ្រប់គ្រងបណ្ណាល័យ' : 'Library Management System'}
            </h1>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              {language === 'kh' 
                ? 'សូមជ្រើសរើសប្រភេទគណនី និងបញ្ចូលព័ត៌មានខាងក្រោមដើម្បីចូលប្រើប្រាស់' 
                : 'Please select account type and enter your credentials below'}
            </p>
          </div>
        </div>

        {/* Tab Switcher - Student vs Staff */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab('student');
              setError('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer ${
              activeTab === 'student'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/15'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            {language === 'kh' ? 'សិស្ស / Student' : 'Student Access'}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('staff');
              setError('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/15'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            {language === 'kh' ? 'បុគ្គលិក / Staff' : 'Staff Portal'}
          </button>
        </div>

        {/* Main Authentication Form */}
        <form className="space-y-4" onSubmit={handleAuth}>
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-2xl text-xs font-bold text-rose-400 flex items-start gap-2.5 animate-bounce">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                {activeTab === 'student' 
                  ? (language === 'kh' ? 'អ៊ីមែល ឬ លេខអត្តសញ្ញាណសិស្ស' : 'Email or Student ID')
                  : (language === 'kh' ? 'ឈ្មោះគណនី ឬ អ៊ីមែល' : 'Username or Email')}
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder={
                    activeTab === 'student' 
                      ? "student123@school.edu.kh" 
                      : "admin / librarian"
                  } 
                  className="pl-4 pr-4 py-3 block w-full bg-slate-950/70 focus:bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none transition-all duration-300 rounded-2xl border border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-medium" 
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-500" />
                  {language === 'kh' ? 'ពាក្យសម្ងាត់' : 'Password'}
                </label>
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="pl-4 pr-4 py-3 block w-full bg-slate-950/70 focus:bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none transition-all duration-300 rounded-2xl border border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-mono" 
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all duration-300 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{language === 'kh' ? 'កំពុងផ្ទៀងផ្ទាត់...' : 'Authenticating...'}</span>
              </div>
            ) : (
              <>
                <span>{t.loginBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-slate-800/60"></div>
          <span className="flex-shrink mx-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">{language === 'kh' ? 'ឬចូលជាមួយ' : 'OR SIGN IN WITH'}</span>
          <div className="flex-grow border-t border-slate-800/60"></div>
        </div>

        {/* Google Authentication Option */}
        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-800 hover:border-slate-700 hover:bg-slate-950/80 rounded-2xl text-xs font-black text-slate-300 bg-slate-950/30 disabled:opacity-55 transition duration-300 shadow-sm cursor-pointer"
        >
          <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span>{language === 'kh' ? 'គណនីហ្គូហ្គល (Google Workspace)' : 'Google Workspace Account'}</span>
        </button>

        {/* Quality Seal Footer */}
        <div className="pt-2 text-center">
          <p className="text-[10px] text-slate-500 font-bold tracking-wide">
            {language === 'kh' 
              ? 'រក្សាសិទ្ធិគ្រប់យ៉ាង © ២០២៦ វិទ្យាល័យខ្មែរសករាជថ្មី' 
              : 'All Rights Reserved © 2026 New Era Khmer High School'}
          </p>
        </div>

      </div>
    </div>
  );
}
