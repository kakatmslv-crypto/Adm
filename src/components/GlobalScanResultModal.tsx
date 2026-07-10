import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Student, BorrowRecord, Language, Category } from '../types';
import { translations } from '../utils/translations';
import { X, BookOpen, User, Calendar, FileText, AlertTriangle, CheckCircle, ArrowRightLeft, Scan, AlertCircle, Check, BookOpenCheck } from 'lucide-react';

interface GlobalScanResultModalProps {
  result: {
    barcode: string;
    book: Book | null;
    mode: 'borrow' | 'return';
    studentId?: string;
    borrowRecord?: BorrowRecord | null;
    error?: string;
  } | null;
  onClose: () => void;
  students: Student[];
  categories: Category[];
  language: Language;
  onBorrow: (studentId: string, borrowDate: string, dueDate: string, notes?: string) => void;
  onReturn: (notes?: string) => void;
  onToggleMode: (mode: 'borrow' | 'return') => void;
}

export default function GlobalScanResultModal({
  result,
  onClose,
  students,
  categories,
  language,
  onBorrow,
  onReturn,
  onToggleMode
}: GlobalScanResultModalProps) {
  const t = translations[language];

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [borrowDate, setBorrowDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Default 7 days
    return date.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  // Reset states when result changes
  useEffect(() => {
    if (result && result.book) {
      setSelectedStudentId(students[0]?.id || '');
      setNotes('');
      const today = new Date().toISOString().split('T')[0];
      setBorrowDate(today);
      const limit = new Date();
      limit.setDate(limit.getDate() + 7);
      setDueDate(limit.toISOString().split('T')[0]);
    }
  }, [result, students]);

  if (!result) return null;

  const { book, mode, error, barcode } = result;

  // Find current borrower if any
  const currentBorrower = book && mode === 'return' && result.borrowRecord
    ? students.find(s => s.id === result.borrowRecord?.studentId)
    : null;

  const isOverdue = result.borrowRecord?.status === 'overdue' || (
    result.borrowRecord?.dueDate && new Date(result.borrowRecord.dueDate) < new Date()
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 z-10"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-slate-800 dark:to-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Scan className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  {language === 'kh' ? 'លទ្ធផលស្កែនរហ័ស' : 'Quick Scan Result'}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">
                  BARCODE: {barcode}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            {error ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-black text-rose-600">
                    {language === 'kh' ? 'រកមិនឃើញសៀវភៅ' : 'Book Not Found'}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                    {error}
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition text-xs shadow-sm cursor-pointer"
                  >
                    {language === 'kh' ? 'បិទ' : 'Close'}
                  </button>
                </div>
              </div>
            ) : book ? (
              <div className="space-y-6">
                {/* Book Mini Information Card */}
                <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="w-20 h-28 bg-blue-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-blue-500 overflow-hidden shadow-md shrink-0">
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-8 h-8" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {(() => {
                      const cat = categories.find(c => c.id === book.categoryId);
                      if (cat) {
                        return (
                          <span 
                            style={{ 
                              backgroundColor: `${cat.color || '#3B82F6'}15`, 
                              color: cat.color || '#3B82F6',
                              borderColor: `${cat.color || '#3B82F6'}30`
                            }} 
                            className="text-[10px] font-extrabold uppercase px-2.5 py-1 border rounded-lg self-start"
                          >
                            {language === 'kh' ? cat.nameKh : cat.nameEn}
                          </span>
                        );
                      }
                      return (
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg self-start">
                          {language === 'kh' ? 'សៀវភៅទូទៅ' : 'General'}
                        </span>
                      );
                    })()}
                    <h4 className="text-sm font-black text-slate-800 dark:text-white mt-2 leading-tight truncate">
                      {book.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {language === 'kh' ? 'និពន្ធដោយ' : 'By'}: {book.author}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        book.status === 'available'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {book.status === 'available'
                          ? (language === 'kh' ? 'អាចខ្ចីបាន' : 'Available')
                          : (language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed')
                      }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700">
                  <button
                    onClick={() => onToggleMode('borrow')}
                    className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      mode === 'borrow'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {language === 'kh' ? 'ខ្ចីសៀវភៅ' : 'Borrow'}
                  </button>
                  <button
                    onClick={() => onToggleMode('return')}
                    className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      mode === 'return'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {language === 'kh' ? 'សងសៀវភៅ' : 'Return'}
                  </button>
                </div>

                {/* FORM PANEL */}
                {mode === 'borrow' ? (
                  book.status !== 'available' ? (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center text-center space-y-3">
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                      <div>
                        <h5 className="text-xs font-bold text-amber-700 dark:text-amber-400">
                          {language === 'kh' ? 'សៀវភៅកំពុងត្រូវបានខ្ចីរួចហើយ' : 'Book is currently checked out'}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                          {language === 'kh'
                            ? 'សៀវភៅនេះត្រូវបានខ្ចីរួចហើយ។ សូមប្តូរទៅកាន់ផ្ទាំង "សងសៀវភៅ" ដើម្បីទទួលសៀវភៅនេះត្រឡប់មកវិញ។'
                            : 'This book is already checked out. Please switch to Return mode to check it back in.'}
                        </p>
                      </div>
                      <button
                        onClick={() => onToggleMode('return')}
                        className="flex items-center gap-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-bold transition cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        {language === 'kh' ? 'ប្តូរទៅ សងសៀវភៅ' : 'Switch to Return'}
                      </button>
                    </div>
                  ) : (
                    /* Borrow Form */
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {language === 'kh' ? 'ជ្រើសរើសសិស្ស' : 'Select Student'}
                        </label>
                        <div className="relative">
                          <select
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-slate-800 dark:text-white"
                          >
                            <option value="" disabled>
                              {language === 'kh' ? '--- ជ្រើសរើសសិស្ស ---' : '--- Choose Student ---'}
                            </option>
                            {students.map((stu) => (
                              <option key={stu.id} value={stu.id}>
                                {stu.name} (ថ្នាក់ទី: {stu.classGrade})
                              </option>
                            ))}
                          </select>
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {language === 'kh' ? 'ថ្ងៃខ្ចី' : 'Borrow Date'}
                          </label>
                          <div className="relative">
                            <input
                              type="date"
                              value={borrowDate}
                              onChange={(e) => setBorrowDate(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                            />
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {language === 'kh' ? 'ថ្ងៃត្រូវសង' : 'Due Date'}
                          </label>
                          <div className="relative">
                            <input
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                            />
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {language === 'kh' ? 'ចំណាំ' : 'Notes'}
                        </label>
                        <div className="relative">
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={language === 'kh' ? 'បន្ថែមការចំណាំផ្សេងៗ...' : 'Add any borrow notes...'}
                            rows={2}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white resize-none"
                          />
                          <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => onBorrow(selectedStudentId, borrowDate, dueDate, notes)}
                          disabled={!selectedStudentId}
                          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {language === 'kh' ? 'យល់ព្រមឲ្យខ្ចី' : 'Confirm Check Out'}
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  /* Return Form */
                  book.status === 'available' ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center text-center space-y-3">
                      <Check className="w-8 h-8 text-emerald-500 bg-emerald-500/10 p-1.5 rounded-full" />
                      <div>
                        <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {language === 'kh' ? 'សៀវភៅកំពុងមាននៅក្នុងបណ្ណាល័យស្រាប់' : 'Book is already in library'}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                          {language === 'kh'
                            ? 'សៀវភៅនេះមិនមានប្រវត្តិខ្ចីសកម្មឡើយ។ សូមប្តូរទៅកាន់ផ្ទាំង "ខ្ចីសៀវភៅ" ដើម្បីកត់ត្រាការខ្ចី។'
                            : 'This book has no active borrowing record. Please switch to Borrow mode to log a checkout.'}
                        </p>
                      </div>
                      <button
                        onClick={() => onToggleMode('borrow')}
                        className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        {language === 'kh' ? 'ប្តូរទៅ ខ្ចីសៀវភៅ' : 'Switch to Borrow'}
                      </button>
                    </div>
                  ) : (
                    /* Return Form */
                    <div className="space-y-4">
                      {currentBorrower && (
                        <div className="p-4 bg-blue-50 dark:bg-slate-800 rounded-2xl border border-blue-100/30 dark:border-slate-700 space-y-2.5">
                          <h5 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                            {language === 'kh' ? 'ព័ត៌មានអ្នកខ្ចី' : 'Borrower Details'}
                          </h5>
                          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'kh' ? 'ឈ្មោះសិស្ស' : 'Student Name'}</p>
                              <p className="font-extrabold text-slate-700 dark:text-white mt-0.5">{currentBorrower.name}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'kh' ? 'ថ្នាក់ទី' : 'Grade Class'}</p>
                              <p className="font-extrabold text-slate-700 dark:text-white mt-0.5">{currentBorrower.classGrade}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'kh' ? 'ថ្ងៃខ្ចី' : 'Borrowed Date'}</p>
                              <p className="font-semibold text-slate-700 dark:text-white mt-0.5">{result.borrowRecord?.borrowDate}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'kh' ? 'ថ្ងៃត្រូវសង' : 'Due Date'}</p>
                              <p className={`font-semibold mt-0.5 ${isOverdue ? 'text-rose-500 font-bold animate-pulse' : 'text-slate-700 dark:text-white'}`}>
                                {result.borrowRecord?.dueDate}
                                {isOverdue && (language === 'kh' ? ' (ហួសកំណត់!)' : ' (Overdue!)')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {language === 'kh' ? 'ចំណាំពេលសងសៀវភៅ' : 'Return Notes'}
                        </label>
                        <div className="relative">
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={language === 'kh' ? 'បន្ថែមការចំណាំផ្សេងៗពេលសងសៀវភៅ...' : 'Add return notes (e.g., book condition)...'}
                            rows={2}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white resize-none"
                          />
                          <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => onReturn(notes)}
                          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <BookOpenCheck className="w-4 h-4" />
                          {language === 'kh' ? 'យល់ព្រមទទួលសៀវភៅសង' : 'Process Return Checkout'}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
