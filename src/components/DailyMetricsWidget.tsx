import { useMemo } from 'react';
import { Book, BorrowRecord, Student, Language } from '../types';
import { 
  BookOpen, 
  CheckCircle2, 
  BellRing, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  ChevronRight,
  Send,
  Sparkles
} from 'lucide-react';

interface DailyMetricsWidgetProps {
  books: Book[];
  records: BorrowRecord[];
  students: Student[];
  language: Language;
  sentReminders: { [key: string]: boolean };
  sendingReminders: { [key: string]: boolean };
  onRemindStudent?: (rec: BorrowRecord) => void;
  onFocusAlertsDesk?: (tab: 'due' | 'overdue') => void;
}

export default function DailyMetricsWidget({
  books,
  records,
  students,
  language,
  sentReminders,
  sendingReminders,
  onRemindStudent,
  onFocusAlertsDesk,
}: DailyMetricsWidgetProps) {
  // Get today's ISO date string based on current local time
  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Filter books borrowed today
  const borrowedToday = useMemo(() => {
    return records.filter(r => r.borrowDate === todayStr);
  }, [records, todayStr]);

  // Filter books returned today
  const returnedToday = useMemo(() => {
    return records.filter(r => r.returnDate === todayStr);
  }, [records, todayStr]);

  // Filter overdue books
  const overdueRecords = useMemo(() => {
    return records.filter(r => (r.status === 'overdue' || r.dueDate < todayStr) && !r.returnDate);
  }, [records, todayStr]);

  // Compute pending notifications: overdue books where reminder is NOT yet sent
  const pendingNotifications = useMemo(() => {
    return overdueRecords.filter(r => !sentReminders[r.id]);
  }, [overdueRecords, sentReminders]);

  // Find entity helper
  const getBookAndStudent = (rec: BorrowRecord) => {
    const book = books.find(b => b.id === rec.bookId);
    const student = students.find(s => s.id === rec.studentId);
    return { book, student };
  };

  return (
    <div id="daily-metrics-at-a-glance" className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm bg-gradient-to-br from-white/90 to-white/40 backdrop-blur-md flex flex-col gap-6">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {language === 'kh' ? 'សកម្មភាពប្រចាំថ្ងៃ At-a-Glance' : 'Daily Operations At-a-Glance'}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            {language === 'kh'
              ? `តាមដានសកម្មភាពខ្ចី សង និងការរំលឹករបស់សិស្សសម្រាប់ថ្ងៃនេះ (${todayStr})`
              : `Real-time updates of borrows, returns, and outstanding notifications for today (${todayStr})`}
          </p>
        </div>

        {language === 'kh' ? (
          <div className="text-[10px] font-black text-slate-400 bg-slate-100/80 px-2.5 py-1 rounded-lg uppercase tracking-wider self-start sm:self-auto">
            របាយការណ៍បច្ចុប្បន្នភាព
          </div>
        ) : (
          <div className="text-[10px] font-black text-slate-400 bg-slate-100/80 px-2.5 py-1 rounded-lg uppercase tracking-wider self-start sm:self-auto font-mono">
            TODAY'S LEDGER
          </div>
        )}
      </div>

      {/* Grid containing 3 modern cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Card 1: Borrowed Today */}
        <div className="bg-gradient-to-b from-blue-50/40 to-white border border-blue-100/50 p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:shadow-md hover:border-blue-200/50 transition duration-200">
          <div>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-blue-700/80 uppercase tracking-widest block">
                  {language === 'kh' ? 'ខ្ចីសៀវភៅថ្ងៃនេះ' : 'Borrowed Today'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-blue-600 tracking-tight font-mono">
                    {borrowedToday.length}
                  </span>
                  <span className="text-xs font-bold text-blue-500">
                    {language === 'kh' ? 'ក្បាល' : 'books'}
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>

            {/* Sub-list of borrows */}
            <div className="mt-4 pt-4 border-t border-blue-100/30 space-y-2">
              {borrowedToday.length > 0 ? (
                <div className="max-h-[110px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {borrowedToday.slice(0, 3).map((rec) => {
                    const { book, student } = getBookAndStudent(rec);
                    return (
                      <div key={rec.id} className="flex items-start gap-2 text-[11px] leading-tight">
                        <ArrowUpRight className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-700 line-clamp-1">{book?.title || 'Unknown Book'}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{student?.name || 'Patron'}</p>
                        </div>
                      </div>
                    );
                  })}
                  {borrowedToday.length > 3 && (
                    <p className="text-[10px] text-blue-600 font-bold italic mt-1 pl-1">
                      + {borrowedToday.length - 3} {language === 'kh' ? 'ទៀត...' : 'more...'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-2 flex flex-col items-center justify-center text-center">
                  <p className="text-[11px] text-slate-400 font-bold">
                    {language === 'kh' ? 'មិនទាន់មានការខ្ចីនៅឡើយទេ' : 'No books borrowed yet'}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {language === 'kh' ? 'សកម្មភាពខ្ចីនឹងបង្ហាញនៅទីនេះ' : 'Today\'s new borrows will appear here'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-2">
            <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-1 rounded-md block text-center">
              {language === 'kh' ? 'កាលបរិច្ឆេទខ្ចីសកម្ម' : 'Active Transaction Date'}
            </span>
          </div>
        </div>

        {/* Card 2: Returned Today */}
        <div className="bg-gradient-to-b from-emerald-50/40 to-white border border-emerald-100/50 p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-200/50 transition duration-200">
          <div>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-emerald-700/80 uppercase tracking-widest block">
                  {language === 'kh' ? 'សងសៀវភៅថ្ងៃនេះ' : 'Returned Today'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-emerald-600 tracking-tight font-mono">
                    {returnedToday.length}
                  </span>
                  <span className="text-xs font-bold text-emerald-500">
                    {language === 'kh' ? 'ក្បាល' : 'books'}
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Sub-list of returns */}
            <div className="mt-4 pt-4 border-t border-emerald-100/30 space-y-2">
              {returnedToday.length > 0 ? (
                <div className="max-h-[110px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {returnedToday.slice(0, 3).map((rec) => {
                    const { book, student } = getBookAndStudent(rec);
                    return (
                      <div key={rec.id} className="flex items-start gap-2 text-[11px] leading-tight">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-700 line-clamp-1">{book?.title || 'Unknown Book'}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{student?.name || 'Patron'}</p>
                        </div>
                      </div>
                    );
                  })}
                  {returnedToday.length > 3 && (
                    <p className="text-[10px] text-emerald-600 font-bold italic mt-1 pl-1">
                      + {returnedToday.length - 3} {language === 'kh' ? 'ទៀត...' : 'more...'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-2 flex flex-col items-center justify-center text-center">
                  <p className="text-[11px] text-slate-400 font-bold">
                    {language === 'kh' ? 'មិនទាន់មានការសងនៅឡើយទេ' : 'No books returned yet'}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {language === 'kh' ? 'សកម្មភាពសងនឹងបង្ហាញនៅទីនេះ' : 'Today\'s safe returns will list here'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-2">
            <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md block text-center">
              {language === 'kh' ? 'ការសងត្រឡប់សុវត្ថិភាព' : 'Verified Shelved Returns'}
            </span>
          </div>
        </div>

        {/* Card 3: Pending Student Notifications */}
        <div className="bg-gradient-to-b from-rose-50/40 to-white border border-rose-100/50 p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:shadow-md hover:border-rose-200/50 transition duration-200">
          <div>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-rose-700/80 uppercase tracking-widest block">
                  {language === 'kh' ? 'ការជូនដំណឹងដែលនៅសេសសល់' : 'Pending Notifications'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-rose-600 tracking-tight font-mono">
                    {pendingNotifications.length}
                  </span>
                  <span className="text-xs font-bold text-rose-500">
                    {language === 'kh' ? 'នាក់' : 'patrons'}
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-rose-500/10 text-rose-600 rounded-xl relative">
                <BellRing className={`w-5 h-5 ${pendingNotifications.length > 0 ? 'animate-bounce' : ''}`} />
                {pendingNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white" />
                )}
              </div>
            </div>

            {/* Sub-list of pending notifications with immediate Remind action */}
            <div className="mt-4 pt-4 border-t border-rose-100/30 space-y-2">
              {pendingNotifications.length > 0 ? (
                <div className="max-h-[110px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {pendingNotifications.slice(0, 2).map((rec) => {
                    const { book, student } = getBookAndStudent(rec);
                    const isSending = sendingReminders[rec.id];
                    return (
                      <div key={rec.id} className="flex items-center justify-between gap-1.5 bg-rose-500/5 border border-rose-100/30 p-1.5 rounded-xl">
                        <div className="space-y-0.5 max-w-[65%]">
                          <p className="font-bold text-slate-700 text-[10px] line-clamp-1">{student?.name || 'Student'}</p>
                          <p className="text-[9px] text-rose-500/80 font-black truncate">{book?.title || 'Book'}</p>
                        </div>
                        {onRemindStudent && (
                          <button
                            onClick={() => onRemindStudent(rec)}
                            disabled={isSending}
                            className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>{isSending ? '...' : (language === 'kh' ? 'ផ្ញើ' : 'Remind')}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {pendingNotifications.length > 2 && (
                    <button
                      onClick={() => onFocusAlertsDesk && onFocusAlertsDesk('overdue')}
                      className="text-[9px] text-rose-600 font-extrabold uppercase tracking-wider hover:underline flex items-center gap-0.5 mt-2 pl-1"
                    >
                      <span>{language === 'kh' ? `មើលបន្ថែមទៀត ${pendingNotifications.length - 2}` : `View ${pendingNotifications.length - 2} more`}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-2 flex flex-col items-center justify-center text-center">
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'kh' ? 'រួចរាល់ទាំងអស់!' : 'All notifications clear!'}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    {language === 'kh' ? 'គ្មានសិស្សហួសកាលកំណត់ត្រូវផ្ញើសារទេ' : 'No overdue students waiting for reminders'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-2">
            {pendingNotifications.length > 0 ? (
              <button
                onClick={() => onFocusAlertsDesk && onFocusAlertsDesk('overdue')}
                className="w-full py-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[9px] uppercase tracking-widest rounded-md block text-center cursor-pointer transition shadow-xs"
              >
                {language === 'kh' ? 'ពិនិត្យបញ្ជីលម្អិត' : 'Inspect Overdue List'}
              </button>
            ) : (
              <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md block text-center">
                {language === 'kh' ? 'គ្រប់គ្រងបានល្អឥតខ្ចោះ' : 'Perfect Patrol Ratio'}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
