import { Book, Category, Student, BorrowRecord, User, Role, WishlistItem } from '../types';

export const defaultCategories: Category[] = [
  { id: 'cat-kh', nameKh: 'អក្សរសាស្ត្រខ្មែរ', nameEn: 'Khmer Literature', color: '#EF4444' }, // Red/Rose
  { id: 'cat-math', nameKh: 'គណិតវិទ្យា', nameEn: 'Mathematics', color: '#3B82F6' }, // Blue
  { id: 'cat-eng', nameKh: 'ភាសាអង់គ្លេស', nameEn: 'English Language', color: '#8B5CF6' }, // Purple
  { id: 'cat-sci', nameKh: 'វិទ្យាសាស្ត្រ (រូប គីមី ជីវៈ)', nameEn: 'Sciences (Physics/Chem/Bio)', color: '#10B981' }, // Emerald
  { id: 'cat-hist', nameKh: 'ប្រវត្តិវិទ្យា', nameEn: 'History', color: '#F59E0B' }, // Amber
  { id: 'cat-geo', nameKh: 'ភូមិវិទ្យា', nameEn: 'Geography', color: '#14B8A6' }, // Teal
  { id: 'cat-ict', nameKh: 'បច្ចេកវិទ្យាព័ត៌មាន', nameEn: 'Information Technology', color: '#06B6D4' }, // Cyan
];

export const defaultBooks: Book[] = [
  {
    id: 'book-1',
    title: 'ភាសាខ្មែរ ថ្នាក់ទី១២ (ភាគ១)',
    barcode: 'KH-12-001',
    categoryId: 'cat-kh',
    author: 'ក្រសួងអប់រំ យុវជន និងកីឡា',
    publishYear: 2022,
    status: 'available',
    location: 'Shelf A1',
    addedDate: '2026-01-10',
  },
  {
    id: 'book-2',
    title: 'គណិតវិទ្យា ថ្នាក់ទី១២ (កម្រិតខ្ពស់)',
    barcode: 'MATH-12-002',
    categoryId: 'cat-math',
    author: 'ក្រសួងអប់រំ យុវជន និងកីឡា',
    publishYear: 2023,
    status: 'borrowed',
    location: 'Shelf B2',
    addedDate: '2026-01-12',
  },
  {
    id: 'book-3',
    title: 'English for Cambodia Book 12',
    barcode: 'ENG-12-003',
    categoryId: 'cat-eng',
    author: 'MoEYS Cambodia',
    publishYear: 2021,
    status: 'available',
    location: 'Shelf C1',
    addedDate: '2026-01-15',
  },
  {
    id: 'book-4',
    title: 'រូបវិទ្យា ថ្នាក់ទី១១',
    barcode: 'PHY-11-004',
    categoryId: 'cat-sci',
    author: 'ក្រសួងអប់រំ យុវជន និងកីឡា',
    publishYear: 2022,
    status: 'available',
    location: 'Shelf D3',
    addedDate: '2026-01-18',
  },
  {
    id: 'book-5',
    title: 'គីមីវិទ្យា ថ្នាក់ទី១២',
    barcode: 'CHEM-12-005',
    categoryId: 'cat-sci',
    author: 'ក្រសួងអប់រំ យុវជន និងកីឡា',
    publishYear: 2023,
    status: 'overdue',
    location: 'Shelf D4',
    addedDate: '2026-01-20',
  },
  {
    id: 'book-6',
    title: 'ប្រវត្តិវិទ្យា ថ្នាក់ទី១២',
    barcode: 'HIST-12-006',
    categoryId: 'cat-hist',
    author: 'ក្រសួងអប់រំ យុវជន និងកីឡា',
    publishYear: 2020,
    status: 'available',
    location: 'Shelf E1',
    addedDate: '2026-02-01',
  },
  {
    id: 'book-7',
    title: 'ភូមិវិទ្យា ថ្នាក់ទី១០',
    barcode: 'GEO-10-007',
    categoryId: 'cat-geo',
    author: 'ក្រសួងអប់រំ យុវជន និងកីឡា',
    publishYear: 2021,
    status: 'lost',
    location: 'Shelf E3',
    addedDate: '2026-02-05',
  },
  {
    id: 'book-8',
    title: 'មូលដ្ឋានគ្រឹះកុំព្យូទ័រ និងបច្ចេកវិទ្យា',
    barcode: 'ICT-01-008',
    categoryId: 'cat-ict',
    author: 'លោក សុខ ជា',
    publishYear: 2024,
    status: 'available',
    location: 'Shelf F1',
    addedDate: '2026-02-10',
  }
];

