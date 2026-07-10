import { useState, useMemo } from 'react';
import CategoryDistributionSummary from './CategoryDistributionSummary';
import LibraryGrowthChart from './LibraryGrowthChart';
import { Book, Student, BorrowRecord, Language, Category } from '../types';
import { translations } from '../utils/translations';
import { 
  Calendar, Search, FileText, ArrowUpRight, Ban, Eye, FileDown, 
  Coins, Settings, ShieldAlert, Check, HelpCircle, Landmark, RotateCcw,
  FileSpreadsheet, History, ChevronDown, BookOpen, Users, Mail, Send, AlertTriangle
} from 'lucide-react';

interface ReportsProps {
  books: Book[];
  students: Student[];
  records: BorrowRecord[];
  language: Language;
  categories?: Category[];
  onNotifyStudent: (student: Student, studentRecs: BorrowRecord[], studentBooks: Book[]) => void;
}

type ReportType = 'all' | 'active' | 'overdue' | 'overdue-list' | 'lost' | 'returned' | 'fees' | 'history';

// Helper to compute difference in days
function getDaysBetween(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  start.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function Reports({ books, students, records, language, categories = [], onNotifyStudent }: ReportsProps) {
  const t = translations[language];

  // Report type tab selection
  const [activeReport, setActiveReport] = useState<ReportType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCsvDropdown, setShowCsvDropdown] = useState(false);
  const [showPdfDropdown, setShowPdfDropdown] = useState(false);

  // Late Fee configuration state
  const [loanPeriod, setLoanPeriod] = useState<number>(7);
  const [dailyFineRate, setDailyFineRate] = useState<number>(500);
  const [currencyUnit, setCurrencyUnit] = useState<string>('៛');
  const [calculationMode, setCalculationMode] = useState<'period' | 'duedate'>('period');

  // Fine payment status simulation state
  const [paidRecordIds, setPaidRecordIds] = useState<string[]>([]);
  const [waivedRecordIds, setWaivedRecordIds] = useState<string[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Group overdue records by student to notify them
  const overdueRecordsByStudent = useMemo(() => {
    const overdueList = records.filter(rec => (rec.status === 'overdue' || (rec.status === 'borrowed' && rec.dueDate < todayStr)) && !rec.returnDate);
    const groups: { [studentId: string]: { student: Student; records: BorrowRecord[]; books: Book[] } } = {};

    overdueList.forEach(rec => {
      const student = students.find(s => s.id === rec.studentId);
      const book = books.find(b => b.id === rec.bookId);
      if (!student) return;

      if (!groups[student.id]) {
        groups[student.id] = {
          student,
          records: [],
          books: []
        };
      }
      groups[student.id].records.push(rec);
      if (book) {
        groups[student.id].books.push(book);
      }
    });

    return Object.values(groups);
  }, [records, students, books, todayStr]);

  // Filtering records depending on selected Report Type
  const filteredRecords = records.filter(rec => {
    const book = books.find(b => b.id === rec.bookId);
    const student = students.find(s => s.id === rec.studentId);
    
    // Search filter matches book title, barcode, student ID, student name
    const matchesSearch = 
      (book?.title.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (book?.barcode.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (student?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (student?.studentId.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    if (!matchesSearch) return false;

    switch (activeReport) {
      case 'active':
        return rec.status === 'borrowed';
      case 'overdue':
        return rec.status === 'overdue';
      case 'overdue-list':
        return (rec.status === 'overdue' || (rec.status === 'borrowed' && rec.dueDate < todayStr));
      case 'lost':
        return rec.status === 'lost';
      case 'returned':
        return rec.status === 'returned';
      case 'fees': {
        if (calculationMode === 'period') {
          const days = getDaysBetween(rec.borrowDate, rec.returnDate || todayStr);
          return days > loanPeriod;
        } else {
          return getDaysBetween(rec.dueDate, rec.returnDate || todayStr) > 0;
        }
      }
      case 'all':
      default:
        return true;
    }
  });

  // Get chronological history of all individual borrow and return events/transactions
  const getHistoryEvents = () => {
    const events: Array<{
      id: string;
      type: 'borrow' | 'return';
      date: string;
      bookId: string;
      studentId: string;
      recordId: string;
      notes?: string;
    }> = [];

    records.forEach(rec => {
      // 1. Every loan record represents a borrow transaction/event
      events.push({
        id: `${rec.id}-borrow`,
        type: 'borrow',
        date: rec.borrowDate,
        bookId: rec.bookId,
        studentId: rec.studentId,
        recordId: rec.id,
        notes: rec.notes
      });

      // 2. If returnDate is present, it represents a return transaction/event
      if (rec.returnDate) {
        events.push({
          id: `${rec.id}-return`,
          type: 'return',
          date: rec.returnDate,
          bookId: rec.bookId,
          studentId: rec.studentId,
          recordId: rec.id,
          notes: rec.notes
        });
      }
    });

    // Apply search filter (matching book title, barcode, student name, student ID, date, type, or notes)
    return events.filter(evt => {
      const book = books.find(b => b.id === evt.bookId);
      const student = students.find(s => s.id === evt.studentId);
      const q = searchTerm.toLowerCase().trim();
      
      if (!q) return true;

      const typeLabelKh = evt.type === 'borrow' ? 'ខ្ចី' : 'សង';
      const typeLabelEn = evt.type === 'borrow' ? 'borrow' : 'return';

      return (
        (book?.title.toLowerCase().includes(q) || false) ||
        (book?.barcode.toLowerCase().includes(q) || false) ||
        (student?.name.toLowerCase().includes(q) || false) ||
        (student?.studentId.toLowerCase().includes(q) || false) ||
        evt.date.includes(q) ||
        typeLabelKh.includes(q) ||
        typeLabelEn.includes(q) ||
        (evt.notes?.toLowerCase().includes(q) || false)
      );
    }).sort((a, b) => {
      // Sort chronologically (newest first)
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, sort returns before borrows for the same record
      if (a.recordId === b.recordId) {
        return a.type === 'return' ? -1 : 1;
      }
      return b.recordId.localeCompare(a.recordId);
    });
  };

  const getReportTitle = () => {
    switch (activeReport) {
      case 'active':
        return language === 'kh' ? 'របាយការណ៍សៀវភៅកំពុងខ្ចីសកម្ម' : 'Active Book Borrowing Report';
      case 'overdue':
        return language === 'kh' ? 'របាយការណ៍សៀវភៅហួសកាលកំណត់' : 'Overdue Book Loans Report';
      case 'overdue-list':
        return language === 'kh' ? 'បញ្ជីសិស្សមានសៀវភៅហួសកាលកំណត់' : 'Students with Overdue Books Report';
      case 'lost':
        return language === 'kh' ? 'របាយការណ៍សៀវភៅបាត់បង់' : 'Lost & Damaged Books Report';
      case 'returned':
        return language === 'kh' ? 'របាយការណ៍សៀវភៅសងរួចរាល់' : 'Completed Returns Report';
      case 'fees':
        return language === 'kh' ? 'របាយការណ៍សវនកម្មថ្លៃពិន័យយឺតយ៉ាវ' : 'Late Fees & Fines Audit Report';
      case 'history':
        return language === 'kh' ? 'ប្រវត្តិប្រតិបត្តិការខ្ចី-សងតាមលំដាប់ពេលវេលា' : 'Chronological Borrow & Return Transaction History';
      case 'all':
      default:
        return language === 'kh' ? 'របាយការណ៍ខ្ចី-សងសរុបទាំងអស់' : 'Comprehensive Library Transaction Log';
    }
  };

  const handleExportPDF = () => {
    const reportTitle = getReportTitle();
    const todayStr = new Date().toLocaleDateString(language === 'kh' ? 'km-KH' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Compile rows for printable HTML layout
    let tableRows = '';
    
    if (activeReport === 'fees') {
      filteredRecords.forEach(rec => {
        const bk = books.find(b => b.id === rec.bookId);
        const stu = students.find(s => s.id === rec.studentId);
        
        let daysOverdue = 0;
        if (calculationMode === 'period') {
          const daysBorrowed = getDaysBetween(rec.borrowDate, rec.returnDate || todayStr);
          daysOverdue = Math.max(0, daysBorrowed - loanPeriod);
        } else {
          daysOverdue = Math.max(0, getDaysBetween(rec.dueDate, rec.returnDate || todayStr));
        }

        const isPaid = paidRecordIds.includes(rec.id);
        const isWaived = waivedRecordIds.includes(rec.id);
        const fineAmount = daysOverdue * dailyFineRate;

        let statusText = 'Unpaid';
        let badgeStyle = 'background-color: #fee2e2; color: #991b1b;';
        if (isPaid) {
          statusText = 'Paid';
          badgeStyle = 'background-color: #d1fae5; color: #065f46;';
        } else if (isWaived) {
          statusText = 'Waived';
          badgeStyle = 'background-color: #f1f5f9; color: #475569;';
        }

        tableRows += `
          <tr>
            <td><strong>${stu?.name || 'Unknown Student'}</strong><br><small>${stu?.studentId || ''} (${stu?.classGrade || 'N/A'})</small></td>
            <td>${bk?.title || 'Unknown Book'}<br><small>${bk?.barcode || ''}</small></td>
            <td>${rec.borrowDate}</td>
            <td>${rec.returnDate ? `Returned: ${rec.returnDate}` : `Due: ${rec.dueDate}`}</td>
            <td>${daysOverdue} ${language === 'kh' ? 'ថ្ងៃ' : 'days'}</td>
            <td><strong>${fineAmount.toLocaleString()} ${currencyUnit}</strong></td>
            <td><span class="status-badge" style="font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; ${badgeStyle}">${statusText.toUpperCase()}</span></td>
          </tr>
        `;
      });
    } else if (activeReport === 'history') {
      const historyEvents = getHistoryEvents();
      historyEvents.forEach(evt => {
        const bk = books.find(b => b.id === evt.bookId);
        const stu = students.find(s => s.id === evt.studentId);
        const typeLabel = evt.type === 'borrow' 
          ? (language === 'kh' ? 'ខ្ចី' : 'BORROW')
          : (language === 'kh' ? 'សង' : 'RETURN');
        const badgeColor = evt.type === 'borrow'
          ? 'background-color: #dbeafe; color: #1e40af;'
          : 'background-color: #d1fae5; color: #065f46;';

        tableRows += `
          <tr>
            <td><strong>${evt.date}</strong></td>
            <td><span class="status-badge" style="font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; ${badgeColor}">${typeLabel}</span></td>
            <td>${bk?.title || 'Unknown Book'}<br><small>${bk?.barcode || ''}</small></td>
            <td><strong>${stu?.name || 'Unknown Student'}</strong><br><small>${stu?.studentId || ''} (${stu?.classGrade || 'N/A'})</small></td>
            <td><small>#${evt.recordId.replace('rec-', '')}</small></td>
            <td><small>${evt.notes || '-'}</small></td>
          </tr>
        `;
      });
    } else {
      filteredRecords.forEach(rec => {
        const bk = books.find(b => b.id === rec.bookId);
        const stu = students.find(s => s.id === rec.studentId);
        tableRows += `
          <tr>
            <td>${rec.id}</td>
            <td>${bk?.barcode || ''}</td>
            <td>${bk?.title || 'Unknown Book'}</td>
            <td>${stu?.name || 'Unknown Student'}</td>
            <td>${stu?.classGrade || ''}</td>
            <td>${rec.borrowDate}</td>
            <td>${rec.dueDate}</td>
            <td>${rec.returnDate || '-'}</td>
            <td><span class="status-badge ${rec.status}">${rec.status.toUpperCase()}</span></td>
          </tr>
        `;
      });
    }

    const tableHeader = activeReport === 'fees'
      ? `
        <tr>
          <th>${language === 'kh' ? 'សិស្ស' : 'STUDENT'}</th>
          <th>${language === 'kh' ? 'សៀវភៅ' : 'BOOK TITLE'}</th>
          <th>${language === 'kh' ? 'ថ្ងៃខ្ចី' : 'BORROW DATE'}</th>
          <th>${language === 'kh' ? 'កាលបរិច្ឆេទសង / ត្រូវសង' : 'RETURN / DUE DATE'}</th>
          <th>${language === 'kh' ? 'ថ្ងៃហួសកំណត់' : 'OVERDUE DAYS'}</th>
          <th>${language === 'kh' ? 'ប្រាក់ពិន័យ' : 'FINE AMOUNT'}</th>
          <th>${language === 'kh' ? 'ស្ថានភាព' : 'STATUS'}</th>
        </tr>
      `
      : activeReport === 'history'
      ? `
        <tr>
          <th>${language === 'kh' ? 'កាលបរិច្ឆេទ' : 'DATE'}</th>
          <th>${language === 'kh' ? 'ប្រភេទប្រតិបត្តិការ' : 'TRANSACTION TYPE'}</th>
          <th>${language === 'kh' ? 'សៀវភៅ' : 'BOOK TITLE'}</th>
          <th>${language === 'kh' ? 'សិស្ស' : 'STUDENT'}</th>
          <th>${language === 'kh' ? 'លេខកូដសំបុត្រ' : 'TICKET ID'}</th>
          <th>${language === 'kh' ? 'កំណត់សម្គាល់' : 'NOTES'}</th>
        </tr>
      `
      : `
        <tr>
          <th>${language === 'kh' ? 'លេខកូដសំបុត្រ' : 'TRANSACT ID'}</th>
          <th>${language === 'kh' ? 'បារកូដ' : 'BARCODE'}</th>
          <th>${language === 'kh' ? 'ចំណងជើងសៀវភៅ' : 'BOOK TITLE'}</th>
          <th>${language === 'kh' ? 'ឈ្មោះសិស្ស' : 'STUDENT NAME'}</th>
          <th>${language === 'kh' ? 'ថ្នាក់' : 'GRADE'}</th>
          <th>${language === 'kh' ? 'ថ្ងៃខ្ចី' : 'BORROW DATE'}</th>
          <th>${language === 'kh' ? 'ថ្ងៃត្រូវសង' : 'DUE DATE'}</th>
          <th>${language === 'kh' ? 'ថ្ងៃបានសង' : 'RETURN DATE'}</th>
          <th>${language === 'kh' ? 'ស្ថានភាព' : 'STATUS'}</th>
        </tr>
      `;

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              color: #1e293b;
              padding: 40px;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px double #cbd5e1;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header h2 {
              font-size: 16px;
              margin: 5px 0;
              color: #475569;
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              font-size: 12px;
              font-weight: bold;
              color: #64748b;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 11px;
            }
            th {
              background-color: #f1f5f9;
              color: #475569;
              font-weight: bold;
              text-align: left;
              padding: 10px;
              border: 1px solid #e2e8f0;
            }
            td {
              padding: 10px;
              border: 1px solid #e2e8f0;
            }
            .status-badge {
              font-size: 9px;
              font-weight: bold;
              padding: 2px 6px;
              border-radius: 4px;
              text-transform: uppercase;
            }
            .status-badge.returned { background-color: #d1fae5; color: #065f46; }
            .status-badge.borrowed { background-color: #dbeafe; color: #1e40af; }
            .status-badge.overdue { background-color: #fee2e2; color: #991b1b; }
            .status-badge.lost { background-color: #fef3c7; color: #92400e; }
            .footer {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              font-size: 12px;
            }
            .signature-block {
              border-top: 1px solid #94a3b8;
              width: 200px;
              text-align: center;
              padding-top: 10px;
              margin-top: 60px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${language === 'kh' ? 'វិទ្យាល័យអណ្ដូងមាស' : 'Hun Sen Andoung Meas High School'}</h1>
            <h2>${language === 'kh' ? 'បណ្ណាល័យសាលា - របាយការណ៍ស្វ័យប្រវត្តិ' : 'School Library Automated Reporting'}</h2>
            <h3 style="margin: 10px 0 0 0; color: #1e3a8a;">${reportTitle}</h3>
          </div>
          
          <div class="meta-info">
            <div>${language === 'kh' ? 'កាលបរិច្ឆេទបង្កើត៖' : 'REPORT DATE:'} ${todayStr}</div>
            <div>${language === 'kh' ? 'កំណត់ត្រាសរុប៖' : 'TOTAL RECORDS:'} ${activeReport === 'history' ? getHistoryEvents().length : filteredRecords.length}</div>
          </div>
          
          <table>
            <thead>
              ${tableHeader}
            </thead>
            <tbody>
              ${tableRows || `<tr><td colspan="9" style="text-align: center; color: #94a3b8;">No records to display</td></tr>`}
            </tbody>
          </table>
          
          <div class="footer">
            <div>
              <p>${language === 'kh' ? 'រៀបចំដោយបណ្ណារក្សសាលា' : 'Prepared by School Librarian'}</p>
              <div class="signature-block">${language === 'kh' ? 'ហត្ថលេខា' : 'Signature'}</div>
            </div>
            <div>
              <p>${language === 'kh' ? 'បានពិនិត្យ និងយល់ព្រមដោយនាយកសាលា' : 'Reviewed & Approved by Principal'}</p>
              <div class="signature-block">${language === 'kh' ? 'ហត្ថលេខា និងត្រា' : 'Signature & Stamp'}</div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportMonthlyPDF = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthIdx = currentDate.getMonth(); // 0-11
    const currentMonthStr = String(currentMonthIdx + 1).padStart(2, '0');
    const currentYearMonth = `${currentYear}-${currentMonthStr}`;

    // Filter all records for the current month:
    // we match borrowDate starting with YYYY-MM OR returnDate starting with YYYY-MM
    const monthlyRecords = records.filter(rec => 
      rec.borrowDate.startsWith(currentYearMonth) || 
      (rec.returnDate && rec.returnDate.startsWith(currentYearMonth))
    );

    // Compute stats for current month
    let borrowedThisMonth = 0;
    let returnedThisMonth = 0;
    let overdueThisMonth = 0;
    let lostThisMonth = 0;

    monthlyRecords.forEach(rec => {
      if (rec.borrowDate.startsWith(currentYearMonth)) {
        borrowedThisMonth++;
      }
      if (rec.returnDate && rec.returnDate.startsWith(currentYearMonth)) {
        returnedThisMonth++;
      }
      if (rec.status === 'overdue') {
        overdueThisMonth++;
      }
      if (rec.status === 'lost') {
        lostThisMonth++;
      }
    });

    const khmerMonths = [
      'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];
    const englishMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthName = language === 'kh' ? khmerMonths[currentMonthIdx] : englishMonths[currentMonthIdx];
    const reportTitle = language === 'kh' 
      ? `របាយការណ៍សង្ខេបប្រចាំខែ ${monthName} ឆ្នាំ ${currentYear}`
      : `Monthly Library Transactions Summary - ${monthName} ${currentYear}`;

    const todayStr = currentDate.toLocaleDateString(language === 'kh' ? 'km-KH' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableRows = '';
    monthlyRecords.forEach(rec => {
      const bk = books.find(b => b.id === rec.bookId);
      const stu = students.find(s => s.id === rec.studentId);
      
      let statusBadgeColor = '';
      if (rec.status === 'returned') {
        statusBadgeColor = 'background-color: #d1fae5; color: #065f46;';
      } else if (rec.status === 'borrowed') {
        statusBadgeColor = 'background-color: #dbeafe; color: #1e40af;';
      } else if (rec.status === 'overdue') {
        statusBadgeColor = 'background-color: #fee2e2; color: #991b1b;';
      } else {
        statusBadgeColor = 'background-color: #fef3c7; color: #92400e;';
      }

      const statusText = rec.status.toUpperCase();

      tableRows += `
        <tr>
          <td>#${rec.id.replace('rec-', '')}</td>
          <td><strong>${stu?.name || 'Unknown Student'}</strong><br><small>${stu?.studentId || 'N/A'} (${stu?.classGrade || 'N/A'})</small></td>
          <td><strong>${bk?.title || 'Unknown Book'}</strong><br><small>${bk?.barcode || 'N/A'}</small></td>
          <td>${rec.borrowDate}</td>
          <td>${rec.dueDate}</td>
          <td>${rec.returnDate || '-'}</td>
          <td><span class="status-badge" style="${statusBadgeColor}">${statusText}</span></td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              color: #1e293b;
              padding: 40px;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px double #cbd5e1;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header h2 {
              font-size: 16px;
              margin: 5px 0;
              color: #475569;
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 25px;
              font-size: 12px;
              font-weight: bold;
              color: #64748b;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .stat-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }
            .stat-val {
              font-size: 22px;
              font-weight: 800;
              color: #1e3a8a;
              margin-bottom: 4px;
            }
            .stat-label {
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 11px;
            }
            th {
              background-color: #f1f5f9;
              color: #475569;
              font-weight: bold;
              text-align: left;
              padding: 10px;
              border: 1px solid #e2e8f0;
            }
            td {
              padding: 10px;
              border: 1px solid #e2e8f0;
            }
            .status-badge {
              font-size: 9px;
              font-weight: bold;
              padding: 2px 6px;
              border-radius: 4px;
              text-transform: uppercase;
              display: inline-block;
            }
            .footer {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              font-size: 12px;
            }
            .signature-block {
              border-top: 1px solid #94a3b8;
              width: 200px;
              text-align: center;
              padding-top: 10px;
              margin-top: 60px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${t.schoolName}</h1>
            <h2>${language === 'kh' ? 'បណ្ណាល័យសាលា - របាយការណ៍ស្វ័យប្រវត្តិ' : 'School Library Automated Reporting'}</h2>
            <h3 style="margin: 10px 0 0 0; color: #1e3a8a;">${reportTitle}</h3>
          </div>
          
          <div class="meta-info">
            <div>${language === 'kh' ? 'កាលបរិច្ឆេទបង្កើត៖' : 'REPORT DATE:'} ${todayStr}</div>
            <div>${language === 'kh' ? 'កំណត់ត្រាសរុបប្រចាំខែ៖' : 'MONTHLY TOTAL RECORDS:'} ${monthlyRecords.length}</div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-val">${borrowedThisMonth}</div>
              <div class="stat-label">${language === 'kh' ? 'ខ្ចីសរុប' : 'Borrowed'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">${returnedThisMonth}</div>
              <div class="stat-label">${language === 'kh' ? 'សងសរុប' : 'Returned'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">${overdueThisMonth}</div>
              <div class="stat-label">${language === 'kh' ? 'ហួសកំណត់' : 'Overdue'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">${lostThisMonth}</div>
              <div class="stat-label">${language === 'kh' ? 'បាត់បង់' : 'Lost / Damaged'}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>${language === 'kh' ? 'លេខកូដសំបុត្រ' : 'TRANSACT ID'}</th>
                <th>${language === 'kh' ? 'សិស្ស' : 'STUDENT'}</th>
                <th>${language === 'kh' ? 'សៀវភៅ' : 'BOOK TITLE'}</th>
                <th>${language === 'kh' ? 'ថ្ងៃខ្ចី' : 'BORROW DATE'}</th>
                <th>${language === 'kh' ? 'ថ្ងៃត្រូវសង' : 'DUE DATE'}</th>
                <th>${language === 'kh' ? 'ថ្ងៃបានសង' : 'RETURN DATE'}</th>
                <th>${language === 'kh' ? 'ស្ថានភាព' : 'STATUS'}</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No transactions recorded for this month.</td></tr>`}
            </tbody>
          </table>
          
          <div class="footer">
            <div>
              <p>${language === 'kh' ? 'រៀបចំដោយបណ្ណារក្សសាលា' : 'Prepared by School Librarian'}</p>
              <div class="signature-block">${language === 'kh' ? 'ហត្ថលេខា' : 'Signature'}</div>
            </div>
            <div>
              <p>${language === 'kh' ? 'បានពិនិត្យ និងយល់ព្រមដោយនាយកសាលា' : 'Reviewed & Approved by Principal'}</p>
              <div class="signature-block">${language === 'kh' ? 'ហត្ថលេខា និងត្រា' : 'Signature & Stamp'}</div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportStudentHistoryPDF = () => {
    const reportTitle = language === 'kh'
      ? 'របាយការណ៍ប្រវត្តិខ្ចី-សងសៀវភៅរបស់សិស្សសរុប'
      : 'Comprehensive Student Borrowing History & Ledger Report';
    
    const todayStr = new Date().toLocaleDateString(language === 'kh' ? 'km-KH' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Statistics
    let activeBorrowersCount = 0;
    const totalBorrowedAllTime = records.length;
    const totalActiveLoans = records.filter(r => r.status === 'borrowed' || r.status === 'overdue').length;
    const totalOverdueLoans = records.filter(r => r.status === 'overdue').length;

    const studentStats = students.map(stu => {
      const studentRecords = records.filter(r => r.studentId === stu.id);
      const active = studentRecords.filter(r => r.status === 'borrowed' || r.status === 'overdue');
      const overdue = studentRecords.filter(r => r.status === 'overdue');
      const lost = studentRecords.filter(r => r.status === 'lost');
      const returned = studentRecords.filter(r => r.status === 'returned');

      if (active.length > 0) activeBorrowersCount++;

      return {
        student: stu,
        recordsCount: studentRecords.length,
        activeCount: active.length,
        overdueCount: overdue.length,
        lostCount: lost.length,
        returnedCount: returned.length,
        historyList: studentRecords.map(rec => {
          const bk = books.find(b => b.id === rec.bookId);
          return {
            rec,
            bookTitle: bk ? bk.title : 'Unknown Book',
            barcode: bk ? bk.barcode : 'N/A'
          };
        }).sort((a, b) => b.rec.borrowDate.localeCompare(a.rec.borrowDate))
      };
    }).sort((a, b) => b.activeCount - a.activeCount || b.recordsCount - a.recordsCount);

    let tableRows = '';
    studentStats.forEach(stat => {
      const stu = stat.student;
      const historySummary = stat.historyList.length > 0
        ? stat.historyList.slice(0, 3).map(h => {
            let badgeStyle = '';
            if (h.rec.status === 'returned') badgeStyle = 'background-color: #d1fae5; color: #065f46;';
            else if (h.rec.status === 'borrowed') badgeStyle = 'background-color: #dbeafe; color: #1e40af;';
            else if (h.rec.status === 'overdue') badgeStyle = 'background-color: #fee2e2; color: #991b1b;';
            else badgeStyle = 'background-color: #fef3c7; color: #92400e;';

            return `<div style="margin-bottom: 4px; border-bottom: 1px dashed #f1f5f9; padding-bottom: 4px; font-size: 10px;">
              • <strong>${h.bookTitle}</strong> (${h.barcode})<br/>
              <span style="color: #64748b;">${language === 'kh' ? 'ខ្ចី៖' : 'Borrowed:'} ${h.rec.borrowDate} ${h.rec.returnDate ? `| ${language === 'kh' ? 'សង៖' : 'Returned:'} ${h.rec.returnDate}` : ''}</span>
              <span class="status-badge" style="font-size: 8px; padding: 1px 4px; ${badgeStyle}">${h.rec.status.toUpperCase()}</span>
            </div>`;
          }).join('') + (stat.historyList.length > 3 ? `<div style="font-size: 9px; color: #3b82f6; font-weight: bold;">+ ${stat.historyList.length - 3} ${language === 'kh' ? 'កំណត់ត្រាទៀត...' : 'more records...'}</div>` : '')
        : `<span style="color: #94a3b8; font-style: italic;">${language === 'kh' ? 'គ្មានប្រវត្តិខ្ចីសៀវភៅទេ' : 'No borrowing history'}</span>`;

      tableRows += `
        <tr>
          <td>
            <strong>${stu.name}</strong><br/>
            <small>${stu.studentId} | ${stu.gender === 'M' ? (language === 'kh' ? 'ប្រុស' : 'Male') : (language === 'kh' ? 'ស្រី' : 'Female')}</small>
          </td>
          <td>${stu.classGrade}</td>
          <td style="text-align: center;"><strong>${stat.recordsCount}</strong></td>
          <td style="text-align: center; color: #1d4ed8;"><strong>${stat.activeCount}</strong></td>
          <td style="text-align: center; color: #b91c1c;"><strong>${stat.overdueCount}</strong></td>
          <td style="text-align: center; color: #b45309;"><strong>${stat.lostCount}</strong></td>
          <td style="text-align: center; color: #047857;"><strong>${stat.returnedCount}</strong></td>
          <td style="max-width: 320px; vertical-align: top;">${historySummary}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              color: #1e293b;
              padding: 40px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px double #cbd5e1;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header h2 {
              font-size: 16px;
              margin: 5px 0;
              color: #475569;
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 25px;
              font-size: 12px;
              font-weight: bold;
              color: #64748b;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .stat-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }
            .stat-val {
              font-size: 22px;
              font-weight: 800;
              color: #1e3a8a;
              margin-bottom: 4px;
            }
            .stat-label {
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 11px;
            }
            th {
              background-color: #f1f5f9;
              color: #475569;
              font-weight: bold;
              text-align: left;
              padding: 10px;
              border: 1px solid #e2e8f0;
            }
            td {
              padding: 10px;
              border: 1px solid #e2e8f0;
              vertical-align: top;
            }
            .status-badge {
              font-size: 8px;
              font-weight: bold;
              padding: 1px 4px;
              border-radius: 3px;
              text-transform: uppercase;
              display: inline-block;
            }
            .footer {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              font-size: 12px;
            }
            .signature-block {
              border-top: 1px solid #94a3b8;
              width: 200px;
              text-align: center;
              padding-top: 10px;
              margin-top: 60px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Hun Sen Andoung Meas High School</h1>
            <h2>${language === 'kh' ? 'បណ្ណាល័យសាលា - របាយការណ៍ស្វ័យប្រវត្តិ' : 'School Library Automated Reporting'}</h2>
            <h3 style="margin: 10px 0 0 0; color: #1e3a8a;">${reportTitle}</h3>
          </div>
          
          <div class="meta-info">
            <div>${language === 'kh' ? 'កាលបរិច្ឆេទបង្កើត៖' : 'REPORT DATE:'} ${todayStr}</div>
            <div>${language === 'kh' ? 'សិស្សសរុប៖' : 'TOTAL STUDENTS:'} ${students.length}</div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-val">${students.length}</div>
              <div class="stat-label">${language === 'kh' ? 'សិស្សចុះឈ្មោះសរុប' : 'Registered Students'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">${activeBorrowersCount}</div>
              <div class="stat-label">${language === 'kh' ? 'សិស្សកំពុងខ្ចីសកម្ម' : 'Active Borrowers'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">${totalBorrowedAllTime}</div>
              <div class="stat-label">${language === 'kh' ? 'ការខ្ចីសរុបគ្រប់ពេល' : 'Total Loans (All-Time)'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-val" style="color: #b91c1c;">${totalOverdueLoans}</div>
              <div class="stat-label">${language === 'kh' ? 'សៀវភៅហួសកំណត់សរុប' : 'Total Overdue Books'}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>${language === 'kh' ? 'សិស្ស' : 'STUDENT'}</th>
                <th>${language === 'kh' ? 'ថ្នាក់' : 'GRADE'}</th>
                <th style="text-align: center;">${language === 'kh' ? 'ខ្ចីសរុប' : 'ALL-TIME'}</th>
                <th style="text-align: center;">${language === 'kh' ? 'សកម្ម' : 'ACTIVE'}</th>
                <th style="text-align: center;">${language === 'kh' ? 'ហួសកំណត់' : 'OVERDUE'}</th>
                <th style="text-align: center;">${language === 'kh' ? 'បាត់' : 'LOST'}</th>
                <th style="text-align: center;">${language === 'kh' ? 'សងរួច' : 'RETURNED'}</th>
                <th>${language === 'kh' ? 'សកម្មភាពចុងក្រោយ (រហូតដល់ ៣)' : 'RECENT ACTIVITY (UP TO 3)'}</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 20px;">No students registered in the database.</td></tr>`}
            </tbody>
          </table>
          
          <div class="footer">
            <div>
              <p>${language === 'kh' ? 'រៀបចំដោយបណ្ណារក្សសាលា' : 'Prepared by School Librarian'}</p>
              <div class="signature-block">${language === 'kh' ? 'ហត្ថលេខា' : 'Signature'}</div>
            </div>
            <div>
              <p>${language === 'kh' ? 'បានពិនិត្យ និងយល់ព្រមដោយនាយកសាលា' : 'Reviewed & Approved by Principal'}</p>
              <div class="signature-block">${language === 'kh' ? 'ហត្ថលេខា និងត្រា' : 'Signature & Stamp'}</div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportBookStatusPDF = () => {
    const reportTitle = language === 'kh'
      ? 'របាយការណ៍ស្ថានភាពសៀវភៅ និងសារពើភ័ណ្ឌបណ្ណាល័យសរុប'
      : 'Comprehensive Book Status & Inventory Audit Report';
    
    const todayStr = new Date().toLocaleDateString(language === 'kh' ? 'km-KH' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Book Stats
    const totalBooksCount = books.length;
    const availableBooksCount = books.filter(b => b.status === 'available').length;
    const borrowedBooksCount = books.filter(b => b.status === 'borrowed').length;
    const overdueBooksCount = books.filter(b => b.status === 'overdue').length;
    const lostBooksCount = books.filter(b => b.status === 'lost').length;

    let tableRows = '';
    books.forEach(book => {
      const cat = categories.find(c => c.id === book.categoryId);
      const categoryName = cat 
        ? (language === 'kh' ? cat.nameKh : cat.nameEn)
        : 'N/A';

      // Find active loan record for this book to see who has it
      const activeRecord = records.find(r => r.bookId === book.id && (r.status === 'borrowed' || r.status === 'overdue'));
      let holderInfo = '-';
      if (activeRecord) {
        const student = students.find(s => s.id === activeRecord.studentId);
        if (student) {
          holderInfo = `<strong>${student.name}</strong><br/><small>${student.studentId} (${student.classGrade})<br/>${language === 'kh' ? 'ខ្ចី៖' : 'Borrowed:'} ${activeRecord.borrowDate}</small>`;
        } else {
          holderInfo = `<span style="color: #dc2626; font-weight: bold;">${language === 'kh' ? 'ខ្ចីដោយគណនីបាត់' : 'Borrowed (No active student record)'}</span>`;
        }
      } else if (book.status === 'lost') {
        const lastLostRecord = records.filter(r => r.bookId === book.id && r.status === 'lost').sort((a,b) => b.borrowDate.localeCompare(a.borrowDate))[0];
        if (lastLostRecord) {
          const student = students.find(s => s.id === lastLostRecord.studentId);
          if (student) {
            holderInfo = `<span style="color: #b45309;">${language === 'kh' ? 'បាត់ក្រោមការកាន់កាប់៖' : 'Lost under:'} ${student.name} (${student.studentId})</span>`;
          }
        }
      }

      let statusBadgeColor = '';
      let statusLabel = '';
      if (book.status === 'available') {
        statusBadgeColor = 'background-color: #d1fae5; color: #065f46;';
        statusLabel = language === 'kh' ? 'អាចខ្ចីបាន' : 'AVAILABLE';
      } else if (book.status === 'borrowed') {
        statusBadgeColor = 'background-color: #dbeafe; color: #1e40af;';
        statusLabel = language === 'kh' ? 'កំពុងខ្ចី' : 'BORROWED';
      } else if (book.status === 'overdue') {
        statusBadgeColor = 'background-color: #fee2e2; color: #991b1b;';
        statusLabel = language === 'kh' ? 'ហួសកាលកំណត់' : 'OVERDUE';
      } else {
        statusBadgeColor = 'background-color: #fef3c7; color: #92400e;';
        statusLabel = language === 'kh' ? 'បាត់បង់' : 'LOST / DAMAGED';
      }

      tableRows += `
        <tr>
          <td>#${book.id.replace('book-', '')}</td>
          <td><strong>${book.barcode}</strong></td>
          <td>
            <strong>${book.title}</strong><br/>
            <small>${language === 'kh' ? 'អ្នកនិពន្ធ៖' : 'Author:'} ${book.author || '-'}</small>
          </td>
          <td>${categoryName}</td>
          <td>${book.location || 'N/A'}</td>
          <td style="text-align: center;"><span class="status-badge" style="${statusBadgeColor}">${statusLabel}</span></td>
          <td style="font-size: 10px;">${holderInfo}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              color: #1e293b;
              padding: 40px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px double #cbd5e1;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header h2 {
              font-size: 16px;
              margin: 5px 0;
              color: #475569;
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 25px;
              font-size: 12px;
              font-weight: bold;
              color: #64748b;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 12px;
              margin-bottom: 30px;
            }
            .stat-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
            }
            .stat-val {
              font-size: 20px;
              font-weight: 800;
              color: #1e3a8a;
              margin-bottom: 4px;
            }
            .stat-label {
              font-size: 9px;
              font-weight: bold;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 11px;
            }
            th {
              background-color: #f1f5f9;
              color: #475569;
              font-weight: bold;
              text-align: left;
              padding: 10px;
              border: 1px solid #e2e8f0;
            }
            td {
              padding: 10px;
              border: 1px solid #e2e8f0;
              vertical-align: middle;
            }
            .status-badge {
              font-size: 9px;
              font-weight: bold;
              padding: 2px 6px;
              border-radius: 4px;
              text-transform: uppercase;
              display: inline-block;
            }
            .footer {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              font-size: 12px;
            }
            .signature-block {
              border-top: 1px solid #94a3b8;
              width: 200px;
              text-align: center;
              padding-top: 10px;
              margin-top: 60px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Hun Sen Andoung Meas High School</h1>
            <h2>${language === 'kh' ? 'បណ្ណាល័យសាលា - របាយការណ៍ស្វ័យប្រវត្តិ' : 'School Library Automated Reporting'}</h2>
            <h3 style="margin: 10px 0 0 0; color: #1e3a8a;">${reportTitle}</h3>
          </div>
          
          <div class="meta-info">
            <div>${language === 'kh' ? 'កាលបរិច្ឆេទបង្កើត៖' : 'REPORT DATE:'} ${todayStr}</div>
            <div>${language === 'kh' ? 'សៀវភៅសរុប៖' : 'TOTAL CATALOGED BOOKS:'} ${totalBooksCount}</div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-val">${totalBooksCount}</div>
              <div class="stat-label">${language === 'kh' ? 'សៀវភៅសរុប' : 'Total Catalog'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-val" style="color: #15803d;">${availableBooksCount}</div>
              <div class="stat-label">${language === 'kh' ? 'អាចខ្ចីបាន' : 'Available'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-val" style="color: #1d4ed8;">${borrowedBooksCount}</div>
              <div class="stat-label">${language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-val" style="color: #b91c1c;">${overdueBooksCount}</div>
              <div class="stat-label">${language === 'kh' ? 'ហួសកំណត់' : 'Overdue'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-val" style="color: #b45309;">${lostBooksCount}</div>
              <div class="stat-label">${language === 'kh' ? 'បាត់បង់/ខូចខាត' : 'Lost / Damaged'}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>${language === 'kh' ? 'កូដសៀវភៅ' : 'BOOK ID'}</th>
                <th>${language === 'kh' ? 'បារកូដ' : 'BARCODE'}</th>
                <th>${language === 'kh' ? 'ព័ត៌មានលម្អិតសៀវភៅ' : 'BOOK DETAILS'}</th>
                <th>${language === 'kh' ? 'ប្រភេទ' : 'CATEGORY'}</th>
                <th>${language === 'kh' ? 'ធ្នើរទីតាំង' : 'SHELF LOCATION'}</th>
                <th style="text-align: center;">${language === 'kh' ? 'ស្ថានភាព' : 'STATUS'}</th>
                <th>${language === 'kh' ? 'កាន់កាប់ដោយ / ប្រវត្តិបាត់' : 'CURRENTLY HELD BY / DETAILS'}</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No books registered in the catalog.</td></tr>`}
            </tbody>
          </table>
          
          <div class="footer">
            <div>
              <p>${language === 'kh' ? 'រៀបចំដោយបណ្ណារក្សសាលា' : 'Prepared by School Librarian'}</p>
              <div class="signature-block">${language === 'kh' ? 'ហត្ថលេខា' : 'Signature'}</div>
            </div>
            <div>
              <p>${language === 'kh' ? 'បានពិនិត្យ និងយល់ព្រមដោយនាយកសាលា' : 'Reviewed & Approved by Principal'}</p>
              <div class="signature-block">${language === 'kh' ? 'ហត្ថលេខា និងត្រា' : 'Signature & Stamp'}</div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    const rows: string[][] = [];

    if (activeReport === 'fees') {
      headers = language === 'kh' 
        ? ['ឈ្មោះសិស្ស', 'អត្តសញ្ញាណប័ណ្ណសិស្ស', 'ថ្នាក់', 'ចំណងជើងសៀវភៅ', 'បារកូដ', 'ថ្ងៃខ្ចី', 'ថ្ងៃត្រូវសង/បានសង', 'ថ្ងៃហួសកំណត់', 'ប្រាក់ពិន័យ', 'ស្ថានភាព']
        : ['Student Name', 'Student ID', 'Class Grade', 'Book Title', 'Book Barcode', 'Borrow Date', 'Return / Due Date', 'Overdue Days', 'Fine Amount', 'Status'];

      filteredRecords.forEach(rec => {
        const bk = books.find(b => b.id === rec.bookId);
        const stu = students.find(s => s.id === rec.studentId);
        
        let daysOverdue = 0;
        if (calculationMode === 'period') {
          const daysBorrowed = getDaysBetween(rec.borrowDate, rec.returnDate || todayStr);
          daysOverdue = Math.max(0, daysBorrowed - loanPeriod);
        } else {
          daysOverdue = Math.max(0, getDaysBetween(rec.dueDate, rec.returnDate || todayStr));
        }

        const isPaid = paidRecordIds.includes(rec.id);
        const isWaived = waivedRecordIds.includes(rec.id);
        const fineAmount = daysOverdue * dailyFineRate;

        let statusText = 'Unpaid';
        if (isPaid) {
          statusText = 'Paid';
        } else if (isWaived) {
          statusText = 'Waived';
        }

        rows.push([
          stu?.name || 'Unknown Student',
          stu?.studentId || '',
          stu?.classGrade || 'N/A',
          bk?.title || 'Unknown Book',
          bk?.barcode || '',
          rec.borrowDate,
          rec.returnDate ? `Returned: ${rec.returnDate}` : `Due: ${rec.dueDate}`,
          String(daysOverdue),
          `${fineAmount} ${currencyUnit}`,
          statusText
        ]);
      });
    } else if (activeReport === 'history') {
      headers = language === 'kh'
        ? ['កាលបរិច្ឆេទ', 'ប្រភេទប្រតិបត្តិការ', 'ចំណងជើងសៀវភៅ', 'បារកូដ', 'ឈ្មោះសិស្ស', 'អត្តសញ្ញាណប័ណ្ណសិស្ស', 'ថ្នាក់', 'លេខកូដសំបុត្រ', 'កំណត់សម្គាល់']
        : ['Date', 'Transaction Type', 'Book Title', 'Book Barcode', 'Student Name', 'Student ID', 'Class Grade', 'Ticket ID', 'Notes'];

      const historyEvents = getHistoryEvents();
      historyEvents.forEach(evt => {
        const bk = books.find(b => b.id === evt.bookId);
        const stu = students.find(s => s.id === evt.studentId);
        const typeLabel = evt.type === 'borrow' 
          ? (language === 'kh' ? 'ខ្ចី' : 'BORROW')
          : (language === 'kh' ? 'សង' : 'RETURN');
        rows.push([
          evt.date,
          typeLabel,
          bk?.title || 'Unknown Book',
          bk?.barcode || '',
          stu?.name || 'Unknown Student',
          stu?.studentId || '',
          stu?.classGrade || 'N/A',
          evt.recordId,
          evt.notes || ''
        ]);
      });
    } else {
      headers = language === 'kh'
        ? ['លេខកូដសំបុត្រ', 'បារកូដ', 'ចំណងជើងសៀវភៅ', 'ឈ្មោះសិស្ស', 'អត្តសញ្ញាណប័ណ្ណសិស្ស', 'ថ្នាក់', 'ថ្ងៃខ្ចី', 'ថ្ងៃត្រូវសង', 'ថ្ងៃបានសង', 'ស្ថានភាព']
        : ['Transaction ID', 'Barcode', 'Book Title', 'Student Name', 'Student ID', 'Grade', 'Borrow Date', 'Due Date', 'Return Date', 'Status'];

      filteredRecords.forEach(rec => {
        const bk = books.find(b => b.id === rec.bookId);
        const stu = students.find(s => s.id === rec.studentId);
        rows.push([
          rec.id,
          bk?.barcode || '',
          bk?.title || 'Unknown Book',
          stu?.name || 'Unknown Student',
          stu?.studentId || '',
          stu?.classGrade || '',
          rec.borrowDate,
          rec.dueDate,
          rec.returnDate || '-',
          rec.status
        ]);
      });
    }

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => {
        const val = cell === null || cell === undefined ? '' : String(cell);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const fileSuffix = activeReport === 'all' ? 'comprehensive_log' : activeReport;
    link.setAttribute('download', `library_report_${fileSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportBooksCSV = () => {
    const headers = language === 'kh'
      ? ['លេខសម្គាល់សៀវភៅ', 'ចំណងជើង', 'បារកូដ', 'អ្នកនិពន្ធ', 'ប្រភេទ', 'ឆ្នាំបោះពុម្ព', 'ទីតាំងធ្នើ', 'កាលបរិច្ឆេទបន្ថែម', 'ស្ថានភាព']
      : ['Book ID', 'Title', 'Barcode', 'Author', 'Category', 'Publish Year', 'Location/Shelf', 'Date Added', 'Status'];

    const rows: string[][] = [];

    books.forEach(book => {
      const cat = categories.find(c => c.id === book.categoryId);
      const categoryName = cat 
        ? (language === 'kh' ? cat.nameKh : cat.nameEn)
        : 'N/A';

      let statusLabel: string = book.status;
      if (language === 'kh') {
        if (book.status === 'available') statusLabel = 'អាចខ្ចីបាន';
        else if (book.status === 'borrowed') statusLabel = 'កំពុងខ្ចី';
        else if (book.status === 'overdue') statusLabel = 'ហួសកំណត់';
        else if (book.status === 'lost') statusLabel = 'បាត់';
      } else {
        statusLabel = book.status.charAt(0).toUpperCase() + book.status.slice(1);
      }

      rows.push([
        book.id,
        book.title,
        book.barcode,
        book.author || '-',
        categoryName,
        String(book.publishYear || ''),
        book.location || 'N/A',
        book.addedDate,
        statusLabel
      ]);
    });

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => {
        const val = cell === null || cell === undefined ? '' : String(cell);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `book_catalog_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportStudentsCSV = () => {
    const headers = language === 'kh'
      ? ['លេខសម្គាល់សិស្ស', 'ឈ្មោះសិស្ស', 'ភេទ', 'ថ្នាក់', 'លេខទូរស័ព្ទ']
      : ['Student ID', 'Student Name', 'Gender', 'Class/Grade', 'Phone Number'];

    const rows: string[][] = [];

    students.forEach(student => {
      const genderLabel = student.gender === 'M' 
        ? (language === 'kh' ? 'ប្រុស' : 'Male') 
        : (language === 'kh' ? 'ស្រី' : 'Female');

      rows.push([
        student.studentId,
        student.name,
        genderLabel,
        student.classGrade,
        student.phoneNumber || '-'
      ]);
    });

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => {
        const val = cell === null || cell === undefined ? '' : String(cell);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `student_directory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute fine statistics dynamically
  let totalOutstanding = 0;
  let totalCollected = 0;
  let totalWaived = 0;
  let outstandingCount = 0;
  let collectedCount = 0;
  let waivedCount = 0;

  records.forEach(rec => {
    let daysOverdue = 0;
    if (calculationMode === 'period') {
      const daysBorrowed = getDaysBetween(rec.borrowDate, rec.returnDate || todayStr);
      daysOverdue = Math.max(0, daysBorrowed - loanPeriod);
    } else {
      daysOverdue = Math.max(0, getDaysBetween(rec.dueDate, rec.returnDate || todayStr));
    }

    if (daysOverdue > 0) {
      const fineAmount = daysOverdue * dailyFineRate;
      if (paidRecordIds.includes(rec.id)) {
        totalCollected += fineAmount;
        collectedCount++;
      } else if (waivedRecordIds.includes(rec.id)) {
        totalWaived += fineAmount;
        waivedCount++;
      } else {
        totalOutstanding += fineAmount;
        outstandingCount++;
      }
    }
  });

  return (
    <div id="reports-view" className="space-y-6">
      {/* Upper Report Switcher & Search */}
      <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Navigation Filters */}
        <div className="flex flex-wrap gap-2 bg-white/30 backdrop-blur-sm p-1 rounded-2xl border border-white/40 self-start">
          <button
            onClick={() => setActiveReport('all')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeReport === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            {t.allRecords}
          </button>
          <button
            onClick={() => setActiveReport('active')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeReport === 'active' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            {t.borrowReport}
          </button>
          <button
            onClick={() => setActiveReport('returned')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeReport === 'returned' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            {t.returnReport}
          </button>
          <button
            onClick={() => setActiveReport('overdue')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeReport === 'overdue' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            {t.overdueReport}
          </button>
          <button
            onClick={() => setActiveReport('overdue-list')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeReport === 'overdue-list' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            {language === 'kh' ? 'បញ្ជីសិស្សហួសកាលកំណត់' : 'Overdue Student List'}
          </button>
          <button
            onClick={() => setActiveReport('lost')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeReport === 'lost' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            {t.lostReport}
          </button>
          <button
            onClick={() => setActiveReport('fees')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeReport === 'fees' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            {language === 'kh' ? 'ការគណនាថ្លៃពិន័យ' : 'Late Fee Calculator'}
          </button>
          <button
            onClick={() => setActiveReport('history')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeReport === 'history' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            {language === 'kh' ? 'ប្រវត្តិប្រតិបត្តិការ' : 'Transaction History'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 self-stretch md:self-auto shrink-0">
          {/* PDF Export Dropdown */}
          <div className="relative self-stretch md:self-auto">
            <button
              id="export-pdf-dropdown-btn"
              onClick={() => setShowPdfDropdown(!showPdfDropdown)}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-md hover:shadow-lg hover:shadow-blue-500/10 transition cursor-pointer self-stretch md:self-auto"
            >
              <FileDown className="w-4 h-4" />
              <span>{language === 'kh' ? 'នាំចេញជា PDF' : 'Export as PDF'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-1 transition duration-200" style={{ transform: showPdfDropdown ? 'rotate(180deg)' : 'none' }} />
            </button>

            {showPdfDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowPdfDropdown(false)} 
                />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-20 origin-top-right flex flex-col gap-1">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    {language === 'kh' ? 'ជ្រើសរើសរបាយការណ៍ PDF' : 'Select PDF Report'}
                  </div>
                  
                  {/* Current Tab */}
                  <button
                    onClick={() => {
                      handleExportPDF();
                      setShowPdfDropdown(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-slate-700 rounded-xl text-xs font-bold transition text-left cursor-pointer hover:bg-slate-50"
                  >
                    <FileDown className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <div className="font-extrabold">{language === 'kh' ? 'ទិន្នន័យតារាងបច្ចុប្បន្ន' : 'Current Table Data'}</div>
                      <div className="text-[9px] text-slate-400 font-medium leading-tight">{language === 'kh' ? 'នាំចេញទិន្នន័យដែលកំពុងបង្ហាញ' : 'Export what is currently shown on screen'}</div>
                    </div>
                  </button>

                  {/* Monthly Summary */}
                  <button
                    onClick={() => {
                      handleExportMonthlyPDF();
                      setShowPdfDropdown(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-slate-700 rounded-xl text-xs font-bold transition text-left cursor-pointer hover:bg-slate-50"
                  >
                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-extrabold">{language === 'kh' ? 'របាយការណ៍សង្ខេបប្រចាំខែ' : 'Monthly Summary'}</div>
                      <div className="text-[9px] text-slate-400 font-medium leading-tight">{language === 'kh' ? 'សរុបស្ថិតិខ្ចី-សងក្នុងខែនេះ' : 'Monthly statistics and transactions'}</div>
                    </div>
                  </button>

                  {/* Student Borrowing History */}
                  <button
                    id="export-student-history-pdf-btn"
                    onClick={() => {
                      handleExportStudentHistoryPDF();
                      setShowPdfDropdown(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-slate-700 rounded-xl text-xs font-bold transition text-left cursor-pointer hover:bg-slate-50"
                  >
                    <Users className="w-4 h-4 text-purple-500 shrink-0" />
                    <div>
                      <div className="font-extrabold">{language === 'kh' ? 'ប្រវត្តិខ្ចី-សងរបស់សិស្ស' : 'Student Borrowing History'}</div>
                      <div className="text-[9px] text-slate-400 font-medium leading-tight">{language === 'kh' ? 'ប្រវត្តិ និងស្ថិតិសិស្សម្នាក់ៗលម្អិត' : 'Individual student borrowing ledgers'}</div>
                    </div>
                  </button>

                  {/* Book Status & Inventory */}
                  <button
                    id="export-book-status-pdf-btn"
                    onClick={() => {
                      handleExportBookStatusPDF();
                      setShowPdfDropdown(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-slate-700 rounded-xl text-xs font-bold transition text-left cursor-pointer hover:bg-slate-50"
                  >
                    <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="font-extrabold">{language === 'kh' ? 'ស្ថានភាពសៀវភៅ និងសារពើភ័ណ្ឌ' : 'Book Status & Inventory'}</div>
                      <div className="text-[9px] text-slate-400 font-medium leading-tight">{language === 'kh' ? 'បញ្ជីសៀវភៅទាំងអស់ និងអ្នកកំពុងកាន់កាប់' : 'All books catalog and active holders'}</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          
          {/* CSV Export Dropdown */}
          <div className="relative self-stretch md:self-auto">
            <button
              id="export-csv-btn"
              onClick={() => setShowCsvDropdown(!showCsvDropdown)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-md hover:shadow-lg hover:shadow-emerald-500/10 transition cursor-pointer self-stretch md:self-auto"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>{language === 'kh' ? 'ទាញយក CSV' : 'Download CSV'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-1 transition duration-200" style={{ transform: showCsvDropdown ? 'rotate(180deg)' : 'none' }} />
            </button>

            {showCsvDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowCsvDropdown(false)} 
                />
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-20 origin-top-right flex flex-col gap-1">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    {language === 'kh' ? 'ជ្រើសរើសទិន្នន័យនាំចេញ' : 'Select Data to Export'}
                  </div>
                  <button
                    onClick={() => {
                      handleExportBooksCSV();
                      setShowCsvDropdown(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-slate-700 rounded-xl text-xs font-bold transition text-left cursor-pointer hover:bg-slate-50"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-extrabold">{language === 'kh' ? 'បញ្ជីសារពើភ័ណ្ឌសៀវភៅ' : 'Book Inventory'}</div>
                      <div className="text-[9px] text-slate-400 font-medium leading-tight">{language === 'kh' ? 'នាំចេញបញ្ជីសៀវភៅ និងស្ថានភាពសរុប' : 'Export complete book catalog and details'}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      handleExportStudentsCSV();
                      setShowCsvDropdown(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-slate-700 rounded-xl text-xs font-bold transition text-left cursor-pointer hover:bg-slate-50"
                  >
                    <Users className="w-4 h-4 text-purple-500 shrink-0" />
                    <div>
                      <div className="font-extrabold">{language === 'kh' ? 'បញ្ជីឈ្មោះសិស្ស' : 'Student Records'}</div>
                      <div className="text-[9px] text-slate-400 font-medium leading-tight">{language === 'kh' ? 'នាំចេញព័ត៌មាន និងឈ្មោះសិស្សសរុប' : 'Export student directories and info'}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      handleExportCSV();
                      setShowCsvDropdown(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-slate-700 rounded-xl text-xs font-bold transition text-left cursor-pointer hover:bg-slate-50"
                  >
                    <History className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <div className="font-extrabold">{language === 'kh' ? 'កំណត់ត្រាប្រតិបត្តិការ' : 'Transaction Records'}</div>
                      <div className="text-[9px] text-slate-400 font-medium leading-tight">{language === 'kh' ? 'នាំចេញកំណត់ត្រាខ្ចី-សងបច្ចុប្បន្ន' : 'Export current filtered log table'}</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Book Category Distribution Pie Chart */}
      <CategoryDistributionSummary 
        books={books}
        categories={categories}
        language={language}
      />

      {/* Library Growth Line/Bar Chart */}
      <LibraryGrowthChart 
        books={books}
        language={language}
      />

      {/* Late Fee Configurator Panel (Only shown in Fines view) */}
      {activeReport === 'fees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Policy Settings card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between gap-4 lg:col-span-1">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Settings className="w-4 h-4 text-slate-500" />
                {language === 'kh' ? 'កំណត់គោលការណ៍ពិន័យ' : 'Fine Policy Settings'}
              </h3>
              
              <div className="space-y-4 text-xs font-bold text-slate-700">
                {/* Loan Period */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label>{language === 'kh' ? 'រយៈពេលអនុញ្ញាតឲ្យខ្ចី (ថ្ងៃ)' : 'Allowed Loan Period (Days)'}</label>
                    <span className="text-blue-600 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100">{loanPeriod} {language === 'kh' ? 'ថ្ងៃ' : 'days'}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={loanPeriod}
                    onChange={(e) => setLoanPeriod(parseInt(e.target.value) || 7)}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Daily Fine Rate */}
                <div>
                  <label className="block mb-1">{language === 'kh' ? 'ថ្លៃពិន័យក្នុងមួយថ្ងៃយឺតយ៉ាវ' : 'Daily Fine Rate'}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={dailyFineRate}
                      onChange={(e) => setDailyFineRate(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-3 pr-10 py-2 block rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input font-bold"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      {currencyUnit}
                    </span>
                  </div>
                </div>

                {/* Currency selector */}
                <div>
                  <label className="block mb-1">{language === 'kh' ? 'រូបិយប័ណ្ណបង្ហាញ' : 'Currency Symbol'}</label>
                  <select
                    value={currencyUnit}
                    onChange={(e) => setCurrencyUnit(e.target.value)}
                    className="w-full px-3 py-2 block rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input font-bold"
                  >
                    <option value="៛">៛ (KHR - Riel)</option>
                    <option value="$">$ (USD - Dollar)</option>
                    <option value="¥">¥ (Yen / Yuan)</option>
                  </select>
                </div>

                {/* Overdue Calculation Basis */}
                <div>
                  <label className="block mb-1">{language === 'kh' ? 'មូលដ្ឋានគណនាថ្ងៃហួសកំណត់' : 'Overdue Calculation Mode'}</label>
                  <div className="flex flex-col gap-2 mt-1">
                    <label className="flex items-center gap-2 font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="calcMode"
                        checked={calculationMode === 'period'}
                        onChange={() => setCalculationMode('period')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs">
                        {language === 'kh' ? 'ធៀបនឹងរយៈពេលកំណត់ (ថ្ងៃ)' : 'Compared to Custom Loan Period'}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="calcMode"
                        checked={calculationMode === 'duedate'}
                        onChange={() => setCalculationMode('duedate')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs">
                        {language === 'kh' ? 'ធៀបនឹងថ្ងៃត្រូវសងក្នុងសំបុត្រខ្ចី' : 'Compared to original due date on record'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed mt-2">
              <span className="text-slate-500">💡 {language === 'kh' ? 'របៀបគណនា៖' : 'How it works:'}</span><br />
              {calculationMode === 'period' 
                ? (language === 'kh' 
                  ? `ប្រាក់ពិន័យ = (ចំនួនថ្ងៃខ្ចីសរុប - ${loanPeriod} ថ្ងៃ) x ${dailyFineRate.toLocaleString()}${currencyUnit} ក្នុងមួយថ្ងៃ`
                  : `Fine = (Total days borrowed - ${loanPeriod} days) x ${dailyFineRate.toLocaleString()}${currencyUnit} per day`)
                : (language === 'kh'
                  ? `ប្រាក់ពិន័យ = (ចំនួនថ្ងៃហួសពីថ្ងៃសងលើសំបុត្រ) x ${dailyFineRate.toLocaleString()}${currencyUnit} ក្នុងមួយថ្ងៃ`
                  : `Fine = (Days past recorded due date) x ${dailyFineRate.toLocaleString()}${currencyUnit} per day`)}
            </div>
          </div>

          {/* Fines Statistics Tiles */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Unpaid (Outstanding) */}
            <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition duration-300">
              <div className="flex justify-between items-start">
                <span className="text-xs font-black text-red-600 tracking-wider uppercase">
                  {language === 'kh' ? 'ប្រាក់ពិន័យមិនទាន់បង់' : 'Outstanding Fines'}
                </span>
                <span className="p-2 rounded-2xl bg-red-50 text-red-600 border border-red-100">
                  <ShieldAlert className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-red-700 tracking-tight block">
                  {totalOutstanding.toLocaleString()} {currencyUnit}
                </span>
                <span className="text-[10px] text-slate-500 font-bold font-mono mt-1 block">
                  {outstandingCount} {language === 'kh' ? 'កំណត់ត្រាមិនទាន់ដោះស្រាយ' : 'unpaid overdue records'}
                </span>
              </div>
            </div>

            {/* Collected (Paid) */}
            <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition duration-300">
              <div className="flex justify-between items-start">
                <span className="text-xs font-black text-emerald-600 tracking-wider uppercase">
                  {language === 'kh' ? 'ប្រាក់ពិន័យប្រមូលបាន' : 'Fines Collected'}
                </span>
                <span className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Check className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-emerald-700 tracking-tight block">
                  {totalCollected.toLocaleString()} {currencyUnit}
                </span>
                <span className="text-[10px] text-slate-500 font-bold font-mono mt-1 block">
                  {collectedCount} {language === 'kh' ? 'កំណត់ត្រាបានបង់រួច' : 'paid records'}
                </span>
              </div>
            </div>

            {/* Waived */}
            <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition duration-300">
              <div className="flex justify-between items-start">
                <span className="text-xs font-black text-slate-500 tracking-wider uppercase">
                  {language === 'kh' ? 'ពិន័យបានលើកលែង' : 'Fines Waived'}
                </span>
                <span className="p-2 rounded-2xl bg-slate-50 text-slate-600 border border-slate-100">
                  <RotateCcw className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-slate-700 tracking-tight block">
                  {totalWaived.toLocaleString()} {currencyUnit}
                </span>
                <span className="text-[10px] text-slate-500 font-bold font-mono mt-1 block">
                  {waivedCount} {language === 'kh' ? 'កំណត់ត្រាបានលើកលែង' : 'waived records'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Input within reports */}
      <div className="glass-panel p-4 rounded-3xl border border-white/60 shadow-sm">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            id="reports-search"
            type="text"
            placeholder={language === 'kh' ? 'តម្រងស្វែងរកក្នុងរបាយការណ៍ (ចំណងជើងសៀវភៅ ឈ្មោះសិស្ស បារកូដ)...' : 'Search within report (Title, student, barcode)...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 block w-full rounded-2xl text-slate-800 text-sm focus:outline-none transition glass-input"
          />
        </div>
      </div>

      {/* Overdue Student Reminders Notification Center (Only shown in Overdue view) */}
      {activeReport === 'overdue' && (
        <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4.5 h-4.5 text-blue-600" />
                {language === 'kh' ? 'ប្រព័ន្ធផ្ញើអ៊ីមែលរំលឹកសិស្សហួសកាលកំណត់' : 'Overdue Student Email Notification Center'}
              </h3>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                {language === 'kh' 
                  ? 'បញ្ជីសិស្សដែលមានសៀវភៅហួសកាលកំណត់ និងសកម្មភាពរំលឹកដោយប្រើប្រាស់កម្មវិធីអ៊ីមែល' 
                  : 'Generate prefilled email notifications and launch default mail client to alert overdue students'}
              </p>
            </div>

            {overdueRecordsByStudent.length > 0 && (
              <button
                onClick={() => {
                  // BCC all students
                  const bccEmails = overdueRecordsByStudent.map(g => `${g.student.studentId.toLowerCase()}@school.edu.kh`).join(',');
                  const subject = language === 'kh' 
                    ? 'លិខិតជូនដំណឹង៖ ការហួសកាលកំណត់សងសៀវភៅបណ្ណាល័យវិទ្យាល័យ ហ៊ុន សែន អណ្តូងមាស' 
                    : 'URGENT: Library Overdue Books Notification - Hun Sen Andoung Meas HS';
                  
                  const body = language === 'kh'
                    ? `សូមជម្រាបសួរ,

នេះជាលិខិតរំលឹកពីបណ្ណាល័យវិទ្យាល័យ ហ៊ុន សែន អណ្តូងមាស។ សូមពិនិត្យមើលសៀវភៅដែលអ្នកបានខ្ចី ហើយបានហួសកាលកំណត់។ សូមយកមកសងបណ្ណាល័យវិញជាបន្ទាន់។

សូមអរគុណ!`
                    : `Dear Students,

This is a reminder from the Hun Sen Andoung Meas High School Library. You have library books that are currently overdue for return. Please return your overdue books to the school library as soon as possible.

Thank you!`;
                  
                  window.location.href = `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg transition cursor-pointer self-start sm:self-center"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{language === 'kh' ? 'ផ្ញើអ៊ីមែលរំលឹកសិស្សទាំងអស់ (BCC)' : 'Email All Overdue Students (BCC)'}</span>
              </button>
            )}
          </div>

          {overdueRecordsByStudent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {overdueRecordsByStudent.map(({ student, records: studentRecs, books: studentBooks }) => {
                const bookTitles = studentBooks.map(b => b.title).join(', ');
                const studentEmail = `${student.studentId.toLowerCase()}@school.edu.kh`;

                return (
                  <div key={student.id} className="bg-slate-50/50 border border-slate-200/40 p-4 rounded-2xl flex flex-col justify-between gap-3 hover:shadow-md transition bg-white/40">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-black text-slate-800">{student.name}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded">
                          {student.studentId}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {language === 'kh' ? `ថ្នាក់៖ ${student.classGrade}` : `Class: ${student.classGrade}`}
                      </p>

                      <div className="mt-3 space-y-1 bg-white/70 p-2.5 rounded-xl border border-slate-100 text-[11px] font-bold">
                        <span className="text-rose-600 flex items-center gap-1 font-black">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {studentRecs.length} {language === 'kh' ? 'សៀវភៅហួសកំណត់' : 'Overdue book(s)'}
                        </span>
                        <p className="text-slate-600 line-clamp-2 text-xs font-semibold leading-tight">
                          {bookTitles}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onNotifyStudent(student, studentRecs, studentBooks)}
                      className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 rounded-xl transition cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      <span>{language === 'kh' ? 'ផ្ញើអ៊ីមែលរំលឹកសិស្សនេះ' : 'Send Email Notification'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs font-bold">
              {language === 'kh' ? 'មិនមានសិស្សដែលមានសៀវភៅហួសកាលកំណត់សងទេ!' : 'No students found with overdue books!'}
            </div>
          )}
        </div>
      )}

      {/* Printable / Viewable Report Table container */}
      <div className="glass-panel rounded-3xl border border-white/60 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-white/40 bg-white/20 backdrop-blur-sm flex justify-between items-center flex-wrap gap-2">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            {getReportTitle()}
          </h2>
          <span className="text-xs bg-white/65 border border-white/50 text-blue-700 font-bold px-2.5 py-1 rounded-full">
            {activeReport === 'history' ? getHistoryEvents().length : filteredRecords.length} {language === 'kh' ? 'កំណត់ត្រា' : 'records found'}
          </span>
        </div>

        <div className="overflow-x-auto">
          {activeReport === 'fees' ? (
            /* LATE FEES BREAKDOWN TABLE */
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'ឈ្មោះសិស្ស' : 'STUDENT'}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t.bookTitle}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'រយៈពេលខ្ចី / កាលបរិច្ឆេទ' : 'LOAN TIMELINE'}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'ថ្ងៃយឺតយ៉ាវ' : 'DAYS OVERDUE'}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'ប្រាក់ពិន័យសរុប' : 'TOTAL FINE'}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'ស្ថានភាព' : 'STATUS'}</th>
                  <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'សកម្មភាពពិន័យ' : 'FINE MANAGEMENT'}</th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-white/20 text-sm">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map(rec => {
                    const bk = books.find(b => b.id === rec.bookId);
                    const stu = students.find(s => s.id === rec.studentId);
                    
                    let daysOverdue = 0;
                    let daysBorrowed = 0;
                    if (calculationMode === 'period') {
                      daysBorrowed = getDaysBetween(rec.borrowDate, rec.returnDate || todayStr);
                      daysOverdue = Math.max(0, daysBorrowed - loanPeriod);
                    } else {
                      daysOverdue = Math.max(0, getDaysBetween(rec.dueDate, rec.returnDate || todayStr));
                    }

                    const fineAmount = daysOverdue * dailyFineRate;
                    const isPaid = paidRecordIds.includes(rec.id);
                    const isWaived = waivedRecordIds.includes(rec.id);

                    return (
                      <tr key={rec.id} className="hover:bg-white/30 transition">
                        {/* Student details */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{stu?.name || 'Deleted Student'}</div>
                          <div className="text-[10px] text-slate-500 font-semibold font-mono">
                            {stu?.studentId || 'N/A'} • {stu?.classGrade || 'N/A'}
                          </div>
                        </td>

                        {/* Book Title with barcode */}
                        <td className="px-6 py-4">
                          <div className="flex gap-2.5 items-center max-w-xs md:max-w-md">
                            {bk?.coverImage ? (
                              <img
                                src={bk.coverImage}
                                alt={bk.title}
                                className="w-6 h-8 object-cover rounded border border-white/40 shadow-sm shrink-0 bg-white"
                              />
                            ) : (
                              <div className="w-6 h-8 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300 shrink-0 text-[5px] font-black uppercase text-center leading-none">
                                N/A
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate" title={bk?.title}>{bk?.title || 'Deleted Book'}</p>
                              <span className="text-[10px] text-slate-500 font-bold font-mono">{bk?.barcode}</span>
                            </div>
                          </div>
                        </td>

                        {/* Loan dates and timeline */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-slate-600 font-medium">
                            <span className="font-bold text-slate-500">{language === 'kh' ? 'ខ្ចី៖' : 'Borrowed:'}</span> {rec.borrowDate}
                          </div>
                          <div className="text-xs text-slate-600 font-medium">
                            {rec.returnDate ? (
                              <>
                                <span className="font-bold text-emerald-600">{language === 'kh' ? 'សង៖' : 'Returned:'}</span> {rec.returnDate}
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-red-500">{language === 'kh' ? 'ថ្ងៃត្រូវសង៖' : 'Due:'}</span> {rec.dueDate}
                              </>
                            )}
                          </div>
                        </td>

                        {/* Overdue days */}
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-700">
                          {daysOverdue} {language === 'kh' ? 'ថ្ងៃ' : 'days'}
                          {calculationMode === 'period' && (
                            <div className="text-[9px] text-slate-400 font-normal">
                              ({daysBorrowed} {language === 'kh' ? 'ថ្ងៃខ្ចីសរុប' : 'total loaned'} - {loanPeriod}d)
                            </div>
                          )}
                        </td>

                        {/* Total fine amount */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono font-black text-slate-800 text-sm">
                            {fineAmount.toLocaleString()} {currencyUnit}
                          </span>
                        </td>

                        {/* Fine status badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 inline-flex text-[9px] leading-5 font-extrabold rounded-full border uppercase tracking-wider ${
                            isPaid
                              ? 'bg-green-100/50 text-green-700 border-green-200/40'
                              : isWaived
                              ? 'bg-slate-100/60 text-slate-600 border-slate-200/40'
                              : 'bg-red-100/50 text-red-700 border-red-200/40 animate-pulse'
                          }`}>
                            {isPaid 
                              ? (language === 'kh' ? 'បានបង់រួច' : 'Paid')
                              : isWaived
                              ? (language === 'kh' ? 'បានលើកលែង' : 'Waived')
                              : (language === 'kh' ? 'មិនទាន់បង់' : 'Unpaid')}
                          </span>
                        </td>

                        {/* Fine management buttons */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex gap-2 justify-center">
                            {!isPaid && !isWaived ? (
                              <>
                                <button
                                  onClick={() => setPaidRecordIds(prev => [...prev, rec.id])}
                                  className="px-2.5 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  {language === 'kh' ? 'បង់រួច' : 'Paid'}
                                </button>
                                <button
                                  onClick={() => setWaivedRecordIds(prev => [...prev, rec.id])}
                                  className="px-2.5 py-1 text-[10px] font-bold bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition cursor-pointer flex items-center gap-1"
                                >
                                  {language === 'kh' ? 'លើកលែង' : 'Waive'}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setPaidRecordIds(prev => prev.filter(id => id !== rec.id));
                                  setWaivedRecordIds(prev => prev.filter(id => id !== rec.id));
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg border border-blue-200/50 transition cursor-pointer flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                {language === 'kh' ? 'សារឡើងវិញ' : 'Reset'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-bold text-xs">
                      {language === 'kh' ? 'មិនមានសិស្សយឺតយ៉ាវត្រូវបង់ប្រាក់ពិន័យទេ!' : 'No overdue student records qualify for late fines.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeReport === 'overdue-list' ? (
            /* OVERDUE STUDENT LIST TABLE */
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'សិស្ស' : 'STUDENT'}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'សៀវភៅហួសកំណត់' : 'OVERDUE BOOKS'}</th>
                  <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'សកម្មភាព' : 'ACTION'}</th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-white/20 text-sm">
                {overdueRecordsByStudent.map(({ student, records: studentRecs, books: studentBooks }) => (
                  <tr key={student.id} className="hover:bg-white/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{student.name}</div>
                      <div className="text-[10px] text-slate-500 font-semibold font-mono">{student.studentId} • {student.classGrade}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700">
                      {studentRecs.map((rec, i) => (
                        <div key={rec.id} className="mb-1">
                          {studentBooks[i]?.title} (<span className="text-rose-600">{rec.dueDate}</span>)
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onNotifyStudent(student, studentRecs, studentBooks)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        {language === 'kh' ? 'ផ្ញើអ៊ីមែលរំលឹក' : 'Notify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeReport === 'history' ? (
            /* CHRONOLOGICAL TRANSACTION HISTORY TABLE */
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'កាលបរិច្ឆេទ' : 'DATE'}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'ប្រភេទប្រតិបត្តិការ' : 'TRANSACTION TYPE'}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t.bookTitle}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'សិស្ស' : 'STUDENT'}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'លេខកូដសំបុត្រ' : 'TICKET ID'}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'កំណត់សម្គាល់' : 'NOTES'}</th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-white/20 text-sm">
                {(() => {
                  const historyEvents = getHistoryEvents();
                  if (historyEvents.length > 0) {
                    return historyEvents.map(evt => {
                      const bk = books.find(b => b.id === evt.bookId);
                      const stu = students.find(s => s.id === evt.studentId);
                      return (
                        <tr key={evt.id} className="hover:bg-white/30 transition">
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-600">
                            {evt.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 inline-flex text-[10px] leading-5 font-extrabold rounded-full border uppercase tracking-wider ${
                              evt.type === 'borrow'
                                ? 'bg-blue-100/50 text-blue-700 border-blue-200/40'
                                : 'bg-green-100/50 text-green-700 border-green-200/40'
                            }`}>
                              {evt.type === 'borrow'
                                ? (language === 'kh' ? 'ខ្ចី' : 'Borrow')
                                : (language === 'kh' ? 'សង' : 'Return')}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            <div className="flex gap-2.5 items-center">
                              {bk?.coverImage ? (
                                <img
                                  src={bk.coverImage}
                                  alt={bk.title}
                                  className="w-6 h-8 object-cover rounded border border-white/40 shadow-sm shrink-0 bg-white"
                                />
                              ) : (
                                <div className="w-6 h-8 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300 shrink-0 text-[5px] font-black uppercase text-center leading-none">
                                  N/A
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="line-clamp-1">{bk?.title || 'Deleted Book'}</p>
                                <span className="text-[10px] text-slate-500 font-bold font-mono">{bk?.barcode}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-700">
                            <div>
                              <p>{stu?.name || 'Deleted Student'}</p>
                              <span className="text-[10px] text-slate-500 font-semibold font-mono">
                                {stu?.studentId || 'N/A'} • {stu?.classGrade || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-500">
                            #{evt.recordId.replace('rec-', '')}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate" title={evt.notes}>
                            {evt.notes || <span className="text-slate-300">-</span>}
                          </td>
                        </tr>
                      );
                    });
                  } else {
                    return (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400 font-bold text-xs">
                          {language === 'kh' ? 'មិនមានកំណត់ត្រាប្រតិបត្តិការខ្ចី-សងទេ' : 'No transactions recorded in history.'}
                        </td>
                      </tr>
                    );
                  }
                })()}
              </tbody>
            </table>
          ) : (
            /* STANDARD REPORTS TABLE */
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{language === 'kh' ? 'លេខកូដសំបុត្រ' : 'TRANSACT ID'}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t.bookTitle}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t.fullName}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t.classGrade}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t.borrowDate}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t.dueDate}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t.returnDate}</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t.status}</th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-white/20 text-sm">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map(rec => {
                    const bk = books.find(b => b.id === rec.bookId);
                    const stu = students.find(s => s.id === rec.studentId);
                    return (
                      <tr key={rec.id} className="hover:bg-white/30 transition">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-600">
                          #{rec.id.replace('rec-', '')}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <div>
                            <p className="line-clamp-1">{bk?.title || 'Deleted Book'}</p>
                            <span className="text-[10px] text-slate-500 font-bold font-mono">{bk?.barcode}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-700">
                          {stu?.name || 'Deleted Student'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold font-mono text-slate-500">
                          {stu?.classGrade || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                          {rec.borrowDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                          {rec.dueDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                          {rec.returnDate ? (
                             <span className="text-emerald-600 font-bold">{rec.returnDate}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-extrabold rounded-full border uppercase tracking-wider ${
                            rec.status === 'returned'
                              ? 'bg-green-100/50 text-green-700 border-green-200/40'
                              : rec.status === 'borrowed'
                              ? 'bg-blue-100/50 text-blue-700 border-blue-200/40'
                              : rec.status === 'overdue'
                              ? 'bg-red-100/50 text-red-700 border-red-200/40 animate-pulse'
                              : 'bg-amber-100/50 text-amber-700 border-amber-200/40'
                          }`}>
                            {rec.status === 'returned' 
                              ? (language === 'kh' ? 'សងរួច' : 'Returned')
                              : rec.status === 'overdue'
                              ? (language === 'kh' ? 'ហួសកំណត់' : 'Overdue')
                              : rec.status === 'lost'
                              ? (language === 'kh' ? 'បាត់' : 'Lost')
                              : (language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed')}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 font-bold text-xs">
                      {language === 'kh' ? 'មិនមានកំណត់ត្រាក្នុងរបាយការណ៍នេះទេ' : 'No report history records match the filter criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
