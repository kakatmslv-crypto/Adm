import { useState, useMemo } from 'react';
import { Book, Category, Language } from '../types';
import { AlertTriangle, ShieldCheck, HelpCircle, Eye, Sliders, ChevronDown, ChevronUp, BookOpen, Layers } from 'lucide-react';

interface LowQuantityWarningProps {
  books: Book[];
  categories: Category[];
  language: Language;
}

interface GroupedBook {
  title: string;
  author: string;
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  overdueCopies: number;
  lostCopies: number;
  barcodes: string[];
}

export default function LowQuantityWarning({ books, categories, language }: LowQuantityWarningProps) {
  const [threshold, setThreshold] = useState<number>(3);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  // Group books by Title (case-insensitive)
  const groupedBooks = useMemo(() => {
    const groups: { [key: string]: GroupedBook } = {};

    books.forEach(book => {
      // Create a key based on normalized title and author
      const key = `${book.title.trim().toLowerCase()}|||${(book.author || '').trim().toLowerCase()}`;

      if (!groups[key]) {
        const cat = categories.find(c => c.id === book.categoryId);
        const catName = cat ? (language === 'kh' ? cat.nameKh : cat.nameEn) : 'Unknown';
        const catCode = book.categoryId.replace('cat-', '').toUpperCase();

        groups[key] = {
          title: book.title,
          author: book.author || (language === 'kh' ? 'មិនស្គាល់អ្នកនិពន្ធ' : 'Unknown Author'),
          categoryId: book.categoryId,
          categoryName: catName,
          categoryCode: catCode,
          totalCopies: 0,
          availableCopies: 0,
          borrowedCopies: 0,
          overdueCopies: 0,
          lostCopies: 0,
          barcodes: [],
        };
      }

      const g = groups[key];
      g.totalCopies += 1;
      g.barcodes.push(book.barcode);

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

    return Object.values(groups);
  }, [books, categories, language]);

  // Filter and sort the warning list
  const warningList = useMemo(() => {
    return groupedBooks
      .filter(item => {
        // Matches the low quantity threshold (available copies < threshold)
        const isLowQuantity = item.availableCopies < threshold;

        // Search term matches title or author or category code
        const matchesSearch = 
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.categoryCode.toLowerCase().includes(searchTerm.toLowerCase());

        // Category filter match
        const matchesCategory = filterCategory === 'all' || item.categoryId === filterCategory;

        return isLowQuantity && matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.availableCopies - b.availableCopies); // prioritizing lower stock first
  }, [groupedBooks, threshold, searchTerm, filterCategory]);

  const toggleExpand = (title: string) => {
    if (expandedBook === title) {
      setExpandedBook(null);
    } else {
      setExpandedBook(title);
    }
  };

  return (
    <div id="low-quantity-warning-section" className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
              {language === 'kh' ? 'សេចក្តីព្រមានអំពីសៀវភៅមានចំនួនតិច' : 'Low Quantity Inventory Alerts'}
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              {language === 'kh'
                ? 'បញ្ជីសៀវភៅដែលនៅសល់ក្នុងស្តុកតិចជាងកម្រិតកំណត់ ដើម្បីជួយសម្រួលការទិញបន្ថែម ឬតាមដាន'
                : 'Highlight books with critically low available copies to prompt restocking or reservation limits'}
            </p>
          </div>

          {/* Threshold controller */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/50 px-3 py-1.5 rounded-2xl shrink-0">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span>{language === 'kh' ? 'កម្រិតព្រមាន៖' : 'Alert Threshold:'}</span>
              <select
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="bg-transparent border-none text-blue-600 focus:ring-0 font-black cursor-pointer text-xs"
              >
                <option value={1}>&lt; 1 {language === 'kh' ? 'ក្បាល' : 'copy'}</option>
                <option value={2}>&lt; 2 {language === 'kh' ? 'ក្បាល' : 'copies'}</option>
                <option value={3}>&lt; 3 {language === 'kh' ? 'ក្បាល' : 'copies'}</option>
                <option value={5}>&lt; 5 {language === 'kh' ? 'ក្បាល' : 'copies'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <input
            type="text"
            placeholder={language === 'kh' ? 'ស្វែងរកសៀវភៅស្តុកតិច...' : 'Search low stock items...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 text-xs font-bold rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 text-xs font-bold rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white cursor-pointer"
          >
            <option value="all">{language === 'kh' ? 'គ្រប់ប្រភេទសៀវភៅ' : 'All Categories'}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {language === 'kh' ? c.nameKh : c.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Main list/table */}
        <div className="max-h-[340px] overflow-y-auto pr-1 space-y-2">
          {warningList.length > 0 ? (
            warningList.map((item) => {
              const isExpanded = expandedBook === item.title;
              const percentAvailable = item.totalCopies > 0 ? (item.availableCopies / item.totalCopies) * 100 : 0;
              
              // Choose badge styles based on availability
              let alertClass = '';
              let alertBadge = '';
              if (item.availableCopies === 0) {
                alertClass = 'border-red-200/50 bg-red-50/20';
                alertBadge = language === 'kh' ? 'អស់ស្តុក' : 'Out of Stock';
              } else {
                alertClass = 'border-amber-200/40 bg-amber-50/15';
                alertBadge = language === 'kh' ? 'ស្តុកទាប' : 'Low Stock';
              }

              return (
                <div 
                  key={item.title} 
                  className={`border rounded-2xl transition duration-150 overflow-hidden ${alertClass} ${
                    isExpanded ? 'ring-1 ring-amber-500/30' : ''
                  }`}
                >
                  {/* Summary row */}
                  <div 
                    onClick={() => toggleExpand(item.title)}
                    className="p-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/20 select-none"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 truncate flex-wrap">
                        {(() => {
                          const cat = categories.find(c => c.id === item.categoryId || c.id === `cat-${item.categoryCode.toLowerCase()}`);
                          return (
                            <span 
                              style={cat?.color ? { 
                                backgroundColor: `${cat.color}15`, 
                                color: cat.color,
                                borderColor: `${cat.color}30`
                              } : undefined}
                              className="px-2 py-0.5 font-mono text-[9px] font-black bg-slate-200 text-slate-700 rounded-lg border"
                            >
                              {item.categoryCode}
                            </span>
                          );
                        })()}
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg ${
                          item.availableCopies === 0 
                            ? 'bg-red-100 text-red-700 border border-red-200/50' 
                            : 'bg-amber-100 text-amber-700 border border-amber-200/50'
                        }`}>
                          {alertBadge}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold truncate">
                          {item.author}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 truncate">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Numeric status indicators */}
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-800 leading-none">
                          {item.availableCopies} {language === 'kh' ? 'ក្បាល' : 'copies'}
                        </p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                          {language === 'kh' ? `សរុប ${item.totalCopies} ក្បាល` : `of ${item.totalCopies} total`}
                        </p>
                      </div>

                      {/* Expand indicator */}
                      <div className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded detailed stats */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-white/40 border-t border-slate-100 divide-y divide-slate-100 text-xs">
                      {/* Progress visualizer */}
                      <div className="py-3">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>{language === 'kh' ? 'អត្រាមានសៀវភៅ៖' : 'Availability Rate:'}</span>
                          <span>{percentAvailable.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.availableCopies === 0 ? 'bg-red-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${percentAvailable}%` }}
                          />
                        </div>
                      </div>

                      {/* Specific counts breakdown */}
                      <div className="py-2.5 grid grid-cols-4 gap-2 text-center text-[10px] font-semibold text-slate-500">
                        <div className="bg-green-50/50 p-1.5 rounded-xl border border-green-100/30">
                          <p className="text-green-700 font-bold">{item.availableCopies}</p>
                          <p className="text-[9px] mt-0.5">{language === 'kh' ? 'អាចខ្ចីបាន' : 'Available'}</p>
                        </div>
                        <div className="bg-blue-50/50 p-1.5 rounded-xl border border-blue-100/30">
                          <p className="text-blue-700 font-bold">{item.borrowedCopies}</p>
                          <p className="text-[9px] mt-0.5">{language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed'}</p>
                        </div>
                        <div className="bg-red-50/50 p-1.5 rounded-xl border border-red-100/30">
                          <p className="text-red-700 font-bold">{item.overdueCopies}</p>
                          <p className="text-[9px] mt-0.5">{language === 'kh' ? 'ហួសកំណត់' : 'Overdue'}</p>
                        </div>
                        <div className="bg-amber-50/50 p-1.5 rounded-xl border border-amber-100/30">
                          <p className="text-amber-700 font-bold">{item.lostCopies}</p>
                          <p className="text-[9px] mt-0.5">{language === 'kh' ? 'បាត់បង់' : 'Lost'}</p>
                        </div>
                      </div>

                      {/* Barcodes of copies */}
                      <div className="py-2.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                          {language === 'kh' ? 'លេខកូដបារកូដចម្លង៖' : 'Barcodes of Copies:'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.barcodes.map(bc => {
                            const copyBook = books.find(b => b.barcode === bc);
                            let statusColor = 'bg-slate-100 text-slate-700';
                            if (copyBook?.status === 'available') statusColor = 'bg-green-100 text-green-800';
                            else if (copyBook?.status === 'borrowed') statusColor = 'bg-blue-100 text-blue-800';
                            else if (copyBook?.status === 'overdue') statusColor = 'bg-red-100 text-red-800';
                            else if (copyBook?.status === 'lost') statusColor = 'bg-amber-100 text-amber-800';

                            return (
                              <span key={bc} className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold border border-white/50 shadow-sm ${statusColor}`}>
                                {bc}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-150 text-slate-400 text-xs font-semibold flex flex-col items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-green-500 mb-2.5 animate-bounce" />
              <p className="text-slate-700 font-bold">
                {language === 'kh' ? 'ស្តុកគ្រប់គ្រាន់ល្អឥតខ្ចោះ!' : 'Inventory Fully Stocked!'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                {language === 'kh' 
                  ? `មិនមានសៀវភៅណាដែលមានកម្រិតស្តុកតិចជាង ${threshold} ក្បាលនោះទេ`
                  : `No books have available copies below the threshold of ${threshold}.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
