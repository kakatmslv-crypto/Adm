import { useState, useMemo } from 'react';
import { Book, Category, Language } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Map, 
  Info, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Search, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';

interface LibraryMapProps {
  books: Book[];
  categories: Category[];
  language: Language;
}

interface ShelfDefinition {
  id: string;
  nameEn: string;
  nameKh: string;
  descriptionEn: string;
  descriptionKh: string;
  x: number;
  y: number;
  width: number;
  height: number;
  colorClass: string;
  accentColor: string;
  fillColor: string;
  hoverFillColor: string;
  textColor: string;
}

export default function LibraryMap({ books, categories, language }: LibraryMapProps) {
  const [hoveredShelf, setHoveredShelf] = useState<string | null>(null);
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Define shelves and coordinates
  const shelfDefinitions = useMemo<ShelfDefinition[]>(() => [
    {
      id: 'Shelf A',
      nameEn: 'Shelf A - Science & Math',
      nameKh: 'ធ្នើរ A - វិទ្យាសាស្ត្រ និងគណិតវិទ្យា',
      descriptionEn: 'Mathematics, Geometry, and Fundamental Sciences',
      descriptionKh: 'គណិតវិទ្យា ធរណីមាត្រ និងវិទ្យាសាស្ត្រមូលដ្ឋាន',
      x: 50,
      y: 60,
      width: 100,
      height: 60,
      colorClass: 'text-blue-600 border-blue-200 bg-blue-50/50',
      accentColor: '#2563EB',
      fillColor: 'rgba(37, 99, 235, 0.1)',
      hoverFillColor: 'rgba(37, 99, 235, 0.25)',
      textColor: 'text-blue-800',
    },
    {
      id: 'Shelf B',
      nameEn: 'Shelf B - Khmer Literature',
      nameKh: 'ធ្នើរ B - អក្សរសាស្ត្រខ្មែរ',
      descriptionEn: 'Khmer Poetry, Novels, Language study and Local Authors',
      descriptionKh: 'កំណាព្យខ្មែរ ប្រលោមលោក ការសិក្សាភាសា និងអ្នកនិពន្ធក្នុងស្រុក',
      x: 50,
      y: 150,
      width: 100,
      height: 60,
      colorClass: 'text-indigo-600 border-indigo-200 bg-indigo-50/50',
      accentColor: '#4F46E5',
      fillColor: 'rgba(79, 70, 229, 0.1)',
      hoverFillColor: 'rgba(79, 70, 229, 0.25)',
      textColor: 'text-indigo-800',
    },
    {
      id: 'Shelf C',
      nameEn: 'Shelf C - English Language',
      nameKh: 'ធ្នើរ C - ភាសាអង់គ្លេស',
      descriptionEn: 'English Literature, Grammar, and ESL Training Guides',
      descriptionKh: 'អក្សរសាស្ត្រអង់គ្លេស វេយ្យាករណ៍ និងមគ្គុទ្ទេសក៍សិក្សាភាសាអង់គ្លេស (ESL)',
      x: 180,
      y: 60,
      width: 100,
      height: 60,
      colorClass: 'text-emerald-600 border-emerald-200 bg-emerald-50/50',
      accentColor: '#059669',
      fillColor: 'rgba(5, 150, 105, 0.1)',
      hoverFillColor: 'rgba(5, 150, 105, 0.25)',
      textColor: 'text-emerald-800',
    },
    {
      id: 'Shelf D',
      nameEn: 'Shelf D - Natural Sciences',
      nameKh: 'ធ្នើរ D - វិទ្យាសាស្ត្រធម្មជាតិ',
      descriptionEn: 'Physics, Chemistry, Biology and Environmental studies',
      descriptionKh: 'រូបវិទ្យា គីមីវិទ្យា ជីវវិទ្យា និងការសិក្សាអំពីបរិស្ថាន',
      x: 180,
      y: 150,
      width: 100,
      height: 60,
      colorClass: 'text-amber-600 border-amber-200 bg-amber-50/50',
      accentColor: '#D97706',
      fillColor: 'rgba(217, 119, 6, 0.1)',
      hoverFillColor: 'rgba(217, 119, 6, 0.25)',
      textColor: 'text-amber-800',
    },
    {
      id: 'Shelf E',
      nameEn: 'Shelf E - History & Geography',
      nameKh: 'ធ្នើរ E - ប្រវត្តិវិទ្យា និងភូមិវិទ្យា',
      descriptionEn: 'Cambodian History, World Civilization, Maps and Earth sciences',
      descriptionKh: 'ប្រវត្តិវិទ្យាប្រទេសកម្ពុជា វិរុសជាតិផែនដី ផែនទី និងភូមិវិទ្យា',
      x: 310,
      y: 60,
      width: 100,
      height: 60,
      colorClass: 'text-rose-600 border-rose-200 bg-rose-50/50',
      accentColor: '#E11D48',
      fillColor: 'rgba(225, 29, 72, 0.1)',
      hoverFillColor: 'rgba(225, 29, 72, 0.25)',
      textColor: 'text-rose-800',
    },
    {
      id: 'Shelf F',
      nameEn: 'Shelf F - ICT & Technology',
      nameKh: 'ធ្នើរ F - បច្ចេកវិទ្យាព័ត៌មាន (ICT)',
      descriptionEn: 'Computer Science, Programming, Digital Literacy and IT Reference',
      descriptionKh: 'វិទ្យាសាស្ត្រកុំព្យូទ័រ ការសរសេរកម្មវិធី អក្ខរកម្មឌីជីថល និងសៀវភៅយោង IT',
      x: 310,
      y: 150,
      width: 100,
      height: 60,
      colorClass: 'text-purple-600 border-purple-200 bg-purple-50/50',
      accentColor: '#9333EA',
      fillColor: 'rgba(147, 51, 234, 0.1)',
      hoverFillColor: 'rgba(147, 51, 234, 0.25)',
      textColor: 'text-purple-800',
    },
  ], []);

  // Normalize location names to map to Shelf IDs
  const getShelfIdForBook = (location?: string): string => {
    if (!location) return 'Other';
    const loc = location.toUpperCase().trim();
    if (loc.includes('SHELF A') || loc.startsWith('A')) return 'Shelf A';
    if (loc.includes('SHELF B') || loc.startsWith('B')) return 'Shelf B';
    if (loc.includes('SHELF C') || loc.startsWith('C')) return 'Shelf C';
    if (loc.includes('SHELF D') || loc.startsWith('D')) return 'Shelf D';
    if (loc.includes('SHELF E') || loc.startsWith('E')) return 'Shelf E';
    if (loc.includes('SHELF F') || loc.startsWith('F')) return 'Shelf F';
    return 'Other';
  };

  // Pre-calculate books inventory per shelf
  const shelfStats = useMemo(() => {
    const stats: { [key: string]: { total: number; available: number; borrowed: number; overdue: number; lost: number; bookList: Book[] } } = {};
    
    // Initialize stats
    shelfDefinitions.forEach(shelf => {
      stats[shelf.id] = { total: 0, available: 0, borrowed: 0, overdue: 0, lost: 0, bookList: [] };
    });
    stats['Other'] = { total: 0, available: 0, borrowed: 0, overdue: 0, lost: 0, bookList: [] };

    // Fill stats
    books.forEach(book => {
      const shelfId = getShelfIdForBook(book.location);
      if (stats[shelfId]) {
        stats[shelfId].total++;
        stats[shelfId].bookList.push(book);
        if (book.status === 'available') stats[shelfId].available++;
        else if (book.status === 'borrowed') stats[shelfId].borrowed++;
        else if (book.status === 'overdue') stats[shelfId].overdue++;
        else if (book.status === 'lost') stats[shelfId].lost++;
      } else {
        stats['Other'].total++;
        stats['Other'].bookList.push(book);
        if (book.status === 'available') stats['Other'].available++;
        else if (book.status === 'borrowed') stats['Other'].borrowed++;
        else if (book.status === 'overdue') stats['Other'].overdue++;
        else if (book.status === 'lost') stats['Other'].lost++;
      }
    });

    return stats;
  }, [books, shelfDefinitions]);

  // Handle active shelf detail retrieval
  const activeShelfId = hoveredShelf || selectedShelf;
  const activeShelfDef = shelfDefinitions.find(s => s.id === activeShelfId);
  const activeShelfStats = activeShelfId ? shelfStats[activeShelfId] : null;

  // Filter books on selected shelf
  const filteredBooksForSelectedShelf = useMemo(() => {
    if (!selectedShelf) return [];
    const shelfBooks = shelfStats[selectedShelf]?.bookList || [];
    return shelfBooks.filter(book => {
      const matchesSearch = 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.barcode.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [selectedShelf, shelfStats, searchQuery, statusFilter]);

  // Total books that are assigned to an unmapped section
  const otherCount = shelfStats['Other']?.total || 0;

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100/50 text-blue-600 rounded-2xl border border-blue-200/40">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {language === 'kh' ? 'ប្លង់ផែនទីបណ្ណាល័យអន្តរកម្ម' : 'Interactive Library Layout Map'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              {language === 'kh' ? 'ប៉ះ ឬដាក់ទស្សន៍ទ្រនិចលើផ្នែកធ្នើរដើម្បីត្រួតពិនិត្យចំនួនសៀវភៅបច្ចុប្បន្ន' : 'Hover or tap over shelf areas to audit current book quantities'}
            </p>
          </div>
        </div>

        {otherCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200/40 rounded-xl text-xs font-black">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              {language === 'kh' 
                ? `សៀវភៅ ${otherCount} ក្បាលមិនទាន់កំណត់ធ្នើរច្បាស់លាស់` 
                : `${otherCount} books in unassigned sections`}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* SVG Interactive Blueprint Floor Plan */}
        <div className="lg:col-span-8 bg-slate-50/60 rounded-2xl border border-slate-200/50 p-4 relative flex flex-col items-center justify-center overflow-hidden min-h-[350px]">
          {/* Blueprint background grid lines */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <svg 
            viewBox="0 0 800 400" 
            className="w-full h-auto select-none max-w-3xl"
          >
            {/* Outline Wall Bounds */}
            <rect 
              x="10" 
              y="10" 
              width="780" 
              height="380" 
              fill="none" 
              stroke="#94A3B8" 
              strokeWidth="2.5" 
              strokeDasharray="4 4"
            />

            {/* Title / North Indicator on blueprint */}
            <text x="30" y="35" className="font-mono text-[9px] font-bold fill-slate-400 uppercase tracking-widest">
              Peam Koh Sna High School Lib - Floor Plan (Grid-Scale 1:50)
            </text>

            {/* Study & Reading Zone (Right Side Lounge) */}
            <g>
              <rect 
                x="440" 
                y="40" 
                width="320" 
                height="300" 
                fill="rgba(148, 163, 184, 0.03)" 
                stroke="#CBD5E1" 
                strokeWidth="1.5" 
                strokeDasharray="6 4" 
                rx="12"
              />
              <text 
                x="600" 
                y="200" 
                textAnchor="middle" 
                className="font-bold fill-slate-300 text-xs uppercase tracking-widest"
              >
                {language === 'kh' ? 'តំបន់អានសៀវភៅ & សិក្សា' : 'Study & Reading Lounge'}
              </text>
              <text 
                x="600" 
                y="218" 
                textAnchor="middle" 
                className="font-mono text-[9px] fill-slate-400 tracking-wider"
              >
                (Silent Reading Zone / តំបន់ស្ងប់ស្ងាត់)
              </text>

              {/* Graphical representation of tables & chairs */}
              {/* Table 1 */}
              <circle cx="510" cy="110" r="24" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
              <circle cx="510" cy="74" r="6" fill="#F1F5F9" stroke="#94A3B8" />
              <circle cx="510" cy="146" r="6" fill="#F1F5F9" stroke="#94A3B8" />
              <circle cx="474" cy="110" r="6" fill="#F1F5F9" stroke="#94A3B8" />
              <circle cx="546" cy="110" r="6" fill="#F1F5F9" stroke="#94A3B8" />

              {/* Table 2 */}
              <circle cx="690" cy="110" r="24" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
              <circle cx="690" cy="74" r="6" fill="#F1F5F9" stroke="#94A3B8" />
              <circle cx="690" cy="146" r="6" fill="#F1F5F9" stroke="#94A3B8" />
              <circle cx="654" cy="110" r="6" fill="#F1F5F9" stroke="#94A3B8" />
              <circle cx="726" cy="110" r="6" fill="#F1F5F9" stroke="#94A3B8" />

              {/* Table 3 (Lounge Couch representation) */}
              <rect x="560" y="270" width="80" height="30" rx="4" fill="#E2E8F0" stroke="#94A3B8" />
              <text x="600" y="288" textAnchor="middle" className="fill-slate-500 font-semibold text-[9px]">Lounge</text>
            </g>

            {/* Librarian Desk / Counter */}
            <g>
              <rect 
                x="180" 
                y="270" 
                width="160" 
                height="45" 
                fill="#E2E8F0" 
                stroke="#64748B" 
                strokeWidth="1.5" 
                rx="6"
              />
              <text 
                x="260" 
                y="297" 
                textAnchor="middle" 
                className="font-extrabold fill-slate-600 text-[10px] uppercase tracking-wider"
              >
                {language === 'kh' ? 'តុបណ្ណារក្ស / បញ្ជរ' : 'Librarian Counter'}
              </text>
            </g>

            {/* Entrance Gate */}
            <g>
              {/* Gate door sweep */}
              <path d="M 400,390 A 40,40 0 0,1 360,350" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
              <line x1="400" y1="390" x2="400" y2="350" stroke="#475569" strokeWidth="2" />
              <rect x="360" y="380" width="80" height="10" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1" />
              <text x="400" y="387" textAnchor="middle" className="font-bold fill-slate-500 text-[8px] uppercase">
                {language === 'kh' ? 'ច្រកចូល' : 'Entrance'}
              </text>
            </g>

            {/* Interactive Shelves Shelves A - F */}
            {shelfDefinitions.map((shelf) => {
              const stats = shelfStats[shelf.id] || { total: 0 };
              const isSelected = selectedShelf === shelf.id;
              const isHovered = hoveredShelf === shelf.id;
              const hasBooks = stats.total > 0;

              return (
                <g 
                  key={shelf.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredShelf(shelf.id)}
                  onMouseLeave={() => setHoveredShelf(null)}
                  onClick={() => {
                    setSelectedShelf(shelf.id === selectedShelf ? null : shelf.id);
                    // Clear search on shelf change
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  {/* Outer glow or selection highlight */}
                  {(isSelected || isHovered) && (
                    <rect 
                      x={shelf.x - 4} 
                      y={shelf.y - 4} 
                      width={shelf.width + 8} 
                      height={shelf.height + 8} 
                      fill="none" 
                      stroke={shelf.accentColor} 
                      strokeWidth={isSelected ? "2.5" : "1.5"}
                      strokeLinecap="round"
                      rx="10"
                      className="transition-all duration-200"
                    />
                  )}

                  {/* Main Shelf Body Rack */}
                  <rect 
                    x={shelf.x} 
                    y={shelf.y} 
                    width={shelf.width} 
                    height={shelf.height} 
                    fill={isHovered || isSelected ? shelf.hoverFillColor : shelf.fillColor} 
                    stroke={shelf.accentColor} 
                    strokeWidth="2" 
                    rx="8"
                    className="transition-all duration-200"
                  />

                  {/* Aesthetic shelf division lines inside to make it look like a bookshelf rack */}
                  <line x1={shelf.x} y1={shelf.y + shelf.height / 2} x2={shelf.x + shelf.width} y2={shelf.y + shelf.height / 2} stroke={shelf.accentColor} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />

                  {/* Shelf Identifier text */}
                  <text 
                    x={shelf.x + shelf.width / 2} 
                    y={shelf.y + 24} 
                    textAnchor="middle" 
                    className={`font-black text-xs ${shelf.textColor}`}
                  >
                    {shelf.id}
                  </text>

                  {/* Subject category name simplified */}
                  <text 
                    x={shelf.x + shelf.width / 2} 
                    y={shelf.y + 38} 
                    textAnchor="middle" 
                    className="fill-slate-500 font-extrabold text-[8px] uppercase tracking-tighter"
                  >
                    {shelf.id === 'Shelf A' ? (language === 'kh' ? 'រូប/គណិត' : 'Science & Math') :
                     shelf.id === 'Shelf B' ? (language === 'kh' ? 'អក្សរសាស្ត្រ' : 'Literature') :
                     shelf.id === 'Shelf C' ? (language === 'kh' ? 'អង់គ្លេស' : 'English') :
                     shelf.id === 'Shelf D' ? (language === 'kh' ? 'វិទ្យាសាស្ត្រ' : 'Nat Sciences') :
                     shelf.id === 'Shelf E' ? (language === 'kh' ? 'ប្រវត្តិ/ភូមិ' : 'Hist & Geo') :
                     (language === 'kh' ? 'បច្ចេកវិទ្យា' : 'ICT / Tech')}
                  </text>

                  {/* Quantity Indicator Pill inside Shelf */}
                  <g>
                    <rect 
                      x={shelf.x + shelf.width / 2 - 18} 
                      y={shelf.y + 44} 
                      width="36" 
                      height="12" 
                      rx="4" 
                      fill={hasBooks ? shelf.accentColor : '#64748B'} 
                    />
                    <text 
                      x={shelf.x + shelf.width / 2} 
                      y={shelf.y + 53} 
                      textAnchor="middle" 
                      className="fill-white font-black text-[8px] font-mono"
                    >
                      {stats.total} {language === 'kh' ? 'ក្បាល' : 'Bks'}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Info panel / Audit panel */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {activeShelfId && activeShelfStats ? (
              <motion.div 
                key={activeShelfId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 h-full flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Shelf Title & Description */}
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/50`}>
                        {activeShelfId}
                      </span>
                      {selectedShelf === activeShelfId && (
                        <button 
                          onClick={() => setSelectedShelf(null)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase mt-2">
                      {language === 'kh' ? activeShelfDef?.nameKh : activeShelfDef?.nameEn}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold leading-normal mt-0.5">
                      {language === 'kh' ? activeShelfDef?.descriptionKh : activeShelfDef?.descriptionEn}
                    </p>
                  </div>

                  {/* Shelf Metrics */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider">{language === 'kh' ? 'សរុប' : 'Total'}</span>
                      <span className="text-lg font-black text-slate-800 mt-1 block leading-none">{activeShelfStats.total}</span>
                    </div>
                    <div className="p-3 bg-emerald-50/40 border border-emerald-100/50 rounded-xl">
                      <span className="text-[9px] font-black text-emerald-600 uppercase block tracking-wider">{language === 'kh' ? 'ដែលអាចខ្ចី' : 'Available'}</span>
                      <span className="text-lg font-black text-emerald-600 mt-1 block leading-none">{activeShelfStats.available}</span>
                    </div>
                    <div className="p-3 bg-blue-50/40 border border-blue-100/50 rounded-xl">
                      <span className="text-[9px] font-black text-blue-600 uppercase block tracking-wider">{language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed'}</span>
                      <span className="text-lg font-black text-blue-600 mt-1 block leading-none">{activeShelfStats.borrowed}</span>
                    </div>
                    <div className="p-3 bg-rose-50/40 border border-rose-100/50 rounded-xl">
                      <span className="text-[9px] font-black text-rose-600 uppercase block tracking-wider">{language === 'kh' ? 'ហួសកំណត់' : 'Overdue'}</span>
                      <span className="text-lg font-black text-rose-600 mt-1 block leading-none">{activeShelfStats.overdue}</span>
                    </div>
                  </div>

                  {/* Simple status availability visual bar */}
                  {activeShelfStats.total > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{language === 'kh' ? 'អត្រាទំនេរ' : 'Availability Rate'}</span>
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
                        <div 
                          style={{ width: `${(activeShelfStats.available / activeShelfStats.total) * 100}%` }}
                          className="bg-emerald-500 h-full"
                          title={`Available: ${activeShelfStats.available}`}
                        />
                        <div 
                          style={{ width: `${(activeShelfStats.borrowed / activeShelfStats.total) * 100}%` }}
                          className="bg-blue-500 h-full"
                          title={`Borrowed: ${activeShelfStats.borrowed}`}
                        />
                        <div 
                          style={{ width: `${(activeShelfStats.overdue / activeShelfStats.total) * 100}%` }}
                          className="bg-rose-500 h-full"
                          title={`Overdue: ${activeShelfStats.overdue}`}
                        />
                        <div 
                          style={{ width: `${(activeShelfStats.lost / activeShelfStats.total) * 100}%` }}
                          className="bg-amber-500 h-full"
                          title={`Lost: ${activeShelfStats.lost}`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 text-center">
                  {selectedShelf === activeShelfId ? (
                    <p className="text-[10px] font-extrabold text-blue-600 flex items-center justify-center gap-1">
                      <span>{language === 'kh' ? 'កំពុងបង្ហាញបញ្ជីសៀវភៅខាងក្រោម' : 'Books list loaded below'}</span>
                      <ArrowRight className="w-3.5 h-3.5 rotate-90 animate-bounce" />
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedShelf(activeShelfId);
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                      className="w-full py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-black rounded-xl border border-slate-200 transition duration-150 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{language === 'kh' ? 'ពិនិត្យបញ្ជីសៀវភៅធ្នើរនេះ' : 'Audit Shelf Inventory'}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-300 py-10 px-5 text-center flex flex-col items-center justify-center h-full space-y-3"
              >
                <HelpCircle className="w-8 h-8 text-slate-300" />
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">{language === 'kh' ? 'ជ្រើសរើសធ្នើរសៀវភៅ' : 'Select a Bookcase Section'}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 leading-normal max-w-[200px] mx-auto">
                    {language === 'kh' ? 'ចុចលើផ្នែកធ្នើរណាមួយក្នុងប្លង់ ដើម្បីពិនិត្យមើលបញ្ជីសៀវភៅដែលមានវត្តមានក្នុងទីតាំងនោះ។' : 'Click any highlighted rack shelf section on the floor layout to inspect its detailed catalog lists.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Book List sub-system inside selected shelf */}
      <AnimatePresence>
        {selectedShelf && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-slate-100 pt-6 mt-4 space-y-4"
          >
            {/* Shelf Catalog Header with Search Filters */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping shrink-0" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  {language === 'kh' ? `សៀវភៅដែលមានក្នុង៖ ${selectedShelf}` : `Books Registered in ${selectedShelf}`}
                </h3>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-mono text-[10px] font-black rounded-full">
                  {filteredBooksForSelectedShelf.length}
                </span>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search query input */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'kh' ? 'ស្វែងរកចំណងជើង បាកូដ អ្នកនិពន្ធ...' : 'Search title, barcode, author...'}
                    className="pl-8 pr-3 py-1.5 w-full md:w-56 text-xs bg-white border border-slate-200 focus:outline-none focus:border-slate-400 rounded-xl"
                  />
                </div>

                {/* Status filter select */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-3 py-1.5 cursor-pointer outline-none focus:border-slate-400"
                >
                  <option value="all">{language === 'kh' ? 'គ្រប់ស្ថានភាព' : 'All Statuses'}</option>
                  <option value="available">{language === 'kh' ? 'ដែលអាចខ្ចីបាន' : 'Available'}</option>
                  <option value="borrowed">{language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed'}</option>
                  <option value="overdue">{language === 'kh' ? 'ហួសកំណត់' : 'Overdue'}</option>
                  <option value="lost">{language === 'kh' ? 'បាត់បង់' : 'Lost'}</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSelectedShelf(null)}
                  className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-950 text-slate-500 rounded-xl transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Catalog list grid / table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/40">
                    <tr>
                      <th className="px-5 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'ចំណងជើងសៀវភៅ' : 'Book Title'}</th>
                      <th className="px-5 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'លេខកូដបាកូដ' : 'Barcode'}</th>
                      <th className="px-5 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'អ្នកនិពន្ធ' : 'Author'}</th>
                      <th className="px-5 py-3 text-left text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'ទីតាំងលម្អិត' : 'Exact Location'}</th>
                      <th className="px-5 py-3 text-right text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'ស្ថានភាព' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredBooksForSelectedShelf.length > 0 ? (
                      filteredBooksForSelectedShelf.map((book) => (
                        <tr key={book.id} className="hover:bg-slate-50/40 transition">
                          <td className="px-5 py-3 font-bold text-slate-800">{book.title}</td>
                          <td className="px-5 py-3 text-slate-500 font-mono font-medium">{book.barcode}</td>
                          <td className="px-5 py-3 text-slate-600 font-semibold">{book.author}</td>
                          <td className="px-5 py-3 text-slate-500 font-semibold">{book.location || 'N/A'}</td>
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-black rounded-full border ${
                              book.status === 'available'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/30'
                                : book.status === 'borrowed'
                                ? 'bg-blue-50 text-blue-700 border-blue-200/30'
                                : book.status === 'overdue'
                                ? 'bg-rose-50 text-rose-700 border-rose-200/30'
                                : 'bg-amber-50 text-amber-700 border-amber-200/30'
                            }`}>
                              {book.status === 'available'
                                ? (language === 'kh' ? 'អាចខ្ចីបាន' : 'Available')
                                : book.status === 'borrowed'
                                ? (language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed')
                                : book.status === 'overdue'
                                ? (language === 'kh' ? 'ហួសកំណត់' : 'Overdue')
                                : (language === 'kh' ? 'បាត់បង់' : 'Lost')}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400 font-bold text-xs">
                          {language === 'kh' ? 'មិនមានសៀវភៅស្របនឹងលក្ខខណ្ឌស្វែងរកទេ' : 'No books found matching criteria.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