const lastNames = ['ចាន់', 'សេង', 'កែវ', 'សុខ', 'លី', 'ជា', 'នួន', 'ម៉ៅ', 'ទួន', 'ហេង', 'សោម', 'គង់', 'ភឿន', 'ម៉ែន', 'ស៊ិន', 'រ័ត្ន', 'ជាម', 'អ៊ុំ', 'តេង', 'ឡាយ'];
const firstNames = ['មុន្នី', 'ស្រីពៅ', 'វិសាល', 'គឹមហួរ', 'ម៉េងហុង', 'រក្សា', 'សិលា', 'បញ្ញា', 'ធារី', 'លីដា', 'ទេវី', 'ដារ៉ា', 'វឌ្ឍនៈ', 'ពិសិដ្ឋ', 'មាលា', 'វណ្ណដា', 'សុជាតា', 'រដ្ឋា', 'វិបុល', 'ស្រីណុច'];
const grades = ['10A', '10B', '10C', '11A', '11B', '11C', '12A', '12B', '12C'];

function generate1000Students(): Student[] {
  const list: Student[] = [
    {
      id: 'stu-1',
      studentId: 'STU-12A-01',
      name: 'ចាន់ មុន្នី',
      gender: 'M',
      classGrade: '12A',
      phoneNumber: '012 345 678',
      email: 'chan.monny@school.edu.kh',
      password: 'password123',
    },
    {
      id: 'stu-2',
      studentId: 'STU-12B-04',
      name: 'សុខ គឹមហួរ',
      gender: 'F',
      classGrade: '12B',
      phoneNumber: '098 765 432',
      email: 'sokh.kimhour@school.edu.kh',
      password: 'password123',
    },
    {
      id: 'stu-3',
      studentId: 'STU-11A-09',
      name: 'លី ម៉េងហុង',
      gender: 'M',
      classGrade: '11A',
      phoneNumber: '085 111 222',
      email: 'ly.menghong@school.edu.kh',
      password: 'password123',
    },
    {
      id: 'stu-4',
      studentId: 'STU-10C-12',
      name: 'សេង ស្រីពៅ',
      gender: 'F',
      classGrade: '10C',
      phoneNumber: '077 333 444',
      email: 'seng.sreypov@school.edu.kh',
      password: 'password123',
    },
    {
      id: 'stu-5',
      studentId: 'STU-12A-18',
      name: 'កែវ វិសាល',
      gender: 'M',
      classGrade: '12A',
      phoneNumber: '099 888 999',
      email: 'keo.visal@school.edu.kh',
      password: 'password123',
    }
  ];

  for (let i = 1; i <= 1000; i++) {
    const ln = lastNames[i % lastNames.length];
    const fn = firstNames[(i * 3) % firstNames.length];
    const name = `${ln} ${fn}`;
    const gender = (i % 2 === 0) ? 'F' : 'M';
    const grade = grades[i % grades.length];
    const stuIdNum = String(i).padStart(4, '0');
    const studentId = `STU-${grade}-${stuIdNum}`;
    const phone = `012 ${String(Math.floor(100000 + Math.random() * 900000))}`;
    const email = `student${i}@school.edu.kh`;
    const password = `pass${1000 + i}`;

    list.push({
      id: `stu-gen-${i}`,
      studentId,
      name,
      gender,
      classGrade: grade,
      phoneNumber: phone,
      email,
      password,
    });
  }

  return list;
}

