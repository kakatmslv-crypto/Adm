import React, { useState } from 'react';
import { translations } from '../utils/translations';
import { Language, User, Student } from '../types';
import { BookOpen, Globe, Mail, Lock } from 'lucide-react';

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
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const t = translations[language];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate small latency for premium UI experience
    await new Promise((resolve) => setTimeout(resolve, 600));

    const lowerUsername = username.trim().toLowerCase();
    const trimPassword = password.trim();

    // 1. Check for system administrator
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

    // 2. Check for system librarian
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

    // 3. Check for student matching email or studentId
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

    setError(language === 'kh' ? 'រកមិនឃើញគណនី ឬ អ៊ីមែលនេះទេ' : 'Account or email not found');
    setIsLoading(false);
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 100%)' }}>
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/45 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-white/60">
        <Globe className="w-4 h-4 text-slate-500" />
        <button
          onClick={() => setLanguage('kh')}
          className={`text-xs font-bold px-2 py-1 rounded-lg transition ${
            language === 'kh' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white/40'
          }`}
        >
          ខ្មែរ
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`text-xs font-bold px-2 py-1 rounded-lg transition ${
            language === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white/40'
          }`}
        >
          EN
        </button>
      </div>

      <div className="max-w-md w-full space-y-8 glass-panel-heavy p-8 rounded-2xl shadow-xl relative z-10 border border-white/80">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-blue-50/60 backdrop-blur rounded-2xl flex items-center justify-center border border-white mb-4 shadow-inner">
            <BookOpen className="h-10 w-10 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-xs font-extrabold text-blue-600 tracking-wider uppercase">
            {t.schoolName}
          </h2>
          <h1 className="mt-1 text-2xl font-black text-slate-900 tracking-tight leading-8">
            {isSignUp ? (language === 'kh' ? 'ចុះឈ្មោះថ្មី' : 'Sign Up') : t.loginTitle}
          </h1>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleAuth}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-2">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input type="email" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="email@school.edu" className="px-3 py-2.5 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-2">
                <Lock className="w-3 h-3" /> Password
              </label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="px-3 py-2.5 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-55 transition duration-150 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            {isLoading ? (language === 'kh' ? 'កំពុងដំណើរការ...' : 'Processing...') : (isSignUp ? (language === 'kh' ? 'ចុះឈ្មោះ' : 'Sign Up') : t.loginBtn)}
          </button>
        </form>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-xs font-bold text-blue-600 hover:text-blue-800 transition"
        >
          {isSignUp ? (language === 'kh' ? 'មានគណនីរួចហើយ? ចូល' : 'Already have an account? Sign in') : (language === 'kh' ? 'មិនទាន់មានគណនី? ចុះឈ្មោះ' : 'Need an account? Sign up')}
        </button>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200/55"></div>
          <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'kh' ? 'ឬ' : 'OR'}</span>
          <div className="flex-grow border-t border-slate-200/55"></div>
        </div>

        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-slate-200/80 hover:border-blue-500/50 rounded-xl text-sm font-bold text-slate-700 bg-white/70 hover:bg-blue-50/20 disabled:opacity-55 transition duration-150 shadow-sm cursor-pointer"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span>{language === 'kh' ? 'ចូលជាមួយ Google' : 'Sign in with Google'}</span>
        </button>

        {/* Toggleable Demo Credentials Guide */}
        <div className="mt-4 pt-3 border-t border-slate-200/40 text-center">
          <button 
            type="button" 
            onClick={() => setShowGuide(!showGuide)} 
            className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-800 transition cursor-pointer"
          >
            {showGuide ? (language === 'kh' ? 'លាក់គណនីសាកល្បង ▴' : 'Hide Demo Accounts ▴') : (language === 'kh' ? 'បង្ហាញគណនីសាកល្បង ▾' : 'Show Demo Accounts ▾')}
          </button>
          
          {showGuide && (
            <div className="mt-3 text-left bg-slate-50/80 backdrop-blur rounded-xl p-3 border border-slate-200/50 text-[11px] text-slate-600 space-y-2 max-h-48 overflow-y-auto font-sans">
              <p className="font-bold text-slate-700 border-b border-slate-200/50 pb-1">
                {language === 'kh' ? '🔑 គណនីគ្រប់គ្រង (Admin / Librarian)' : '🔑 Administrative Accounts'}
              </p>
              <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                <div><strong>Email/User:</strong> admin</div>
                <div><strong>Pass:</strong> admin123</div>
                <div><strong>Email/User:</strong> librarian</div>
                <div><strong>Pass:</strong> password123</div>
              </div>
              
              <p className="font-bold text-slate-700 border-b border-slate-200/50 pt-1 pb-1">
                {language === 'kh' ? '🎓 គណនីសិស្ស (1000+ នាក់)' : '🎓 Student Accounts (1000+ Students)'}
              </p>
              <p className="text-[10px] text-slate-500 leading-normal mb-1">
                {language === 'kh' ? 'គណនីសិស្សទាំងអស់ត្រូវបានបង្កើតឡើងដោយស្វ័យប្រវត្តិតាមទម្រង់ខាងក្រោម៖' : 'All students can login using the following credentials formula:'}
              </p>
              <div className="bg-white/80 p-2 rounded border border-slate-100 font-mono space-y-1.5 text-[10px]">
                <div>
                  <span className="text-blue-600 font-bold">Email format:</span>
                  <br />
                  <code className="bg-slate-50 px-1 py-0.5 rounded text-rose-600">student[ID]@school.edu.kh</code>
                </div>
                <div>
                  <span className="text-blue-600 font-bold">Password format:</span>
                  <br />
                  <code className="bg-slate-50 px-1 py-0.5 rounded text-rose-600">pass[1000 + ID]</code>
                </div>
              </div>
              
              <p className="font-semibold text-slate-700 pt-1">
                {language === 'kh' ? 'ឧទាហរណ៍គណនីសិស្ស៖' : 'Example Student Accounts:'}
              </p>
              <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                <div>student1@school.edu.kh</div>
                <div>pass1001</div>
                
                <div>student2@school.edu.kh</div>
                <div>pass1002</div>
                
                <div>student500@school.edu.kh</div>
                <div>pass1500</div>
                
                <div>student1000@school.edu.kh</div>
                <div>pass2000</div>
              </div>

              <p className="font-semibold text-slate-700 pt-1">
                {language === 'kh' ? 'គណនីសិស្សពិសេស (Special Students):' : 'Special Student Accounts:'}
              </p>
              <div className="grid grid-cols-2 gap-1 font-mono text-[10px] bg-blue-50/50 p-1.5 rounded border border-blue-100/40">
                <div>chan.monny@school.edu.kh</div>
                <div>password123</div>

                <div>sokh.kimhour@school.edu.kh</div>
                <div>password123</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
