import { useMemo, useState } from 'react';
import { Book, BorrowRecord, Language } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, BookOpen, Calendar, TrendingUp, Sparkles, Percent } from 'lucide-react';

interface OverdueAnalyticsWidgetProps {
  books: Book[];
  records: BorrowRecord[];
  language: Language;
}

export default function OverdueAnalyticsWidget({ books, records, language }: OverdueAnalyticsWidgetProps) {
  const [timeRange, setTimeRange] = useState<30 | 14 | 7>(30);

  // Compute today's date based on current local time or max record date
  const todayStr = useMemo(() => {
    // Standard default date to use
    let baseDate = new Date('2026-07-12');
    
    if (records.length > 0) {
      const allDates = records
        .map(r => new Date(r.borrowDate).getTime())
        .concat(records.filter(r => r.returnDate).map(r => new Date(r.returnDate!).getTime()));
      
      if (allDates.length > 0) {
        const maxRecordTime = Math.max(...allDates);
        const maxRecordDate = new Date(maxRecordTime);
        if (maxRecordDate > baseDate) {
          baseDate = maxRecordDate;
        }
      }
    }
    return baseDate.toISOString().split('T')[0];
  }, [records]);

  // Compute stats
  const activeLoans = useMemo(() => {
    return records.filter(r => r.status === 'borrowed' || r.status === 'overdue' || !r.returnDate);
  }, [records]);

  const overdueBooksCount = useMemo(() => {
    return activeLoans.filter(r => r.dueDate < todayStr).length;
  }, [activeLoans, todayStr]);

  const loanPercentage = useMemo(() => {
    if (books.length === 0) return 0;
    return Math.round((activeLoans.length / books.length) * 100);
  }, [activeLoans, books]);

  // Calculate overdue trend data over last 30, 14, or 7 days
  const trendData = useMemo(() => {
    const baseDate = new Date(todayStr);
    const dateArray: string[] = [];

    // Generate dates
    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(baseDate.getTime());
      d.setDate(baseDate.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dateArray.push(dateStr);
    }

    // Accumulate overdue count on each day D
    return dateArray.map(date => {
      const overdueOnDay = records.filter(rec => {
        // Was borrowed on or before 'date'
        const isBorrowedBeforeOrOnDay = rec.borrowDate <= date;
        // Due date is strictly before 'date'
        const isDueDateBeforeDay = rec.dueDate < date;
        // Was not returned yet, or was returned after 'date'
        const notReturnedYetOnDay = !rec.returnDate || rec.returnDate > date;

        return isBorrowedBeforeOrOnDay && isDueDateBeforeDay && notReturnedYetOnDay;
      }).length;

      // Formatting labels (e.g., "Jul 12" or "12 កក្កដា")
      const parsedDate = new Date(date);
      let formattedLabel = '';
      if (language === 'kh') {
        const monthsKh = [
          'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
          'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
        ];
        formattedLabel = `${parsedDate.getDate()} ${monthsKh[parsedDate.getMonth()]}`;
      } else {
        const monthsEn = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        formattedLabel = `${monthsEn[parsedDate.getMonth()]} ${parsedDate.getDate()}`;
      }

      return {
        date,
        label: formattedLabel,
        overdueCount: overdueOnDay,
      };
    });
  }, [records, todayStr, timeRange, language]);

  return (
    <div id="overdue-analytics-widget" className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-md flex flex-col justify-between">
      {/* Header with Title and Toggle Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-50 rounded-lg text-rose-500">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {language === 'kh' ? 'ការវិភាគការយឺតយ៉ាវ និងសៀវភៅខ្ចី' : 'Overdue & Loan Analytics'}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">
            {language === 'kh'
              ? 'ការតាមដានរហ័សលើបរិមាណសៀវភៅហួសកំណត់ និងអត្រាខ្ចីសរុប និងនិន្នាការប្រចាំថ្ងៃ'
              : 'Real-time monitoring of overdue counts, loan percentages, and historical backlogs'}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl self-start sm:self-auto">
          {([7, 14, 30] as const).map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-150 cursor-pointer ${
                timeRange === days
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {days} {language === 'kh' ? 'ថ្ងៃ' : 'Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid containing metrics and the chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Key Stats Callout */}
        <div className="space-y-4 flex flex-col justify-between lg:border-r lg:border-slate-200/50 lg:pr-6">
          {/* Overdue Stat Card */}
          <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/5 border border-rose-100 p-4 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-rose-700/80 uppercase tracking-widest block">
                  {language === 'kh' ? 'សៀវភៅហួសកាលកំណត់សរុប' : 'Total Overdue Books'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-rose-600 tracking-tight font-mono">
                    {overdueBooksCount}
                  </span>
                  <span className="text-xs font-bold text-rose-500">
                    {language === 'kh' ? 'ក្បាល' : 'books'}
                  </span>
                </div>
              </div>
              <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
            </div>
            <div className="mt-2.5 text-[10px] font-semibold text-rose-700">
              {language === 'kh' 
                ? 'ត្រូវការការទំនាក់ទំនង និងតាមដានជាបន្ទាន់' 
                : 'Requires immediate follow-up with borrowers'}
            </div>
          </div>

          {/* Loan Percentage Stat Card */}
          <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-100 p-4 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-amber-700/80 uppercase tracking-widest block">
                  {language === 'kh' ? 'អត្រាសៀវភៅកំពុងខ្ចី' : 'Active Loan Ratio'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-amber-600 tracking-tight font-mono">
                    {loanPercentage}%
                  </span>
                  <span className="text-xs font-bold text-amber-500">
                    {language === 'kh' ? 'នៃសៀវភៅសរុប' : 'of catalog'}
                  </span>
                </div>
              </div>
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            
            {/* Visual Mini Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-slate-200/70 rounded-full h-1.5">
                <div 
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, loanPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] font-black text-slate-400 mt-1 uppercase tracking-wider">
                <span>0%</span>
                <span>{language === 'kh' ? 'កំពុងអាន' : 'ON LOAN'}</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Trend Line Chart */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {language === 'kh' ? `និន្នាការហួសកំណត់ ${timeRange}ថ្ងៃចុងក្រោយ` : `${timeRange}-Day Overdue Backlog Trend`}
            </span>
            <span className="text-[10px] font-black text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded-md">
              {language === 'kh' ? 'ចំនួនសៀវភៅ' : 'Backlog Count'}
            </span>
          </div>

          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="overdueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="#94a3b8" 
                  fontSize={9} 
                  fontWeight="bold"
                  tickLine={false} 
                  axisLine={false} 
                  dy={6}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={9} 
                  fontWeight="bold"
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">{data.label}</p>
                          <p className="font-black text-slate-100 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            {language === 'kh' 
                              ? `ហួសកាលកំណត់៖ ${data.overdueCount} ក្បាល` 
                              : `Overdue books: ${data.overdueCount}`}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="overdueCount" 
                  stroke="#f43f5e" 
                  strokeWidth={3} 
                  dot={{ r: 3, stroke: '#fda4af', strokeWidth: 1.5, fill: '#f43f5e' }}
                  activeDot={{ r: 6, stroke: '#fda4af', strokeWidth: 2, fill: '#e11d48' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
