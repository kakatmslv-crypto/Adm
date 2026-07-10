import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Student, BorrowRecord, Language } from '../types';
import { translations } from '../utils/translations';
import { Scan, User, Calendar, BookOpen, AlertCircle, CheckCircle, ArrowRightLeft, Clock, Camera, Sparkles, BookOpenCheck, Check, CornerDownLeft, AlertTriangle } from 'lucide-react';
import CameraScanner from './CameraScanner';

interface BorrowReturnSystemProps {
  books: Book[];
  students: Student[];
  records: BorrowRecord[];
  language: Language;
  onBorrowBook: (record: Omit<BorrowRecord, 'id'>) => void;
  onReturnBook: (barcode: string, returnDate: string, notes?: string) => boolean;
  preselectedStudentId?: string;
  onClearPreselectedStudent?: () => void;
}

export default function BorrowReturnSystem({
  books,
  students,
  records,
  language,
  onBorrowBook,
  onReturnBook,
  preselectedStudentId,
  onClearPreselectedStudent,
}: BorrowReturnSystemProps) {
  const t = translations[language];

  // System Tab: 'borrow' | 'return'
  const [activeTab, setActiveTab] = useState<'borrow' | 'return'>('borrow');

  // BORROW STATE
  const [borrowBarcode, setBorrowBarcode] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [borrowDate, setBorrowDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Default due date: 7 days from now
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [borrowNotes, setBorrowNotes] = useState('');
  const [borrowError, setBorrowError] = useState('');
  const [borrowSuccess, setBorrowSuccess] = useState('');

  // RETURN STATE
  const [returnBarcode, setReturnBarcode] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [activeBorrowDetail, setActiveBorrowDetail] = useState<BorrowRecord | null>(null);
  const [returnError, setReturnError] = useState('');
  const [returnSuccess, setReturnSuccess] = useState('');

  // Scanned Result Overlay State
  const [scannedResult, setScannedResult] = useState<{
    barcode: string;
    book: Book | null;
    mode: 'borrow' | 'return';
    studentId?: string;
    borrowRecord?: BorrowRecord | null;
    error?: string;
  } | null>(null);

  // Sync preselectedStudentId from props
  useEffect(() => {
    if (preselectedStudentId) {
      setSelectedStudentId(preselectedStudentId);
      setActiveTab('borrow');
      if (onClearPreselectedStudent) {
        onClearPreselectedStudent();
      }
    }
  }, [preselectedStudentId]);

  // Play double-tone success chime
  const playSuccessChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator1 = audioCtx.createOscillator();
      const oscillator2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator1.type = 'sine';
      oscillator1.frequency.setValueAtTime(600, audioCtx.currentTime);
      oscillator1.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);

      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1);
      oscillator2.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.25);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);

      oscillator1.start(audioCtx.currentTime);
      oscillator1.stop(audioCtx.currentTime + 0.1);
      
      oscillator2.start(audioCtx.currentTime + 0.1);
      oscillator2.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio play blocked:', e);
    }
  };

  // Main barcode scan and identification router
  const handleScanProcessed = (barcode: string, mode: 'borrow' | 'return') => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    // 1. Check if the scanned code matches a Student ID card QR code
    const student = students.find(s => s.studentId.toUpperCase() === cleanBarcode.toUpperCase());
    if (student) {
      setSelectedStudentId(student.id);
      playSuccessChime();
      setBorrowSuccess(language === 'kh'
        ? `បានរកឃើញ និងជ្រើសរើសសិស្ស៖ ${student.name} (${student.studentId})`
        : `Scanned and selected Student: ${student.name} (${student.studentId})`
      );
      setBorrowError('');
      return;
    }

    // 2. Otherwise process as a Book Barcode/QR
    const book = books.find(b => b.barcode.toUpperCase() === cleanBarcode.toUpperCase()) || null;
    
    if (!book) {
      setScannedResult({
        barcode: cleanBarcode,
        book: null,
        mode,
        error: language === 'kh' 
          ? `រកមិនឃើញសៀវភៅដែលមានលេខបារកូដ "${cleanBarcode}" ឡើយ!` 
          : `No book found with barcode "${cleanBarcode}" in the database.`
      });
      return;
    }

    if (mode === 'borrow') {
      const activeRec = records.find(r => r.bookId === book.id && (r.status === 'borrowed' || r.status === 'overdue')) || null;
      setScannedResult({
        barcode: cleanBarcode,
        book,
        mode,
        studentId: selectedStudentId || '',
        borrowRecord: activeRec,
      });
    } else {
      const activeRec = records.find(r => r.bookId === book.id && (r.status === 'borrowed' || r.status === 'overdue')) || null;
      setScannedResult({
        barcode: cleanBarcode,
        book,
        mode,
        borrowRecord: activeRec,
      });
    }
  };

  // Virtual Scanner Help
  const [showVirtualScan, setShowVirtualScan] = useState(false);

  // Camera Scanner Modal State
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'borrow' | 'return'>('borrow');

  const handleCameraScanSuccess = (barcode: string) => {
    handleScanProcessed(barcode, scannerTarget);
    setShowCameraScanner(false);
  };

  // Handle barcode typing / selection in Borrow
  const handleBorrowBarcodeChange = (barcode: string) => {
    setBorrowBarcode(barcode);
    setBorrowError('');
    setBorrowSuccess('');
  };

  // Search active borrow record based on typed barcode in Return tab
  const handleReturnBarcodeChange = (barcode: string) => {
    setReturnBarcode(barcode);
    setReturnError('');
    setReturnSuccess('');

    if (!barcode.trim()) {
      setActiveBorrowDetail(null);
      return;
    }

    const book = books.find(b => b.barcode.toUpperCase() === barcode.trim().toUpperCase());
    if (!book) {
      setActiveBorrowDetail(null);
      return;
    }

    // Find incomplete borrow record for this book
    const activeRec = records.find(r => r.bookId === book.id && (r.status === 'borrowed' || r.status === 'overdue'));
    if (activeRec) {
      setActiveBorrowDetail(activeRec);
    } else {
      setActiveBorrowDetail(null);
    }
  };

  const handleBorrowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBorrowError('');
    setBorrowSuccess('');

    if (!borrowBarcode.trim() || !selectedStudentId) {
      setBorrowError(language === 'kh' ? 'សូមបញ្ចូលបារកូដសៀវភៅ និងជ្រើសរើសសិស្ស!' : 'Please enter book barcode and select a student!');
      return;
    }

    // Check if book exists
    const book = books.find(b => b.barcode.toUpperCase() === borrowBarcode.trim().toUpperCase());
    if (!book) {
      setBorrowError(t.invalidBarcode);
      return;
    }

    // Check if book is available
    if (book.status !== 'available') {
      setBorrowError(t.bookNotAvailable);
      return;
    }

    // Process Borrow
    onBorrowBook({
      bookId: book.id,
      studentId: selectedStudentId,
      borrowDate,
      dueDate,
      status: 'borrowed',
      notes: borrowNotes,
    });

    setBorrowSuccess(t.borrowSuccess);
    setBorrowBarcode('');
    setBorrowNotes('');
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReturnError('');
    setReturnSuccess('');

    if (!returnBarcode.trim()) {
      setReturnError(language === 'kh' ? 'សូមបញ្ចូលលេខបារកូដ!' : 'Please input a barcode!');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const success = onReturnBook(returnBarcode.trim(), todayStr, returnNotes);

    if (success) {
      setReturnSuccess(t.returnSuccess);
      setReturnBarcode('');
      setReturnNotes('');
      setActiveBorrowDetail(null);
    } else {
      setReturnError(t.bookNotBorrowed);
    }
  };

  // Helper to fill from list for quick testing
  const selectQuickBook = (book: Book) => {
    handleScanProcessed(book.barcode, activeTab);
    setShowVirtualScan(false);
  };

  // Filter books list based on tab
  const scanOptionBooks = books.filter(b => {
    if (activeTab === 'borrow') {
      return b.status === 'available';
    } else {
      return b.status === 'borrowed' || b.status === 'overdue';
    }
  });

  return (
    <div id="borrow-return-view" className="space-y-6">
      {/* Tab Selector */}
      <div className="flex bg-white/35 backdrop-blur-md border border-white/50 p-1 rounded-2xl max-w-md shadow-sm">
        <button
          id="tab-borrow"
          onClick={() => {
            setActiveTab('borrow');
            setBorrowError('');
            setBorrowSuccess('');
          }}
          className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'borrow' 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 rotate-90" />
          {t.borrowBook}
        </button>
        <button
          id="tab-return"
          onClick={() => {
            setActiveTab('return');
            setReturnError('');
            setReturnSuccess('');
          }}
          className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'return' 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          {t.returnBook}
        </button>
      </div>

      {/* Smart Scan Station Control Center */}
      <div id="smart-scan-hub" className="glass-panel rounded-3xl border border-white/60 p-5 shadow-md bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-emerald-500/5 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-5 animate-fade-in">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Custom Animated Laser Barcode */}
          <div className="relative w-16 h-16 bg-slate-950/20 rounded-2xl border border-white/45 flex flex-col items-center justify-center overflow-hidden shrink-0 shadow-inner">
            <div className="flex gap-[2px] items-stretch h-8 opacity-70">
              <div className="w-[3px] bg-slate-600" />
              <div className="w-[1px] bg-slate-600" />
              <div className="w-[2px] bg-slate-600" />
              <div className="w-[4px] bg-slate-600" />
              <div className="w-[1px] bg-slate-600" />
              <div className="w-[2px] bg-slate-600" />
              <div className="w-[3px] bg-slate-600" />
              <div className="w-[1px] bg-slate-600" />
            </div>
            {/* Pulsing/bouncing red laser beam line */}
            <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-bounce" style={{ animationDuration: '2.5s' }} />
            <span className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-widest mt-1">Laser Ready</span>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              {language === 'kh' ? 'ស្ថានីយស្កេនបារកូដវៃឆ្លាត' : 'Smart Scan Station'}
            </h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 max-w-md leading-relaxed">
              {language === 'kh' 
                ? 'ប្រើប្រាស់កាមេរ៉ាកុំព្យូទ័រ ម៉ាស៊ីនស្កេនដៃ ឬប៊ូតុងសាកល្បង ដើម្បីស្កេន និងបង្ហាញលទ្ធផលភ្លាមៗ' 
                : 'Supports webcam camera, keyboard barcode scanners, or quick virtual books with instant overlay HUD'}
            </p>
          </div>
        </div>

        {/* Scan Triggers */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => {
              setScannerTarget('borrow');
              setShowCameraScanner(true);
            }}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition duration-200 shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-white animate-pulse" />
            <span>{language === 'kh' ? 'ស្កេនខ្ចីសៀវភៅ' : 'Scan to Borrow'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScannerTarget('return');
              setShowCameraScanner(true);
            }}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition duration-200 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 text-white" />
            <span>{language === 'kh' ? 'ស្កេនសងសៀវភៅ' : 'Scan to Return'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Borrow/Return Transaction Form Card */}
        <div className="glass-panel rounded-3xl border border-white/60 p-6 shadow-sm lg:col-span-2">
          {activeTab === 'borrow' ? (
            /* BORROW FORM */
            <form onSubmit={handleBorrowSubmit} className="space-y-5">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                {t.borrowBook}
              </h3>

              {borrowError && (
                <div className="bg-red-100/50 backdrop-blur-sm border-l-4 border-red-500 p-3.5 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{borrowError}</span>
                </div>
              )}

              {borrowSuccess && (
                <div className="bg-green-100/50 backdrop-blur-sm border-l-4 border-green-500 p-3.5 rounded-xl text-xs font-bold text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{borrowSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Barcode scan box */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.scanBarcode} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Scan className="h-4 w-4 text-slate-400" />
                      </span>
                      <input
                        id="borrow-barcode-input"
                        type="text"
                        value={borrowBarcode}
                        onChange={(e) => handleBorrowBarcodeChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleScanProcessed(borrowBarcode, 'borrow');
                          }
                        }}
                        placeholder="e.g. MATH-12-002, KH-12-001"
                        className="pl-9 pr-4 py-2.5 block w-full rounded-xl text-slate-800 font-mono text-sm focus:outline-none transition glass-input focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider block w-full">
                      {language === 'kh' ? '💡 វាយបញ្ចូលរួចចុច Enter ដើម្បីផ្ទៀងផ្ទាត់' : '💡 Press Enter to verify barcode immediately'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget('borrow');
                        setShowCameraScanner(true);
                      }}
                      className="px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <Camera className="w-4 h-4 text-blue-600" />
                      {language === 'kh' ? 'ស្កេនតាមកាមេរ៉ា' : 'Webcam Scan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVirtualScan(!showVirtualScan)}
                      className="px-3.5 bg-white/45 backdrop-blur hover:bg-white/75 text-slate-700 border border-white/60 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Scan className="w-4 h-4 text-blue-600" />
                      {language === 'kh' ? 'សាកល្បង' : 'Virtual'}
                    </button>
                  </div>
                </div>

                {/* Virtual Scanner Helper list overlay dropdown */}
                {showVirtualScan && (
                  <div className="bg-white/30 backdrop-blur p-4 rounded-2xl border border-white/45 space-y-2 animate-fade-in max-h-48 overflow-y-auto">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {language === 'kh' ? 'ចុចលើសៀវភៅខាងក្រោម ដើម្បីស្កេនយកបារកូដ៖' : 'Click a book below to virtual scan its barcode:'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {scanOptionBooks.length > 0 ? (
                        scanOptionBooks.map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => selectQuickBook(b)}
                            className="text-left p-2 bg-white/40 hover:bg-white/80 hover:border-blue-300 border border-white/40 rounded-xl text-xs font-semibold text-slate-700 transition flex justify-between items-center cursor-pointer"
                          >
                            <span className="truncate pr-2">{b.title}</span>
                            <span className="font-mono text-[10px] bg-white/60 px-1.5 py-0.5 rounded border border-white/40 shrink-0 font-bold text-slate-500">{b.barcode}</span>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 col-span-2 font-bold">
                          {language === 'kh' ? 'គ្មានសៀវភៅដែលអាចប្រើប្រាស់បានទេ' : 'No available books found in database.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Select Student */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.selectStudent} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </span>
                    <select
                      id="borrow-student-select"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="pl-9 pr-4 py-2.5 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition cursor-pointer glass-input"
                    >
                      <option value="">{language === 'kh' ? '-- ជ្រើសរើសសិស្សខ្ចី --' : '-- Select Borrowing Student --'}</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          [{s.studentId}] {s.name} - {s.classGrade}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {t.borrowDate}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-slate-400" />
                      </span>
                      <input
                        type="date"
                        value={borrowDate}
                        onChange={(e) => setBorrowDate(e.target.value)}
                        className="pl-9 pr-4 py-2.5 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition font-mono glass-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {t.dueDate}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="h-4 w-4 text-slate-400" />
                      </span>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="pl-9 pr-4 py-2.5 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition font-mono glass-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.notes}
                  </label>
                  <textarea
                    rows={2}
                    value={borrowNotes}
                    onChange={(e) => setBorrowNotes(e.target.value)}
                    placeholder={language === 'kh' ? 'ឧទាហរណ៍៖ សៀវភៅចាស់ សិស្សខ្ចីត្រៀមប្រលង...' : 'e.g. Preparing for exam, slightly worn book...'}
                    className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="borrow-submit-btn"
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 shadow-md shadow-blue-500/15 cursor-pointer"
                >
                  {language === 'kh' ? 'អនុញ្ញាតឱ្យខ្ចីសៀវភៅ' : 'Authorize Borrow Loan'}
                </button>
              </div>
            </form>
          ) : (
            /* RETURN FORM */
            <form onSubmit={handleReturnSubmit} className="space-y-5">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                {t.returnBook}
              </h3>

              {returnError && (
                <div className="bg-red-100/50 backdrop-blur-sm border-l-4 border-red-500 p-3.5 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{returnError}</span>
                </div>
              )}

              {returnSuccess && (
                <div className="bg-green-100/50 backdrop-blur-sm border-l-4 border-green-500 p-3.5 rounded-xl text-xs font-bold text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{returnSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Barcode input for Return */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'kh' ? 'ស្កេន ឬបញ្ចូលលេខបារកូដដើម្បីប្រគល់សៀវភៅវិញ' : 'Scan or Enter Barcode to Return Book'} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Scan className="h-4 w-4 text-slate-400" />
                      </span>
                      <input
                        id="return-barcode-input"
                        type="text"
                        value={returnBarcode}
                        onChange={(e) => handleReturnBarcodeChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleScanProcessed(returnBarcode, 'return');
                          }
                        }}
                        placeholder="e.g. MATH-12-002, PHYS-11-004"
                        className="pl-9 pr-4 py-2.5 block w-full rounded-xl text-slate-800 font-mono text-sm focus:outline-none transition glass-input focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider block w-full">
                      {language === 'kh' ? '💡 វាយបញ្ចូលរួចចុច Enter ដើម្បីផ្ទៀងផ្ទាត់' : '💡 Press Enter to verify barcode immediately'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget('return');
                        setShowCameraScanner(true);
                      }}
                      className="px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <Camera className="w-4 h-4 text-emerald-600" />
                      {language === 'kh' ? 'ស្កេនតាមកាមេរ៉ា' : 'Webcam Scan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVirtualScan(!showVirtualScan)}
                      className="px-3.5 bg-white/45 backdrop-blur hover:bg-white/75 text-slate-700 border border-white/60 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Scan className="w-4 h-4 text-emerald-600" />
                      {language === 'kh' ? 'សាកល្បង' : 'Virtual'}
                    </button>
                  </div>
                </div>

                {/* Virtual Scanner Helper for Return */}
                {showVirtualScan && (
                  <div className="bg-white/30 backdrop-blur p-4 rounded-2xl border border-white/45 space-y-2 animate-fade-in max-h-48 overflow-y-auto">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {language === 'kh' ? 'ចុចលើសៀវភៅខាងក្រោម ដើម្បីស្កេនសងសៀវភៅ៖' : 'Click a borrowed book below to virtual return its barcode:'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {scanOptionBooks.length > 0 ? (
                        scanOptionBooks.map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => selectQuickBook(b)}
                            className="text-left p-2 bg-white/40 hover:bg-white/80 hover:border-emerald-300 border border-white/40 rounded-xl text-xs font-semibold text-slate-700 transition flex justify-between items-center cursor-pointer"
                          >
                            <span className="truncate pr-2">{b.title}</span>
                            <span className="font-mono text-[10px] bg-white/60 px-1.5 py-0.5 rounded border border-white/40 shrink-0 font-bold text-slate-500">{b.barcode}</span>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 col-span-2 font-bold">
                          {language === 'kh' ? 'មិនមានសៀវភៅដែលកំពុងត្រូវបានខ្ចីទេ' : 'No books are currently borrowed.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Real-time Borrow Details Finder */}
                {activeBorrowDetail && (
                  <div className="bg-emerald-50/60 backdrop-blur-md p-4 rounded-2xl border border-emerald-200/50 space-y-2 shadow-inner">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      {language === 'kh' ? 'រកឃើញព័ត៌មាននៃការខ្ចីសកម្ម៖' : 'Active Loan Details Found:'}
                    </p>
                    <div className="grid grid-cols-2 gap-y-1.5 text-xs text-slate-600 font-bold">
                      <div>
                        {language === 'kh' ? 'សៀវភៅ៖' : 'Book Title:'} <span className="text-slate-800 font-black">
                          {books.find(b => b.id === activeBorrowDetail.bookId)?.title}
                        </span>
                      </div>
                      <div>
                        {language === 'kh' ? 'អ្នកខ្ចី៖' : 'Student Name:'} <span className="text-slate-800 font-black">
                          {students.find(s => s.id === activeBorrowDetail.studentId)?.name}
                        </span>
                      </div>
                      <div>
                        {language === 'kh' ? 'ថ្ងៃខ្ចី៖' : 'Borrow Date:'} <span className="text-slate-800 font-mono font-black">
                          {activeBorrowDetail.borrowDate}
                        </span>
                      </div>
                      <div>
                        {language === 'kh' ? 'ថ្ងៃត្រូវសង៖' : 'Due Date:'} <span className="text-slate-800 font-mono font-black">
                          {activeBorrowDetail.dueDate}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Return notes / Condition comments */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'kh' ? 'កំណត់សម្គាល់ពេលប្រគល់ (ជម្រើសចិត្ត)' : 'Return Comments / Condition notes'}
                  </label>
                  <textarea
                    rows={2}
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder={language === 'kh' ? 'សៀវភៅសងត្រឡប់មកវិញក្នុងស្ថានភាពល្អ គ្មានទំព័ររហែក...' : 'Returned in pristine condition, no pages torn...'}
                    className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="return-submit-btn"
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 shadow-md shadow-emerald-500/15 cursor-pointer"
                >
                  {language === 'kh' ? 'បញ្ជាក់ការសងសៀវភៅត្រឡប់មកវិញ' : 'Confirm Book Return'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Borrow records feed on the right column */}
        <div className="glass-panel rounded-3xl border border-white/60 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-indigo-600" />
              {language === 'kh' ? 'កំណត់ត្រាខ្ចី-សងចុងក្រោយ' : 'Recent Transaction History'}
            </h3>
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {records.length > 0 ? (
                [...records]
                  .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime())
                  .slice(0, 5)
                  .map(rec => {
                    const bk = books.find(b => b.id === rec.bookId);
                    const stu = students.find(s => s.id === rec.studentId);
                    return (
                      <div key={rec.id} className="p-3 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 text-xs flex gap-2.5 items-start shadow-sm">
                        {bk?.coverImage ? (
                          <img
                            src={bk.coverImage}
                            alt={bk.title}
                            className="w-8 h-10.5 object-cover rounded border border-white/40 shadow-sm shrink-0 bg-white mt-0.5"
                          />
                        ) : (
                          <div className="w-8 h-10.5 rounded border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-300 shrink-0 font-bold text-[6px] uppercase text-center p-0.5 leading-none mt-0.5">
                            <span>No</span>
                            <span>Pic</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-extrabold text-slate-800 truncate pr-2" title={bk?.title}>{bk?.title || 'Unknown Title'}</span>
                            <span className={`px-1.5 py-0.5 rounded border font-black tracking-wider text-[8px] uppercase shrink-0 ${
                              rec.status === 'returned'
                                ? 'bg-green-100/50 text-green-700 border-green-200/40'
                                : rec.status === 'overdue'
                                ? 'bg-red-100/50 text-red-700 border-red-200/40 animate-pulse'
                                : 'bg-blue-100/50 text-blue-700 border-blue-200/40'
                            }`}>
                              {rec.status === 'returned' 
                                ? (language === 'kh' ? 'សងរួច' : 'Returned')
                                : rec.status === 'overdue'
                                ? (language === 'kh' ? 'ហួសកំណត់' : 'Overdue')
                                : (language === 'kh' ? 'កំពុងខ្ចី' : 'Active')}
                            </span>
                          </div>
                          <div className="text-slate-600 font-semibold">
                            {language === 'kh' ? 'សិស្ស៖' : 'Borrower:'} <span className="text-slate-800 font-bold">{stu?.name || 'N/A'} ({stu?.classGrade})</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 font-bold font-mono pt-0.5">
                            <span>{language === 'kh' ? 'ថ្ងៃខ្ចី៖' : 'Borrow:'} {rec.borrowDate}</span>
                            <span>{language === 'kh' ? 'ថ្ងៃត្រូវសង៖' : 'Due:'} {rec.dueDate}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-8 text-slate-400 font-bold text-xs">
                  {language === 'kh' ? 'មិនទាន់មានកំណត់ត្រាខ្ចីនៅឡើយទេ' : 'No borrow records found.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCameraScanner && (
        <CameraScanner
          language={language}
          onScanSuccess={handleCameraScanSuccess}
          onClose={() => setShowCameraScanner(false)}
        />
      )}

      {/* Scanned Result Overlay */}
      <AnimatePresence>
        {scannedResult && (
          <ScannedResultModal
            scannedResult={scannedResult}
            language={language}
            students={students}
            books={books}
            records={records}
            onClose={() => setScannedResult(null)}
            onConfirmBorrow={(newRecord) => {
              onBorrowBook(newRecord);
              playSuccessChime();
              setBorrowSuccess(t.borrowSuccess);
              setBorrowBarcode('');
              setBorrowNotes('');
              setScannedResult(null);
            }}
            onConfirmReturn={(barcode, notes) => {
              const todayStr = new Date().toISOString().split('T')[0];
              const success = onReturnBook(barcode, todayStr, notes);
              if (success) {
                playSuccessChime();
                setReturnSuccess(t.returnSuccess);
                setReturnBarcode('');
                setReturnNotes('');
                setActiveBorrowDetail(null);
                setScannedResult(null);
                return true;
              }
              return false;
            }}
            onSwitchMode={(newMode) => {
              setScannedResult(prev => {
                if (!prev) return null;
                const activeRec = records.find(r => r.bookId === prev.book?.id && (r.status === 'borrowed' || r.status === 'overdue')) || null;
                return {
                  ...prev,
                  mode: newMode,
                  borrowRecord: activeRec,
                };
              });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// SCANNED RESULT HUD OVERLAY SUB-COMPONENT
// ==========================================
interface ScannedResultModalProps {
  scannedResult: {
    barcode: string;
    book: Book | null;
    mode: 'borrow' | 'return';
    studentId?: string;
    borrowRecord?: BorrowRecord | null;
    error?: string;
  };
  language: Language;
  students: Student[];
  books: Book[];
  records: BorrowRecord[];
  onClose: () => void;
  onConfirmBorrow: (record: Omit<BorrowRecord, 'id'>) => void;
  onConfirmReturn: (barcode: string, notes?: string) => boolean;
  onSwitchMode: (newMode: 'borrow' | 'return') => void;
}

const ScannedResultModal: React.FC<ScannedResultModalProps> = ({
  scannedResult,
  language,
  students,
  books,
  records,
  onClose,
  onConfirmBorrow,
  onConfirmReturn,
  onSwitchMode,
}) => {
  const [studentId, setStudentId] = useState(scannedResult.studentId || '');
  const [borrowNotes, setBorrowNotes] = useState('');
  const [returnNotes, setReturnNotes] = useState('');

  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const [borrowDate, setBorrowDate] = useState(today);
  const [dueDate, setDueDate] = useState(nextWeekStr);
  const [localError, setLocalError] = useState('');

  // Sync state if scannedResult changes
  useEffect(() => {
    setStudentId(scannedResult.studentId || '');
    setLocalError('');
  }, [scannedResult]);

  const { book, mode, barcode, error, borrowRecord } = scannedResult;

  const handleBorrowSubmit = () => {
    if (!book) return;
    if (!studentId) {
      setLocalError(language === 'kh' ? 'សូមជ្រើសរើសសិស្សដើម្បីខ្ចី!' : 'Please select a student borrower!');
      return;
    }
    onConfirmBorrow({
      bookId: book.id,
      studentId: studentId,
      borrowDate,
      dueDate,
      status: 'borrowed',
      notes: borrowNotes,
    });
  };

  const handleReturnSubmit = () => {
    if (!book) return;
    const success = onConfirmReturn(barcode, returnNotes);
    if (!success) {
      setLocalError(language === 'kh' ? 'ការប្រគល់មិនបានជោគជ័យឡើយ!' : 'Failed to process book return!');
    }
  };

  // Helper to calculate overdue days
  const getOverdueDays = (dueDateStr: string) => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = todayDate.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const selectedStudent = students.find(s => s.id === studentId);

  // Generates a nice background pattern/gradient based on book category
  const getCategoryColor = (cat?: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('math') || c.includes('គណិត')) return 'from-blue-600 to-indigo-700';
    if (c.includes('khmer') || c.includes('អក្សរ')) return 'from-amber-600 to-red-700';
    if (c.includes('phys') || c.includes('រូប')) return 'from-purple-600 to-violet-700';
    if (c.includes('chem') || c.includes('គីមី')) return 'from-emerald-600 to-teal-700';
    if (c.includes('bio') || c.includes('ជីវ')) return 'from-green-600 to-emerald-700';
    return 'from-slate-700 to-slate-900';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col my-8 animate-fade-in"
      >
        {/* Status Line Top Accent */}
        <div className={`h-2.5 w-full bg-gradient-to-r ${mode === 'borrow' ? 'from-blue-500 to-indigo-600' : 'from-emerald-500 to-teal-600'}`} />

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black font-mono tracking-widest uppercase px-2.5 py-1 rounded-full ${
              mode === 'borrow' 
                ? 'bg-blue-100 text-blue-800 border border-blue-200/50' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200/50'
            }`}>
              {mode === 'borrow' 
                ? (language === 'kh' ? 'ផ្ទៀងផ្ទាត់ការខ្ចី' : 'VERIFY BORROW') 
                : (language === 'kh' ? 'ផ្ទៀងផ្ទាត់ការសង' : 'VERIFY RETURN')}
            </span>
            <span className="font-mono text-xs font-bold text-slate-400">#{barcode}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer font-bold text-base"
          >
            &times;
          </button>
        </div>

        {/* Modal content body */}
        <div className="p-6 md:p-8 overflow-y-auto max-h-[75vh]">
          {error ? (
            /* ERROR MODE: UNRECOGNIZED BARCODE */
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-red-100 border border-red-200 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-slate-800">
                  {language === 'kh' ? 'រកមិនឃើញសៀវភៅ!' : 'Unrecognized Barcode!'}
                </h4>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  {error}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  {language === 'kh' ? 'បោះបង់' : 'Dismiss'}
                </button>
              </div>
            </div>
          ) : (
            /* SUCCESSFUL MATCH - SHOW SYSTEM INFO & ACTIONS */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Column: Book Spine Display */}
              <div className="md:col-span-5 flex flex-col items-center">
                {book?.coverImage ? (
                  <div className="relative group rounded-2xl overflow-hidden shadow-2xl border border-slate-100 bg-white transition duration-300 hover:scale-[1.03] w-full max-w-[160px]">
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-56 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-slate-900/85 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider">
                      {book.status}
                    </div>
                  </div>
                ) : (
                  /* Custom 3D-styled textured hardcover fallback */
                  <div className={`w-full max-w-[160px] h-56 bg-gradient-to-br ${getCategoryColor(book?.categoryId)} rounded-2xl shadow-2xl border border-white/20 p-4 flex flex-col justify-between text-white relative overflow-hidden transition duration-300 hover:scale-[1.03]`}>
                    {/* Spine texture overlay lines */}
                    <div className="absolute left-1.5 inset-y-0 w-[1px] bg-white/20" />
                    <div className="absolute left-2.5 inset-y-0 w-[1px] bg-white/10" />
                    
                    <div className="space-y-1 z-10 text-left">
                      <span className="text-[8px] font-black uppercase tracking-widest bg-white/20 px-1.5 py-0.5 rounded">
                        {book?.categoryId || 'General'}
                      </span>
                      <h4 className="font-extrabold text-sm line-clamp-3 leading-snug pt-1">
                        {book?.title}
                      </h4>
                    </div>

                    <div className="space-y-1.5 z-10 text-left">
                      <p className="text-[10px] font-medium opacity-80 italic truncate">
                        {book?.author || 'Unknown Author'}
                      </p>
                      <div className="border-t border-white/25 pt-1.5 flex justify-between text-[8px] font-mono opacity-90">
                        <span>LOB: {book?.location || 'A1'}</span>
                        <span>#{book?.barcode}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 text-center space-y-1">
                  <h5 className="font-extrabold text-slate-800 text-sm line-clamp-1">{book?.title}</h5>
                  <p className="text-xs text-slate-500 font-semibold">{book?.author}</p>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md mt-1 ${
                    book?.status === 'available' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {book?.status === 'available' 
                      ? (language === 'kh' ? 'សៀវភៅទំនេរ' : 'Available') 
                      : (language === 'kh' ? 'កំពុងត្រូវបានខ្ចី' : 'Borrowed')}
                  </span>
                </div>
              </div>

              {/* Right Column: Transaction Actions Panel */}
              <div className="md:col-span-7 space-y-5 text-left">
                {localError && (
                  <div className="bg-red-100 border border-red-200/50 p-3 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{localError}</span>
                  </div>
                )}

                {mode === 'borrow' ? (
                  /* BORROW PROCESS inside overlay */
                  book?.status === 'available' ? (
                    <div className="space-y-4">
                      {/* Borrower Student Dropdown */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          {language === 'kh' ? 'ជ្រើសរើសសិស្សខ្ចី *' : 'SELECT STUDENT BORROWER *'}
                        </label>
                        <select
                          value={studentId}
                          onChange={(e) => {
                            setStudentId(e.target.value);
                            setLocalError('');
                          }}
                          className="px-3 py-2.5 w-full rounded-xl text-slate-800 text-xs font-bold focus:outline-none transition glass-input bg-white/70 border border-slate-200"
                        >
                          <option value="">{language === 'kh' ? '-- ជ្រើសរើសសិស្ស --' : '-- Choose Student --'}</option>
                          {students.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.studentId} - {s.classGrade})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Display Selected Borrower Profile */}
                      {selectedStudent && (
                        <div className="bg-blue-50/55 border border-blue-100/40 p-3.5 rounded-2xl flex gap-2.5 items-start">
                          <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="text-xs space-y-0.5">
                            <p className="font-black text-slate-800">{selectedStudent.name}</p>
                            <p className="font-semibold text-slate-500">ID: {selectedStudent.studentId} • Class: {selectedStudent.classGrade}</p>
                            {selectedStudent.phoneNumber && (
                              <p className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">Tel: {selectedStudent.phoneNumber}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Date selection row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            {language === 'kh' ? 'ថ្ងៃខ្ចី' : 'BORROW DATE'}
                          </label>
                          <input
                            type="date"
                            value={borrowDate}
                            onChange={(e) => setBorrowDate(e.target.value)}
                            className="px-3 py-1.5 w-full rounded-xl text-slate-800 text-xs font-mono font-bold focus:outline-none transition glass-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            {language === 'kh' ? 'ថ្ងៃត្រូវសង' : 'DUE DATE'}
                          </label>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="px-3 py-1.5 w-full rounded-xl text-slate-800 text-xs font-mono font-bold focus:outline-none transition glass-input"
                          />
                        </div>
                      </div>

                      {/* Notes input */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          {language === 'kh' ? 'កំណត់សម្គាល់បន្ថែម' : 'LOAN REMARKS / NOTES'}
                        </label>
                        <textarea
                          rows={2}
                          value={borrowNotes}
                          onChange={(e) => setBorrowNotes(e.target.value)}
                          placeholder={language === 'kh' ? 'កំណត់ចំណាំផ្សេងៗ...' : 'Add remarks here...'}
                          className="px-3 py-2 block w-full rounded-xl text-slate-800 text-xs focus:outline-none transition glass-input"
                        />
                      </div>

                      {/* Submit action */}
                      <div className="pt-2">
                        <button
                          onClick={handleBorrowSubmit}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-blue-500/15 cursor-pointer"
                        >
                          <BookOpenCheck className="w-4.5 h-4.5" />
                          <span>{language === 'kh' ? 'បញ្ជាក់ការខ្ចីសៀវភៅ' : 'Authorize Book Loan'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ALREADY BORROWED ALERT WITH SMART ROUTING BUTTON */
                    <div className="space-y-4">
                      <div className="bg-amber-50/70 border border-amber-200/50 p-4 rounded-2xl space-y-2 text-xs">
                        <p className="font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                          {language === 'kh' ? 'សៀវភៅត្រូវបានខ្ចីរួចហើយ!' : 'Book already on Active Loan!'}
                        </p>
                        <p className="text-slate-600 font-semibold leading-relaxed">
                          {language === 'kh' 
                            ? 'សៀវភៅនេះត្រូវបានសម្គាល់ថា "កំពុងត្រូវបានខ្ចី" នៅក្នុងមូលដ្ឋានទិន្នន័យរួចហើយ។' 
                            : 'This book is marked as borrowed. You cannot issue a new loan until it is returned.'}
                        </p>

                        {/* Search loan details */}
                        {borrowRecord && (
                          <div className="border-t border-amber-200/40 pt-2.5 mt-2.5 space-y-1 text-[11px] font-bold text-slate-700">
                            <div>
                              {language === 'kh' ? 'សិស្សខ្ចី៖' : 'Borrower student:'} <span className="text-slate-900 font-extrabold">
                                {students.find(s => s.id === borrowRecord.studentId)?.name || 'Unknown student'}
                              </span>
                            </div>
                            <div>
                              {language === 'kh' ? 'ថ្ងៃត្រូវសង៖' : 'Due date:'} <span className="text-slate-900 font-mono font-extrabold">{borrowRecord.dueDate}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Smart Quick Route */}
                      <button
                        onClick={() => onSwitchMode('return')}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-emerald-500/15 cursor-pointer"
                      >
                        <ArrowRightLeft className="w-4 h-4 rotate-90" />
                        <span>{language === 'kh' ? 'ប្តូរទៅកាន់ "ការសងសៀវភៅវិញ"' : 'Switch to Return Mode & Process'}</span>
                      </button>
                    </div>
                  )
                ) : (
                  /* RETURN PROCESS inside overlay */
                  borrowRecord ? (
                    <div className="space-y-4">
                      {/* Active Loan Details */}
                      <div className="bg-emerald-50/50 border border-emerald-100/40 p-4 rounded-2xl space-y-2.5 text-xs">
                        <p className="font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                          {language === 'kh' ? 'រកឃើញព័ត៌មាននៃការខ្ចី៖' : 'Matching Active Loan Found:'}
                        </p>

                        <div className="grid grid-cols-2 gap-y-2 text-slate-600 font-bold">
                          <div>
                            {language === 'kh' ? 'អ្នកខ្ចី៖' : 'Student:'} <span className="text-slate-900 font-black">
                              {students.find(s => s.id === borrowRecord.studentId)?.name || 'N/A'}
                            </span>
                          </div>
                          <div>
                            {language === 'kh' ? 'ថ្នាក់៖' : 'Class/Grade:'} <span className="text-slate-900 font-black">
                              {students.find(s => s.id === borrowRecord.studentId)?.classGrade || 'N/A'}
                            </span>
                          </div>
                          <div>
                            {language === 'kh' ? 'ថ្ងៃខ្ចី៖' : 'Issued date:'} <span className="text-slate-900 font-mono font-black">{borrowRecord.borrowDate}</span>
                          </div>
                          <div>
                            {language === 'kh' ? 'ថ្ងៃត្រូវសង៖' : 'Due date:'} <span className="text-slate-900 font-mono font-black">{borrowRecord.dueDate}</span>
                          </div>
                        </div>

                        {/* Overdue alert indicator */}
                        {getOverdueDays(borrowRecord.dueDate) > 0 ? (
                          <div className="bg-red-100 border border-red-200/40 p-2.5 rounded-xl text-[11px] font-black text-red-700 flex items-center gap-2 animate-pulse mt-2">
                            <AlertCircle className="w-4.5 h-4.5 text-red-600 animate-bounce" />
                            <span>
                              {language === 'kh' 
                                ? `ហួសកាលកំណត់ចំនួន ${getOverdueDays(borrowRecord.dueDate)} ថ្ងៃ!` 
                                : `Overdue by ${getOverdueDays(borrowRecord.dueDate)} Days!`}
                            </span>
                          </div>
                        ) : (
                          <div className="bg-green-100 text-green-700 border border-green-200/40 p-2 rounded-xl text-[10px] font-black tracking-wide uppercase text-center mt-2">
                            {language === 'kh' ? 'សៀវភៅស្ថិតក្នុងសុពលភាពនៅឡើយ' : 'Loan is within valid period'}
                          </div>
                        )}
                      </div>

                      {/* Notes Input */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          {language === 'kh' ? 'ស្ថានភាពសៀវភៅ ឬកំណត់សម្គាល់បន្ថែម' : 'RETURN CONDITION REMARKS'}
                        </label>
                        <textarea
                          rows={2}
                          value={returnNotes}
                          onChange={(e) => setReturnNotes(e.target.value)}
                          placeholder={language === 'kh' ? 'សៀវភៅសងមកវិញក្នុងស្ថានភាពល្អ...' : 'Book returned in perfect state...'}
                          className="px-3 py-2 block w-full rounded-xl text-slate-800 text-xs focus:outline-none transition glass-input"
                        />
                      </div>

                      {/* Return submit button */}
                      <div className="pt-2">
                        <button
                          onClick={handleReturnSubmit}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-emerald-500/15 cursor-pointer"
                        >
                          <Check className="w-4.5 h-4.5" />
                          <span>{language === 'kh' ? 'យល់ព្រមទទួលសៀវភៅត្រឡប់មកវិញ' : 'Process Book Return'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ALREADY AVAILABLE ALERT WITH SMART ROUTING BUTTON */
                    <div className="space-y-4 text-center py-4">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 max-w-sm mx-auto">
                        <h5 className="font-extrabold text-slate-800 text-sm">
                          {language === 'kh' ? 'សៀវភៅនេះមានស្រាប់រួចហើយ!' : 'Book is already available!'}
                        </h5>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          {language === 'kh' 
                            ? 'សៀវភៅនេះមានស្ថានភាពជា "ទំនេរ" នៅក្នុងមូលដ្ឋានទិន្នន័យ។ មិនមានកំណត់ត្រាខ្ចីសកម្មដើម្បីដោះស្រាយការសងឡើយ។' 
                            : 'This book is already marked as available. No active loan record needs processing.'}
                        </p>
                      </div>

                      {/* Smart Quick Route */}
                      <div className="pt-2">
                        <button
                          onClick={() => onSwitchMode('borrow')}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-blue-500/15 cursor-pointer"
                        >
                          <ArrowRightLeft className="w-4 h-4 rotate-90" />
                          <span>{language === 'kh' ? 'ប្តូរទៅកាន់ "ការខ្ចីសៀវភៅ"' : 'Switch to Borrow Mode & Assign'}</span>
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
