import React, { useState, useEffect } from 'react';
import { Book, Category, Student, BorrowRecord, User, Language, Role, WishlistItem } from './types';
import { defaultCategories, defaultBooks, defaultStudents, defaultBorrowRecords, defaultUsers, defaultRoles, defaultWishlist } from './data/defaultData';
import { translations } from './utils/translations';
import { motion, AnimatePresence } from 'motion/react';
import schoolLogo from './assets/images/school_logo_1783221279657.jpg';


// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import BookManagement from './components/BookManagement';
import StudentManagement from './components/StudentManagement';
import BorrowReturnSystem from './components/BorrowReturnSystem';
import Reports from './components/Reports';
import DeploymentCenter from './components/DeploymentCenter';
import RoleManagement from './components/RoleManagement';
import SettingsComponent from './components/Settings';
import GraphQLDeveloperHub from './components/GraphQLDeveloperHub';
import { useToast } from './context/ToastContext';
import CameraScanner from './components/CameraScanner';
import GlobalScanResultModal from './components/GlobalScanResultModal';

// Icons
import {
  Library,
  LayoutDashboard,
  BookMarked,
  Users2,
  ArrowRightLeft,
  FileBarChart2,
  DatabaseBackup,
  LogOut,
  Globe,
  Download,
  Upload,
  Shield,
  Menu,
  X,
  CloudLightning,
  Cloud,
  Scan,
  Camera,
  AlertTriangle,
  BookOpenCheck,
  CheckCircle,
  Check,
  Sparkles,
  AlertCircle,
  Search,
  Clock,
  Sun,
  Moon,
  Settings,
  Code
} from 'lucide-react';

