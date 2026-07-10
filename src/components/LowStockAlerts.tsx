import { useState, useMemo } from 'react';
import { Book, BorrowRecord, Student, Category, Language } from '../types';
import { AlertTriangle, Clock, BookOpen, Users, Search, ArrowRight, ShieldCheck, Mail, Send } from 'lucide-react';

interface LowStockAlertsProps {
  books: Book[];
  records: BorrowRecord[];
  students: Student[];
  categories: Category[];
  language: Language;
  onRemindStudent: (record: BorrowRecord) => void;
}

interface GroupedBookStock {
  title: string;
  author: string;
  categoryName: string;
  categoryCode: string;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  overdueCopies: number;
  lostCopies: number;
}

export default function LowStockAlerts({
  books,
  records,
  students,
  categories,
  language,
  onRemindStudent,
}: LowStockAlertsProps) {
  const [activeTab, setActiveTab] = useState<'zero_stock' | 'long_borrow'>('zero_stock');
  const [searchTerm, setSearchTerm] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Helper to calculate days between dates
  const getDaysElapsed = (startDateStr: string): number => {
    if (!startDateStr) return 0;
    const start = new Date(startDateStr);
    const end = new Date(todayStr);
    start.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);
    const diffTime = end.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // 1. Group books by Title and Author, and filter for those with exactly 0 available copies
  const zeroStockBooks = useMemo(() => {
    const groups: { [key: string]: GroupedBookStock } = {};

    books.forEach(book => {
      const key = `${book.title.trim().toLowerCase()}|||${(book.author || '').trim().toLowerCase()}`;

      if (!groups[key]) {
        const cat = categories.find(c => c.id === book.categoryId);
        const catName = cat ? (language === 'kh' ? cat.nameKh : cat.nameEn) : 'Unknown';
        const catCode = book.categoryId.replace('cat-', '').toUpperCase();

        groups[key] = {
          title: book.title,
          author: book.author || (language === 'kh' ? 'មិនស្គាល់អ្នកនិពន្ធ' : 'Unknown Author'),
          categoryName: catName,
          categoryCode: catCode,
          totalCopies: 0,
          availableCopies: 0,
          borrowedCopies: 0,
          overdueCopies: 0,
          lostCopies: 0,
        };
      }

      const g = groups[key];
      g.totalCopies += 1;

      if (book.status === 'available') {
        g.availableCopies += 1;
      } else if (book.status === 'borrowed') {
        g.borrowedCopies += 1;
      } else if (book.status === 'overdue') {
        g.overdueCopies += 1;
      } else if (book.status === 'lost') {
        g.lostCopies += 1;
      }
    });

    // Only return the groups with exactly 0 available copies
    return Object.values(groups).filter(g => g.availableCopies === 0);
  }, [books, categories, language]);

  // 2. Identify active borrow records borrowed for > 30 days
  const longBorrowedItems = useMemo(() => {
    return records
      .filter(record => {
        const isActive = record.status === 'borrowed' || record.status === 'overdue' || !record.returnDate;
        if (!isActive) return false;

        const days = getDaysElapsed(record.borrowDate);
        return days > 30;
      })
      .map(record => {
        const book = books.find(b => b.id === record.bookId);
        const student = students.find(s => s.id === record.studentId);
        const elapsedDays = getDaysElapsed(record.borrowDate);

        return {
          record,
          book,
          student,
          elapsedDays,
        };
      })
      .sort((a, b) => b.elapsedDays - a.elapsedDays); // Sort by longest borrowed first
  }, [records, books, students, todayStr]);

  // Filtered lists based on search term
  const filteredZeroStock = useMemo(() => {
    return zeroStockBooks.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoryCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [zeroStockBooks, searchTerm]);

  const filteredLongBorrowed = useMemo(() => {
    return longBorrowedItems.filter(item =>
      (item.book?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.student?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.student?.studentId || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [longBorrowedItems, searchTerm]);

  return (
    <div id="low-stock-alerts-widget" className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
              {language === 'kh' ? 'ការព្រមានស្តុកទាប & ខ្ចីយូរ' : 'Critical Stock & Borrow Alerts'}
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              {language === 'kh'
                ? 'តាមដានសៀវភៅគ្មានសល់ក្នុងស្តុក និងសៀវភៅដែលត្រូវបានខ្ចីលើសពី ៣០ ថ្ងៃ'
                : 'Track items with zero copies in library or copies held by students for over 30 days'}
            </p>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-red-50 text-red-600 border border-red-100 text-[10px] font-extrabold flex items-center gap-1">
              <span>{language === 'kh' ? 'ដាច់ស្តុក៖' : 'Out of Stock:'}</span>
              <span className="font-black text-xs">{zeroStockBooks.length}</span>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-extrabold flex items-center gap-1">
              <span>{language === 'kh' ? 'ខ្ចីយូរ៖' : 'Held >30 Days:'}</span>
              <span className="font-black text-xs">{longBorrowedItems.length}</span>
            </span>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('zero_stock');
                setSearchTerm('');
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'zero_stock'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{language === 'kh' ? 'សៀវភៅអស់ស្តុក' : '0 Copies Available'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('long_borrow');
                setSearchTerm('');
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'long_borrow'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{language === 'kh' ? 'ខ្ចីហួស ៣០ ថ្ងៃ' : 'Borrowed > 30 Days'}</span>
            </button>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'zero_stock'
                  ? (language === 'kh' ? 'ស្វែងរកសៀវភៅអស់ស្តុក...' : 'Search out-of-stock titles...')
                  : (language === 'kh' ? 'ស្វែងរកសិស្ស ឬសៀវភៅ...' : 'Search student or title...')
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-bold rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            />
          </div>
        </div>

        {/* Content Lists */}
        <div className="max-h-[340px] overflow-y-auto pr-1 space-y-2">
          {activeTab === 'zero_stock' ? (
            filteredZeroStock.length > 0 ? (
              filteredZeroStock.map((item, idx) => (
                <div
                  key={idx}
                  className="border border-red-200/50 bg-red-50/10 rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-red-50/20 transition"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(() => {
                        const cat = categories.find(c => c.id === `cat-${item.categoryCode.toLowerCase()}`);
                        return (
                          <span 
                            style={cat?.color ? { 
                              backgroundColor: `${cat.color}15`, 
                              color: cat.color,
                              borderColor: `${cat.color}30`
                            } : undefined}
                            className="px-2 py-0.5 font-mono text-[9px] font-black bg-slate-200 text-slate-700 rounded-lg border uppercase"
                          >
                            {item.categoryCode}
                          </span>
                        );
                      })()}
                      <span className="px-2 py-0.5 text-[9px] font-black rounded-lg bg-red-100 text-red-700 border border-red-200/30 uppercase">
                        {language === 'kh' ? 'អស់ពីស្តុក' : 'OUT OF STOCK'}
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-800 truncate">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {language === 'kh' ? 'អ្នកនិពន្ធ៖' : 'Author:'} {item.author}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-rose-600">
                      0 {language === 'kh' ? 'ក្បាលសល់' : 'copies left'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                      {language === 'kh' ? `ខ្ចី ${item.borrowedCopies} | ហួសកំណត់ ${item.overdueCopies}` : `borrowed ${item.borrowedCopies} | overdue ${item.overdueCopies}`}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-150 text-slate-400 text-xs font-semibold flex flex-col items-center justify-center">
                <ShieldCheck className="w-9 h-9 text-emerald-500 mb-2" />
                <p className="text-slate-700 font-extrabold">
                  {language === 'kh' ? 'គ្មានសៀវភៅណាអស់ពីស្តុកទេ!' : 'No titles are out of stock!'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {language === 'kh' ? 'សៀវភៅទាំងអស់មានយ៉ាងហោចណាស់ ១ ក្បាលសម្រាប់ខ្ចី' : 'Every registered catalog title has at least 1 copy available.'}
                </p>
              </div>
            )
          ) : (
            filteredLongBorrowed.length > 0 ? (
              filteredLongBorrowed.map((item, idx) => (
                <div
                  key={idx}
                  className="border border-amber-200/50 bg-amber-50/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-amber-50/25 transition"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 text-[9px] font-black rounded-lg bg-amber-100 text-amber-800 border border-amber-200/30 uppercase">
                        {language === 'kh' ? `${item.elapsedDays} ថ្ងៃ` : `${item.elapsedDays} DAYS ELAPSED`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {language === 'kh' ? 'ខ្ចីតាំងពី៖' : 'Borrowed on:'} {item.record.borrowDate}
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-800 truncate">
                      {item.book?.title || 'Unknown Book'}
                    </h4>
                    
                    {/* Borrower Details */}
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-700">{item.student?.name || 'Unknown Student'}</span>
                      <span className="text-slate-300">|</span>
                      <span className="font-mono">{item.student?.studentId}</span>
                      <span className="text-slate-300">|</span>
                      <span>{item.student?.classGrade}</span>
                    </div>
                  </div>

                  {/* Reminder Action */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onRemindStudent(item.record)}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] tracking-wider uppercase transition flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{language === 'kh' ? 'ផ្ញើសាររំលឹក' : 'Remind Student'}</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-150 text-slate-400 text-xs font-semibold flex flex-col items-center justify-center">
                <ShieldCheck className="w-9 h-9 text-emerald-500 mb-2" />
                <p className="text-slate-700 font-extrabold">
                  {language === 'kh' ? 'គ្មានកំណត់ត្រាខ្ចីលើសពី ៣០ ថ្ងៃទេ!' : 'No loans held for over 30 days!'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {language === 'kh' ? 'ការខ្ចីទាំងអស់មានអាយុកាលតិចជាង ៣០ ថ្ងៃ' : 'All active checkouts are within the healthy 30-day timeline.'}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
