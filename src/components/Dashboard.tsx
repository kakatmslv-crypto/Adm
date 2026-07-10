import { Book, Student, BorrowRecord, Category, Language, User } from '../types';
import { translations } from '../utils/translations';
import { BookOpen, Calendar, AlertTriangle, CheckCircle, Users, Activity, BellRing, Phone, Send, Check, Clock, Mail, MessageSquare, Smartphone, X, TrendingUp, Shield, QrCode, Lock, Printer, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Legend } from 'recharts';
import CategoryDistributionSummary from './CategoryDistributionSummary';
import LowQuantityWarning from './LowQuantityWarning';
import LowStockAlerts from './LowStockAlerts';
import BorrowingActivityTrend from './BorrowingActivityTrend';
import MonthlyBorrowingChart from './MonthlyBorrowingChart';
import DailyAttendanceActivity from './DailyAttendanceActivity';
import LibraryMap from './LibraryMap';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import schoolLogo from '../assets/images/school_logo_1783221279657.jpg';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';

interface DashboardProps {
  books: Book[];
  students: Student[];
  records: BorrowRecord[];
  categories: Category[];
  language: Language;
  currentUser?: User | null;
  onNavigateToBook?: (bookTitle: string) => void;
  onNavigateToStudent?: (studentId: string, studentName: string) => void;
}

