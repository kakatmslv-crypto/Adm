import { BorrowRecord, Language } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMemo } from 'react';
import { Activity } from 'lucide-react';

interface Props {
  records: BorrowRecord[];
  language: Language;
}

export default function DailyAttendanceActivity({ records, language }: Props) {
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const borrows = records.filter(r => r.borrowDate === dateStr).length;
      const returns = records.filter(r => r.returnDate === dateStr).length;
      
      data.push({
        date: date.toLocaleDateString(language === 'kh' ? 'km-KH' : 'en-US', { weekday: 'short' }),
        borrows,
        returns,
      });
    }
    return data;
  }, [records, language]);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          {language === 'kh' ? 'សកម្មភាពប្រចាំថ្ងៃ' : 'Daily Attendance & Activity'}
        </h3>
        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
          {language === 'kh' ? 'ការតាមដានសកម្មភាពខ្ចី និងសងសៀវភៅក្នុងរយៈពេល ៧ថ្ងៃចុងក្រោយ' : 'Tracking check-ins and borrowing volume for the past 7 days'}
        </p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 'bold' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '11px' }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
            <Line type="monotone" dataKey="borrows" name={language === 'kh' ? 'ខ្ចីសៀវភៅ' : 'Borrows'} stroke="#3B82F6" strokeWidth={2} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="returns" name={language === 'kh' ? 'សងសៀវភៅ' : 'Returns'} stroke="#10B981" strokeWidth={2} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
