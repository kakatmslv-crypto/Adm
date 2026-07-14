export interface Book {
  id: string;
  title: string;
  barcode: string;
  categoryId: string;
  author: string;
  publishYear: number;
  status: 'available' | 'borrowed' | 'overdue' | 'lost';
  location?: string;
  addedDate: string;
  coverImage?: string; // base64 data URL or external URL
  images?: string[]; // Multiple additional photos for the book
  notificationEmail?: string;
  notificationNotes?: string;
}

export interface Category {
  id: string;
  nameKh: string;
  nameEn: string;
  color?: string; // Optional hex or tailwind color
}

export interface Student {
  id: string; // internal UUID
  studentId: string; // Visible ID e.g., STU-2026-001
  name: string;
  gender: 'M' | 'F';
  classGrade: string; // e.g., 10A, 12B
  phoneNumber: string;
  photo?: string; // base64 data URL
  email?: string;
  password?: string;
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  studentId: string;
  borrowDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  status: 'borrowed' | 'returned' | 'overdue' | 'lost';
  notes?: string;
  fineAmount?: number;
  finePaid?: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: string; // support both system and custom role ids
  lastLogin?: string;
}

export interface RolePermissions {
  manageBooks: boolean;
  manageStudents: boolean;
  borrowReturn: boolean;
  viewReports: boolean;
  manageRoles: boolean;
  systemBackup: boolean;
}

export interface Role {
  id: string;
  nameKh: string;
  nameEn: string;
  permissions: RolePermissions;
  isSystem: boolean;
}

export type Language = 'kh' | 'en';

export interface WishlistItem {
  id: string;
  title: string;
  author: string;
  requesterName: string;
  requestDate: string; // YYYY-MM-DD
  status: 'pending' | 'approved' | 'rejected' | 'purchased' | 'acquired';
  notes?: string;
}
