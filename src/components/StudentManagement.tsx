import React, { useState } from 'react';
import { Student, Language, Book, BorrowRecord } from '../types';
import { translations } from '../utils/translations';
import { generateStudentID } from '../utils/barcode';
import { 
  Search, Plus, Edit2, Trash2, X, Save, UserPlus, Phone, Award,
  ChevronDown, ChevronUp, BookOpen, Clock, CheckCircle2, AlertCircle, Calendar,
  QrCode, Printer, Filter, History, Loader2, Download, RefreshCw, Mail, Camera, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import StudentCameraPhoto from './StudentCameraPhoto';

interface StudentManagementProps {
  students: Student[];
  records?: BorrowRecord[];
  books?: Book[];
  language: Language;
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  googleAccessToken?: string | null;
  onConnectGoogle?: () => Promise<string | null>;
  onShowSuccess?: (msg: string) => void;
  onShowError?: (msg: string) => void;
  initialSearchTerm?: string;
  initialStudentId?: string | null;
}

export default function StudentManagement({
  students,
  records = [],
  books = [],
  language,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  googleAccessToken = null,
  onConnectGoogle,
  onShowSuccess,
  onShowError,
  initialSearchTerm,
  initialStudentId,
}: StudentManagementProps) {
  const t = translations[language];

  // Expanded student view state
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Photo target state for camera capture
  const [photoTargetStudent, setPhotoTargetStudent] = useState<Student | null>(null);

  // Hover tooltip state
  const [hoveredStudent, setHoveredStudent] = useState<Student | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<DOMRect | null>(null);

  const tooltipTranslations = {
    kh: {
      currentlyBorrowing: 'សៀវភៅកំពុងខ្ចី',
      overdue: 'ហួសកំណត់',
      borrowed: 'កំពុងខ្ចី',
      totalBorrowed: 'ខ្ចីសរុប',
      overdueAlert: 'សិស្សមានសៀវភៅហួសកំណត់សង!',
      noActiveBooks: 'គ្មានសៀវភៅកំពុងខ្ចីទេ',
      dueOn: 'ត្រូវសង៖',
      overdueSince: 'ហួសកំណត់តាំងពី៖'
    },
    en: {
      currentlyBorrowing: 'Currently Borrowing',
      overdue: 'Overdue',
      borrowed: 'Borrowed',
      totalBorrowed: 'Total Borrowed',
      overdueAlert: 'Student has overdue books!',
      noActiveBooks: 'No active borrowed books',
      dueOn: 'Due:',
      overdueSince: 'Overdue since:'
    }
  };

  const tExpanded = {
    historyTitle: language === 'kh' ? 'ប្រវត្តិនៃការខ្ចី និងសងសៀវភៅ' : 'Borrowing & Return History',
    totalBorrowed: language === 'kh' ? 'សៀវភៅខ្ចីសរុប' : 'Total Borrowed',
    currentlyHolding: language === 'kh' ? 'កំពុងខ្ចីសៀវភៅ' : 'Currently Borrowing',
    overdueBooks: language === 'kh' ? 'ហួសកំណត់សង' : 'Overdue Books',
    bookTitle: language === 'kh' ? 'ចំណងជើងសៀវភៅ' : 'Book Title',
    barcode: language === 'kh' ? 'បារកូដ' : 'Barcode',
    borrowDate: language === 'kh' ? 'ថ្ងៃខ្ចី' : 'Borrow Date',
    dueDate: language === 'kh' ? 'ថ្ងៃត្រូវសង' : 'Due Date',
    returnDate: language === 'kh' ? 'ថ្ងៃបានសង' : 'Return Date',
    status: language === 'kh' ? 'ស្ថានភាព' : 'Status',
    notReturned: language === 'kh' ? 'មិនទាន់សង' : 'Not Returned Yet',
    noHistory: language === 'kh' ? 'មិនទាន់មានប្រវត្តិខ្ចីសៀវភៅនៅឡើយទេ' : 'No borrowing or return history found for this student.',
    viewHistory: language === 'kh' ? 'មើលប្រវត្តិ' : 'View History',
    hideHistory: language === 'kh' ? 'លាក់ប្រវត្តិ' : 'Hide History',
    booksUnit: language === 'kh' ? 'ក្បាល' : 'books',
  };

  // Search filter
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');

  React.useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  React.useEffect(() => {
    if (initialStudentId) {
      setExpandedStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  // Google Contacts Integration State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [googleContacts, setGoogleContacts] = useState<any[]>([]);
  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [contactsSearchTerm, setContactsSearchTerm] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [importClassGrade, setImportClassGrade] = useState('10A');
  const [importError, setImportError] = useState<string | null>(null);
  const [importTab, setImportTab] = useState<'all' | 'new' | 'sync'>('all');

  const fetchGoogleContacts = async (token: string) => {
    setIsFetchingContacts(true);
    setImportError(null);
    try {
      const response = await fetch('https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,genders,emailAddresses&pageSize=100', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Google API returned status ${response.status}`);
      }
      const data = await response.json();
      const parsed = (data.connections || []).map((conn: any) => {
        const name = conn.names?.[0]?.displayName || 'Unnamed Contact';
        const email = conn.emailAddresses?.[0]?.value || '';
        const phoneNumber = conn.phoneNumbers?.[0]?.value || '';
        const genderValue = conn.genders?.[0]?.value || 'male';
        const gender = (genderValue.toLowerCase() === 'female' || genderValue.toLowerCase() === 'f') ? 'F' : 'M';
        return {
          id: conn.resourceName,
          name,
          email,
          phoneNumber,
          gender: gender as 'M' | 'F'
        };
      });
      setGoogleContacts(parsed);
    } catch (err: any) {
      console.error("Failed to fetch Google Contacts:", err);
      setImportError(language === 'kh' ? 'មិនអាចទាញយកទំនាក់ទំនងពី Google បានទេ! សូមព្យាយាមម្តងទៀត។' : 'Failed to fetch Google Contacts. Please try again.');
    } finally {
      setIsFetchingContacts(false);
    }
  };

  const handleOpenImportModal = async () => {
    setIsImportModalOpen(true);
    let activeToken = googleAccessToken;
    if (!activeToken && onConnectGoogle) {
      activeToken = await onConnectGoogle();
    }
    if (activeToken) {
      fetchGoogleContacts(activeToken);
    }
  };

  const handleToggleSelectContact = (id: string) => {
    setSelectedContactIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSelectAllContacts = (filteredIds: string[]) => {
    if (selectedContactIds.length === filteredIds.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filteredIds);
    }
  };

  const handleImportSelectedContacts = () => {
    const selected = googleContacts.filter(c => selectedContactIds.includes(c.id));
    if (selected.length === 0) return;

    let importedCount = 0;
    let syncedCount = 0;

    selected.forEach((contact, index) => {
      // Find case-insensitive match by name
      const matched = students.find(s => s.name.trim().toLowerCase() === contact.name.trim().toLowerCase());

      if (matched) {
        // Overwrite / Sync current student's phoneNumber with the Google Contact's phoneNumber if available
        onUpdateStudent({
          ...matched,
          phoneNumber: contact.phoneNumber || matched.phoneNumber
        });
        syncedCount++;
      } else {
        // Find class count to generate proper Student ID
        const classCount = students.filter(s => s.classGrade.toUpperCase() === importClassGrade.toUpperCase()).length + importedCount;
        const studentId = generateStudentID(importClassGrade, classCount);

        const newStudent: Student = {
          id: `stu-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
          studentId,
          name: contact.name,
          gender: contact.gender,
          classGrade: importClassGrade.toUpperCase(),
          phoneNumber: contact.phoneNumber || 'N/A',
        };
        onAddStudent(newStudent);
        importedCount++;
      }
    });

    if (onShowSuccess) {
      if (importedCount > 0 && syncedCount > 0) {
        onShowSuccess(
          language === 'kh'
            ? `បាននាំចូលសិស្សថ្មីចំនួន ${importedCount} នាក់ និងបានធ្វើបច្ចុប្បន្នភាពទិន្នន័យទំនាក់ទំនងសិស្សចាស់ចំនួន ${syncedCount} នាក់រួចរាល់!`
            : `Successfully imported ${importedCount} new student(s) and synced/updated ${syncedCount} existing records!`
        );
      } else if (importedCount > 0) {
        onShowSuccess(
          language === 'kh'
            ? `បាននាំចូលសិស្សថ្មីចំនួន ${importedCount} នាក់ដោយជោគជ័យ!`
            : `Successfully imported ${importedCount} new student(s) from Google Contacts!`
        );
      } else if (syncedCount > 0) {
        onShowSuccess(
          language === 'kh'
            ? `បានធ្វើបច្ចុប្បន្នភាព/អនុគមន៍ទិន្នន័យទំនាក់ទំនងសិស្សចំនួន ${syncedCount} នាក់រួចរាល់!`
            : `Successfully synchronized and updated ${syncedCount} existing student contact(s)!`
        );
      }
    }

    setIsImportModalOpen(false);
    setSelectedContactIds([]);
    setGoogleContacts([]);
    setImportTab('all');
  };

  // History searching and status filtering inside expanded student panel
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'borrowed' | 'returned' | 'overdue' | 'lost'>('all');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  const [qrViewStudent, setQrViewStudent] = useState<Student | null>(null);
  const [studentQrCodeUrl, setStudentQrCodeUrl] = useState<string>('');

  React.useEffect(() => {
    if (qrViewStudent) {
      QRCode.toDataURL(qrViewStudent.studentId, { margin: 1, width: 220 })
        .then((url) => setStudentQrCodeUrl(url))
        .catch((err) => console.error(err));
    } else {
      setStudentQrCodeUrl('');
    }
  }, [qrViewStudent]);

  const handlePrintStudentCard = (student: Student) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${student.studentId} - ${student.name}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                font-family: sans-serif;
                background-color: #f8fafc;
              }
              .card {
                border: 2px solid #3b82f6;
                padding: 24px;
                border-radius: 20px;
                background: #ffffff;
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                width: 320px;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .card {
                width: 320px;
                padding: 24px;
                background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
                border: 1px solid #e2e8f0;
                border-radius: 24px;
                box-shadow: 0 15px 30px -10px rgba(0,0,0,0.15);
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              }
              .school {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: #64748b;
                font-weight: 900;
                margin-bottom: 8px;
              }
              .title {
                font-size: 16px;
                font-weight: 800;
                color: #1e3a8a;
                margin: 0 0 16px 0;
              }
               .avatar {
                width: 80px;
                height: 80px;
                border-radius: 20px;
                background: ${student.gender === 'M' ? '#dbeafe' : '#fce7f3'};
                color: ${student.gender === 'M' ? '#1d4ed8' : '#be185d'};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
                font-weight: 800;
                margin-bottom: 16px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
              }
              .avatar-img {
                width: 80px;
                height: 80px;
                border-radius: 20px;
                object-fit: cover;
                border: 3px solid #ffffff;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                margin-bottom: 16px;
              }
              .name {
                font-size: 20px;
                font-weight: 800;
                color: #0f172a;
                margin: 0 0 4px 0;
              }
              .details {
                font-size: 13px;
                color: #475569;
                font-weight: 600;
                margin: 0 0 16px 0;
                background: rgba(255,255,255,0.6);
                padding: 4px 12px;
                border-radius: 8px;
              }
              .qr-container {
                border: 1px solid #e2e8f0;
                padding: 10px;
                border-radius: 16px;
                background: #ffffff;
                margin-bottom: 16px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
              }
              .id-label {
                font-family: monospace;
                font-size: 14px;
                font-weight: 900;
                color: #1e293b;
                background: #e2e8f0;
                padding: 4px 12px;
                border-radius: 8px;
                letter-spacing: 0.5px;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <span class="school">Hun Sen Andoung Meas High School</span>
              <h2 class="title">STUDENT LIBRARY CARD</h2>
              ${student.photo ? `
                <img class="avatar-img" src="${student.photo}" alt="${student.name}" />
              ` : `
                <div class="avatar">${student.name.charAt(0)}</div>
              `}
              <p class="name">${student.name}</p>
              <p class="details">Grade: ${student.classGrade} | Gen: ${student.gender === 'M' ? 'Male' : 'Female'}</p>
              <div class="qr-container">
                <img src="${studentQrCodeUrl}" width="150" height="150" alt="Student QR Code" />
              </div>
              <span class="id-label">${student.studentId}</span>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Form Fields
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [classGrade, setClassGrade] = useState('12A');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Filter students based on search term
  const filteredStudents = students.filter((student) => {
    return (
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.classGrade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phoneNumber.includes(searchTerm) ||
      (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingStudentId(null);
    setName('');
    setGender('M');
    setClassGrade('12A');
    setPhoneNumber('');
    setEmail('');
    setPassword('');
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setIsEditMode(true);
    setEditingStudentId(student.id);
    setName(student.name);
    setGender(student.gender);
    setClassGrade(student.classGrade);
    setPhoneNumber(student.phoneNumber);
    setEmail(student.email || '');
    setPassword(student.password || '');
    setIsModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !classGrade.trim()) return;

    if (isEditMode && editingStudentId) {
      const existingStudent = students.find((s) => s.id === editingStudentId);
      if (!existingStudent) return;

      onUpdateStudent({
        ...existingStudent,
        name,
        gender,
        classGrade,
        phoneNumber,
        email: email.trim() || undefined,
        password: password.trim() || undefined,
      });
    } else {
      // Auto generate Student ID depending on class count
      const classCount = students.filter((s) => s.classGrade.toUpperCase() === classGrade.toUpperCase()).length;
      const studentId = generateStudentID(classGrade, classCount);

      const newStudent: Student = {
        id: `stu-${Date.now()}`,
        studentId,
        name,
        gender,
        classGrade: classGrade.toUpperCase(),
        phoneNumber,
        email: email.trim() || undefined,
        password: password.trim() || undefined,
      };
      onAddStudent(newStudent);
    }
    setIsModalOpen(false);
  };

  return (
    <div id="student-management-view" className="space-y-6">
      {/* Search and Action Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            id="student-search"
            type="text"
            placeholder={language === 'kh' ? 'ស្វែងរកសិស្ស (ឈ្មោះ អត្តសញ្ញាណ ថ្នាក់ ឬទូរស័ព្ទ)...' : 'Search students (Name, ID, Class, Phone)...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 block w-full rounded-2xl text-slate-800 text-sm focus:outline-none transition glass-input"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            id="import-google-contacts-btn"
            type="button"
            onClick={handleOpenImportModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg hover:shadow-emerald-500/10 transition duration-150 cursor-pointer w-full md:w-auto justify-center"
          >
            <Download className="w-4 h-4" />
            {language === 'kh' ? 'នាំចូលពី Contacts' : 'Import from Google Contacts'}
          </button>

          <button
            id="add-student-btn"
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg hover:shadow-blue-500/10 transition duration-150 cursor-pointer w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            {language === 'kh' ? 'ចុះឈ្មោះសិស្ស' : 'Register Student'}
          </button>
        </div>
      </div>

      {/* Student List Table */}
      <div className="glass-panel rounded-3xl border border-white/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/20">
            <thead className="bg-slate-100/40 backdrop-blur-sm">
              <tr>
                <th className="w-12 px-4 py-4 text-center text-[11px] font-extrabold text-slate-500 uppercase tracking-wider"></th>
                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.studentId}</th>
                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.fullName}</th>
                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.gender}</th>
                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.classGrade}</th>
                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.phone}</th>
                <th className="px-6 py-4 text-right text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20 text-sm">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <React.Fragment key={student.id}>
                    <tr className="hover:bg-white/45 transition">
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const nextId = expandedStudentId === student.id ? null : student.id;
                            setExpandedStudentId(nextId);
                            setHistorySearch('');
                            setHistoryStatusFilter('all');
                          }}
                          className={`p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 transition cursor-pointer inline-flex items-center justify-center ${
                            expandedStudentId === student.id ? 'bg-blue-50 text-blue-600' : ''
                          }`}
                          title={expandedStudentId === student.id ? tExpanded.hideHistory : tExpanded.viewHistory}
                        >
                          {expandedStudentId === student.id ? (
                            <ChevronUp className="w-4.5 h-4.5" />
                          ) : (
                            <ChevronDown className="w-4.5 h-4.5" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-600">
                        {student.studentId}
                      </td>
                      <td 
                        className="px-6 py-4 font-bold text-slate-800 cursor-help group/name"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoverAnchor(rect);
                          setHoveredStudent(student);
                        }}
                        onMouseLeave={() => {
                          setHoveredStudent(null);
                          setHoverAnchor(null);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {student.photo ? (
                            <img 
                              src={student.photo} 
                              alt={student.name} 
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border shadow-sm shrink-0 ${
                              student.gender === 'M' 
                                ? 'bg-blue-100 border-blue-200 text-blue-700' 
                                : 'bg-pink-100 border-pink-200 text-pink-700'
                            }`}>
                              {student.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2">
                              <span className="group-hover/name:text-blue-600 transition duration-150">
                                {student.name}
                              </span>
                            
                              {/* Mini Status Badge next to name */}
                              {(() => {
                                const studentRecords = records.filter(r => r.studentId === student.id);
                                const activeRecords = studentRecords.filter(r => r.status === 'borrowed' || r.status === 'overdue');
                                const overdueRecords = studentRecords.filter(r => r.status === 'overdue');
                                
                                if (overdueRecords.length > 0) {
                                  return (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                                      <AlertCircle className="w-2.5 h-2.5" />
                                      {overdueRecords.length}
                                    </span>
                                  );
                                } else if (activeRecords.length > 0) {
                                  return (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-100">
                                      <BookOpen className="w-2.5 h-2.5 text-blue-500" />
                                      {activeRecords.length}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            {student.email && (
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span>{student.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                        <span className={`px-2 py-0.5 text-xs font-black rounded border ${
                          student.gender === 'M' 
                            ? 'bg-blue-100/50 text-blue-700 border-blue-200/30' 
                            : 'bg-pink-100/50 text-pink-700 border-pink-200/30'
                        }`}>
                          {student.gender === 'M' ? t.male : t.female}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-bold font-mono">
                        {student.classGrade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-600 font-bold">
                        {student.phoneNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-black space-x-1.5">
                        <button
                          onClick={() => setQrViewStudent(student)}
                          title={language === 'kh' ? 'កាតសិស្ស និងកូដ QR' : 'Student Card & QR Code'}
                          className="p-1.5 bg-white/40 backdrop-blur-sm border border-white/60 text-slate-600 rounded-lg hover:text-blue-600 hover:bg-white/80 transition inline-flex items-center cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-1.5 bg-white/40 backdrop-blur-sm border border-white/60 text-slate-600 rounded-lg hover:text-indigo-600 hover:bg-white/80 transition inline-flex items-center cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(language === 'kh' ? `តើអ្នកប្រាកដជាចង់លុបសិស្សឈ្មោះ ${student.name} នេះមែនទេ?` : `Are you sure you want to delete student ${student.name}?`)) {
                               onDeleteStudent(student.id);
                            }
                          }}
                          className="p-1.5 bg-white/40 backdrop-blur-sm border border-white/60 text-slate-600 hover:text-red-600 hover:bg-red-50/50 rounded-lg transition inline-flex items-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Collapsible Expanded View */}
                    {expandedStudentId === student.id && (() => {
                      const studentRecords = records.filter(r => r.studentId === student.id);
                      
                      const filteredHistory = studentRecords.filter(rec => {
                        const bk = books.find(b => b.id === rec.bookId);
                        const titleMatch = bk ? bk.title.toLowerCase().includes(historySearch.toLowerCase()) : false;
                        const barcodeMatch = bk ? bk.barcode.toLowerCase().includes(historySearch.toLowerCase()) : false;
                        const matchesSearch = !historySearch || titleMatch || barcodeMatch;

                        const matchesStatus = historyStatusFilter === 'all' || rec.status === historyStatusFilter;
                        return matchesSearch && matchesStatus;
                      });

                      const totalCount = studentRecords.length;
                      const borrowedCount = studentRecords.filter(r => r.status === 'borrowed').length;
                      const returnedCount = studentRecords.filter(r => r.status === 'returned').length;
                      const overdueCount = studentRecords.filter(r => r.status === 'overdue').length;
                      const lostCount = studentRecords.filter(r => r.status === 'lost').length;

                      const totalFines = studentRecords.reduce((sum, r) => sum + (r.fineAmount || 0), 0);
                      const pendingFines = studentRecords.reduce((sum, r) => sum + (!r.finePaid ? (r.fineAmount || 0) : 0), 0);

                      const tabs = [
                        { value: 'all', count: totalCount, labelKh: 'ទាំងអស់', labelEn: 'All' },
                        { value: 'borrowed', count: borrowedCount, labelKh: 'កំពុងខ្ចី', labelEn: 'Borrowed' },
                        { value: 'returned', count: returnedCount, labelKh: 'បានសង', labelEn: 'Returned' },
                        { value: 'overdue', count: overdueCount, labelKh: 'ហួសកំណត់', labelEn: 'Overdue' },
                        { value: 'lost', count: lostCount, labelKh: 'បាត់បង់', labelEn: 'Lost' },
                      ] as const;

                      return (
                        <tr className="bg-slate-50/40">
                          <td colSpan={7} className="px-6 py-5 border-t border-b border-slate-100">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-4">
                                {/* Header and Stats Cards */}
                                <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-white/60 p-4 rounded-2xl border border-slate-100 shadow-sm">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    {/* Student Photo and Camera Trigger */}
                                    <div className="relative group/avatar shrink-0">
                                      {student.photo ? (
                                        <img 
                                          src={student.photo} 
                                          alt={student.name} 
                                          className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-100 shadow-md group-hover/avatar:border-blue-400 transition"
                                        />
                                      ) : (
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black border-2 shadow-md ${
                                          student.gender === 'M' 
                                            ? 'bg-blue-100 border-blue-200 text-blue-700' 
                                            : 'bg-pink-100 border-pink-200 text-pink-700'
                                        }`}>
                                          {student.name.charAt(0)}
                                        </div>
                                      )}
                                      {/* Capture hover trigger overlay */}
                                      <button
                                        type="button"
                                        onClick={() => setPhotoTargetStudent(student)}
                                        className="absolute inset-0 bg-slate-900/60 text-white rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-150 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                                        title={language === 'kh' ? 'ថតរូបសិស្ស' : 'Take student photo'}
                                      >
                                        <Camera className="w-4 h-4 text-white" />
                                        <span className="text-[8px] font-black uppercase tracking-wider text-white">
                                          {language === 'kh' ? 'ថតរូប' : 'Photo'}
                                        </span>
                                      </button>
                                    </div>

                                    <div>
                                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <History className="w-4 h-4 text-blue-500" />
                                        {tExpanded.historyTitle}
                                      </h4>
                                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                        {language === 'kh' ? `កំណត់ត្រាខ្ចីរបស់សិស្ស ${student.name}` : `Borrowing logs for ${student.name}`}
                                      </p>
                                      {student.email && (
                                        <div className="mt-2 text-[11px] text-slate-600 bg-blue-50/55 border border-blue-100/50 px-2.5 py-1.5 rounded-xl inline-flex flex-wrap gap-x-4 gap-y-1 items-center">
                                          <span className="flex items-center gap-1">
                                            <Mail className="w-3 h-3 text-blue-500" />
                                            <strong className="font-bold text-slate-700">{language === 'kh' ? 'អ៊ីមែល៖' : 'Email:'}</strong>
                                            <span className="font-mono text-xs">{student.email}</span>
                                          </span>
                                          {student.password && (
                                            <span className="flex items-center gap-1">
                                              <Lock className="w-3 h-3 text-blue-500" />
                                              <strong className="font-bold text-slate-700">{language === 'kh' ? 'ពាក្យសម្ងាត់៖' : 'Password:'}</strong>
                                              <span className="font-mono text-xs bg-white/70 px-1 py-0.5 rounded border border-slate-100">{student.password}</span>
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {/* Camera Trigger Button */}
                                      <button
                                        type="button"
                                        onClick={() => setPhotoTargetStudent(student)}
                                        className="mt-2 inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-[10px] font-black text-blue-600 hover:text-blue-700 transition cursor-pointer shadow-sm animate-fade-in"
                                      >
                                        <Camera className="w-3.5 h-3.5 text-blue-500" />
                                        <span>{language === 'kh' ? 'ថតរូបសិស្ស' : 'Take Photo'}</span>
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Small Stats Badges */}
                                  <div className="flex flex-wrap gap-2">
                                    <div className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{tExpanded.totalBorrowed}</span>
                                      <span className="text-xs font-black text-blue-700 bg-white/80 px-1.5 py-0.5 rounded-lg border border-blue-200/30">
                                        {totalCount} {tExpanded.booksUnit}
                                      </span>
                                    </div>
                                    
                                    <div className="bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">{tExpanded.currentlyHolding}</span>
                                      <span className="text-xs font-black text-amber-700 bg-white/80 px-1.5 py-0.5 rounded-lg border border-amber-200/30">
                                        {borrowedCount + overdueCount} {tExpanded.booksUnit}
                                      </span>
                                    </div>
                                    
                                    <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                                        {language === 'kh' ? 'សៀវភៅបានសង' : 'Books Returned'}
                                      </span>
                                      <span className="text-xs font-black text-emerald-700 bg-white/80 px-1.5 py-0.5 rounded-lg border border-emerald-200/30">
                                        {returnedCount} {tExpanded.booksUnit}
                                      </span>
                                    </div>

                                    {overdueCount > 0 && (
                                      <div className="bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl flex items-center gap-2 animate-pulse">
                                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{tExpanded.overdueBooks}</span>
                                        <span className="text-xs font-black text-red-700 bg-white/80 px-1.5 py-0.5 rounded-lg border border-red-200/30">
                                          {overdueCount} {tExpanded.booksUnit}
                                        </span>
                                      </div>
                                    )}

                                    {totalFines > 0 && (
                                      <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 border ${pendingFines > 0 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{language === 'kh' ? 'ប្រាក់ពិន័យ' : 'Fines'}</span>
                                        <span className="text-xs font-black bg-white/80 px-1.5 py-0.5 rounded-lg border border-rose-200/30">
                                          ${pendingFines.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Search and Filtering inside Student History */}
                                {studentRecords.length > 0 && (
                                  <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white/40 p-3 rounded-2xl border border-slate-100">
                                    {/* Sub status filter tabs */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {tabs.map((tab) => {
                                        const isActive = historyStatusFilter === tab.value;
                                        return (
                                          <button
                                            key={tab.value}
                                            type="button"
                                            onClick={() => setHistoryStatusFilter(tab.value)}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-2 cursor-pointer ${
                                              isActive 
                                                ? 'bg-blue-600 text-white shadow-sm' 
                                                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/40'
                                            }`}
                                          >
                                            <span>{language === 'kh' ? tab.labelKh : tab.labelEn}</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                                              isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                              {tab.count}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Sub search input */}
                                    <div className="relative w-full md:w-64">
                                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                                      <input
                                        type="text"
                                        value={historySearch}
                                        onChange={(e) => setHistorySearch(e.target.value)}
                                        placeholder={language === 'kh' ? 'ស្វែងរកចំណងជើង ឬបារកូដ...' : 'Search title or barcode...'}
                                        className="w-full pl-8 pr-4 py-1.5 bg-white border border-slate-200 focus:border-slate-300 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition"
                                      />
                                      {historySearch && (
                                        <button
                                          type="button"
                                          onClick={() => setHistorySearch('')}
                                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Records Table */}
                                {filteredHistory.length > 0 ? (
                                  <div className="bg-white/80 border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-100 text-left">
                                      <thead className="bg-slate-50">
                                        <tr>
                                          <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">{tExpanded.bookTitle}</th>
                                          <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">{tExpanded.barcode}</th>
                                          <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">{tExpanded.borrowDate}</th>
                                          <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">{tExpanded.dueDate}</th>
                                          <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">{tExpanded.returnDate}</th>
                                          <th className="px-4 py-2 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">{tExpanded.status}</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                        {filteredHistory
                                          .sort((a, b) => b.borrowDate.localeCompare(a.borrowDate))
                                          .map((rec) => {
                                            const bk = books.find(b => b.id === rec.bookId);
                                            return (
                                              <tr key={rec.id} className="hover:bg-slate-50/50 transition">
                                                <td className="px-4 py-2.5 font-bold text-slate-800">
                                                  {bk?.title || 'Unknown Book'}
                                                </td>
                                                <td className="px-4 py-2.5 font-mono text-slate-500 font-bold">
                                                  {bk?.barcode || '-'}
                                                </td>
                                                <td className="px-4 py-2.5 font-mono text-slate-600">
                                                  <span className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {rec.borrowDate}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2.5 font-mono text-slate-600">
                                                  <span className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    {rec.dueDate}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2.5 font-mono">
                                                  {rec.returnDate ? (
                                                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                                      {rec.returnDate}
                                                    </span>
                                                  ) : (
                                                    <span className="text-slate-400 italic font-medium">{tExpanded.notReturned}</span>
                                                  )}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-black">
                                                  <div className="flex flex-col items-end gap-1">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] border ${
                                                      rec.status === 'returned'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        : rec.status === 'overdue'
                                                        ? 'bg-red-50 text-red-700 border-red-100'
                                                        : rec.status === 'lost'
                                                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-100'
                                                    }`}>
                                                      {rec.status === 'returned'
                                                        ? (language === 'kh' ? 'បានសង' : 'Returned')
                                                        : rec.status === 'overdue'
                                                        ? (language === 'kh' ? 'ហួសកំណត់' : 'Overdue')
                                                        : rec.status === 'lost'
                                                        ? (language === 'kh' ? 'បាត់បង់' : 'Lost')
                                                        : (language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed')
                                                      }
                                                    </span>
                                                    {rec.fineAmount && rec.fineAmount > 0 ? (
                                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border mt-0.5 ${
                                                        rec.finePaid 
                                                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                                          : 'bg-rose-50 border-rose-100 text-rose-600'
                                                      }`}>
                                                        ${rec.fineAmount.toFixed(2)} ({rec.finePaid ? (language === 'kh' ? 'បានបង់' : 'Paid') : (language === 'kh' ? 'មិនទាន់បង់' : 'Unpaid')})
                                                      </span>
                                                    ) : null}
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="bg-white/50 border border-slate-200/60 rounded-2xl p-6 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-2">
                                    <AlertCircle className="w-8 h-8 text-slate-300" />
                                    {studentRecords.length > 0 
                                      ? (language === 'kh' ? 'គ្មានកំណត់ត្រាត្រូវគ្នានឹងការស្វែងរក ឬតម្រងឡើយ' : 'No records match the current search or filter.')
                                      : tExpanded.noHistory}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      );
                    })()}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-bold text-xs">
                    {language === 'kh' ? 'មិនរកឃើញសិស្សតាមការស្វែងរកឡើយ' : 'No students found matching your criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Google Contacts Importer Modal Overlay */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-heavy rounded-3xl max-w-2xl w-full shadow-2xl border border-white/80 overflow-hidden transform transition duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/40 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    {language === 'kh' ? 'នាំចូលសិស្សពី Google Contacts' : 'Import from Google Contacts'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {language === 'kh' ? 'ជ្រើសរើសទំនាក់ទំនង និងកំណត់ថ្នាក់រៀនសម្រាប់ពួកគេ' : 'Select Google contacts and map them to school classes'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 rounded-full p-1 bg-white/40 hover:bg-white/70 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 flex flex-col min-h-0">
              {isFetchingContacts ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-500 animate-pulse">
                    {language === 'kh' ? 'កំពុងទាញយកទំនាក់ទំនងពី Google...' : 'Retrieving your Google Contacts...'}
                  </p>
                </div>
              ) : importError ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto gap-3">
                  <AlertCircle className="w-10 h-10 text-rose-500" />
                  <p className="text-xs font-bold text-rose-600">
                    {importError}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenImportModal}
                    className="mt-2 px-4 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    {language === 'kh' ? 'ព្យាយាមម្តងទៀត' : 'Retry'}
                  </button>
                </div>
              ) : googleContacts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto gap-3">
                  <Plus className="w-10 h-10 text-slate-300" />
                  <p className="text-xs font-bold text-slate-500">
                    {language === 'kh' ? 'រកមិនឃើញទំនាក់ទំនងនៅក្នុងគណនី Google របស់អ្នកទេ' : 'No connections or contacts found in your Google account.'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    {language === 'kh' 
                      ? 'សូមប្រាកដថាគណនី Google របស់អ្នកមានទំនាក់ទំនងរក្សាទុកនៅក្នុង Google Contacts ឬជ្រើសរើសគណនីផ្សេង។'
                      : 'Please check that your signed-in account actively has contacts stored in contacts.google.com.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenImportModal}
                    className="mt-2 px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    {language === 'kh' ? 'ទាញយកឡើងវិញ' : 'Refresh Connections'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Configuration Controls */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-4 shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Assign Class / Grade */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          {language === 'kh' ? 'កំណត់ថ្នាក់រៀនសម្រាប់សិស្សថ្មី' : 'Class/Grade for New Students'} <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={importClassGrade}
                          onChange={(e) => setImportClassGrade(e.target.value)}
                          className="px-3 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition bg-white border border-slate-200 font-bold"
                        >
                          {['10A', '10B', '10C', '11A', '11B', '11C', '12A', '12B', '12C'].map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      {/* Search / Filter Contacts */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          {language === 'kh' ? 'ស្វែងរកទំនាក់ទំនង' : 'Filter Contacts'}
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={contactsSearchTerm}
                            onChange={(e) => setContactsSearchTerm(e.target.value)}
                            placeholder={language === 'kh' ? 'ស្វែងរកតាមឈ្មោះ ឬលេខទូរស័ព្ទ...' : 'Search by name or phone...'}
                            className="pl-9 pr-3.5 py-1.5 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition bg-white border border-slate-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Advanced Import & Sync Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/30 gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setImportTab('all')}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition ${
                          importTab === 'all'
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                        }`}
                      >
                        {language === 'kh' ? 'ទាំងអស់' : 'All'} ({googleContacts.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportTab('new')}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition ${
                          importTab === 'new'
                            ? 'bg-white text-emerald-700 shadow-sm'
                            : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50/50'
                        }`}
                      >
                        {language === 'kh' ? 'សិស្សថ្មី' : 'New Only'} ({googleContacts.filter(c => !students.find(s => s.name.trim().toLowerCase() === c.name.trim().toLowerCase())).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportTab('sync')}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition ${
                          importTab === 'sync'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-slate-500 hover:text-blue-700 hover:bg-slate-50/50'
                        }`}
                      >
                        {language === 'kh' ? 'សិស្សចាស់ដែលអាចធ្វើបច្ចុប្បន្នភាព' : 'Syncable Matches'} ({googleContacts.filter(c => !!students.find(s => s.name.trim().toLowerCase() === c.name.trim().toLowerCase())).length})
                      </button>
                    </div>

                    {/* Select Utilities */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                      <span className="text-[10px] font-bold text-slate-500">
                        {language === 'kh' 
                          ? `បានជ្រើសរើសទំនាក់ទំនងចំនួន ${selectedContactIds.length} នាក់` 
                          : `Selected ${selectedContactIds.length} contact(s) to import/sync`}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            let list = googleContacts;
                            if (importTab === 'new') {
                              list = googleContacts.filter(c => !students.find(s => s.name.trim().toLowerCase() === c.name.trim().toLowerCase()));
                            } else if (importTab === 'sync') {
                              list = googleContacts.filter(c => !!students.find(s => s.name.trim().toLowerCase() === c.name.trim().toLowerCase()));
                            }
                            const filtered = list
                              .filter(c => c.name.toLowerCase().includes(contactsSearchTerm.toLowerCase()) || c.phoneNumber.includes(contactsSearchTerm))
                              .map(c => c.id);
                            handleSelectAllContacts(filtered);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          {selectedContactIds.length > 0 && selectedContactIds.length === googleContacts.length
                            ? (language === 'kh' ? 'ដកការជ្រើសរើសទាំងអស់' : 'Deselect All')
                            : (language === 'kh' ? 'ជ្រើសរើសទាំងអស់' : 'Select All')}
                        </button>
                        <button
                          type="button"
                          onClick={() => fetchGoogleContacts(googleAccessToken!)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>{language === 'kh' ? 'ធ្វើបច្ចុប្បន្នភាព' : 'Refresh'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Contacts List Grid */}
                  <div className="flex-1 min-h-0 border border-slate-100 rounded-2xl overflow-hidden bg-white/50">
                    <div className="overflow-y-auto max-h-[300px] divide-y divide-slate-100">
                      {googleContacts
                        .filter(c => {
                          const isMatched = !!students.find(s => s.name.trim().toLowerCase() === c.name.trim().toLowerCase());
                          if (importTab === 'new' && isMatched) return false;
                          if (importTab === 'sync' && !isMatched) return false;
                          return c.name.toLowerCase().includes(contactsSearchTerm.toLowerCase()) || c.phoneNumber.includes(contactsSearchTerm);
                        })
                        .map((c) => {
                          const isSelected = selectedContactIds.includes(c.id);
                          const matchedStudent = students.find(s => s.name.trim().toLowerCase() === c.name.trim().toLowerCase());
                          return (
                            <div
                              key={c.id}
                              onClick={() => handleToggleSelectContact(c.id)}
                              className={`flex items-center justify-between p-3 transition cursor-pointer ${
                                isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // handled by div onClick
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer shrink-0"
                                />
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs font-black text-slate-800">{c.name}</p>
                                    {matchedStudent ? (
                                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded text-[8px] font-black uppercase tracking-wider">
                                        <RefreshCw className="w-2 h-2 shrink-0 animate-spin-slow" />
                                        {language === 'kh' ? `សមកាលកម្ម (${matchedStudent.studentId})` : `Syncable (${matchedStudent.studentId})`}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase tracking-wider">
                                        <UserPlus className="w-2 h-2 shrink-0" />
                                        {language === 'kh' ? 'ថ្មី' : 'New'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400 font-medium font-mono mt-0.5">
                                    {c.phoneNumber && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-2.5 h-2.5 shrink-0" />
                                        {c.phoneNumber}
                                      </span>
                                    )}
                                    {c.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="w-2.5 h-2.5 shrink-0" />
                                        {c.email}
                                      </span>
                                    )}
                                    <span className="capitalize">
                                      {language === 'kh' 
                                        ? (c.gender === 'F' ? 'ស្រី' : 'ប្រុស') 
                                        : (c.gender === 'F' ? 'Female' : 'Male')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      {googleContacts.filter(c => {
                        const isMatched = !!students.find(s => s.name.trim().toLowerCase() === c.name.trim().toLowerCase());
                        if (importTab === 'new' && isMatched) return false;
                        if (importTab === 'sync' && !isMatched) return false;
                        return c.name.toLowerCase().includes(contactsSearchTerm.toLowerCase()) || c.phoneNumber.includes(contactsSearchTerm);
                      }).length === 0 && (
                        <p className="text-center py-8 text-slate-400 font-bold text-xs">
                          {language === 'kh' ? 'រកមិនឃើញទំនាក់ទំនងដែលត្រូវគ្នាទេ' : 'No matching contacts found.'}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            {!isFetchingContacts && googleContacts.length > 0 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  {language === 'kh' ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={selectedContactIds.length === 0}
                  onClick={handleImportSelectedContacts}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-55 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer"
                >
                  {language === 'kh' 
                    ? `នាំចូល និងសមកាលកម្ម (${selectedContactIds.length})` 
                    : `Import & Sync (${selectedContactIds.length})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-heavy rounded-3xl max-w-md w-full shadow-2xl border border-white/80 overflow-hidden transform transition duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/40 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {isEditMode 
                  ? (language === 'kh' ? 'កែសម្រួលព័ត៌មានសិស្ស' : 'Edit Student Info')
                  : (language === 'kh' ? 'ចុះឈ្មោះសិស្សថ្មី' : 'Register New Student')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 rounded-full p-1 bg-white/40 hover:bg-white/70 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.fullName} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserPlus className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={language === 'kh' ? 'បញ្ចូលឈ្មោះពេញរបស់សិស្ស' : 'Enter full name'}
                    className="pl-9 pr-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.gender}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('M')}
                      className={`py-2 text-center text-sm font-bold rounded-xl border transition cursor-pointer ${
                        gender === 'M' 
                          ? 'bg-blue-100/50 border-blue-400 text-blue-700 shadow-sm shadow-blue-500/10' 
                          : 'border-white/60 bg-white/20 text-slate-600 hover:bg-white/40'
                      }`}
                    >
                      {t.male}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('F')}
                      className={`py-2 text-center text-sm font-bold rounded-xl border transition cursor-pointer ${
                        gender === 'F' 
                          ? 'bg-pink-100/50 border-pink-400 text-pink-700 shadow-sm shadow-pink-500/10' 
                          : 'border-white/60 bg-white/20 text-slate-600 hover:bg-white/40'
                      }`}
                    >
                      {t.female}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.classGrade} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Award className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      required
                      value={classGrade}
                      onChange={(e) => setClassGrade(e.target.value)}
                      placeholder="e.g. 12A, 11B"
                      className="pl-9 pr-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm uppercase font-mono focus:outline-none transition glass-input"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.phone}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 012 345 678"
                    className="pl-9 pr-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm font-mono focus:outline-none transition glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'kh' ? 'អ៊ីមែល' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. student@school.edu.kh"
                      className="pl-9 pr-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm font-mono focus:outline-none transition glass-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'kh' ? 'ពាក្យសម្ងាត់' : 'Password'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={language === 'kh' ? 'បញ្ចូលពាក្យសម្ងាត់' : 'Enter password'}
                      className="pl-9 pr-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm font-mono focus:outline-none transition glass-input"
                    />
                  </div>
                </div>
              </div>

              {/* ID auto generation notice */}
              {!isEditMode && (
                <div className="bg-blue-50/60 backdrop-blur rounded-xl p-3 text-xs text-blue-800 font-bold border border-white/40 flex items-center gap-2">
                  <span className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700 font-extrabold uppercase font-mono">AUTO</span>
                  <span>
                    {language === 'kh' 
                      ? 'អត្តសញ្ញាណសិស្ស (Student ID) នឹងត្រូវបានបង្កើតដោយស្វ័យប្រវត្តិតាមថ្នាក់!' 
                      : 'Student ID will be automatically generated depending on grade index!'}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-white/60 hover:bg-white/40 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer bg-white/20 backdrop-blur"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-500/10"
                >
                  <Save className="w-3.5 h-3.5" />
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Card & QR Code Preview Modal Overlay */}
      {qrViewStudent && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-heavy rounded-3xl max-w-sm w-full shadow-2xl border border-white/80 overflow-hidden transform transition duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/40 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {language === 'kh' ? 'កាតសិស្ស និងកូដ QR' : 'Student Card & QR Code'}
              </h3>
              <button
                onClick={() => setQrViewStudent(null)}
                className="text-slate-500 hover:text-slate-800 rounded-full p-1 bg-white/40 hover:bg-white/70 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Card Body */}
            <div className="p-8 flex flex-col items-center justify-center text-center">
              {/* Actual Library Card Layout for Student */}
              <div className="w-full max-w-[280px] bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/50 rounded-2xl p-6 flex flex-col items-center shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-lg pointer-events-none" />
                
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">{t.schoolName}</span>
                <span className="text-[10px] text-blue-600 font-black tracking-wider uppercase mt-0.5">
                  {language === 'kh' ? 'កាតបណ្ណាល័យសិស្ស' : 'Student Library Card'}
                </span>
                
                {/* Avatar */}
                <div className={`w-14 h-14 rounded-full mt-4 flex items-center justify-center text-lg font-black border-2 shadow-sm ${
                  qrViewStudent.gender === 'M' 
                    ? 'bg-blue-100 border-blue-300 text-blue-700' 
                    : 'bg-pink-100 border-pink-300 text-pink-700'
                }`}>
                  {qrViewStudent.name.charAt(0)}
                </div>

                <h4 className="mt-2.5 font-extrabold text-slate-800 text-base">{qrViewStudent.name}</h4>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                  {language === 'kh' ? `ថ្នាក់ទី៖ ${qrViewStudent.classGrade}` : `Class Grade: ${qrViewStudent.classGrade}`}
                </p>

                {/* QR Code image */}
                <div className="border border-white/80 p-2.5 rounded-xl shadow-inner bg-white mt-4 flex items-center justify-center">
                  {studentQrCodeUrl ? (
                    <img 
                      src={studentQrCodeUrl} 
                      alt="Student ID QR" 
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <div className="w-36 h-36 bg-slate-100/50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-[10px] font-bold">
                      {language === 'kh' ? 'កំពុងបង្កើត QR...' : 'Generating QR...'}
                    </div>
                  )}
                </div>

                <span className="mt-3.5 font-mono font-black text-[11px] text-slate-700 bg-slate-200/50 border border-slate-300/40 px-3 py-1 rounded-xl">
                  {qrViewStudent.studentId}
                </span>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-white/30 backdrop-blur-md border-t border-white/40 flex justify-end gap-2">
              <button
                onClick={() => setQrViewStudent(null)}
                className="px-4 py-2 border border-white/60 hover:bg-white/40 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer bg-white/20 backdrop-blur"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handlePrintStudentCard(qrViewStudent)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-500/10"
              >
                <Printer className="w-3.5 h-3.5" />
                {language === 'kh' ? 'បោះពុម្ពកាតសិស្ស' : 'Print Card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hover Tooltip Popup */}
      <AnimatePresence>
        {hoveredStudent && hoverAnchor && (() => {
          const studentRecords = records.filter(r => r.studentId === hoveredStudent.id);
          const activeRecords = studentRecords.filter(r => r.status === 'borrowed' || r.status === 'overdue');
          const overdueRecords = studentRecords.filter(r => r.status === 'overdue');
          const totalBorrowed = studentRecords.length;
          
          const tT = tooltipTranslations[language];

          // Calculate horizontal centering or alignment
          const tooltipWidth = 320;
          const leftPos = Math.max(
            16,
            Math.min(
              window.innerWidth - tooltipWidth - 16,
              hoverAnchor.left + (hoverAnchor.width / 2) - (tooltipWidth / 2)
            )
          );

          // Calculate top/bottom placement to avoid offscreen
          const tooltipHeight = 240; // safe estimation
          const showAbove = hoverAnchor.bottom + tooltipHeight > window.innerHeight;
          const topPos = showAbove 
            ? hoverAnchor.top - tooltipHeight - 8 
            : hoverAnchor.bottom + 8;

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: showAbove ? 5 : -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: showAbove ? 5 : -5 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 p-4 w-80 text-left pointer-events-none text-slate-800"
              style={{
                top: `${topPos}px`,
                left: `${leftPos}px`,
              }}
            >
              {/* Tooltip Header */}
              <div className="border-b border-slate-100 pb-2 mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      {hoveredStudent.name}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {hoveredStudent.studentId} • Grade {hoveredStudent.classGrade}
                    </span>
                  </div>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border leading-none ${
                    hoveredStudent.gender === 'M' 
                      ? 'bg-blue-50 text-blue-700 border-blue-100' 
                      : 'bg-pink-50 text-pink-700 border-pink-100'
                  }`}>
                    {hoveredStudent.gender === 'M' ? t.male : t.female}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-1.5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{tT.totalBorrowed}</p>
                  <p className="text-sm font-black text-slate-700">{totalBorrowed}</p>
                </div>
                <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-1.5">
                  <p className="text-[8px] font-black text-blue-500 uppercase tracking-wider">{tT.borrowed}</p>
                  <p className="text-sm font-black text-blue-700">{activeRecords.length - overdueRecords.length}</p>
                </div>
                <div className={`${overdueRecords.length > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-150'} rounded-xl p-1.5`}>
                  <p className={`text-[8px] font-black uppercase tracking-wider ${overdueRecords.length > 0 ? 'text-red-500' : 'text-slate-400'}`}>{tT.overdue}</p>
                  <p className={`text-sm font-black ${overdueRecords.length > 0 ? 'text-red-700' : 'text-slate-700'}`}>{overdueRecords.length}</p>
                </div>
              </div>

              {/* Active Borrowings details */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                  {tT.currentlyBorrowing}
                </p>
                {activeRecords.length > 0 ? (
                  activeRecords.map((rec) => {
                    const bk = books.find(b => b.id === rec.bookId);
                    const isOverdue = rec.status === 'overdue';
                    return (
                      <div key={rec.id} className="flex items-start gap-2 bg-slate-50/50 border border-slate-100 rounded-xl p-2">
                        <BookOpen className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isOverdue ? 'text-red-500' : 'text-blue-500'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-700 truncate leading-snug">
                            {bk?.title || 'Unknown Book'}
                          </p>
                          <p className={`text-[9px] font-bold mt-0.5 flex items-center gap-1 leading-none ${isOverdue ? 'text-red-600' : 'text-slate-400'}`}>
                            {isOverdue ? (
                              <>
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                {tT.overdueSince} {rec.dueDate}
                              </>
                            ) : (
                              <>
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
                                {tT.dueOn} {rec.dueDate}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-slate-400 font-bold italic py-1">
                    {tT.noActiveBooks}
                  </p>
                )}
              </div>

              {/* Overdue alert banner */}
              {overdueRecords.length > 0 && (
                <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <p className="text-[9px] font-black text-red-700 leading-tight">
                    {tT.overdueAlert}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
