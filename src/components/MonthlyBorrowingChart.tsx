import React, { useMemo } from 'react';
import { BorrowRecord, Language } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface MonthlyBorrowingChartProps {
  records: BorrowRecord[];
  language: Language;
}

export default function MonthlyBorrowingChart({ records, language }: MonthlyBorrowingChartProps) {
  const chartData = useMemo(() => {
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

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm">
      <div className="mb-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-2">
          <BarChart3 className="w-4.5 h-4.5 text-indigo-600" />
          {language === 'kh' ? 'ការខ្ចីសៀវភៅតាមខែ' : 'Monthly Borrowing Trends'}
        </h3>
        <p className="text-[11px] text-slate-500 font-semibold">
          {language === 'kh'
            ? 'ចំនួនសៀវភៅដែលបានខ្ចីសម្រាប់ឆ្នាំបច្ចុប្បន្ន'
            : 'Number of books borrowed per month for the current year'}
        </p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} 
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} 
              tickLine={false} 
              axisLine={false}
              dx={-5}
            />
            <Tooltip
              cursor={{ fill: '#F1F5F9' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl text-white border border-slate-700/80 shadow-2xl text-xs">
                      <p className="font-bold">{payload[0].payload.monthLabel}</p>
                      <p className="text-blue-400 font-black">{payload[0].value} {language === 'kh' ? 'ក្បាល' : 'books'}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="borrowed" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.borrowed > 0 ? '#4F46E5' : '#E2E8F0'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
