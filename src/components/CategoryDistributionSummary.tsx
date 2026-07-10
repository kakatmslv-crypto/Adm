import { useState } from 'react';
import { Book, Category, Language } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Layers, ListFilter, HelpCircle } from 'lucide-react';

interface CategoryDistributionSummaryProps {
  books: Book[];
  categories: Category[];
  language: Language;
}

const COLORS = [
  '#3B82F6', // Blue (Math/Sci)
  '#10B981', // Emerald (Khmer)
  '#6366F1', // Indigo (English)
  '#EC4899', // Pink (ICT)
  '#F59E0B', // Amber (History)
  '#8B5CF6', // Purple (Geo)
  '#14B8A6', // Teal
  '#EF4444', // Red
  '#64748B', // Slate
];

export default function CategoryDistributionSummary({ books, categories, language }: CategoryDistributionSummaryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Compute stats for categories
  const categoryData = categories.map((cat, idx) => {
    const associatedBooks = books.filter(b => b.categoryId === cat.id);
    const total = associatedBooks.length;
    const available = associatedBooks.filter(b => b.status === 'available').length;
    const borrowed = associatedBooks.filter(b => b.status === 'borrowed').length;
    const overdue = associatedBooks.filter(b => b.status === 'overdue').length;
    const lost = associatedBooks.filter(b => b.status === 'lost').length;

    const code = cat.id.replace('cat-', '').toUpperCase();

    return {
      id: cat.id,
      code,
      name: language === 'kh' ? cat.nameKh : cat.nameEn,
      total,
      available,
      borrowed,
      overdue,
      lost,
      color: COLORS[idx % COLORS.length],
    };
  }).filter(c => c.total > 0); // only show categories with books to make the chart meaningful

  const totalInventory = books.length;

  const chartData = categoryData.map(c => ({
    name: c.name,
    value: c.total,
    code: c.code,
    percentage: totalInventory > 0 ? ((c.total / totalInventory) * 100).toFixed(1) : '0.0',
    color: c.color,
  }));

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <div id="category-distribution-summary" className="glass-panel p-6 rounded-3xl border-2 border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          {language === 'kh' ? 'សេចក្តីសង្ខេបការបែងចែកសៀវភៅតាមប្រភេទ' : 'Category Inventory Distribution'}
        </h3>
        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mb-6">
          {language === 'kh'
            ? 'ការបង្ហាញលម្អិតអំពីចំណែកភាគរយសៀវភៅតាមមុខវិជ្ជាការសិក្សា និងស្ថានភាពរបស់វា'
            : 'Visual breakdown and status distribution of the library catalog by subject prefix'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
        {/* Left Side: Donut Chart */}
        <div className="col-span-1 lg:col-span-2 relative flex items-center justify-center min-h-[220px]">
          {chartData.length > 0 ? (
            <>
              <div className="w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      onMouseEnter={onPieEnter}
                      onMouseLeave={onPieLeave}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          opacity={activeIndex === null || activeIndex === index ? 1 : 0.65}
                          style={{
                            outline: 'none',
                            cursor: 'pointer',
                            transform: activeIndex === index ? 'scale(1.03)' : 'scale(1)',
                            transformOrigin: 'center',
                            transition: 'all 0.15s ease-out',
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl text-white border border-slate-700 shadow-xl text-xs space-y-1">
                              <p className="font-bold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: data.color }} />
                                {data.name} ({data.code})
                              </p>
                              <p className="text-[10px] text-slate-300 font-semibold">
                                {language === 'kh' ? 'សៀវភៅសរុប៖' : 'Total Books:'} <b className="text-white text-xs">{data.value}</b>
                              </p>
                              <p className="text-[10px] text-slate-300 font-semibold">
                                {language === 'kh' ? 'ចំណែក៖' : 'Share:'} <b className="text-white text-xs">{data.percentage}%</b>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Dynamic Center Label */}
              <div className="absolute text-center pointer-events-none">
                {activeIndex !== null ? (
                  <>
                    <p className="text-2xl font-black text-slate-800 leading-none">
                      {chartData[activeIndex].value}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">
                      {chartData[activeIndex].code} ({chartData[activeIndex].percentage}%)
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-black text-slate-800 leading-none">
                      {totalInventory}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">
                      {language === 'kh' ? 'សៀវភៅសរុប' : 'Total Books'}
                    </p>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400 font-semibold text-center flex flex-col items-center justify-center py-8">
              <HelpCircle className="w-8 h-8 text-slate-300 mb-2 animate-bounce" />
              {language === 'kh' ? 'មិនមានទិន្នន័យដើម្បីបង្ហាញ' : 'No category data to visualize'}
            </div>
          )}
        </div>

        {/* Right Side: Detailed breakdown list */}
        <div className="col-span-1 lg:col-span-3 space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
          {categoryData.length > 0 ? (
            categoryData.map((cat, idx) => {
              const share = totalInventory > 0 ? ((cat.total / totalInventory) * 100).toFixed(1) : '0';
              const isHovered = activeIndex === idx;

              return (
                <div 
                  key={cat.id}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`p-3 rounded-2xl border transition duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isHovered 
                      ? 'bg-slate-50 border-slate-200/80 shadow-inner' 
                      : 'bg-white/45 border-white/60 hover:bg-white/80'
                  }`}
                >
                  {/* Left info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="px-2 py-1 font-mono text-[9px] font-black rounded-lg shrink-0 text-white shadow-sm"
                      style={{ backgroundColor: cat.color }}
                    >
                      {cat.code}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {cat.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {language === 'kh' 
                          ? `${cat.total} ក្បាល (${share}%)`
                          : `${cat.total} books (${share}%)`}
                      </p>
                    </div>
                  </div>

                  {/* Status pills breakdown */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Available */}
                    {cat.available > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 border border-green-100/50 text-green-700">
                        <span className="w-1 h-1 rounded-full bg-green-500 mr-1 shrink-0" />
                        {cat.available}
                      </span>
                    )}
                    {/* Borrowed */}
                    {cat.borrowed > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 border border-blue-100/50 text-blue-700">
                        <span className="w-1 h-1 rounded-full bg-blue-500 mr-1 shrink-0" />
                        {cat.borrowed}
                      </span>
                    )}
                    {/* Overdue */}
                    {cat.overdue > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 border border-red-100/50 text-red-700">
                        <span className="w-1 h-1 rounded-full bg-red-500 mr-1 shrink-0" />
                        {cat.overdue}
                      </span>
                    )}
                    {/* Lost */}
                    {cat.lost > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-100/50 text-amber-700">
                        <span className="w-1 h-1 rounded-full bg-amber-500 mr-1 shrink-0" />
                        {cat.lost}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs font-semibold">
              {language === 'kh' ? 'គ្មានប្រភេទសៀវភៅ' : 'No catalog segments defined'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