export default function App() {
  const { showSuccess, showError, showInfo, showWarning } = useToast();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toKhmerDigits = (numStr: string | number): string => {
    const khmerNums = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return String(numStr).replace(/[0-9]/g, (w) => khmerNums[parseInt(w)]);
  };

  const getKhmerWeekday = (day: number) => {
    const days = ['ថ្ងៃអាទិត្យ', 'ថ្ងៃច័ន្ទ', 'ថ្ងៃអង្គារ', 'ថ្ងៃពុធ', 'ថ្ងៃព្រហស្បតិ៍', 'ថ្ងៃសុក្រ', 'ថ្ងៃសៅរ៍'];
    return days[day];
  };

  const getKhmerMonth = (month: number) => {
    const months = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
    return months[month];
  };

  const formatKhmerDate = (date: Date) => {
    const dayName = getKhmerWeekday(date.getDay());
    const dayNum = toKhmerDigits(date.getDate());
    const monthName = getKhmerMonth(date.getMonth());
    const yearNum = toKhmerDigits(date.getFullYear());
    return `${dayName} ទី${dayNum} ខែ${monthName} ឆ្នាំ${yearNum}`;
  };

  const formatEnglishDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date: Date, lang: 'kh' | 'en') => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    
    if (lang === 'kh') {
      const ampmKh = ampm === 'AM' ? 'ព្រឹក' : 'ល្ងាច';
      return `${toKhmerDigits(hoursStr)}:${toKhmerDigits(minutes)}:${toKhmerDigits(seconds)} ${ampmKh}`;
    } else {
      return `${hoursStr}:${minutes}:${seconds} ${ampm}`;
    }
  };

  // Localization: Default to Khmer for Hun Sen Andoung Meas HS!
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('library_lang');
    return (saved as Language) || 'kh';
  });

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const t = translations[language];

  // Dynamic School Info Settings (Configurable in Settings tab)
  const [cfgSchoolNameKh, setCfgSchoolNameKh] = useState(() => localStorage.getItem('cfg_school_name_kh') || 'វិទ្យាល័យ ហ៊ុន សែន អណ្តូងមាស');
  const [cfgSchoolNameEn, setCfgSchoolNameEn] = useState(() => localStorage.getItem('cfg_school_name_en') || 'Hun Sen Andoung Meas HS');

  useEffect(() => {
    const handleStorageChange = () => {
      setCfgSchoolNameKh(localStorage.getItem('cfg_school_name_kh') || 'វិទ្យាល័យ ហ៊ុន សែន អណ្តូងមាស');
      setCfgSchoolNameEn(localStorage.getItem('cfg_school_name_en') || 'Hun Sen Andoung Meas HS');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('library_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Database / Inventory State
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('library_categories');
    return saved ? JSON.parse(saved) : defaultCategories;
  });
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem('library_wishlist');
    return saved ? JSON.parse(saved) : defaultWishlist;
  });

  // Roles and users state
  const [roles, setRoles] = useState<Role[]>(() => {
    const saved = localStorage.getItem('library_roles');
    return saved ? JSON.parse(saved) : defaultRoles;
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('library_users');
    return saved ? JSON.parse(saved) : defaultUsers;
  });

  // Firebase integration indicators
  const [isCloud, setIsCloud] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  
  // Stubs for Firebase calls
  const auth = { currentUser: null };
  const db = {};
  const doc = (...args: any[]) => ({});
  const setDoc = async (...args: any[]) => {};
  const deleteDoc = async (...args: any[]) => {};
  const getDoc = (...args: any[]) => ({ exists: () => false, data: () => ({}) });
  const handleFirestoreError = (...args: any[]) => {};
  const OperationType = { LIST: 'LIST', WRITE: 'WRITE', DELETE: 'DELETE' };
  
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // Navigation View Router
  const [activeView, setActiveView] = useState<'dashboard' | 'books' | 'students' | 'borrow' | 'reports' | 'deploy' | 'roles' | 'analytics' | 'settings' | 'graphql'>('dashboard');
  const [bookSearchTerm, setBookSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // Mobile Navigation Drawer Toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Scanner States
  const [showGlobalScanner, setShowGlobalScanner] = useState(false);
  const [preselectedStudentId, setPreselectedStudentId] = useState<string>('');
  const [globalScannedResult, setGlobalScannedResult] = useState<{
    barcode: string;
    book: Book | null;
    mode: 'borrow' | 'return';
    studentId?: string;
    borrowRecord?: BorrowRecord | null;
    error?: string;
  } | null>(null);

  // Global Search State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showGlobalSearchResults, setShowGlobalSearchResults] = useState(false);
  const [selectedSearchBook, setSelectedSearchBook] = useState<Book | null>(null);

  // MySQL check, loader and Auto Save system
  const [isMysqlConnected, setIsMysqlConnected] = useState(true); // Default to true to enable writing to queue immediately
  const [mysqlError, setMysqlError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'saving' | 'saved' | 'offline' | 'syncing' | 'idle'>('saved');
  const [unsavedQueue, setUnsavedQueue] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('library_unsaved_changes') || '[]');
    } catch {
      return [];
    }
  });

  // Helper to parse API endpoints into entity type, ID, and action for the sync transaction queue
  const parseEndpoint = (endpoint: string, method: string, body?: any) => {
    const parts = endpoint.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    
    const entity = parts[1]; // 'books', 'students', 'records', etc.
    const id = parts[2] || (body ? body.id : null);
    
    let action: 'create' | 'update' | 'delete' = 'update';
    if (method === 'POST') action = 'create';
    else if (method === 'DELETE') action = 'delete';
    
    return { entity, action, id };
  };

  // Queue a change in local storage to prevent data loss in crash or offline states
  const queueMutation = (entity: string, action: 'create' | 'update' | 'delete', data: any) => {
    if (!entity || !action || !data) return;

    // High precision ID prevents duplicate synchronizations in multi-tab or network retries
    const mutationId = `${entity}-${action}-${data.id || data}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const newMutation = {
      id: mutationId,
      entity,
      action,
      data,
      timestamp: Date.now()
    };

    setUnsavedQueue(prev => {
      const entityId = data.id || data;
      // Optimistically deduplicate the queue: only sync the latest state of an active object
      const filtered = prev.filter(m => !(m.entity === entity && (m.data.id === entityId || m.data === entityId)));
      const updated = [...filtered, newMutation];
      localStorage.setItem('library_unsaved_changes', JSON.stringify(updated));
      return updated;
    });
    
    setSyncStatus('saving');
  };

  // Replaces standard fetch - intercepts writes and pipes them straight into the auto-save transaction queue
  const syncToMysql = async (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body?: any) => {
    const parsed = parseEndpoint(endpoint, method, body);
    if (!parsed) return;

    const { entity, action, id } = parsed;
    const data = action === 'delete' ? { id } : body;

    queueMutation(entity, action, data);
  };

  // Batch-syncs all outstanding local modifications to MySQL in a single database transaction
  const flushSyncQueue = async (customQueue?: any[]) => {
    const queueToFlush = customQueue || unsavedQueue;
    if (queueToFlush.length === 0) {
      setSyncStatus('saved');
      return;
    }
    
    setSyncStatus('saving');
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutations: queueToFlush })
      });
      const result = await res.json();
      if (result.success) {
        setSyncStatus('saved');
        setUnsavedQueue(prev => {
          // Filter out synced mutations
          const remaining = prev.filter(m => !result.syncedIds.includes(m.id));
          localStorage.setItem('library_unsaved_changes', JSON.stringify(remaining));
          return remaining;
        });
      } else {
        console.error("Auto Save Sync error:", result.error);
        setSyncStatus('offline');
      }
    } catch (err) {
      console.error("Auto Save Sync network exception:", err);
      setSyncStatus('offline');
    }
  };

  // Fallback to offline localStorage state when database is unreachable
  const loadLocalStorageFallbacks = () => {
    try {
      const savedBooks = localStorage.getItem('library_books');
      const savedStudents = localStorage.getItem('library_students');
      const savedRecords = localStorage.getItem('library_records');
      const savedCategories = localStorage.getItem('library_categories');
      const savedRoles = localStorage.getItem('library_roles');
      const savedUsers = localStorage.getItem('library_users');
      const savedWishlist = localStorage.getItem('library_wishlist');

      setBooks(savedBooks ? JSON.parse(savedBooks) : defaultBooks);
      setStudents(savedStudents ? JSON.parse(savedStudents) : defaultStudents);
      setRecords(savedRecords ? JSON.parse(savedRecords) : defaultBorrowRecords);
      setCategories(savedCategories ? JSON.parse(savedCategories) : defaultCategories);
      setRoles(savedRoles ? JSON.parse(savedRoles) : defaultRoles);
      setUsers(savedUsers ? JSON.parse(savedUsers) : defaultUsers);
      setWishlist(savedWishlist ? JSON.parse(savedWishlist) : defaultWishlist);
    } catch (err) {
      console.error("Failed to load local storage fallbacks:", err);
    }
  };

  // Loads core MySQL datasets and automatically restores/applies any local unsaved changes on top
  const loadMysqlData = async () => {
    try {
      const res = await fetch('/api/mysql-status');
      const data = await res.json();
      if (data.connected) {
        setIsMysqlConnected(true);
        setDbLoading(true);
        try {
          const [catsRes, booksRes, studentsRes, recordsRes, wishlistRes, rolesRes, usersRes] = await Promise.all([
            fetch('/api/categories').then(r => r.json()),
            fetch('/api/books').then(r => r.json()),
            fetch('/api/students').then(r => r.json()),
            fetch('/api/records').then(r => r.json()),
            fetch('/api/wishlist').then(r => r.json()),
            fetch('/api/roles').then(r => r.json()),
            fetch('/api/users').then(r => r.json()),
          ]);

          // Fetch local pending mutations to overlay on top of database snapshot
          const pending = JSON.parse(localStorage.getItem('library_unsaved_changes') || '[]');
          
          const applyMutations = (dbList: any[], entity: string) => {
            let list = Array.isArray(dbList) ? [...dbList] : [];
            pending.forEach((m: any) => {
              if (m.entity === entity) {
                if (m.action === 'create') {
                  list = [m.data, ...list.filter(item => item.id !== m.data.id)];
                } else if (m.action === 'update') {
                  list = list.map(item => item.id === m.data.id ? m.data : item);
                  if (!list.some(item => item.id === m.data.id)) {
                    list.push(m.data);
                  }
                } else if (m.action === 'delete') {
                  const idToDelete = m.data?.id || m.data;
                  list = list.filter(item => item.id !== idToDelete);
                }
              }
            });
            return list;
          };

          setCategories(applyMutations(catsRes, 'categories'));
          setBooks(applyMutations(booksRes, 'books'));
          setStudents(applyMutations(studentsRes, 'students'));
          setRecords(applyMutations(recordsRes, 'records'));
          setWishlist(applyMutations(wishlistRes, 'wishlist'));
          setRoles(applyMutations(rolesRes, 'roles'));
          setUsers(applyMutations(usersRes, 'users'));
          setMysqlError(null);
        } catch (err) {
          console.error("Failed to load MySQL data, utilizing offline fallbacks.", err);
          loadLocalStorageFallbacks();
        } finally {
          setDbLoading(false);
        }
      } else {
        setIsMysqlConnected(false); // Utilise offline fallback or Firebase when MySQL is not connected
        setSyncStatus('offline');
        setMysqlError(data.error);
        loadLocalStorageFallbacks();
      }
    } catch (err: any) {
      setIsMysqlConnected(false);
      setSyncStatus('offline');
      setMysqlError(err.message || 'Failed to contact database status API');
      loadLocalStorageFallbacks();
    }
  };

  const handleNotifyStudent = (student: Student, studentRecs: BorrowRecord[], studentBooks: Book[]) => {
    const subject = language === 'kh'
      ? `លិខិតរំលឹក៖ ការហួសកំណត់សងសៀវភៅបណ្ណាល័យ - ${student.name}`
      : `Library Overdue Notice: ${student.name} (${student.studentId})`;
    
    const bookDetailsStr = studentRecs.map((rec, i) => {
      const b = studentBooks[i];
      return `- ${b ? b.title : 'Book'} (Due Date: ${rec.dueDate})`;
    }).join('\n');

    const body = language === 'kh'
      ? `សូមជម្រាបសួរ ${student.name},

នេះជាលិខិតរំលឹកពីបណ្ណាល័យវិទ្យាល័យ ហ៊ុន សែន អណ្តូងមាស។ សៀវភៅខាងក្រោមដែលអ្នកបានខ្ចីគឺហួសកាលកំណត់សងហើយ៖
${bookDetailsStr}

សូមយកមកសងបណ្ណាល័យវិញឱ្យបានឆាប់បំផុត ដើម្បីចៀសវាងការបង់ប្រាក់ពិន័យបន្ថែម។

ដោយសេចក្តីគោរព,
បណ្ណារក្សសាលា`
      : `Dear ${student.name},

This is a friendly reminder from the library of Hun Sen Andoung Meas High School. The following book(s) you borrowed are currently overdue:
${bookDetailsStr}

Please return them to the library as soon as possible to avoid further late fee charges.

Best regards,
School Librarian`;

    window.location.href = `mailto:${student.studentId.toLowerCase()}@school.edu.kh?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  useEffect(() => {
    loadMysqlData();
  }, []);

  // Timer 1: Auto-save modifications every 5 seconds
  useEffect(() => {
    if (unsavedQueue.length === 0) {
      setSyncStatus('saved');
      return;
    }

    const timer = setTimeout(() => {
      flushSyncQueue();
    }, 5000);

    return () => clearTimeout(timer);
  }, [unsavedQueue]);

  // Timer 2: Flush immediate updates when active view / page transitions
  useEffect(() => {
    if (unsavedQueue.length > 0) {
      flushSyncQueue();
    }
  }, [activeView]);

  // Timer 3: Safe backup save on page close or tab dismissal with browser keepalive
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedQueue.length > 0) {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mutations: unsavedQueue }),
          keepalive: true
        });
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedQueue]);

  // Timer 4: Re-connection listener to auto-sync offline data
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('syncing');
      loadMysqlData().then(() => {
        flushSyncQueue();
      });
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [unsavedQueue]);

  // Interval check to reconnect database state automatically
  useEffect(() => {
    const interval = setInterval(() => {
      if (syncStatus === 'offline') {
        loadMysqlData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [syncStatus]);

  // Sync state with localStorage on change
  useEffect(() => {
    localStorage.setItem('library_lang', language);
  }, [language]);

  // Firebase auth & data listeners (REMOVED)
  useEffect(() => {
    // Firebase removed.
  }, []);

  // Sync state to local storage ONLY if not in cloud mode (avoid conflict with firestore)
  useEffect(() => {
    if (!isCloud) {
      localStorage.setItem('library_books', JSON.stringify(books));
    }
  }, [books, isCloud]);

  useEffect(() => {
    if (!isCloud) {
      localStorage.setItem('library_students', JSON.stringify(students));
    }
  }, [students, isCloud]);

  useEffect(() => {
    if (!isCloud) {
      localStorage.setItem('library_records', JSON.stringify(records));
    }
  }, [records, isCloud]);

  useEffect(() => {
    if (!isCloud) {
      localStorage.setItem('library_categories', JSON.stringify(categories));
    }
  }, [categories, isCloud]);

  useEffect(() => {
    if (!isCloud) {
      localStorage.setItem('library_roles', JSON.stringify(roles));
    }
  }, [roles, isCloud]);

  useEffect(() => {
    if (!isCloud) {
      localStorage.setItem('library_users', JSON.stringify(users));
    }
  }, [users, isCloud]);

  useEffect(() => {
    if (!isCloud) {
      localStorage.setItem('library_wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, isCloud]);

  // Resolve current user's permissions
  const currentPermissions = (() => {
    if (!currentUser) {
      return {
        manageBooks: false,
        manageStudents: false,
        borrowReturn: false,
        viewReports: false,
        manageRoles: false,
        systemBackup: false
      };
    }
    // Admin has absolute permissions
    if (currentUser.role === 'admin') {
      return {
        manageBooks: true,
        manageStudents: true,
        borrowReturn: true,
        viewReports: true,
        manageRoles: true,
        systemBackup: true
      };
    }
    const roleObj = roles.find(r => r.id === currentUser.role);
    return roleObj?.permissions || {
      manageBooks: false,
      manageStudents: false,
      borrowReturn: false,
      viewReports: false,
      manageRoles: false,
      systemBackup: false
    };
  })();

  // Role Management handlers
  const handleAddRole = async (newRole: Role) => {
    setRoles(prev => [...prev, newRole]);
    showSuccess(
      language === 'kh' 
        ? `បានបង្កើតតួនាទីថ្មី "${newRole.nameKh}" ដោយជោគជ័យ!` 
        : `Role "${newRole.nameEn}" created successfully!`
    );
    if (isMysqlConnected) {
      await syncToMysql('/api/roles', 'POST', newRole);
    }
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'roles', newRole.id), newRole);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `roles/${newRole.id}`);
      }
    }
  };

  const handleUpdateRole = async (updatedRole: Role) => {
    setRoles(prev => prev.map(r => r.id === updatedRole.id ? updatedRole : r));
    if (isMysqlConnected) {
      await syncToMysql(`/api/roles/${updatedRole.id}`, 'PUT', updatedRole);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    setRoles(prev => prev.filter(r => r.id !== roleId));
    showSuccess(
      language === 'kh' 
        ? 'បានលុបតួនាទីដោយជោគជ័យ!' 
        : 'Role deleted successfully!'
    );
    if (isMysqlConnected) {
      await syncToMysql(`/api/roles/${roleId}`, 'DELETE');
    }
  };

  const handleUpdateUserRole = async (userId: string, roleId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: roleId } : u));
    
    // Also update current operator's session role if they changed their own
    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, role: roleId };
      setCurrentUser(updatedUser);
      localStorage.setItem('library_user', JSON.stringify(updatedUser));
    }

    showSuccess(
      language === 'kh' 
        ? 'បានធ្វើបច្ចុប្បន្នភាពតួនាទីសមាជិកដោយជោគជ័យ!' 
        : 'User role updated successfully!'
    );

    if (isMysqlConnected) {
      const targetUser = users.find(u => u.id === userId);
      if (targetUser) {
        await syncToMysql(`/api/users/${userId}`, 'PUT', { ...targetUser, role: roleId });
      }
    }

    if (auth.currentUser) {
      try {
        const userDocRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const uData = userSnap.data() as User;
          await setDoc(userDocRef, { ...uData, role: roleId });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
      }
    }
  };

  const handleUpdateUserName = async (userId: string, newName: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, name: newName } : u));
    
    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, name: newName };
      setCurrentUser(updatedUser);
      localStorage.setItem('library_user', JSON.stringify(updatedUser));
    }

    showSuccess(
      language === 'kh' 
        ? 'បានធ្វើបច្ចុប្បន្នភាពឈ្មោះដោយជោគជ័យ!' 
        : 'User name updated successfully!'
    );

    if (isMysqlConnected) {
      const targetUser = users.find(u => u.id === userId);
      if (targetUser) {
        await syncToMysql(`/api/users/${userId}`, 'PUT', { ...targetUser, name: newName });
      }
    }
  };

  // Actions
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('library_user', JSON.stringify(user));
    setActiveView('dashboard');
  };

  const handleGoogleLogin = async () => {
    showError(language === 'kh' ? 'មុខងារនេះត្រូវបានបិទ' : 'This feature is disabled');
  };

  const handleConnectGoogle = async (): Promise<string | null> => {
    showError(language === 'kh' ? 'មុខងារនេះត្រូវបានបិទ' : 'This feature is disabled');
    return null;
  };

  const handleLogout = async () => {
    if (confirm(language === 'kh' ? 'តើអ្នកពិតជាចង់ចាកចេញមែនទេ?' : 'Are you sure you want to log out?')) {
      setCurrentUser(null);
      setGoogleAccessToken(null);
      localStorage.removeItem('library_user');
      showSuccess(language === 'kh' ? 'បានចាកចេញដោយជោគជ័យ!' : 'Logged out successfully!');
    }
  };

  // Add / Edit Book
  const handleAddBook = async (newBook: Book) => {
    setBooks(prev => [newBook, ...prev]);
    showSuccess(
      language === 'kh' 
        ? `បានបន្ថែមសៀវភៅ "${newBook.title}" ដោយជោគជ័យ!` 
        : `Book "${newBook.title}" added successfully!`
    );
    if (isMysqlConnected) {
      await syncToMysql('/api/books', 'POST', newBook);
    }
  };

  const handleUpdateBook = async (updatedBook: Book) => {
    setBooks(prev => prev.map(b => (b.id === updatedBook.id ? updatedBook : b)));
    showSuccess(
      language === 'kh' 
        ? `បានកែសម្រួលសៀវភៅ "${updatedBook.title}" រួចរាល់!` 
        : `Book "${updatedBook.title}" updated successfully!`
    );
    
    // Auto sync records if status was altered in books manager
    let updatedRecords = [...records];
    if (updatedBook.status === 'lost') {
      updatedRecords = records.map(rec => {
        if (rec.bookId === updatedBook.id && (rec.status === 'borrowed' || rec.status === 'overdue')) {
          return { ...rec, status: 'lost' };
        }
        return rec;
      });
      setRecords(updatedRecords);
    }

    if (isMysqlConnected) {
      await syncToMysql(`/api/books/${updatedBook.id}`, 'PUT', updatedBook);
      if (updatedBook.status === 'lost') {
        for (const rec of updatedRecords) {
          if (rec.bookId === updatedBook.id && rec.status === 'lost') {
            await syncToMysql(`/api/records/${rec.id}`, 'PUT', rec);
          }
        }
      }
    }
  };

  const handleDeleteBook = async (id: string) => {
    const targetBook = books.find(b => b.id === id);
    setBooks(prev => prev.filter(b => b.id !== id));
    setRecords(prev => prev.filter(r => r.bookId !== id));
    showSuccess(
      language === 'kh' 
        ? `បានលុបសៀវភៅ "${targetBook?.title || ''}" ជាស្ថាពរ!` 
        : `Book "${targetBook?.title || ''}" deleted successfully!`
    );

    if (isMysqlConnected) {
      await syncToMysql(`/api/books/${id}`, 'DELETE');
      const associated = records.filter(r => r.bookId === id);
      for (const r of associated) {
        await syncToMysql(`/api/records/${r.id}`, 'DELETE');
      }
    }
  };

  // Category Actions
  const handleAddCategory = async (newCategory: Category) => {
    setCategories(prev => [newCategory, ...prev]);
    showSuccess(
      language === 'kh' 
        ? `បានបន្ថែមប្រភេទសៀវភៅ "${newCategory.nameKh}" ដោយជោគជ័យ!` 
        : `Category "${newCategory.nameEn}" added successfully!`
    );
    if (isMysqlConnected) {
      await syncToMysql('/api/categories', 'POST', newCategory);
    }
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'categories', newCategory.id), newCategory);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `categories/${newCategory.id}`);
      }
    }
  };

  const handleUpdateCategory = async (updatedCategory: Category) => {
    setCategories(prev => prev.map(c => (c.id === updatedCategory.id ? updatedCategory : c)));
    showSuccess(
      language === 'kh' 
        ? `បានកែសម្រួលប្រភេទសៀវភៅ "${updatedCategory.nameKh}" រួចរាល់!` 
        : `Category "${updatedCategory.nameEn}" updated successfully!`
    );
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'categories', updatedCategory.id), updatedCategory);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `categories/${updatedCategory.id}`);
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const targetCat = categories.find(c => c.id === id);
    setCategories(prev => prev.filter(c => c.id !== id));
    showSuccess(
      language === 'kh' 
        ? `បានលុបប្រភេទសៀវភៅ "${targetCat?.nameKh || ''}" ជាស្ថាពរ!` 
        : `Category "${targetCat?.nameEn || ''}" deleted successfully!`
    );
    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
      }
    }
  };

  // Wishlist Actions
  const handleAddWishlist = async (newItem: WishlistItem) => {
    setWishlist(prev => [newItem, ...prev]);
    showSuccess(
      language === 'kh' 
        ? `បានបន្ថែមទៅបញ្ជីចង់បានសៀវភៅ "${newItem.title}" ដោយជោគជ័យ!` 
        : `Added "${newItem.title}" to wishlist successfully!`
    );
    if (isMysqlConnected) {
      await syncToMysql('/api/wishlist', 'POST', newItem);
    }
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'wishlist', newItem.id), newItem);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `wishlist/${newItem.id}`);
      }
    }
  };

  const handleUpdateWishlist = async (updatedItem: WishlistItem) => {
    setWishlist(prev => prev.map(w => (w.id === updatedItem.id ? updatedItem : w)));
    showSuccess(
      language === 'kh' 
        ? `បានធ្វើបច្ចុប្បន្នភាពសៀវភៅក្នុងបញ្ជីចង់បាន!` 
        : `Wishlist item updated successfully!`
    );
    if (isMysqlConnected) {
      await syncToMysql(`/api/wishlist/${updatedItem.id}`, 'PUT', updatedItem);
    }
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'wishlist', updatedItem.id), updatedItem);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `wishlist/${updatedItem.id}`);
      }
    }
  };

  const handleDeleteWishlist = async (id: string) => {
    const targetItem = wishlist.find(w => w.id === id);
    setWishlist(prev => prev.filter(w => w.id !== id));
    showSuccess(
      language === 'kh' 
        ? `បានលុបសៀវភៅ "${targetItem?.title || ''}" ពីបញ្ជីចង់បាន!` 
        : `Wishlist item "${targetItem?.title || ''}" deleted successfully!`
    );
    if (isMysqlConnected) {
      await syncToMysql(`/api/wishlist/${id}`, 'DELETE');
    }
    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'wishlist', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `wishlist/${id}`);
      }
    }
  };

  // Student Actions
  const handleAddStudent = async (newStudent: Student) => {
    setStudents(prev => [newStudent, ...prev]);
    showSuccess(
      language === 'kh' 
        ? `បានចុះឈ្មោះសិស្ស "${newStudent.name}" ដោយជោគជ័យ!` 
        : `Student "${newStudent.name}" registered successfully!`
    );
    if (isMysqlConnected) {
      await syncToMysql('/api/students', 'POST', newStudent);
    }
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'students', newStudent.id), newStudent);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `students/${newStudent.id}`);
      }
    }
  };

  const handleUpdateStudent = async (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => (s.id === updatedStudent.id ? updatedStudent : s)));
    showSuccess(
      language === 'kh' 
        ? `បានកែសម្រួលព័ត៌មានសិស្ស "${updatedStudent.name}" រួចរាល់!` 
        : `Student "${updatedStudent.name}" updated successfully!`
    );
    if (isMysqlConnected) {
      await syncToMysql(`/api/students/${updatedStudent.id}`, 'PUT', updatedStudent);
    }
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'students', updatedStudent.id), updatedStudent);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `students/${updatedStudent.id}`);
      }
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const targetStudent = students.find(s => s.id === id);
    setStudents(prev => prev.filter(s => s.id !== id));
    setRecords(prev => prev.filter(r => r.studentId !== id));
    showSuccess(
      language === 'kh' 
        ? `បានលុបសិស្ស "${targetStudent?.name || ''}" รួចរាល់!` 
        : `Student "${targetStudent?.name || ''}" deleted successfully!`
    );

    if (isMysqlConnected) {
      await syncToMysql(`/api/students/${id}`, 'DELETE');
      const associated = records.filter(r => r.studentId === id);
      for (const rec of associated) {
        await syncToMysql(`/api/records/${rec.id}`, 'DELETE');
      }
    }

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'students', id));
        const associated = records.filter(r => r.studentId === id);
        for (const rec of associated) {
          await deleteDoc(doc(db, 'borrowRecords', rec.id));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
      }
    }
  };

  // Borrow Transaction Action
  const handleBorrowBook = async (recordData: Omit<BorrowRecord, 'id'>) => {
    const newRecord: BorrowRecord = {
      ...recordData,
      id: `rec-${Date.now()}`,
    };
    
    setRecords(prev => [newRecord, ...prev]);
    
    // Update Book status to 'borrowed'
    setBooks(prev => prev.map(b => {
      if (b.id === recordData.bookId) {
        return { ...b, status: 'borrowed' };
      }
      return b;
    }));

    const bk = books.find(b => b.id === recordData.bookId);
    const stu = students.find(s => s.id === recordData.studentId);
    showSuccess(
      language === 'kh'
        ? `បានខ្ចីសៀវភៅ "${bk?.title || ''}" ទៅកាន់ "${stu?.name || ''}"!`
        : `Successfully checked out "${bk?.title || ''}" to ${stu?.name || ''}!`
    );

    if (isMysqlConnected) {
      await syncToMysql('/api/records', 'POST', newRecord);
      const targetBook = books.find(b => b.id === recordData.bookId);
      if (targetBook) {
        await syncToMysql(`/api/books/${targetBook.id}`, 'PUT', { ...targetBook, status: 'borrowed' });
      }
    }

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'borrowRecords', newRecord.id), newRecord);
        const targetBook = books.find(b => b.id === recordData.bookId);
        if (targetBook) {
          await setDoc(doc(db, 'books', targetBook.id), { ...targetBook, status: 'borrowed' });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `borrowRecords/${newRecord.id}`);
      }
    }
  };

  // Return Transaction Action
  const handleReturnBook = (barcode: string, returnDate: string, notes?: string): boolean => {
    const book = books.find(b => b.barcode.toUpperCase() === barcode.toUpperCase());
    if (!book) {
      showError(
        language === 'kh'
          ? 'រកមិនឃើញសៀវភៅដែលមានបារកូដនេះទេ!'
          : 'No book found with this barcode!'
      );
      return false;
    }

    // Find the latest active loan record for this book
    const activeRecordIndex = records.findIndex(r => r.bookId === book.id && (r.status === 'borrowed' || r.status === 'overdue'));
    if (activeRecordIndex === -1) {
      showWarning(
        language === 'kh'
          ? 'សៀវភៅនេះមិនមានប្រវត្តិខ្ចីសកម្មទេ!'
          : 'This book has no active borrowing record!'
      );
      return false;
    }

    const activeRecord = records[activeRecordIndex];
    const updatedRecord: BorrowRecord = {
      ...activeRecord,
      returnDate,
      status: 'returned',
      notes: notes ? `${activeRecord.notes || ''} | Return note: ${notes}` : activeRecord.notes,
    };

    // Update the record to returned
    setRecords(prev => {
      const updated = [...prev];
      updated[activeRecordIndex] = updatedRecord;
      return updated;
    });

    // Check if there is an email notification set
    if (book.notificationEmail) {
      const email = book.notificationEmail;
      const notes = book.notificationNotes ? ` (${book.notificationNotes})` : '';
      setTimeout(() => {
        showInfo(
          language === 'kh'
            ? `📧 ប្រព័ន្ធផ្ញើសារស្វ័យប្រវត្តិ៖ បានផ្ញើទៅកាន់ ${email}! សៀវភៅ "${book.title}" ត្រូវបានសងវិញហើយ${notes}។`
            : `📧 Automated return email sent to: ${email}! Book "${book.title}" has been returned${notes}.`,
          8000
        );
      }, 600);
    }

    // Update book status to available
    setBooks(prev => prev.map(b => {
      if (b.id === book.id) {
        return { 
          ...b, 
          status: 'available',
          notificationEmail: undefined,
          notificationNotes: undefined
        };
      }
      return b;
    }));

    showSuccess(
      language === 'kh'
        ? `បានសងសៀវភៅ "${book.title}" ដោយជោគជ័យ!`
        : `Book "${book.title}" returned successfully!`
    );

    if (isMysqlConnected) {
      syncToMysql(`/api/records/${updatedRecord.id}`, 'PUT', updatedRecord);
      syncToMysql(`/api/books/${book.id}`, 'PUT', { ...book, status: 'available', notificationEmail: undefined, notificationNotes: undefined });
    }

    if (auth.currentUser) {
      setDoc(doc(db, 'borrowRecords', updatedRecord.id), updatedRecord).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `borrowRecords/${updatedRecord.id}`);
      });
      setDoc(doc(db, 'books', book.id), { ...book, status: 'available', notificationEmail: undefined, notificationNotes: undefined }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `books/${book.id}`);
      });
    }

    return true;
  };

  // Global Scanner Action Handlers
  const handleGlobalScanSuccess = (decodedText: string) => {
    setShowGlobalScanner(false);

    // 1. Check if the scanned QR code matches a Student ID card
    const matchedStudent = students.find(
      (s) => s.studentId.toUpperCase() === decodedText.trim().toUpperCase()
    );

    if (matchedStudent) {
      setPreselectedStudentId(matchedStudent.id);
      setActiveView('borrow');
      showSuccess(
        language === 'kh'
          ? `បានរកឃើញ និងជ្រើសរើសសិស្ស៖ ${matchedStudent.name} (${matchedStudent.studentId})`
          : `Scanned and selected Student: ${matchedStudent.name} (${matchedStudent.studentId})`
      );
      return;
    }
    
    // 2. Otherwise process as a Book Barcode/QR
    const matchedBook = books.find(
      (b) => b.barcode.toUpperCase() === decodedText.trim().toUpperCase()
    );

    if (!matchedBook) {
      setGlobalScannedResult({
        barcode: decodedText,
        book: null,
        mode: 'borrow',
        error: language === 'kh' ? `រកមិនឃើញសៀវភៅ ឬសិស្សដែលមានលេខបារកូដ/QR "${decodedText}" ទេ!` : `No book or student found with barcode/QR: "${decodedText}"`
      });
      return;
    }

    if (matchedBook.status === 'borrowed' || matchedBook.status === 'overdue') {
      const record = records.find(
        (r) => r.bookId === matchedBook.id && (r.status === 'borrowed' || r.status === 'overdue')
      );
      setGlobalScannedResult({
        barcode: decodedText,
        book: matchedBook,
        mode: 'return',
        borrowRecord: record || null
      });
    } else {
      setGlobalScannedResult({
        barcode: decodedText,
        book: matchedBook,
        mode: 'borrow'
      });
    }
  };

  const handleGlobalBorrowSubmit = (studentId: string, borrowDate: string, dueDate: string, notes?: string) => {
    if (!globalScannedResult || !globalScannedResult.book) return;
    
    handleBorrowBook({
      bookId: globalScannedResult.book.id,
      studentId,
      borrowDate,
      dueDate,
      status: 'borrowed',
      notes
    });

    setGlobalScannedResult(null);
  };

  const handleGlobalReturnSubmit = (notes?: string) => {
    if (!globalScannedResult || !globalScannedResult.book) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    handleReturnBook(globalScannedResult.book.barcode, todayStr, notes);
    setGlobalScannedResult(null);
  };

  // Backup and Restore JSON file database feature (highly useful offline/preview features!)
  const handleBackupDatabase = () => {
    showInfo(
      language === 'kh'
        ? 'ការទាញយកទិន្នន័យបម្រុងបានចាប់ផ្តើម...'
        : 'Database backup started...'
    );
    const backupData = {
      books,
      students,
      records,
      backupDate: new Date().toISOString(),
      school: 'Hun Sen Andoung Meas High School'
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `library_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.books && data.students && data.records) {
          setBooks(data.books);
          setStudents(data.students);
          setRecords(data.records);
          showSuccess(language === 'kh' ? 'បានស្តារមូលដ្ឋានទិន្នន័យដោយជោគជ័យ!' : 'Database restored successfully!');
        } else {
          showError(language === 'kh' ? 'ឯកសារមិនត្រឹមត្រូវឡើយ!' : 'Invalid backup file format!');
        }
      } catch (err) {
        showError(language === 'kh' ? 'កំហុសក្នុងការអានឯកសារ!' : 'Error parsing backup file!');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDatabase = () => {
    try {
      localStorage.removeItem('library_books');
      localStorage.removeItem('library_students');
      localStorage.removeItem('library_records');
      localStorage.removeItem('library_categories');
      localStorage.removeItem('library_roles');
      localStorage.removeItem('library_users');
      localStorage.removeItem('library_wishlist');
      localStorage.removeItem('cfg_school_name_kh');
      localStorage.removeItem('cfg_school_name_en');
      localStorage.removeItem('cfg_library_title_kh');
      localStorage.removeItem('cfg_library_title_en');
      localStorage.removeItem('cfg_contact_email');
      localStorage.removeItem('cfg_contact_phone');
      localStorage.removeItem('cfg_announcement_kh');
      localStorage.removeItem('cfg_announcement_en');

      setBooks(defaultBooks);
      setStudents(defaultStudents);
      setRecords(defaultBorrowRecords);
      setCategories(defaultCategories);
      setRoles(defaultRoles);
      setUsers(defaultUsers);
      setWishlist(defaultWishlist);

      // Reset school name states
      setCfgSchoolNameKh('វិទ្យាល័យ ហ៊ុន សែន អណ្តូងមាស');
      setCfgSchoolNameEn('Hun Sen Andoung Meas HS');

      showSuccess(language === 'kh' ? 'បានកំណត់មូលដ្ឋានទិន្នន័យឡើងវិញជោគជ័យ!' : 'Database successfully reset to defaults!');
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      showError(language === 'kh' ? 'កំណត់ប្រព័ន្ធឡើងវិញមិនបានជោគជ័យ៖ ' : 'Failed to reset database: ' + err);
    }
  };


  // Render core views dynamically depending on activeView router
  const renderActiveView = () => {
    switch (activeView) {
      case 'books':
        return (
          <BookManagement
            books={books}
            categories={categories}
            language={language}
            onAddBook={handleAddBook}
            onUpdateBook={handleUpdateBook}
            onDeleteBook={handleDeleteBook}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            wishlist={wishlist}
            onAddWishlist={handleAddWishlist}
            onUpdateWishlist={handleUpdateWishlist}
            onDeleteWishlist={handleDeleteWishlist}
            initialSearchTerm={bookSearchTerm}
            onClearSearch={() => setBookSearchTerm('')}
            currentUser={currentUser}
          />
        );
      case 'students':
        return (
          <StudentManagement
            students={students}
            records={records}
            books={books}
            language={language}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            googleAccessToken={googleAccessToken}
            onConnectGoogle={handleConnectGoogle}
            onShowSuccess={showSuccess}
            onShowError={showError}
            initialSearchTerm={studentSearchTerm}
            initialStudentId={preselectedStudentId}
          />
        );
      case 'borrow':
        return (
          <BorrowReturnSystem
            books={books}
            students={students}
            records={records}
            language={language}
            onBorrowBook={handleBorrowBook}
            onReturnBook={handleReturnBook}
            preselectedStudentId={preselectedStudentId}
            onClearPreselectedStudent={() => setPreselectedStudentId('')}
          />
        );
      case 'reports':
        return (
          <Reports
            books={books}
            students={students}
            records={records}
            language={language}
            categories={categories}
            onNotifyStudent={handleNotifyStudent}
          />
        );
      case 'deploy':
        return (
          <DeploymentCenter
            language={language}
            isMysqlConnected={isMysqlConnected}
            mysqlError={mysqlError}
            onRefreshConnection={loadMysqlData}
            categories={categories}
            books={books}
            students={students}
            records={records}
            wishlist={wishlist}
            roles={roles}
            users={users}
          />
        );
      case 'roles':
        return (
          <RoleManagement
            roles={roles}
            users={users}
            currentUser={currentUser}
            language={language}
            onAddRole={handleAddRole}
            onUpdateRole={handleUpdateRole}
            onDeleteRole={handleDeleteRole}
            onUpdateUserRole={handleUpdateUserRole}
            onUpdateUserName={handleUpdateUserName}
          />
        );
      case 'settings':
        return (
          <SettingsComponent
            language={language}
            setLanguage={setLanguage}
            books={books}
            students={students}
            records={records}
            categories={categories}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            onShowSuccess={showSuccess}
            onShowError={showError}
            onShowInfo={showInfo}
            onResetDatabase={handleResetDatabase}
          />
        );
      case 'graphql':
        return (
          <GraphQLDeveloperHub
            books={books}
            students={students}
            records={records}
            categories={categories}
            language={language}
            onAddBook={(newBookData) => {
              const fullBook: Book = {
                ...newBookData,
                id: `b-${Date.now()}`
              };
              handleAddBook(fullBook);
            }}
            onReturnBook={(recordId, returnDate, fineAmount, notes) => {
              const rec = records.find(r => r.id === recordId);
              if (rec) {
                const book = books.find(b => b.id === rec.bookId);
                if (book) {
                  handleReturnBook(book.barcode, returnDate, notes);
                }
              }
            }}
          />
        );
      case 'dashboard':
      case 'analytics':
      default:
        return (
          <Dashboard
            books={books}
            students={students}
            records={records}
            categories={categories}
            language={language}
            currentUser={currentUser}
            activeView={activeView}
            onNavigateToBook={(bookTitle) => {
              setBookSearchTerm(bookTitle);
              setActiveView('books');
            }}
            onNavigateToStudent={(studentId, studentName) => {
              setStudentSearchTerm(studentName);
              setPreselectedStudentId(studentId);
              setActiveView('students');
            }}
          />
        );
    }
  };

  // Redirect to login if user session is not found
  if (!currentUser) {
    return (
      <Login
        onLogin={handleLogin}
        onGoogleLogin={handleGoogleLogin}
        students={students}
        language={language}
        setLanguage={setLanguage}
        isLoading={dbLoading}
      />
    );
  }

  const sidebarItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard, visible: true },
    { 
      id: 'books', 
      label: currentUser?.role === 'student' 
        ? (language === 'kh' ? 'ស្វែងរកសៀវភៅ' : 'Browse Books') 
        : t.bookManage, 
      icon: BookMarked, 
      visible: currentPermissions.manageBooks || currentUser?.role === 'student' 
    },
    { id: 'students', label: t.studentManage, icon: Users2, visible: currentPermissions.manageStudents },
    { id: 'borrow', label: `${t.borrowBook} / ${t.returnBook}`, icon: ArrowRightLeft, visible: currentPermissions.borrowReturn },
    { id: 'reports', label: t.reports, icon: FileBarChart2, visible: currentPermissions.viewReports },
    { id: 'roles', label: language === 'kh' ? 'គ្រប់គ្រងតួនាទី' : 'Role Management', icon: Shield, visible: currentPermissions.manageRoles },
    { id: 'analytics', label: language === 'kh' ? 'វិភាគទិន្នន័យ' : 'Analytics', icon: FileBarChart2, visible: currentUser?.role !== 'student' },
    { id: 'settings', label: language === 'kh' ? 'ការកំណត់ប្រព័ន្ធ' : 'System Settings', icon: Settings, visible: currentUser?.role !== 'student' },
    { id: 'graphql', label: language === 'kh' ? 'មជ្ឈមណ្ឌល GraphQL' : 'GraphQL Dev Hub', icon: Code, visible: true },
  ];

  // Find current borrow details for the selected book in global header search
  const activeBookRecord = selectedSearchBook ? records.find(r => r.bookId === selectedSearchBook.id && (r.status === 'borrowed' || r.status === 'overdue')) : null;
  const activeBookBorrower = activeBookRecord ? students.find(s => s.id === activeBookRecord.studentId) : null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative font-sans text-slate-800" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 100%)' }}>
      {/* LEFT SIDEBAR - Desktop view */}
      <aside className="hidden md:flex md:w-64 flex-col glass-sidebar text-slate-100 min-h-screen shrink-0 sticky top-0 z-20 shadow-xl">
        {/* School Identity Header */}
        <div className="p-6 border-b border-white/10 flex items-center gap-3 bg-white/5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md border border-white/20 overflow-hidden bg-white">
            <img src={schoolLogo} alt="School Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-[10px] font-black text-blue-200 uppercase tracking-widest leading-none truncate max-w-[150px]" title={language === 'kh' ? cfgSchoolNameKh : cfgSchoolNameEn}>
              {language === 'kh' ? 'សាលារៀន' : 'Hun Sen'}
            </h2>
            <h1 className="text-xs font-black text-white tracking-tight leading-normal mt-0.5 truncate max-w-[150px]" title={language === 'kh' ? cfgSchoolNameKh : cfgSchoolNameEn}>
              {language === 'kh' ? cfgSchoolNameKh.replace('វិទ្យាល័យ', '').trim() : cfgSchoolNameEn.replace('Hun Sen', '').trim()}
            </h1>
          </div>
        </div>

        {/* Navigation Sidebar List */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id !== 'books') setBookSearchTerm('');
                  if (item.id !== 'students') {
                    setStudentSearchTerm('');
                    setPreselectedStudentId('');
                  }
                  setActiveView(item.id as any);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-white/20 text-white border border-white/20 shadow-lg'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-blue-300'}`} />
                {item.label}
              </button>
            );
          })}

          {/* Quick Scan Action Button */}
          {true && (
            <div className="pt-4 border-t border-white/10 mt-4">
              <button
                onClick={() => setShowGlobalScanner(true)}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 text-xs font-black rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20 border border-emerald-400/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer relative overflow-hidden group"
              >
                <Scan className="w-4 h-4 text-white animate-pulse" />
                <span>{language === 'kh' ? 'ស្កែនរហ័ស (Quick Scan)' : 'Quick Scan'}</span>
              </button>
            </div>
          )}
        </nav>

        {/* Database Backup & Restore inside bottom drawer of sidebar */}
        {true && (
          <div className="p-4 border-t border-white/10 space-y-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-blue-100 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition text-left cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-yellow-300" /> : <Moon className="w-3.5 h-3.5 text-blue-300" />}
              {isDarkMode ? (language === 'kh' ? 'របៀបពន្លឺ' : 'Light Mode') : (language === 'kh' ? 'របៀបងងឹត' : 'Dark Mode')}
            </button>
            <button
              onClick={handleBackupDatabase}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-blue-100 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition text-left cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-300" />
              {language === 'kh' ? 'ទាញយក Backup' : 'Backup Database'}
            </button>
          </div>
        )}

        {/* Auto Save Sync Status Badge */}
        <div className="mx-4 my-2 p-2.5 bg-white/5 border border-white/10 rounded-xl space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">
              {language === 'kh' ? 'ប្រព័ន្ធរក្សាទុកស្វ័យប្រវត្ត' : 'Auto Save Status'}
            </span>
            {unsavedQueue.length > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[8px] font-black rounded-md">
                {unsavedQueue.length} {language === 'kh' ? 'មិនទាន់សង' : 'pending'}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {syncStatus === 'saving' || syncStatus === 'syncing' ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
              ) : syncStatus === 'saved' ? (
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              )}
              
              <span className="text-[10px] font-extrabold text-slate-200">
                {syncStatus === 'saving' && (language === 'kh' ? 'កំពុងរក្សាទុក...' : 'Saving...')}
                {syncStatus === 'syncing' && (language === 'kh' ? 'កំពុងសមកាលកម្ម...' : 'Syncing...')}
                {syncStatus === 'saved' && (language === 'kh' ? 'បានរក្សាទុកជោគជ័យ' : 'Saved successfully')}
                {syncStatus === 'offline' && (language === 'kh' ? 'រក្សាទុកក្នុងម៉ាស៊ីន' : 'Offline (saved locally)')}
              </span>
            </div>

            {unsavedQueue.length > 0 && (
              <button
                onClick={() => flushSyncQueue()}
                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[9px] font-bold transition-all cursor-pointer shadow active:scale-95"
              >
                {language === 'kh' ? 'សមកាលកម្ម' : 'Save Now'}
              </button>
            )}
          </div>
        </div>

        {/* Authenticated user badge */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/5">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[10px] text-blue-200 font-bold capitalize">{currentUser.role}</p>
          </div>
          <button
            onClick={handleLogout}
            title={t.logoutBtn}
            className="p-1.5 hover:bg-red-500/20 text-blue-200 hover:text-red-300 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER & DRAWER */}
      <div className="md:hidden glass-panel border-b border-white/40 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center text-white">
            <Library className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[10px] font-black text-blue-900 leading-none truncate max-w-[180px]">{language === 'kh' ? cfgSchoolNameKh : cfgSchoolNameEn}</h2>
            <h1 className="text-xs font-black text-slate-800 mt-0.5 leading-none">{language === 'kh' ? 'ប្រព័ន្ធគ្រប់គ្រងបណ្ណាល័យ' : 'Library System'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 text-slate-500 hover:text-blue-900 transition"
          >
            {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
          <button
            onClick={() => setLanguage(language === 'kh' ? 'en' : 'kh')}
            className="p-1.5 text-slate-500 hover:text-blue-900 transition"
          >
            <Globe className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 transition"
          >
            {mobileMenuOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[53px] glass-panel-heavy z-40 flex flex-col justify-between">
          <div className="p-4 space-y-1">
            {/* Live Ticking Clock, Date, and Year Widget (Mobile) */}
            <div className="flex items-center gap-3 bg-white/60 border border-slate-200/50 rounded-2xl px-3 py-2.5 shadow-sm mb-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 shadow-md">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black font-mono text-slate-800 tracking-tight leading-none">
                  {formatTime(currentTime, language)}
                </p>
                <p className="text-[9px] text-slate-500 font-bold mt-1 leading-none">
                  {language === 'kh' ? formatKhmerDate(currentTime) : formatEnglishDate(currentTime)}
                </p>
              </div>
            </div>

            {sidebarItems.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id !== 'books') setBookSearchTerm('');
                    if (item.id !== 'students') {
                      setStudentSearchTerm('');
                      setPreselectedStudentId('');
                    }
                    setActiveView(item.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-xs font-bold rounded-xl transition ${
                    isActive ? 'bg-blue-900 text-white shadow-md' : 'text-slate-700 hover:bg-white/40'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 border-t border-white/60 bg-white/45 space-y-3">
            {currentPermissions.systemBackup && (
              <div className="flex">
                <button
                  onClick={() => {
                    handleBackupDatabase();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white/75 border border-white text-slate-700 rounded-xl text-xs font-bold shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  Backup
                </button>
              </div>
            )}

            {/* Auto Save Sync Status Badge Mobile */}
            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500">
                  {language === 'kh' ? 'ប្រព័ន្ធរក្សាទុកស្វ័យប្រវត្ត' : 'Auto Save Status'}
                </span>
                {unsavedQueue.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-black rounded-md">
                    {unsavedQueue.length} {language === 'kh' ? 'មិនទាន់សង' : 'pending'}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {syncStatus === 'saving' || syncStatus === 'syncing' ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                    </span>
                  ) : syncStatus === 'saved' ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                  )}
                  
                  <span className="text-[10px] font-extrabold text-slate-700">
                    {syncStatus === 'saving' && (language === 'kh' ? 'កំពុងរក្សាទុក...' : 'Saving...')}
                    {syncStatus === 'syncing' && (language === 'kh' ? 'កំពុងសមកាលកម្ម...' : 'Syncing...')}
                    {syncStatus === 'saved' && (language === 'kh' ? 'បានរក្សាទុកជោគជ័យ' : 'Saved successfully')}
                    {syncStatus === 'offline' && (language === 'kh' ? 'រក្សាទុកក្នុងម៉ាស៊ីន' : 'Offline (saved locally)')}
                  </span>
                </div>

                {unsavedQueue.length > 0 && (
                  <button
                    onClick={() => {
                      flushSyncQueue();
                      setMobileMenuOpen(false);
                    }}
                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[9px] font-bold transition-all cursor-pointer shadow active:scale-95"
                  >
                    {language === 'kh' ? 'សមកាលកម្ម' : 'Save Now'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 capitalize">{currentUser.role}</p>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1 px-3 py-1.5 border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-600 rounded-lg text-xs font-bold transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t.logoutBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Top bar with simple notifications or actions - Desktop only */}
        <header className="hidden md:flex justify-between items-center mb-6 gap-6">
          <div className="shrink-0 flex items-center gap-5">
            <div>
              <span className="text-xs text-blue-600 font-extrabold uppercase tracking-widest">{t.schoolName}</span>
              <h1 className="text-base font-black text-slate-800 mt-0.5">{t.tagline}</h1>
            </div>

            {/* Live Ticking Clock, Date, and Year Widget */}
            <div className="flex items-center gap-3 bg-white/70 backdrop-blur border border-slate-200/50 rounded-2xl px-4 py-2 shadow-sm">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/10 shrink-0">
                <Clock className="w-4 h-4 animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black font-mono text-slate-800 tracking-tight leading-none">
                  {formatTime(currentTime, language)}
                </p>
                <p className="text-[9px] text-slate-400 font-bold mt-1 leading-none">
                  {language === 'kh' ? formatKhmerDate(currentTime) : formatEnglishDate(currentTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Global Header Search Bar */}
          <div className="flex-1 max-w-md relative">
            <div className="relative">
              <input
                type="text"
                value={globalSearchQuery}
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value);
                  setShowGlobalSearchResults(true);
                }}
                onFocus={() => setShowGlobalSearchResults(true)}
                placeholder={language === 'kh' ? 'ស្វែងរកសៀវភៅតាម ចំណងជើង និពន្ធ ឬបារកូដ...' : 'Search books by title, author, or barcode...'}
                className="w-full pl-10 pr-4 py-2.5 bg-white/75 backdrop-blur-md border border-slate-200/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-800 shadow-sm"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {globalSearchQuery && (
                <button
                  onClick={() => {
                    setGlobalSearchQuery('');
                    setShowGlobalSearchResults(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-black transition p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Floating Dropdown Search Results */}
            {showGlobalSearchResults && globalSearchQuery.trim() !== '' && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowGlobalSearchResults(false)} 
                />
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-40 max-h-96 overflow-y-auto">
                  {(() => {
                    const q = globalSearchQuery.toLowerCase().trim();
                    const matched = books.filter(b => 
                      b.title.toLowerCase().includes(q) ||
                      b.author.toLowerCase().includes(q) ||
                      b.barcode.toLowerCase().includes(q)
                    ).slice(0, 5);

                    if (matched.length === 0) {
                      return (
                        <div className="p-4 text-center text-xs font-semibold text-slate-400">
                          {language === 'kh' ? 'រកមិនឃើញសៀវភៅដែលត្រូវគ្នាឡើយ' : 'No matching books found'}
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-slate-100">
                        {matched.map(book => (
                          <button
                            key={book.id}
                            onClick={() => {
                              setSelectedSearchBook(book);
                              setGlobalSearchQuery('');
                              setShowGlobalSearchResults(false);
                            }}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50/80 transition cursor-pointer"
                          >
                            <div className="w-9 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 overflow-hidden shadow-sm shrink-0 border border-slate-100/50">
                              {book.coverImage ? (
                                <img src={book.coverImage} alt={book.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              ) : (
                                <BookMarked className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-extrabold text-slate-800 truncate leading-tight">{book.title}</h5>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">{language === 'kh' ? 'និពន្ធដោយ' : 'By'}: {book.author}</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">Barcode: {book.barcode}</p>
                            </div>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                              book.status === 'available'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}>
                              {book.status === 'available'
                                ? (language === 'kh' ? 'អាចខ្ចី' : 'Available')
                                : (language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed')
                              }
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/60 shadow-sm shrink-0">
            <div className="flex items-center gap-1.5 border-r border-slate-200/50 pr-3">
              <Globe className="w-4 h-4 text-slate-400" />
              <button
                onClick={() => setLanguage('kh')}
                className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition ${
                  language === 'kh' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white/40'
                }`}
              >
                ខ្មែរ
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition ${
                  language === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white/40'
                }`}
              >
                EN
              </button>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-800 leading-none">{currentUser.name}</p>
              <p className="text-[9px] text-blue-600 font-extrabold uppercase mt-1 tracking-wider leading-none">{currentUser.role}</p>
            </div>
          </div>
        </header>

        {/* Render dynamic component based on Navigation state */}
        <div className="animate-fadeIn">
          {renderActiveView()}
        </div>

        {/* Footer info line */}
        <footer className="mt-12 text-center text-[10px] text-slate-400 font-semibold uppercase tracking-widest border-t border-white/20 pt-6 pb-4">
          &copy; {new Date().getFullYear()} {t.schoolName} &bull; {language === 'kh' ? 'រចនាឡើងសម្រាប់គម្រោងបណ្ណាល័យសាលា' : 'Designed for high school education projects'}
        </footer>
      </main>

      {/* Mobile Floating Quick Scan Action Button */}
      {currentPermissions.borrowReturn && (
        <div className="md:hidden fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setShowGlobalScanner(true)}
            className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full shadow-2xl shadow-emerald-500/40 border border-emerald-400/30 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer animate-bounce"
            style={{ animationDuration: '3s' }}
            title={language === 'kh' ? 'ស្កែនរហ័ស' : 'Quick Scan'}
          >
            <Scan className="w-6 h-6 text-white animate-pulse" />
          </button>
        </div>
      )}

      {/* Global Camera Scanner Modal */}
      {showGlobalScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="relative bg-white dark:bg-slate-950 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600 animate-pulse" />
                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">
                  {language === 'kh' ? 'កាមេរ៉ាស្កែនបារកូដ និង QR Code' : 'Camera Barcode / QR Scanner'}
                </h3>
              </div>
              <button
                onClick={() => setShowGlobalScanner(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <CameraScanner
                language={language}
                onScanSuccess={handleGlobalScanSuccess}
                onClose={() => setShowGlobalScanner(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Global Scanned Result Approval / Action Modal */}
      <GlobalScanResultModal
        result={globalScannedResult}
        onClose={() => setGlobalScannedResult(null)}
        students={students}
        categories={categories}
        language={language}
        onBorrow={handleGlobalBorrowSubmit}
        onReturn={handleGlobalReturnSubmit}
        onToggleMode={(mode) => setGlobalScannedResult(prev => prev ? { ...prev, mode } : null)}
      />

      {/* Selected Searched Book Detail popup card */}
      {selectedSearchBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="relative bg-white dark:bg-slate-950 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-blue-600" />
                <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">
                  {language === 'kh' ? 'ព័ត៌មានលម្អិតសៀវភៅ' : 'Book Details'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSearchBook(null)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Main book info layout */}
              <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="w-20 h-28 bg-blue-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-blue-500 overflow-hidden shadow-md shrink-0">
                  {selectedSearchBook.coverImage ? (
                    <img
                      src={selectedSearchBook.coverImage}
                      alt={selectedSearchBook.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Library className="w-8 h-8" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  {(() => {
                    const cat = categories.find(c => c.id === selectedSearchBook.categoryId);
                    if (cat) {
                      return (
                        <span 
                          style={{ 
                            backgroundColor: `${cat.color || '#3B82F6'}15`, 
                            color: cat.color || '#3B82F6',
                            borderColor: `${cat.color || '#3B82F6'}30`
                          }} 
                          className="text-[10px] font-extrabold uppercase px-2.5 py-1 border rounded-lg self-start"
                        >
                          {language === 'kh' ? cat.nameKh : cat.nameEn}
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg self-start">
                        {language === 'kh' ? 'សៀវភៅទូទៅ' : 'General'}
                      </span>
                    );
                  })()}
                  <h4 className="text-sm font-black text-slate-800 dark:text-white mt-2 leading-tight">
                    {selectedSearchBook.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'kh' ? 'និពន្ធដោយ' : 'By'}: {selectedSearchBook.author}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      selectedSearchBook.status === 'available'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {selectedSearchBook.status === 'available'
                        ? (language === 'kh' ? 'អាចខ្ចីបាន' : 'Available')
                        : (language === 'kh' ? 'កំពុងខ្ចី' : 'Borrowed')
                    }
                    </span>
                    {selectedSearchBook.location && (
                      <span className="text-[10px] text-slate-400 font-bold">
                        {language === 'kh' ? `ថត៖ ${selectedSearchBook.location}` : `Shelf: ${selectedSearchBook.location}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Barcode badge block */}
              <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-300">
                <span>Barcode / ISBN:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedSearchBook.barcode}</span>
              </div>

              {/* Active Borrower info if borrowed */}
              {selectedSearchBook.status !== 'available' && activeBookRecord && activeBookBorrower ? (
                <div className="p-4 bg-blue-50 dark:bg-slate-800 rounded-2xl border border-blue-100/30 dark:border-slate-700 space-y-2.5">
                  <h5 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                    {language === 'kh' ? 'ព័ត៌មានលម្អិតការខ្ចី' : 'Active Checkout Details'}
                  </h5>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'kh' ? 'ឈ្មោះសិស្ស' : 'Borrower'}</p>
                      <p className="font-extrabold text-slate-700 dark:text-white mt-0.5">{activeBookBorrower.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'kh' ? 'ថ្នាក់ទី' : 'Class Grade'}</p>
                      <p className="font-extrabold text-slate-700 dark:text-white mt-0.5">{activeBookBorrower.classGrade}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'kh' ? 'ថ្ងៃខ្ចី' : 'Borrow Date'}</p>
                      <p className="font-semibold text-slate-700 dark:text-white mt-0.5">{activeBookRecord.borrowDate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'kh' ? 'ថ្ងៃត្រូវសង' : 'Due Date'}</p>
                      <p className={`font-semibold mt-0.5 ${activeBookRecord.status === 'overdue' ? 'text-rose-500 font-bold animate-pulse' : 'text-slate-700 dark:text-white'}`}>
                        {activeBookRecord.dueDate}
                        {activeBookRecord.status === 'overdue' && (language === 'kh' ? ' (ហួសកំណត់!)' : ' (Overdue!)')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold leading-normal">
                    {language === 'kh'
                      ? 'សៀវភៅនេះមាននៅលើធ្នើស្រាប់ និងអាចខ្ចីបានភ្លាមៗ។'
                      : 'This book is safe on the shelves and ready for instant checkout.'}
                  </p>
                </div>
              )}

              {/* Action triggers */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedSearchBook(null);
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold rounded-2xl transition text-xs shadow-sm cursor-pointer"
                >
                  {language === 'kh' ? 'បិទ' : 'Close'}
                </button>

                {currentPermissions.borrowReturn && (
                  selectedSearchBook.status === 'available' ? (
                    <button
                      onClick={() => {
                        setGlobalScannedResult({
                          barcode: selectedSearchBook.barcode,
                          book: selectedSearchBook,
                          mode: 'borrow'
                        });
                        setSelectedSearchBook(null);
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-2xl transition text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>{language === 'kh' ? 'ខ្ចីសៀវភៅ' : 'Borrow Book'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setGlobalScannedResult({
                          barcode: selectedSearchBook.barcode,
                          book: selectedSearchBook,
                          mode: 'return',
                          borrowRecord: activeBookRecord
                        });
                        setSelectedSearchBook(null);
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl transition text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>{language === 'kh' ? 'សងសៀវភៅ' : 'Return Book'}</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <footer className="fixed bottom-4 left-0 right-0 text-center text-xs text-white/70">
        ធ្វើឡើងដោយ និស្សិត ឈ្មោះ សម្បត្តិ ឈុនហ៊ាង
      </footer>
    </div>
  );
}