export default function Dashboard({
  books,
  students,
  records,
  categories,
  language,
  currentUser,
  onNavigateToBook,
  onNavigateToStudent,
}: DashboardProps) {
  const t = translations[language];

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toKhmerDigits = (numStr: string | number): string => {
    const khmerNums = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return String(numStr).replace(/[0-9]/g, (w) => khmerNums[parseInt(w)]);
  };

  const getKhmerWeekday = (day: number) => {
    const days = ['ថ្ងៃអាទិត្យ', 'ថ្ងៃច័ន្ទ', 'ថ្ងៃអង្គារ', 'ថ្ងៃពុធ', 'ថ្ងៃព្រហស្បតិ៍', 'ថ្ងៃសុក្រ', 'ថ្ងៃសៅរ៍'];
    return days[day];
  };

  const getKhmerMonth = (month: number) => {
    const months = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
    return months[month];
  };

  const formatKhmerDate = (date: Date) => {
    const dayName = getKhmerWeekday(date.getDay());
    const dayNum = toKhmerDigits(date.getDate());
    const monthName = getKhmerMonth(date.getMonth());
    const yearNum = toKhmerDigits(date.getFullYear());
    return `${dayName} ទី${dayNum} ខែ${monthName} ឆ្នាំ${yearNum}`;
  };

  const formatEnglishDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date: Date, lang: 'kh' | 'en') => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    
    if (lang === 'kh') {
      const ampmKh = ampm === 'AM' ? 'ព្រឹក' : 'ល្ងាច';
      return `${toKhmerDigits(hoursStr)}:${toKhmerDigits(minutes)}:${toKhmerDigits(seconds)} ${ampmKh}`;
    } else {
      return `${hoursStr}:${minutes}:${seconds} ${ampm}`;
    }
  };

  const { showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState<'due' | 'overdue'>('due');
  const [sendingReminders, setSendingReminders] = useState<{ [key: string]: boolean }>({});
  const [sentReminders, setSentReminders] = useState<{ [key: string]: boolean }>({});

  const [activeReminder, setActiveReminder] = useState<{
    record: BorrowRecord;
    book: Book;
    student: Student;
  } | null>(null);
  const [reminderMode, setReminderMode] = useState<'sms' | 'email'>('sms');
  const [reminderPhone, setReminderPhone] = useState('');
  const [reminderEmail, setReminderEmail] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderSubject, setReminderSubject] = useState('');
  const [isSendingSimulated, setIsSendingSimulated] = useState(false);
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [availabilityBarView, setAvailabilityBarView] = useState<'overall' | 'category'>('overall');

  const todayStr = new Date().toISOString().split('T')[0];

  function getDaysBetween(startStr: string, endStr: string): number {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    start.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);
    const diffTime = end.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  const [studentQrCode, setStudentQrCode] = useState<string>('');

  const currentStudent = useMemo(() => {
    if (currentUser?.role === 'student') {
      return students.find(s => s.id === currentUser.id || s.studentId.toLowerCase() === currentUser.username.toLowerCase());
    }
    return null;
  }, [currentUser, students]);

  useEffect(() => {
    if (currentStudent) {
      QRCode.toDataURL(currentStudent.studentId, { margin: 1, width: 250 })
        .then(url => setStudentQrCode(url))
        .catch(err => console.error(err));
    }
  }, [currentStudent]);

  const studentRecords = useMemo(() => {
    if (!currentStudent) return [];
    return records.filter(r => r.studentId === currentStudent.id);
  }, [currentStudent, records]);

  const activeStudentRecords = useMemo(() => {
    return studentRecords.filter(r => r.status === 'borrowed' || r.status === 'overdue' || !r.returnDate);
  }, [studentRecords]);

  const returnedStudentRecords = useMemo(() => {
    return studentRecords.filter(r => r.status === 'returned' || !!r.returnDate);
  }, [studentRecords]);

  // If a student is logged in, intercept with a personalized, high-fidelity Student Portal dashboard.
  if (currentUser?.role === 'student') {
    return (
      <div id="student-portal-view" className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex items-center gap-4">
            {currentStudent?.photo ? (
              <img src={currentStudent.photo} alt={currentStudent.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow-md shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-2xl font-black text-blue-200 shrink-0 shadow-inner">
                {currentStudent?.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
                {language === 'kh' ? 'គណនីសិស្សផ្លូវការ' : 'Official Student Portal'}
              </p>
              <h1 className="text-2xl font-black tracking-tight mt-0.5">
                {language === 'kh' ? `សួស្តី, ${currentStudent?.name}!` : `Hello, ${currentStudent?.name}!`}
              </h1>
              <p className="text-xs text-slate-300 font-medium mt-1">
                {language === 'kh'
                  ? 'រីករាយស្វាគមន៍មកកាន់គណនីបណ្ណាល័យផ្ទាល់ខ្លួនរបស់អ្នក។'
                  : 'Welcome to your personalized library service dashboard.'}
              </p>
            </div>
          </div>
          <div className="relative z-10 bg-white/10 backdrop-blur border border-white/15 px-4.5 py-3 rounded-2xl flex items-center gap-3 shadow-inner">
            <Clock className="w-4.5 h-4.5 text-blue-300 shrink-0" />
            <div>
              <p className="text-xs font-black font-mono tracking-tight text-white leading-none mb-1">
                {formatTime(currentTime, language)}
              </p>
              <p className="text-[10px] text-slate-300 font-bold leading-none">
                {language === 'kh' ? formatKhmerDate(currentTime) : formatEnglishDate(currentTime)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Digital Student Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-indigo-950 via-blue-900 to-indigo-900 rounded-3xl p-6 text-white border border-white/15 shadow-xl relative overflow-hidden flex flex-col justify-between h-[340px] group transition duration-300 hover:shadow-blue-900/10">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent pointer-events-none"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                    Hun Sen Andoung Meas HS
                  </h3>
                  <p className="text-[9px] font-bold text-slate-300 uppercase leading-none">
                    Library Membership Card
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center p-0.5">
                  <img src={schoolLogo} alt="School Logo" className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="relative z-10 my-4 flex gap-4 items-center">
                {studentQrCode ? (
                  <div className="p-2 bg-white rounded-xl shadow-md shrink-0 border border-white/40">
                    <img src={studentQrCode} alt="Student QR" className="w-24 h-24" />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-slate-800/80 rounded-xl flex items-center justify-center animate-pulse border border-white/10 shrink-0">
                    <QrCode className="w-8 h-8 text-slate-500 animate-spin" />
                  </div>
                )}
                <div className="space-y-1.5 overflow-hidden">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300 leading-none">Student Name</p>
                  <p className="text-base font-black truncate leading-tight">{currentStudent?.name}</p>
                  
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10px]">
                    <div>
                      <p className="font-bold text-blue-300/80">Student ID</p>
                      <p className="font-mono font-bold text-white">{currentStudent?.studentId}</p>
                    </div>
                    <div>
                      <p className="font-bold text-blue-300/80">Grade/Class</p>
                      <p className="font-mono font-black text-white">{currentStudent?.classGrade}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-2 border-t border-white/10 flex justify-between items-center text-[9px] text-slate-300 font-bold">
                <span className="flex items-center gap-1 font-mono">
                  <Mail className="w-3 h-3 text-blue-300 shrink-0" />
                  <span className="truncate max-w-[140px]">{currentStudent?.email || 'N/A'}</span>
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-blue-300 shrink-0" />
                  <span>{currentStudent?.phoneNumber || 'N/A'}</span>
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed'}</p>
                  <p className="text-xl font-black text-slate-800 font-mono">{activeStudentRecords.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-3">
                <div className={`p-3 rounded-xl shrink-0 ${activeStudentRecords.some(r => r.status === 'overdue' || (r.dueDate && r.dueDate < todayStr)) ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'kh' ? 'ហួសកំណត់' : 'Overdue'}</p>
                  <p className="text-xl font-black text-slate-800 font-mono">
                    {activeStudentRecords.filter(r => r.status === 'overdue' || (r.dueDate && r.dueDate < todayStr)).length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'kh' ? 'បានសង' : 'Returned'}</p>
                  <p className="text-xl font-black text-slate-800 font-mono">{returnedStudentRecords.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'kh' ? 'សរុបទាំងអស់' : 'Total Logs'}</p>
                  <p className="text-xl font-black text-slate-800 font-mono">{studentRecords.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Borrowing Activity & Overdue Books */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-md">
              <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
                {language === 'kh' ? 'សៀវភៅកំពុងខ្ចីបច្ចុប្បន្ន' : 'Your Current Active Borrowings'}
              </h2>

              {activeStudentRecords.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-600">
                    {language === 'kh' ? 'អ្នកមិនមានការខ្ចីសៀវភៅបច្ចុប្បន្នទេ' : 'No active borrowed books!'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {language === 'kh' 
                      ? 'សូមអញ្ជើញមកកាន់បណ្ណាល័យសាលាដើម្បីស្វែងរក និងខ្ចីសៀវភៅអានបន្ថែម!' 
                      : 'Visit the school library catalog to borrow and expand your knowledge.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeStudentRecords.map(rec => {
                    const book = books.find(b => b.id === rec.bookId);
                    const isOverdue = rec.status === 'overdue' || (rec.dueDate && rec.dueDate < todayStr);
                    const daysLeft = rec.dueDate ? getDaysBetween(todayStr, rec.dueDate) : 0;
                    
                    return (
                      <div key={rec.id} className={`p-4 rounded-2xl border transition duration-200 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${isOverdue ? 'bg-rose-50/70 border-rose-100' : 'bg-white border-slate-100 shadow-sm hover:border-blue-200/80'}`}>
                        <div className="flex gap-3 items-start">
                          <div className={`p-3 rounded-xl shrink-0 ${isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-800 leading-tight">{book?.title || 'Unknown Title'}</h3>
                            <p className="text-xs text-slate-500 font-bold mt-0.5">By {book?.author || 'Unknown Author'}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] font-mono text-slate-400 font-bold">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {language === 'kh' ? 'ខ្ចីថ្ងៃ៖' : 'Borrowed:'} {rec.borrowDate}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {language === 'kh' ? 'ថ្ងៃត្រូវសង៖' : 'Due:'} {rec.dueDate}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="w-full sm:w-auto flex sm:flex-col items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {language === 'kh' ? 'ហួសកំណត់សង!' : 'OVERDUE!'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100">
                              <Clock className="w-3.5 h-3.5 text-blue-500" />
                              {language === 'kh' ? `សល់ ${toKhmerDigits(daysLeft)} ថ្ងៃទៀត` : `${daysLeft} days left`}
                            </span>
                          )}
                          <p className="text-[10px] text-slate-400 font-bold font-mono">ID: {book?.barcode}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* History logs */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-md">
              <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                {language === 'kh' ? 'ប្រវត្តិសងសៀវភៅរួចរាល់' : 'Your Borrowing History'}
              </h2>

              {returnedStudentRecords.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  {language === 'kh' ? 'មិនទាន់មានប្រវត្តិសងសៀវភៅនៅឡើយទេ' : 'No returned books found in history.'}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto pr-1 space-y-3">
                  {returnedStudentRecords.map(rec => {
                    const book = books.find(b => b.id === rec.bookId);
                    return (
                      <div key={rec.id} className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-200/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-800">{book?.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Returned: {rec.returnDate || rec.dueDate}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200/50 px-2 py-0.5 rounded font-bold">
                          {book?.barcode}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const openReminderModal = (rec: BorrowRecord) => {
    const book = books.find(b => b.id === rec.bookId);
    const student = students.find(s => s.id === rec.studentId);
    if (!book || !student) return;

    setActiveReminder({ record: rec, book, student });
    setReminderMode('sms');
    setReminderPhone(student.phoneNumber || '012 345 678');
    setReminderEmail(`${student.studentId.toLowerCase()}@student.edu.kh`);
    
    const days = Math.max(1, getDaysBetween(rec.dueDate, todayStr));
    const msg = language === 'kh'
      ? `ជម្រាបសួរ ${student.name}! នេះជាសាររំលឹកពីបណ្ណាល័យវិទ្យាល័យ ហ៊ុន សែន អណ្ដូងមាស។ សៀវភៅ «${book.title}» ដែលអ្នកបានខ្ចីគឺហួសកាលកំណត់ចំនួន ${days} ថ្ងៃហើយ។ សូមមេត្តាយកសៀវភៅមកសងវិញឱ្យបានឆាប់បំផុត។ សូមអរគុណ!`
      : `Hello ${student.name}, this is a reminder from the Hun Sen Andoung Meas High School Library. The book "${book.title}" you borrowed is overdue by ${days} days. Please return it as soon as possible. Thank you!`;
    
    const subject = language === 'kh'
      ? `សេចក្តីជូនដំណឹងអំពីការហួសកាលកំណត់សងសៀវភៅ - ${student.name}`
      : `Overdue Book Notice - ${student.name}`;

    setReminderMessage(msg);
    setReminderSubject(subject);
  };

  const handleTriggerSimulatedReminder = () => {
    if (!activeReminder) return;
    setIsSendingSimulated(true);
    setSimulationStep(1);

    // Step 1: Connecting (500ms)
    setTimeout(() => {
      setSimulationStep(2);
      // Step 2: Auth / Relay (500ms)
      setTimeout(() => {
        setSimulationStep(3);
        // Step 3: Delivering (500ms)
        setTimeout(() => {
          setIsSendingSimulated(false);
          setSimulationStep(0);
          
          const recordId = activeReminder.record.id;
          setSentReminders(prev => ({ ...prev, [recordId]: true }));
          
          const channelLabel = reminderMode === 'sms'
            ? (language === 'kh' ? `SMS ទៅកាន់លេខ ${reminderPhone}` : `SMS to ${reminderPhone}`)
            : (language === 'kh' ? `Email ទៅកាន់ ${reminderEmail}` : `Email to ${reminderEmail}`);
            
          const msg = language === 'kh'
            ? `បានផ្ញើសាររំលឹក (${channelLabel}) ទៅកាន់ ${activeReminder.student.name} ដោយជោគជ័យ!`
            : `Overdue reminder (${channelLabel}) sent successfully to ${activeReminder.student.name}!`;
            
          showSuccess(msg);
          setActiveReminder(null);
        }, 500);
      }, 500);
    }, 500);
  };

  const activeRecords = records.filter(r => r.status === 'borrowed' || r.status === 'overdue' || !r.returnDate);
  const dueTodayRecords = activeRecords.filter(r => r.dueDate === todayStr);
  const overdueRecords = activeRecords.filter(r => r.dueDate < todayStr);

  const formatDaysOverdue = (days: number) => {
    if (language === 'kh') {
      return `ហួសកំណត់ ${days} ថ្ងៃ`;
    }
    return `${days} ${days === 1 ? 'day' : 'days'} overdue`;
  };

  const handleSendReminder = (recordId: string, studentName: string, bookTitle: string, phoneNumber?: string) => {
    setSendingReminders(prev => ({ ...prev, [recordId]: true }));
    
    setTimeout(() => {
      setSendingReminders(prev => ({ ...prev, [recordId]: false }));
      setSentReminders(prev => ({ ...prev, [recordId]: true }));
      
      const channelText = phoneNumber 
        ? (language === 'kh' ? `តាមរយៈលេខទូរសព្ទ ${phoneNumber}` : `to phone ${phoneNumber}`)
        : (language === 'kh' ? `តាមរយៈប្រព័ន្ធក្នុងសាលា` : `via in-app notification`);
        
      const msg = language === 'kh'
        ? `បានផ្ញើសាររំលឹកទៅកាន់សិស្ស "${studentName}" (${channelText}) សម្រាប់សៀវភៅ "${bookTitle}" ដោយជោគជ័យ!`
        : `Reminder notification dispatched successfully to ${studentName} (${channelText}) for "${bookTitle}"!`;
        
      showSuccess(msg);
    }, 800);
  };

  // Dynamic statistics calculations
  const totalBooks = books.length;
  const borrowedBooks = books.filter(b => b.status === 'borrowed').length;
  const returnedRecords = records.filter(r => r.status === 'returned').length;
  const overdueBooks = books.filter(b => b.status === 'overdue').length;
  const totalStudents = students.length;

  // Pie chart data for Book Status
  const statusCounts = {
    available: books.filter(b => b.status === 'available').length,
    borrowed: books.filter(b => b.status === 'borrowed').length,
    overdue: books.filter(b => b.status === 'overdue').length,
    lost: books.filter(b => b.status === 'lost').length,
  };

  const statusPieData = [
    { name: t.available, value: statusCounts.available, color: '#10B981' }, // Green
    { name: t.borrowed, value: statusCounts.borrowed, color: '#3B82F6' }, // Blue
    { name: t.overdue, value: statusCounts.overdue, color: '#EF4444' }, // Red
    { name: t.lost, value: statusCounts.lost, color: '#F59E0B' }, // Amber
  ].filter(d => d.value > 0);

  // Bar chart data for Book Categories
  const categoryStats = categories.map(cat => {
    const count = books.filter(b => b.categoryId === cat.id).length;
    return {
      name: language === 'kh' ? cat.nameKh : cat.nameEn,
      count,
      color: cat.color || '#3B82F6',
    };
  });

  // Borrowed vs. Available books comparison data
  const overallBorrowedVsAvailableData = useMemo(() => {
    const availableCount = books.filter(b => b.status === 'available').length;
    const borrowedCount = books.filter(b => b.status === 'borrowed' || b.status === 'overdue').length;
    return [
      {
        name: language === 'kh' ? 'អាចខ្ចីបាន' : 'Available',
        count: availableCount,
        fill: '#10B981',
      },
      {
        name: language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed',
        count: borrowedCount,
        fill: '#3B82F6',
      }
    ];
  }, [books, language]);

  const categoryBorrowedVsAvailableData = useMemo(() => {
    return categories.map(cat => {
      const catBooks = books.filter(b => b.categoryId === cat.id);
      const available = catBooks.filter(b => b.status === 'available').length;
      const borrowed = catBooks.filter(b => b.status === 'borrowed' || b.status === 'overdue').length;
      return {
        name: language === 'kh' ? cat.nameKh : cat.nameEn,
        [language === 'kh' ? 'អាចខ្ចីបាន' : 'Available']: available,
        [language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed']: borrowed,
      };
    });
  }, [books, categories, language]);

  // Monthly borrowing trends for the current year
  const monthlyTrendData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthsKh = [
      'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];
    const monthsEn = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    return Array.from({ length: 12 }, (_, index) => {
      const monthStr = String(index + 1).padStart(2, '0');
      const yearMonthPrefix = `${currentYear}-${monthStr}`;
      
      const monthRecords = records.filter(r => r.borrowDate.startsWith(yearMonthPrefix));
      const borrowedCount = monthRecords.length;

      return {
        monthLabel: language === 'kh' ? monthsKh[index] : monthsEn[index],
        borrowed: borrowedCount,
      };
    });
  }, [records, language]);

  // Recent activity logs (mapping actual records for chronological authenticity)
  const recentActivities = useMemo(() => {
    const events: Array<{
      id: string;
      bookTitle: string;
      bookId: string;
      studentName: string;
      studentId: string;
      type: 'borrow' | 'return';
      action: string;
      date: string;
      status: string;
    }> = [];

    records.forEach(rec => {
      const book = books.find(b => b.id === rec.bookId);
      const student = students.find(s => s.id === rec.studentId);
      const bookTitle = book?.title || 'Unknown Book';
      const studentName = student?.name || 'Unknown Student';

      // Add borrow event
      events.push({
        id: `${rec.id}-borrow`,
        bookTitle,
        bookId: rec.bookId,
        studentName,
        studentId: rec.studentId,
        type: 'borrow',
        action: language === 'kh' ? 'ខ្ចីសៀវភៅ' : 'Borrowed',
        date: rec.borrowDate,
        status: 'borrowed',
      });

      // Add return event if present
      if (rec.returnDate) {
        events.push({
          id: `${rec.id}-return`,
          bookTitle,
          bookId: rec.bookId,
          studentName,
          studentId: rec.studentId,
          type: 'return',
          action: language === 'kh' ? 'សងត្រឡប់' : 'Returned',
          date: rec.returnDate,
          status: 'returned',
        });
      }
    });

    // Sort by date descending
    return events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [records, books, students, language]);

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Page Title & Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900/95 to-indigo-950/95 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-white/10">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
              <img src={schoolLogo} alt="School Logo" className="w-full h-full object-cover" />
            </div>
            {t.appName}
          </h1>
          <p className="text-xs text-blue-200 font-bold mt-1">
            {language === 'kh' 
              ? 'សូមស្វាគមន៍មកកាន់ប្រព័ន្ធគ្រប់គ្រងបណ្ណាល័យសាលាជាផ្លូវការរបស់វិទ្យាល័យអណ្ដូងមាស'
              : 'Welcome to the official library management software for Hun Sen Andoung Meas High School.'}
          </p>
        </div>
        <div className="bg-white/15 backdrop-blur border border-white/20 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-inner">
          <div className="p-1.5 bg-white/10 rounded-lg text-white shrink-0">
            <Clock className="w-4 h-4 text-blue-200" />
          </div>
          <div className="text-left">
            <p className="text-xs font-black font-mono tracking-tight leading-none text-white">
              {formatTime(currentTime, language)}
            </p>
            <p className="text-[10px] text-blue-200 font-bold mt-1 leading-none">
              {language === 'kh' ? formatKhmerDate(currentTime) : formatEnglishDate(currentTime)}
            </p>
          </div>
        </div>
      </div>

      {/* Visual indicator for currently overdue books */}
      {overdueRecords.length > 0 && (
        <div id="dashboard-overdue-banner" className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-3xl p-5 shadow-lg border border-red-400 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-pulse-slow">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/10 rounded-2xl text-white shrink-0 shadow-inner">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">
                {language === 'kh' ? 'មានសៀវភៅហួសកាលកំណត់សងសកម្ម!' : 'Urgent: Overdue Books Detected!'}
              </h2>
              <p className="text-xs text-red-100 font-medium mt-1">
                {language === 'kh' 
                  ? `បច្ចុប្បន្នមានសៀវភៅចំនួន ${overdueRecords.length} ក្បាលដែលត្រូវបានខ្ចីហួសកាលកំណត់សង។ សូមពិនិត្យមើលបញ្ជីលម្អិតខាងក្រោមដើម្បីផ្ញើសាររំលឹក។`
                  : `There are currently ${overdueRecords.length} books past their return due date. Please inspect the list below and dispatch reminders to patrons.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('alerts-desk-section');
              if (el) {
                setActiveTab('overdue');
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="shrink-0 px-4 py-2 bg-white text-red-600 hover:bg-red-50 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition duration-150 cursor-pointer"
          >
            {language === 'kh' ? 'ពិនិត្យមើលឥឡូវនេះ' : 'Inspect Now'}
          </button>
        </div>
      )}

      {/* At-a-Glance Library Status Summary Section */}
      <div id="library-status-at-a-glance" className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm bg-gradient-to-br from-slate-50/50 to-white/30 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
          <div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {language === 'kh' ? 'សេចក្តីសង្ខេបស្ថានភាពបណ្ណាល័យ' : 'Library Status At-a-Glance'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              {language === 'kh' ? 'ព័ត៌មានសង្ខេបពីសកម្មភាពបណ្ណាល័យបច្ចុប្បន្ន' : 'Real-time high-level operational overview of active library metrics'}
            </p>
          </div>
          <div className="px-2.5 py-1 bg-white/80 border border-slate-200/50 rounded-lg text-[9px] font-black uppercase text-slate-500 tracking-wider">
            {language === 'kh' ? 'ស្ថានភាពបច្ចុប្បន្ន' : 'Live Status'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Active Loans Card */}
          <div className="bg-white/75 border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {language === 'kh' ? 'ការខ្ចីសកម្មសរុប' : 'Total Active Loans'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800 tracking-tight font-mono">
                    {activeRecords.length}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {language === 'kh' ? 'សៀវភៅ' : 'titles'}
                  </span>
                </div>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-500">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-mono">
                {books.length > 0 ? Math.round((activeRecords.length / books.length) * 100) : 0}%
              </span>
              <span>{language === 'kh' ? 'នៃសៀវភៅសរុបទាំងអស់' : 'of total catalog volume'}</span>
            </div>
          </div>

          {/* Overdue Books Card */}
          <div className="bg-white/75 border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {language === 'kh' ? 'សៀវភៅហួសកាលកំណត់' : 'Overdue Books'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800 tracking-tight font-mono">
                    {overdueRecords.length}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {language === 'kh' ? 'កំណត់ត្រា' : 'records'}
                  </span>
                </div>
              </div>
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-500">
              {overdueRecords.length > 0 ? (
                <>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 font-mono">
                    {Math.round((overdueRecords.length / (activeRecords.length || 1)) * 100)}%
                  </span>
                  <span>{language === 'kh' ? 'នៃសៀវភៅកំពុងខ្ចីទាំងអស់' : 'of active borrowings'}</span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
                    0%
                  </span>
                  <span>{language === 'kh' ? 'គ្មានការខ្ចីហួសកំណត់ទេ' : 'Excellent return rate'}</span>
                </>
              )}
            </div>
          </div>

          {/* Total Students Card */}
          <div className="bg-white/75 border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {language === 'kh' ? 'សិស្សចុះឈ្មោះសរុប' : 'Total Students'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800 tracking-tight font-mono">
                    {totalStudents}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {language === 'kh' ? 'នាក់' : 'readers'}
                  </span>
                </div>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-500">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                {Array.from(new Set(activeRecords.map(r => r.studentId))).length}
              </span>
              <span>{language === 'kh' ? 'សិស្សកំពុងខ្ចីសកម្ម' : 'active borrowers today'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics Section */}
      <div id="summary-statistics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Books */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t.totalBooks}</p>
            <h3 className="text-2xl font-black text-slate-800 leading-tight">{totalBooks}</h3>
          </div>
        </div>

        {/* Registered Students */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{language === 'kh' ? 'សិស្សចុះឈ្មោះ' : 'Registered Students'}</p>
            <h3 className="text-2xl font-black text-slate-800 leading-tight">{totalStudents}</h3>
          </div>
        </div>

        {/* Active Loans */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{language === 'kh' ? 'ការខ្ចីសកម្ម' : 'Active Loans'}</p>
            <h3 className="text-2xl font-black text-slate-800 leading-tight">{activeRecords.length}</h3>
          </div>
        </div>

        {/* Overdue Books */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t.overdueBooks}</p>
            <h3 className="text-2xl font-black text-slate-800 leading-tight">{overdueBooks}</h3>
          </div>
        </div>
      </div>

      {/* Due Today & Overdue Alerts Desk */}
      <div id="alerts-desk-section" className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {language === 'kh' ? 'ផ្ទាំងគ្រប់គ្រងការរំលឹកកាលបរិច្ឆេទ & ហួសកំណត់' : 'Due & Overdue Alerts Desk'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                {language === 'kh' ? 'ពិនិត្យមើលសៀវភៅដែលត្រូវសងថ្ងៃនេះ និងសៀវភៅហួសកាលកំណត់សង' : 'Monitor books due today and actively manage overdue borrowings'}
              </p>
            </div>
          </div>

          {/* Tab Toggles */}
          <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl self-start">
            <button
              onClick={() => setActiveTab('due')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'due' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{language === 'kh' ? 'ត្រូវសងថ្ងៃនេះ' : 'Due Today'}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                dueTodayRecords.length > 0 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-slate-200/60 text-slate-500'
              }`}>
                {dueTodayRecords.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'overdue' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{language === 'kh' ? 'ហួសកំណត់សង' : 'Overdue'}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                overdueRecords.length > 0 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-slate-200/60 text-slate-500'
              }`}>
                {overdueRecords.length}
              </span>
            </button>
          </div>
        </div>

        {/* List of alerts */}
        <div className="space-y-4">
          {activeTab === 'due' ? (
            dueTodayRecords.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dueTodayRecords.map(rec => {
                  const book = books.find(b => b.id === rec.bookId);
                  const student = students.find(s => s.id === rec.studentId);
                  const isSending = sendingReminders[rec.id];
                  const isSent = sentReminders[rec.id];

                  return (
                    <div key={rec.id} className="flex flex-col justify-between bg-amber-50/40 border border-amber-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200/30">
                            {language === 'kh' ? 'ថ្ងៃនេះ' : 'Today'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            ID: {student?.studentId || '-'}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-black text-slate-800 line-clamp-1">
                            {book?.title || 'Unknown Book'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold font-mono">
                            Barcode: {book?.barcode || '-'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/60 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 font-medium block">{language === 'kh' ? 'ឈ្មោះសិស្ស' : 'Student'}</span>
                            <span className="font-bold text-slate-700">{student?.name || 'Unknown'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">{language === 'kh' ? 'ថ្នាក់/បន្ទប់' : 'Class'}</span>
                            <span className="font-bold font-mono text-slate-700">{student?.classGrade || 'N/A'}</span>
                          </div>
                          {student?.phoneNumber && (
                            <div className="col-span-2 border-t border-slate-100 pt-1.5 mt-0.5 flex items-center gap-1.5 text-slate-600 font-bold">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono">{student.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100/60 flex justify-end">
                        <button
                          type="button"
                          disabled={isSending || isSent}
                          onClick={() => openReminderModal(rec)}
                          className={`w-full sm:w-auto px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            isSent 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed'
                              : isSending
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-sm hover:border-slate-300'
                          }`}
                        >
                          {isSent ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>{language === 'kh' ? 'បានផ្ញើ ✓' : 'Sent ✓'}</span>
                            </>
                          ) : isSending ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                              <span>{language === 'kh' ? 'កំពុងផ្ញើ...' : 'Sending...'}</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>{language === 'kh' ? 'ផ្ញើសាររំលឹក' : 'Send Reminder'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl py-12 px-6 text-center flex flex-col items-center gap-3">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'kh' ? 'មិនមានសៀវភៅត្រូវសងថ្ងៃនេះទេ' : 'No books due today'}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{language === 'kh' ? 'ការងារល្អ! គណនីទាំងអស់មានសភាពធម្មតា។' : 'Outstanding! All borrowings are currently in good standing.'}</p>
                </div>
              </div>
            )
          ) : (
            overdueRecords.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overdueRecords.map(rec => {
                  const book = books.find(b => b.id === rec.bookId);
                  const student = students.find(s => s.id === rec.studentId);
                  const isSending = sendingReminders[rec.id];
                  const isSent = sentReminders[rec.id];
                  const days = getDaysBetween(rec.dueDate, todayStr);

                  return (
                    <div key={rec.id} className="flex flex-col justify-between bg-rose-50/40 border border-rose-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200/30">
                            {formatDaysOverdue(days)}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            ID: {student?.studentId || '-'}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-black text-slate-800 line-clamp-1">
                            {book?.title || 'Unknown Book'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold font-mono">
                            Barcode: {book?.barcode || '-'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/60 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 font-medium block">{language === 'kh' ? 'ឈ្មោះសិស្ស' : 'Student'}</span>
                            <span className="font-bold text-slate-700">{student?.name || 'Unknown'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">{language === 'kh' ? 'ថ្នាក់/បន្ទប់' : 'Class'}</span>
                            <span className="font-bold font-mono text-slate-700">{student?.classGrade || 'N/A'}</span>
                          </div>
                          <div className="col-span-2 border-t border-slate-100 pt-1.5 mt-0.5 flex flex-col gap-1 text-[10px] font-semibold text-slate-500">
                            <span className="flex items-center gap-1.5 font-bold text-rose-600">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{language === 'kh' ? `កាលកំណត់៖ ${rec.dueDate}` : `Due: ${rec.dueDate}`}</span>
                            </span>
                            {student?.phoneNumber && (
                              <span className="flex items-center gap-1.5 font-bold text-slate-600 mt-1 font-mono text-[11px]">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{student.phoneNumber}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100/60 flex justify-end">
                        <button
                          type="button"
                          disabled={isSending || isSent}
                          onClick={() => openReminderModal(rec)}
                          className={`w-full sm:w-auto px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            isSent 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed'
                              : isSending
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700 text-white shadow-sm'
                          }`}
                        >
                          {isSent ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>{language === 'kh' ? 'បានផ្ញើ ✓' : 'Sent ✓'}</span>
                            </>
                          ) : isSending ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                              <span>{language === 'kh' ? 'កំពុងផ្ញើ...' : 'Sending...'}</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>{language === 'kh' ? 'ផ្ញើសាររំលឹក' : 'Send Reminder'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl py-12 px-6 text-center flex flex-col items-center gap-3">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{language === 'kh' ? 'មិនមានសៀវភៅហួសកំណត់សងទេ' : 'No overdue books'}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{language === 'kh' ? 'ការងារល្អ! គណនីទាំងអស់មានសភាពធម្មតា។' : 'Outstanding! All borrowings are currently in good standing.'}</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Library Map Section */}
      <LibraryMap 
        books={books} 
        categories={categories} 
        language={language} 
      />

      {/* Category Inventory Summary Component */}
      <CategoryDistributionSummary 
        books={books} 
        categories={categories} 
        language={language} 
      />

      {/* 30-Day Borrowing & Return Trends */}
      <BorrowingActivityTrend 
        records={records} 
        language={language} 
      />

      {/* Monthly Borrowing Trends for School Year */}
      <MonthlyBorrowingChart
        records={records}
        language={language}
      />

      {/* Daily Attendance & Activity */}
      <DailyAttendanceActivity 
        records={records} 
        language={language} 
      />

      {/* Graphical Insights section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Books by Category Bar Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              {language === 'kh' ? 'ស្ថិតិសៀវភៅតាមមុខវិជ្ជា/ប្រភេទ' : 'Books Distribution by Subject Category'}
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStats} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0/50" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.6)', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Book Availability Status Pie Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {language === 'kh' ? 'អត្រាស្ថានភាពសៀវភៅបច្ចុប្បន្ន' : 'Book Availability Rates'}
            </h3>
          </div>
          {statusPieData.length > 0 ? (
            <div className="h-44 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <p className="text-2xl font-black text-slate-800">{totalBooks}</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{language === 'kh' ? 'សៀវភៅសរុប' : 'Total Items'}</p>
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">
              No status records to visualize
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs pt-4 border-t border-white/50">
            {statusPieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: d.color }}></span>
                <span className="text-slate-500 font-bold truncate">{d.name}: <b>{d.value}</b></span>
              </div>
            ))}
          </div>
        </div>

        {/* Book Category Distribution Pie Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              {language === 'kh' ? 'ចំណែកតាមប្រភេទសៀវភៅ' : 'Category Distribution'}
            </h3>
          </div>
          {categoryStats.length > 0 ? (
            <div className="h-44 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">
              No categories to visualize
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs pt-4 border-t border-white/50 max-h-24 overflow-y-auto">
            {categoryStats.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: d.color }}></span>
                <span className="text-slate-500 font-bold truncate">{d.name}: <b>{d.count}</b></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Analytical Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Borrowed vs. Available Books Bar Chart */}
        <div id="borrowed-vs-available-chart" className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <BarChart className="w-4.5 h-4.5 text-blue-600" />
                {language === 'kh' ? 'ការប្រៀបធៀប សៀវភៅអាចខ្ចីបាន VS កំពុងខ្ចី' : 'Available vs. Borrowed Books'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                {language === 'kh' ? 'ស្ថិតិប្រៀបធៀបសៀវភៅក្នុងបណ្ណាល័យ និងសៀវភៅដែលសិស្សកំពុងខ្ចី' : 'Comparison of stock availability and active borrowings'}
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setAvailabilityBarView('overall')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                  availabilityBarView === 'overall'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {language === 'kh' ? 'សរុប' : 'Overall'}
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityBarView('category')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                  availabilityBarView === 'category'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {language === 'kh' ? 'តាមប្រភេទ' : 'By Category'}
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {availabilityBarView === 'overall' ? (
                <BarChart data={overallBorrowedVsAvailableData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 'bold' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={60}>
                    {overallBorrowedVsAvailableData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={categoryBorrowedVsAvailableData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '11px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Bar dataKey={language === 'kh' ? 'ដែលអាចខ្ចីបាន' : 'Available'} fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed'} fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Borrowing Trends Line Chart */}
        <div id="monthly-borrowing-trends-chart" className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-indigo-600" />
              {language === 'kh' ? `និន្នាការខ្ចីសៀវភៅប្រចាំខែ ឆ្នាំ ${new Date().getFullYear()}` : `Monthly Borrowing Trends (${new Date().getFullYear()})`}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5 mb-4">
              {language === 'kh' ? 'ការតាមដានការខ្ចីសៀវភៅប្រចាំខែក្នុងឆ្នាំនេះ ដើម្បីវិភាគពីតម្រូវការសិស្ស' : 'Monthly overview of library checkout performance and volume throughout the current year'}
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 9, fill: '#64748B', fontWeight: 'bold' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '11px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                <Line 
                  type="monotone" 
                  dataKey="borrowed" 
                  name={language === 'kh' ? 'ការខ្ចីសៀវភៅ' : 'Books Borrowed'} 
                  stroke="#6366F1" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alerts and Activity Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Low Stock & Borrow Alerts Widget */}
        <div className="lg:col-span-3">
          <LowStockAlerts 
            books={books} 
            records={records}
            students={students}
            categories={categories} 
            language={language} 
            onRemindStudent={openReminderModal}
          />
        </div>

        {/* Recent Activities Section */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-white/60 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-blue-600" />
              {t.recentActivity}
            </h3>
            <div id="recent-activities-list" className="flow-root max-h-[380px] overflow-y-auto pr-1">
              <ul className="-mb-8">
                <AnimatePresence initial={false}>
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity, activityIdx) => (
                      <motion.li
                        key={activity.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        layout
                      >
                        <div className="relative pb-8">
                          {activityIdx !== recentActivities.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                activity.type === 'return'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : 'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>
                                {activity.type === 'return' ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <BookOpen className="w-4 h-4" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-800 truncate">
                                  <button
                                    id={`activity-book-${activity.id}`}
                                    onClick={() => onNavigateToBook?.(activity.bookTitle)}
                                    className="hover:text-blue-600 transition text-left truncate block w-full focus:outline-none cursor-pointer"
                                    title={language === 'kh' ? 'មើលសៀវភៅ' : 'View Book Details'}
                                  >
                                    {activity.bookTitle}
                                  </button>
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                                  <span>{language === 'kh' ? 'សិស្ស៖' : 'Student:'}</span>
                                  <button
                                    id={`activity-student-${activity.id}`}
                                    onClick={() => onNavigateToStudent?.(activity.studentId, activity.studentName)}
                                    className="text-slate-600 font-extrabold hover:text-blue-600 transition cursor-pointer text-left focus:outline-none"
                                    title={language === 'kh' ? 'មើលសិស្ស' : 'View Student Details'}
                                  >
                                    {activity.studentName}
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-wider ${
                                activity.type === 'return'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                                  : 'bg-blue-50 text-blue-700 border-blue-200/50'
                              }`}>
                                {activity.type === 'return' 
                                  ? (language === 'kh' ? 'សងសៀវភៅ' : 'Return')
                                  : (language === 'kh' ? 'ខ្ចីសៀវភៅ' : 'Borrow')
                                }
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 font-mono">
                                {activity.date}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    ))
                  ) : (
                    <motion.div
                      key="empty-activity"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-6 text-slate-400 text-xs font-medium"
                    >
                      {language === 'kh' ? 'មិនទាន់មានកំណត់ត្រាសកម្មភាពនៅឡើយទេ' : 'No library actions recorded yet.'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive SMS/Email Reminder Dialog */}
      {activeReminder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    {language === 'kh' ? 'ផ្ញើសាររំលឹកកាលកំណត់សង' : 'Dispatch Overdue Reminder'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {language === 'kh' ? 'ជ្រើសរើសជម្រើស SMS ឬ Email សម្រាប់សិស្ស' : 'Choose SMS or Email communication for student'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveReminder(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Student Summary Panel */}
              <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-slate-900">{activeReminder.student.name}</span>
                    <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      {activeReminder.student.studentId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold truncate max-w-[240px]">
                    {language === 'kh' ? 'ខ្ចីសៀវភៅ៖' : 'Borrowed:'} <span className="text-slate-800">«{activeReminder.book.title}»</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg inline-block">
                    {language === 'kh' 
                      ? `ហួសកំណត់៖ ${Math.max(1, getDaysBetween(activeReminder.record.dueDate, todayStr))} ថ្ងៃ`
                      : `${Math.max(1, getDaysBetween(activeReminder.record.dueDate, todayStr))} days overdue`}
                  </span>
                  <p className="text-[9px] text-slate-400 font-semibold font-mono mt-0.5">
                    {language === 'kh' ? `កាលកំណត់៖ ${activeReminder.record.dueDate}` : `Due date: ${activeReminder.record.dueDate}`}
                  </p>
                </div>
              </div>

              {/* Mode Toggle (SMS vs Email) */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setReminderMode('sms')}
                  className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition ${
                    reminderMode === 'sms'
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{language === 'kh' ? 'សារទូរសព្ទ (SMS)' : 'SMS Text'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReminderMode('email')}
                  className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition ${
                    reminderMode === 'email'
                      ? 'bg-white text-indigo-600 shadow-md'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>{language === 'kh' ? 'អុីម៉ែល (Email)' : 'Email'}</span>
                </button>
              </div>

              {/* Fields */}
              <div className="space-y-3.5">
                {reminderMode === 'sms' ? (
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      {language === 'kh' ? 'លេខទូរសព្ទអ្នកទទួល' : 'Recipient Phone Number'}
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
                      <input
                        type="tel"
                        value={reminderPhone}
                        onChange={(e) => setReminderPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition"
                        placeholder="e.g. 012 345 678"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        {language === 'kh' ? 'អាសយដ្ឋានអុីម៉ែលសិស្ស' : 'Recipient Email Address'}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
                        <input
                          type="email"
                          value={reminderEmail}
                          onChange={(e) => setReminderEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition"
                          placeholder="e.g. student@school.edu.kh"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        {language === 'kh' ? 'ប្រធានបទអុីម៉ែល' : 'Email Subject Line'}
                      </label>
                      <input
                        type="text"
                        value={reminderSubject}
                        onChange={(e) => setReminderSubject(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition"
                        placeholder="Subject"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    {language === 'kh' ? 'ខ្លឹមសារសាររំលឹក' : 'Notification Message Template'}
                  </label>
                  <textarea
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl text-xs font-bold text-slate-700 outline-none transition resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Simulation steps animation overlay */}
              {isSendingSimulated && (
                <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 space-y-3 shadow-inner animate-pulse">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-wider uppercase text-blue-400">
                      {language === 'kh' ? 'បច្ចេកវិទ្យាកំពុងដំណើរការ...' : 'Simulated Gateway Dispatching...'}
                    </span>
                    <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                  </div>
                  <div className="space-y-1.5 font-mono text-[10px] text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className={simulationStep >= 1 ? "text-emerald-400 font-black" : "text-slate-600"}>
                        {simulationStep >= 1 ? "✓" : "○"}
                      </span>
                      <span className={simulationStep === 1 ? "text-white" : "text-slate-400"}>
                        {reminderMode === 'sms'
                          ? (language === 'kh' ? 'កំពុងភ្ជាប់ទៅកាន់ប្រព័ន្ធ SMS Gateway API...' : 'Connecting to high-speed SMS Gateway API...')
                          : (language === 'kh' ? 'កំពុងបើកការភ្ជាប់ទៅកាន់ប្រព័ន្ធ SMTP Server...' : 'Establishing secure handshake with school SMTP Server...')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={simulationStep >= 2 ? "text-emerald-400 font-black" : "text-slate-600"}>
                        {simulationStep >= 2 ? "✓" : "○"}
                      </span>
                      <span className={simulationStep === 2 ? "text-white" : "text-slate-400"}>
                        {reminderMode === 'sms'
                          ? (language === 'kh' ? 'កំពុងផ្ទៀងផ្ទាត់សោសម្ងាត់ API Credentials...' : 'Validating SMS developer API credentials...')
                          : (language === 'kh' ? 'កំពុងដោះស្រាយកំណត់ត្រា MX Domains...' : 'Resolving recipient email MX records and domain host...')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={simulationStep >= 3 ? "text-emerald-400 font-black" : "text-slate-600"}>
                        {simulationStep >= 3 ? "✓" : "○"}
                      </span>
                      <span className={simulationStep === 3 ? "text-white" : "text-slate-400"}>
                        {reminderMode === 'sms'
                          ? (language === 'kh' ? `កំពុងផ្ញើសារទូរសព្ទទៅកាន់ ${reminderPhone}...` : `Delivering SMS payload to +855 ${reminderPhone}...`)
                          : (language === 'kh' ? `កំពុងផ្ញើខ្លឹមសារអុីម៉ែលទៅកាន់ ${reminderEmail}...` : `Transmitting SMTP packet body to ${reminderEmail}...`)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-between gap-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSendingSimulated}
                onClick={() => setActiveReminder(null)}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {language === 'kh' ? 'បដិសេធ' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isSendingSimulated || (reminderMode === 'sms' && !reminderPhone) || (reminderMode === 'email' && !reminderEmail)}
                onClick={handleTriggerSimulatedReminder}
                className={`px-5 py-2 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10 ${
                  reminderMode === 'sms' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {reminderMode === 'sms'
                    ? (language === 'kh' ? 'ផ្ញើសារ SMS រំលឹក' : 'Simulate SMS Dispatch')
                    : (language === 'kh' ? 'ផ្ញើអុីម៉ែលរំលឹក' : 'Simulate SMTP Send')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
