import { useState, useMemo } from 'react';
import { BorrowRecord, Language } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar, ArrowRightLeft, BookOpen, CheckCircle } from 'lucide-react';

interface BorrowingActivityTrendProps {
  records: BorrowRecord[];
  language: Language;
}

export default function BorrowingActivityTrend({ records, language }: BorrowingActivityTrendProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'borrowed' | 'returned'>('all');

  // Compute the 30-day date range dynamically
  const trendData = useMemo(() => {
    // Determine the base end-date (either today or the maximum date in the records)
    let baseDate = new Date();
    
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

    // Generate last 30 days leading up to baseDate
    const dateArray: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(baseDate.getTime());
      d.setDate(baseDate.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // 'YYYY-MM-DD'
      dateArray.push(dateStr);
    }

    // Accumulate counts for each day
    return dateArray.map(date => {
      const borrowsOnDay = records.filter(r => r.borrowDate === date).length;
      const returnsOnDay = records.filter(r => r.returnDate === date).length;

      // Formatting the display date (e.g. "Jun 15" or "15 មិថុនា")
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
        rawDate: date,
        dateLabel: formattedLabel,
        borrowed: borrowsOnDay,
        returned: returnsOnDay,
      };
    });
  }, [records, language]);

  // Aggregate stats over the 30-day period
  const totals = useMemo(() => {
    let borrowed = 0;
    let returned = 0;
    trendData.forEach(day => {
      borrowed += day.borrowed;
      returned += day.returned;
    });
    return { borrowed, returned };
  }, [trendData]);

  return (
    <div id="borrowing-activity-trend" className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
            {language === 'kh' ? 'និន្នាការខ្ចី និងសងសៀវភៅ ៣០ថ្ងៃចុងក្រោយ' : '30-Day Library Activity Trends'}
          </h3>
          <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
            {language === 'kh'
              ? 'ការវិភាគប្រៀបធៀបរវាងបរិមាណសៀវភៅដែលបានខ្ចីចេញ និងបានសងត្រឡប់មកវិញក្នុងរយៈពេល៣០ថ្ងៃ'
              : 'Comparative analysis of books checked out vs. returned over the past 30 days'}
          </p>
        </div>

        {/* View Filter Toggles */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/40 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {language === 'kh' ? 'ទាំងអស់' : 'All'}
          </button>
          <button
            onClick={() => setActiveFilter('borrowed')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition cursor-pointer ${
              activeFilter === 'borrowed'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {language === 'kh' ? 'ខ្ចី' : 'Borrowed'}
          </button>
          <button
            onClick={() => setActiveFilter('returned')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition cursor-pointer ${
              activeFilter === 'returned'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {language === 'kh' ? 'សង' : 'Returned'}
          </button>
        </div>
      </div>

      {/* Grid containing Quick Overview and Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-stretch">
        
        {/* Quick Stats Sidebar (1 column) */}
        <div className="xl:col-span-1 flex flex-row xl:flex-col gap-4 justify-between">
          {/* Borrowed Counter Card */}
          <div className="flex-1 p-4 bg-blue-50/40 border border-blue-100/50 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                {language === 'kh' ? 'ខ្ចីសរុប' : 'Total Borrowed'}
              </span>
              <BookOpen className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-800 leading-none">
                {totals.borrowed}
              </h4>
              <p className="text-[9px] text-slate-400 font-semibold mt-1">
                {language === 'kh' ? 'ក្បាលសៀវភៅខ្ចីចេញ' : 'books checked out'}
              </p>
            </div>
          </div>

          {/* Returned Counter Card */}
          <div className="flex-1 p-4 bg-emerald-50/40 border border-emerald-100/50 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                {language === 'kh' ? 'សងសរុប' : 'Total Returned'}
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-800 leading-none">
                {totals.returned}
              </h4>
              <p className="text-[9px] text-slate-400 font-semibold mt-1">
                {language === 'kh' ? 'ក្បាលសៀវភៅសងវិញ' : 'books returned'}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Chart Workspace (3 columns) */}
        <div className="xl:col-span-3 h-64 w-full bg-slate-50/30 border border-slate-100/40 rounded-2xl p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                {/* Gradient for Borrowed Area */}
                <linearGradient id="colorBorrowed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
                {/* Gradient for Returned Area */}
                <linearGradient id="colorReturned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fontSize: 9, fill: '#64748B', fontWeight: 600 }} 
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                tick={{ fontSize: 9, fill: '#64748B', fontWeight: 600 }} 
                tickLine={false} 
                axisLine={false}
                dx={-5}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl text-white border border-slate-700/80 shadow-2xl text-xs space-y-1.5 min-w-[140px]">
                        <p className="font-black text-slate-300 border-b border-slate-700/60 pb-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          {data.dateLabel}
                        </p>
                        {activeFilter !== 'returned' && (
                          <div className="flex justify-between items-center gap-4 text-[10px]">
                            <span className="flex items-center gap-1 font-bold text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {language === 'kh' ? 'បានខ្ចី៖' : 'Borrowed:'}
                            </span>
                            <b className="text-white text-xs font-black">{data.borrowed} {language === 'kh' ? 'ក្បាល' : 'books'}</b>
                          </div>
                        )}
                        {activeFilter !== 'borrowed' && (
                          <div className="flex justify-between items-center gap-4 text-[10px]">
                            <span className="flex items-center gap-1 font-bold text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {language === 'kh' ? 'បានសង៖' : 'Returned:'}
                            </span>
                            <b className="text-white text-xs font-black">{data.returned} {language === 'kh' ? 'ក្បាល' : 'books'}</b>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              
              {/* Conditional Area Renderings based on Filter */}
              {(activeFilter === 'all' || activeFilter === 'borrowed') && (
                <Area 
                  type="monotone" 
                  dataKey="borrowed" 
                  name={language === 'kh' ? 'ខ្ចីសៀវភៅ' : 'Books Borrowed'}
                  stroke="#3B82F6" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorBorrowed)" 
                />
              )}
              {(activeFilter === 'all' || activeFilter === 'returned') && (
                <Area 
                  type="monotone" 
                  dataKey="returned" 
                  name={language === 'kh' ? 'សងសៀវភៅ' : 'Books Returned'}
                  stroke="#10B981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorReturned)" 
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