export const defaultStudents: Student[] = generate1000Students();

export const defaultBorrowRecords: BorrowRecord[] = [
  {
    id: 'rec-1',
    bookId: 'book-3', // English for Cambodia
    studentId: 'stu-1', // ចាន់ មុន្នី
    borrowDate: '2026-06-15',
    dueDate: '2026-06-25',
    returnDate: '2026-06-24',
    status: 'returned',
    notes: 'Returned in good condition',
  },
  {
    id: 'rec-2',
    bookId: 'book-2', // Mathematics Grade 12
    studentId: 'stu-2', // សុខ គឹមហួរ
    borrowDate: '2026-06-26',
    dueDate: '2026-07-06',
    status: 'borrowed',
    notes: 'Borrowing for upcoming national exams',
  },
  {
    id: 'rec-3',
    bookId: 'book-5', // Chemistry Grade 12
    studentId: 'stu-3', // លី ម៉េងហុង
    borrowDate: '2026-06-10',
    dueDate: '2026-06-20',
    status: 'overdue',
    notes: 'Called phone number twice - no response',
  },
  {
    id: 'rec-4',
    bookId: 'book-7', // Geography Grade 10
    studentId: 'stu-4', // សេង ស្រីពៅ
    borrowDate: '2026-05-12',
    dueDate: '2026-05-22',
    status: 'lost',
    notes: 'Student reported book lost, agreed to replace it',
  }
];

export const defaultUsers: User[] = [
  {
    id: 'u-1',
    username: 'admin',
    name: 'Sambat Chhunheang (Admin)',
    role: 'admin',
    lastLogin: '2026-07-01 08:30',
  },
  {
    id: 'u-2',
    username: 'librarian',
    name: 'Keo Samrang (Librarian)',
    role: 'librarian',
    lastLogin: '2026-07-01 07:45',
  }
];

export const defaultRoles: Role[] = [
  {
    id: 'admin',
    nameKh: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)',
    nameEn: 'System Administrator',
    permissions: {
      manageBooks: true,
      manageStudents: true,
      borrowReturn: true,
      viewReports: true,
      manageRoles: true,
      systemBackup: true
    },
    isSystem: true
  },
  {
    id: 'librarian',
    nameKh: 'បណ្ណារក្ស (Librarian)',
    nameEn: 'Librarian',
    permissions: {
      manageBooks: true,
      manageStudents: true,
      borrowReturn: true,
      viewReports: true,
      manageRoles: false,
      systemBackup: false
    },
    isSystem: true
  }
];

export const defaultWishlist: WishlistItem[] = [
  {
    id: 'wish-1',
    title: 'រូបវិទ្យា ថ្នាក់ទី១២',
    author: 'ក្រសួងអប់រំ យុវជន និងកីឡា',
    requesterName: 'សុខ គឹមហួរ',
    requestDate: '2026-06-28',
    status: 'pending',
    notes: 'Required for college preparations'
  },
  {
    id: 'wish-2',
    title: 'ប្រលោមលោក រឿងតេជោតំឌិន',
    author: 'គង់ ប៊ុនឈឿន',
    requesterName: 'លី ម៉េងហុង',
    requestDate: '2026-06-30',
    status: 'approved',
    notes: 'Recommended classic Khmer literature reading'
  },
  {
    id: 'wish-3',
    title: 'គីមីវិទ្យា ថ្នាក់ទី១២ (Chemistry Grade 12)',
    author: 'ក្រសួងអប់រំ យុវជន និងកីឡា',
    requesterName: 'ចាន់ ណារ៉េត',
    requestDate: '2026-07-02',
    status: 'acquired',
    notes: 'Successfully acquired and added to catalog'
  }
];
