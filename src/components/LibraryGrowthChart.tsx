import { useState, useMemo } from 'react';
import { Book, Language } from '../types';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { TrendingUp, BookOpen, Calendar, HelpCircle } from 'lucide-react';

interface LibraryGrowthChartProps {
  books: Book[];
  language: Language;
}

export default function LibraryGrowthChart({ books, language }: LibraryGrowthChartProps) {
  const [chartType, setChartType] = useState<'cumulative' | 'additions'>('cumulative');

  // Compute the past 6 months data dynamically
  const chartData = useMemo(() => {
    const today = new Date();
    const monthsData = [];

    // Generate last 6 months (chronological order)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-11
      const yearMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`; // "YYYY-MM"
      
      // Label in language
      let label = '';
      if (language === 'kh') {
        const monthsKh = [
          'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
          'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
        ];
        label = `${monthsKh[month]} ${year}`;
      } else {
        const monthsEn = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        label = `${monthsEn[month]} ${year}`;
      }

      monthsData.push({
        year,
        month,
        yearMonthStr,
        label,
        additions: 0,
        cumulative: 0,
      });
    }

    // Determine the first month's YYYY-MM
    const firstMonthStr = monthsData[0].yearMonthStr;

    // Count how many books were added before our 6-month window for base cumulative calculation
    let baseCumulativeCount = 0;
    
    books.forEach(book => {
      if (!book.addedDate) return;
      
      // Extract YYYY-MM from addedDate
      const dateParts = book.addedDate.split('-');
      if (dateParts.length >= 2) {
        const bookYearMonth = `${dateParts[0]}-${dateParts[1]}`;
        if (bookYearMonth < firstMonthStr) {
          baseCumulativeCount++;
        }
      }
    });

    // Populate monthly additions count
    books.forEach(book => {
      if (!book.addedDate) return;
      const dateParts = book.addedDate.split('-');
      if (dateParts.length >= 2) {
        const bookYearMonth = `${dateParts[0]}-${dateParts[1]}`;
        const targetMonth = monthsData.find(m => m.yearMonthStr === bookYearMonth);
        if (targetMonth) {
          targetMonth.additions++;
        }
      }
    });

    // Compute cumulative totals sequentially
    let runningTotal = baseCumulativeCount;
    monthsData.forEach(m => {
      runningTotal += m.additions;
      m.cumulative = runningTotal;
    });

    return monthsData;
  }, [books, language]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalAddedLast6Months = 0;
    chartData.forEach(d => {
      totalAddedLast6Months += d.additions;
    });

    const currentTotal = books.length;
    const initialTotal = currentTotal - totalAddedLast6Months;
    const growthPercent = initialTotal > 0 
      ? Math.round((totalAddedLast6Months / initialTotal) * 100) 
      : 100;

    return {
      totalAddedLast6Months,
      currentTotal,
      growthPercent
    };
  }, [chartData, books]);

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 text-white p-3.5 rounded-2xl border border-slate-800 shadow-2xl text-xs font-semibold backdrop-blur-sm">
          <p className="text-slate-400 font-extrabold mb-1.5 uppercase tracking-wider">{label}</p>
          <div className="space-y-1">
            {chartType === 'cumulative' ? (
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>{language === 'kh' ? 'សៀវភៅសរុបក្នុងបណ្ណាល័យ' : 'Total Library Size'}:</span>
                <span className="font-bold text-blue-400 text-sm">{payload[0].value}</span>
              </p>
            ) : (
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{language === 'kh' ? 'សៀវភៅបន្ថែមថ្មី' : 'New Books Added'}:</span>
                <span className="font-bold text-emerald-400 text-sm">+{payload[0].value}</span>
              </p>
            )}
            <p className="text-[10px] text-slate-500 mt-1">
              {chartType === 'cumulative' 
                ? (language === 'kh' ? `សៀវភៅបន្ថែមខែនេះ៖ +${payload[0].payload.additions}` : `Added this month: +${payload[0].payload.additions}`)
                : (language === 'kh' ? `សៀវភៅសរុបគិតត្រឹមពេលនេះ៖ ${payload[0].payload.cumulative}` : `Cumulative total: ${payload[0].payload.cumulative}`)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="library-growth-section" className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
            {language === 'kh' ? 'និន្នាការនៃការកើនឡើងសៀវភៅក្នុងបណ្ណាល័យ' : 'Library Catalog Growth & Volumetrics'}
          </h3>
          <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
            {language === 'kh'
              ? 'ការតាមដានការបន្ថែមសៀវភៅថ្មីៗ និងកំណើនកាតាឡុកសរុបក្នុងរយៈពេល៦ខែចុងក្រោយ'
              : 'Tracking new book procurement and cumulative catalog volume over the last 6 months'}
          </p>
        </div>

        {/* Chart type controls */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 self-start">
          <button
            onClick={() => setChartType('cumulative')}
            className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition ${
              chartType === 'cumulative'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/20'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {language === 'kh' ? 'កំណើនសរុបបង្គរ' : 'Cumulative Size'}
          </button>
          <button
            onClick={() => setChartType('additions')}
            className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition ${
              chartType === 'additions'
                ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/20'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {language === 'kh' ? 'បរិមាណបន្ថែមប្រចាំខែ' : 'Monthly Added'}
          </button>
        </div>
      </div>

      {/* Visual Analytics Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Total Inventory */}
        <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100/50">
          <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider">
            {language === 'kh' ? 'ចំនួនសៀវភៅបច្ចុប្បន្ន' : 'Current Book Stock'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800 leading-none">
              {stats.currentTotal}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              {language === 'kh' ? 'ក្បាល' : 'books'}
            </span>
          </div>
        </div>

        {/* Procured Last 6 Months */}
        <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100/50">
          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">
            {language === 'kh' ? 'បានបន្ថែមក្នុងរយៈពេល៦ខែ' : 'Added Past 6 Months'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700 leading-none">
              +{stats.totalAddedLast6Months}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold uppercase">
              {language === 'kh' ? 'ក្បាល' : 'books'}
            </span>
          </div>
        </div>

        {/* Growth Rate Percent */}
        <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-100/50">
          <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">
            {language === 'kh' ? 'អត្រាកំណើនកាតាឡុក' : 'Procurement Growth Rate'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-700 leading-none">
              {stats.growthPercent}%
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              {language === 'kh' ? 'កើនឡើង' : 'increase'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="h-64 w-full select-none">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'cumulative' ? (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="label" 
                tick={{ fill: '#64748B', fontSize: 10, fontWeight: '700' }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#64748B', fontSize: 10, fontWeight: '700' }} 
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#2563EB" 
                strokeWidth={3}
                dot={{ r: 5, strokeWidth: 2, fill: '#FFFFFF' }}
                activeDot={{ r: 7, strokeWidth: 0 }}
                name={language === 'kh' ? 'សៀវភៅបង្គរសរុប' : 'Total Inventory Size'}
              />
            </LineChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="label" 
                tick={{ fill: '#64748B', fontSize: 10, fontWeight: '700' }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#64748B', fontSize: 10, fontWeight: '700' }} 
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="additions" 
                fill="#10B981" 
                radius={[6, 6, 0, 0]}
                name={language === 'kh' ? 'សៀវភៅថ្មីបន្ថែម' : 'Books Procured'}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
