import React, { useState } from 'react';
import { Book, Category, Language, WishlistItem, User } from '../types';
import { translations } from '../utils/translations';
import { generateBarcodeSVG, generateBookBarcode } from '../utils/barcode';
import { Search, Plus, Edit2, Trash2, Printer, X, Save, Check, Filter, Camera, Tag, QrCode, Heart, ShoppingBag, Loader2, GripVertical, HelpCircle, FolderOpen, ArrowRight, Bell, Mail, Download, Upload } from 'lucide-react';
import CameraPhotoTaker from './CameraPhotoTaker';
import QRCode from 'qrcode';
import { QRCodeSVG } from 'qrcode.react';

const PRESET_COLORS = [
  '#EF4444', // Red/Rose
  '#F59E0B', // Amber/Orange
  '#10B981', // Emerald/Green
  '#14B8A6', // Teal
  '#3B82F6', // Blue
  '#8B5CF6', // Purple/Violet
  '#EC4899', // Pink
  '#64748B', // Slate
];

interface BookManagementProps {
  books: Book[];
  categories: Category[];
  language: Language;
  onAddBook: (book: Book) => void;
  onUpdateBook: (book: Book) => void;
  onDeleteBook: (id: string) => void;
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  wishlist: WishlistItem[];
  onAddWishlist: (item: WishlistItem) => void;
  onUpdateWishlist: (item: WishlistItem) => void;
  onDeleteWishlist: (id: string) => void;
  initialSearchTerm?: string;
  onClearSearch?: () => void;
  currentUser?: User | null;
  onShowSuccess?: (msg: string) => void;
  onShowError?: (msg: string) => void;
}

interface BookQRCodeProps {
  barcode: string;
}

function BookQRCode({ barcode }: BookQRCodeProps) {
  return (
    <QRCodeSVG 
      value={barcode} 
      size={32}
      className="w-8 h-8 rounded border border-slate-200 bg-white shadow-sm"
    />
  );
}

export default function BookManagement({
  books,
  categories,
  language,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  wishlist = [],
  onAddWishlist,
  onUpdateWishlist,
  onDeleteWishlist,
  initialSearchTerm,
  onClearSearch,
  currentUser,
  onShowSuccess,
  onShowError,
}: BookManagementProps) {
  const t = translations[language];
  const isStudent = currentUser?.role === 'student';

  // Category management modal & form states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catCode, setCatCode] = useState('');
  const [catNameKh, setCatNameKh] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catColor, setCatColor] = useState('#3B82F6');
  const [catError, setCatError] = useState('');

  const handleOpenCategoryModal = () => {
    setIsCategoryModalOpen(true);
    resetCategoryForm();
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCatCode('');
    setCatNameKh('');
    setCatNameEn('');
    setCatColor('#3B82F6');
    setCatError('');
  };

  const handleEditCategorySelect = (cat: Category) => {
    setEditingCategory(cat);
    // Extract prefix code from id, e.g. "cat-math" -> "MATH"
    const code = cat.id.replace('cat-', '').toUpperCase();
    setCatCode(code);
    setCatNameKh(cat.nameKh);
    setCatNameEn(cat.nameEn);
    setCatColor(cat.color || '#3B82F6');
    setCatError('');
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');

    if (!catCode.trim() || !catNameKh.trim() || !catNameEn.trim()) {
      setCatError(language === 'kh' ? 'សូមបំពេញព័ត៌មានទាំងអស់!' : 'Please fill all fields!');
      return;
    }

    const cleanCode = catCode.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!cleanCode) {
      setCatError(language === 'kh' ? 'កូដប្រភេទមិនត្រឹមត្រូវ!' : 'Invalid Category Code!');
      return;
    }

    const generatedId = `cat-${cleanCode}`;

    if (editingCategory) {
      // Editing existing category
      onUpdateCategory({
        id: editingCategory.id, // keep original ID
        nameKh: catNameKh.trim(),
        nameEn: catNameEn.trim(),
        color: catColor,
      });
      resetCategoryForm();
    } else {
      // Check if code or ID already exists
      if (categories.some(c => c.id === generatedId)) {
        setCatError(language === 'kh' ? 'កូដប្រភេទនេះមានរួចហើយ!' : 'Category Code already exists!');
        return;
      }

      onAddCategory({
        id: generatedId,
        nameKh: catNameKh.trim(),
        nameEn: catNameEn.trim(),
        color: catColor,
      });
      resetCategoryForm();
    }
  };

  const handleDeleteCategoryClick = (cat: Category) => {
    // Check if any books are associated with this category
    const associatedBooksCount = books.filter(b => b.categoryId === cat.id).length;
    if (associatedBooksCount > 0) {
      alert(
        language === 'kh' 
          ? `មិនអាចលុបប្រភេទនេះបានទេ ព្រោះវាមានសៀវភៅចំនួន ${associatedBooksCount} ក្បាលនៅក្នុងនោះ!` 
          : `Cannot delete this category because it has ${associatedBooksCount} books in it!`
      );
      return;
    }

    if (confirm(language === 'kh' ? `តើអ្នកពិតជាចង់លុបប្រភេទ "${cat.nameKh}" នេះមែនទេ?` : `Are you sure you want to delete category "${cat.nameEn}"?`)) {
      onDeleteCategory(cat.id);
      resetCategoryForm();
    }
  };

  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  React.useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Tab control
  const [activeTab, setActiveTab] = useState<'inventory' | 'categories-drag' | 'wishlist'>('inventory');

  // Drag and Drop Category Organizer States
  const [dragSearchTerm, setDragSearchTerm] = useState('');
  const [dragCategoryFilter, setDragCategoryFilter] = useState('all');
  const [activeDragOverCat, setActiveDragOverCat] = useState<string | null>(null);
  const [draggedBookId, setDraggedBookId] = useState<string | null>(null);

  // Wishlist Search and Filter state
  const [wishlistSearch, setWishlistSearch] = useState('');
  const [wishlistStatusFilter, setWishlistStatusFilter] = useState('all');

  // Wishlist modal state
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isWishlistEditMode, setIsWishlistEditMode] = useState(false);
  const [editingWishlistId, setEditingWishlistId] = useState<string | null>(null);

  // Wishlist Form Fields
  const [wishlistTitle, setWishlistTitle] = useState('');
  const [wishlistAuthor, setWishlistAuthor] = useState('');
  const [wishlistRequester, setWishlistRequester] = useState('');
  const [wishlistStatus, setWishlistStatus] = useState<'pending' | 'approved' | 'rejected' | 'purchased' | 'acquired'>('pending');
  const [wishlistNotes, setWishlistNotes] = useState('');

  const openAddWishlistModal = () => {
    setIsWishlistEditMode(false);
    setEditingWishlistId(null);
    setWishlistTitle('');
    setWishlistAuthor('');
    setWishlistRequester('');
    setWishlistStatus('pending');
    setWishlistNotes('');
    setIsWishlistModalOpen(true);
  };

  const openEditWishlistModal = (item: WishlistItem) => {
    setIsWishlistEditMode(true);
    setEditingWishlistId(item.id);
    setWishlistTitle(item.title);
    setWishlistAuthor(item.author);
    setWishlistRequester(item.requesterName);
    setWishlistStatus(item.status);
    setWishlistNotes(item.notes || '');
    setIsWishlistModalOpen(true);
  };

  const handleSaveWishlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishlistTitle.trim() || !wishlistAuthor.trim() || !wishlistRequester.trim()) return;

    if (isWishlistEditMode && editingWishlistId) {
      onUpdateWishlist({
        id: editingWishlistId,
        title: wishlistTitle.trim(),
        author: wishlistAuthor.trim(),
        requesterName: wishlistRequester.trim(),
        requestDate: wishlist.find(w => w.id === editingWishlistId)?.requestDate || new Date().toISOString().split('T')[0],
        status: wishlistStatus,
        notes: wishlistNotes.trim() || undefined
      });
    } else {
      const newItem: WishlistItem = {
        id: `wish-${Date.now()}`,
        title: wishlistTitle.trim(),
        author: wishlistAuthor.trim(),
        requesterName: wishlistRequester.trim(),
        requestDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: wishlistNotes.trim() || undefined
      };
      onAddWishlist(newItem);
    }
    setIsWishlistModalOpen(false);
  };

  const handleDeleteWishlistClick = (id: string, titleStr: string) => {
    if (confirm(language === 'kh' ? `តើអ្នកពិតជាចង់លុបសៀវភៅ "${titleStr}" នេះពីបញ្ជីចង់បានមែនទេ?` : `Are you sure you want to delete "${titleStr}" from wishlist?`)) {
      onDeleteWishlist(id);
    }
  };

  const handleConvertToBook = (item: WishlistItem) => {
    setIsEditMode(false);
    setEditingBookId(null);
    setTitle(item.title);
    setAuthor(item.author);
    setCategoryId(categories[0]?.id || '');
    setPublishYear(new Date().getFullYear());
    setLocation('');
    setStatus('available');
    setCoverImage('');
    setIsModalOpen(true);
  };

  const filteredWishlist = wishlist.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(wishlistSearch.toLowerCase()) ||
      item.author.toLowerCase().includes(wishlistSearch.toLowerCase()) ||
      item.requesterName.toLowerCase().includes(wishlistSearch.toLowerCase());
    
    const matchesStatus = wishlistStatusFilter === 'all' || item.status === wishlistStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const keepFormOpenRef = React.useRef(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [author, setAuthor] = useState('');
  const [publishYear, setPublishYear] = useState(new Date().getFullYear());
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'available' | 'borrowed' | 'lost' | 'overdue'>('available');
  const [coverImage, setCoverImage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [photoTarget, setPhotoTarget] = useState<'cover' | 'additional'>('cover');
  const [isPhotoTakerOpen, setIsPhotoTakerOpen] = useState(false);

  // Barcode View modal state
  const [barcodeViewBook, setBarcodeViewBook] = useState<Book | null>(null);
  const [printCodeType, setPrintCodeType] = useState<'barcode' | 'qr'>('qr');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Customizable QR code options
  const [qrFormat, setQrFormat] = useState<'barcode' | 'rich-text' | 'json'>('barcode');
  const [qrColor, setQrColor] = useState<string>('#1e293b'); // default Slate

  // Bulk Label Print options
  const [isBulkPrintModalOpen, setIsBulkPrintModalOpen] = useState(false);
  const [selectedBulkBookIds, setSelectedBulkBookIds] = useState<string[]>([]);
  const [bulkPrintType, setBulkPrintType] = useState<'qr' | 'barcode' | 'both'>('qr');
  const [bulkLabelSize, setBulkLabelSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [bulkCategoryFilter, setBulkCategoryFilter] = useState<string>('all');
  const [bulkSearchQuery, setBulkSearchQuery] = useState<string>('');

  // Email Return Alert states
  const [alertBook, setAlertBook] = useState<Book | null>(null);
  const [alertEmail, setAlertEmail] = useState('');
  const [alertNotes, setAlertNotes] = useState('');
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // CSV Bulk Import for Books
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsingError, setCsvParsingError] = useState<string | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);

  const openAlertModal = (book: Book) => {
    setAlertBook(book);
    setAlertEmail(book.notificationEmail || 'librarian@school.edu');
    setAlertNotes(book.notificationNotes || '');
    setIsAlertModalOpen(true);
  };

  const handleSaveAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertBook) return;

    if (!alertEmail.trim()) {
      alert(language === 'kh' ? 'សូមបញ្ចូលអ៊ីមែល!' : 'Please enter an email address!');
      return;
    }

    onUpdateBook({
      ...alertBook,
      notificationEmail: alertEmail.trim(),
      notificationNotes: alertNotes.trim() || undefined
    });

    setIsAlertModalOpen(false);
    setAlertBook(null);
  };

  const handleRemoveAlert = (book: Book) => {
    onUpdateBook({
      ...book,
      notificationEmail: undefined,
      notificationNotes: undefined
    });

    setIsAlertModalOpen(false);
    setAlertBook(null);
  };

  const getQRContent = (book: Book, format: 'barcode' | 'rich-text' | 'json') => {
    if (format === 'json') {
      return JSON.stringify({
        id: book.id,
        barcode: book.barcode,
        title: book.title,
        author: book.author,
        location: book.location || ''
      });
    } else if (format === 'rich-text') {
      return `Hun Sen Andoung Meas High School Library\nBook: ${book.title}\nAuthor: ${book.author}\nBarcode: ${book.barcode}\nLocation: ${book.location || 'N/A'}`;
    }
    return book.barcode; // Default standard barcode tracker
  };

  const handleDownloadQR = (book: Book) => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `QR_${book.barcode}_${book.title.replace(/[^a-zA-Z0-9-]/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadBookQRDirect = (book: Book) => {
    QRCode.toDataURL(book.barcode, { 
      margin: 1, 
      width: 400,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    })
      .then((url) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `QR_${book.barcode}_${book.title.replace(/[^a-zA-Z0-9-]/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => console.error(err));
  };

  React.useEffect(() => {
    if (barcodeViewBook) {
      const content = getQRContent(barcodeViewBook, qrFormat);
      QRCode.toDataURL(content, { 
        margin: 1, 
        width: 300,
        color: {
          dark: qrColor,
          light: '#ffffff'
        }
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error(err));
    } else {
      setQrCodeDataUrl('');
    }
  }, [barcodeViewBook, qrFormat, qrColor]);

  const handlePrintBulk = async () => {
    const selectedBooks = books.filter(b => selectedBulkBookIds.includes(b.id));
    if (selectedBooks.length === 0) return;

    // Generate QR code URLs for all selected books
    const qrCodesWithBooks = await Promise.all(
      selectedBooks.map(async (book) => {
        const content = getQRContent(book, bulkPrintType === 'barcode' ? 'barcode' : 'rich-text');
        try {
          const url = await QRCode.toDataURL(content, { margin: 1, width: 200 });
          return { book, qrUrl: url };
        } catch (err) {
          console.error(err);
          return { book, qrUrl: '' };
        }
      })
    );

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Define label dimensions based on user size preference
      const sizeClasses = {
        sm: { width: '130px', height: '150px', fontSize: '9px', imgSize: '75px' },
        md: { width: '190px', height: '220px', fontSize: '11px', imgSize: '115px' },
        lg: { width: '250px', height: '290px', fontSize: '13px', imgSize: '165px' }
      }[bulkLabelSize];

      const labelsHtml = qrCodesWithBooks.map(({ book, qrUrl }) => {
        const barcodeSvg = generateBarcodeSVG(book.barcode, 180, 50);
        
        let codeHtml = '';
        if (bulkPrintType === 'qr') {
          codeHtml = `<img src="${qrUrl}" width="${sizeClasses.imgSize}" height="${sizeClasses.imgSize}" style="margin: 6px 0; border-radius: 4px;" />`;
        } else if (bulkPrintType === 'barcode') {
          codeHtml = `<div style="margin: 8px 0; max-width: 100%; display: flex; justify-content: center;">${barcodeSvg}</div>`;
        } else {
          // both
          codeHtml = `
            <img src="${qrUrl}" width="${sizeClasses.imgSize}" height="${sizeClasses.imgSize}" style="margin: 4px 0; border-radius: 4px;" />
            <div style="margin: 4px 0; max-width: 100%; display: flex; justify-content: center; transform: scale(0.85);">${barcodeSvg}</div>
          `;
        }

        return `
          <div class="label-card">
            <div class="school-name">HUN SEN ANDOUNG MEAS HS</div>
            <div class="book-title">${book.title}</div>
            <div class="book-author">By ${book.author}</div>
            ${codeHtml}
            <div class="barcode-text">${book.barcode}</div>
            <div class="book-location">${book.location || 'Shelf: N/A'}</div>
          </div>
        `;
      }).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>Bulk Book Labels Print</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: white;
              }
              .grid {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                justify-content: center;
              }
              .label-card {
                width: ${sizeClasses.width};
                min-height: ${sizeClasses.height};
                border: 1.5px dashed #64748b;
                border-radius: 8px;
                padding: 12px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                text-align: center;
                background: white;
                page-break-inside: avoid;
              }
              .school-name {
                font-size: 7px;
                font-weight: 800;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 2px;
              }
              .book-title {
                font-size: ${sizeClasses.fontSize};
                font-weight: 800;
                color: #0f172a;
                line-height: 1.2;
                max-height: 2.4em;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                margin-bottom: 2px;
              }
              .book-author {
                font-size: 8px;
                font-weight: 500;
                color: #64748b;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
                margin-bottom: 4px;
              }
              .barcode-text {
                font-family: monospace;
                font-size: 9px;
                font-weight: 700;
                background: #f1f5f9;
                padding: 2px 6px;
                border-radius: 4px;
                margin-top: 4px;
                border: 1px solid #e2e8f0;
              }
              .book-location {
                font-size: 8px;
                font-weight: 600;
                color: #475569;
                margin-top: 2px;
              }
              @media print {
                body {
                  padding: 0;
                }
                .label-card {
                  border: 1px solid #000;
                }
              }
            </style>
          </head>
          <body>
            <div class="grid">
              ${labelsHtml}
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

  // Filter books based on criteria
  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || book.categoryId === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || book.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // CSV Parser Helper
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = "";
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
        row.push(currentValue.trim());
        if (row.length > 0 && (row.length > 1 || row[0] !== "")) {
          lines.push(row);
        }
        row = [];
        currentValue = "";
      } else {
        currentValue += char;
      }
    }

    if (currentValue !== "" || row.length > 0) {
      row.push(currentValue.trim());
      if (row.length > 0 && (row.length > 1 || row[0] !== "")) {
        lines.push(row);
      }
    }

    return lines;
  };

  const handleDownloadSampleCsv = () => {
    const headers = language === 'kh'
      ? 'ចំណងជើងសៀវភៅ,អ្នកនិពន្ធ,ឆ្នាំបោះពុម្ព,ប្រភេទសៀវភៅ,ទីតាំងសៀវភៅ\nគណិតវិទ្យា ថ្នាក់ទី១២,ក្រសួងអប់រំ,២០២២,Mathematics,បន្ទប់ A1\nរូបវិទ្យា ថ្នាក់ទី១១,ក្រសួងអប់រំ,២០២១,Science,Shelf B3'
      : 'Book Title,Author,Publish Year,Category Name or ID,Location\nMathematics Grade 12,Ministry of Education,2022,Mathematics,Room A1\nPhysics Grade 11,Ministry of Education,2021,Science,Shelf B3';
    
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'book_bulk_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFileSelect = (file: File) => {
    setCsvFile(file);
    setCsvParsingError(null);
    setCsvPreviewData([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error(language === 'kh' ? 'ឯកសារគ្មានទិន្នន័យ!' : 'File is empty!');

        const rows = parseCSV(text);
        if (rows.length < 2) {
          throw new Error(language === 'kh' ? 'ឯកសារត្រូវមានយ៉ាងហោចណាស់ជួរក្បាល និងទិន្នន័យមួយជួរ!' : 'CSV must contain a header row and at least one data row!');
        }

        const headers = rows[0].map(h => h.toLowerCase());
        
        // Find indices
        const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('ចំណងជើង'));
        const authorIdx = headers.findIndex(h => h.includes('author') || h.includes('អ្នកនិពន្ធ'));
        const yearIdx = headers.findIndex(h => h.includes('year') || h.includes('ឆ្នាំ'));
        const catIdx = headers.findIndex(h => h.includes('category') || h.includes('ប្រភេទ'));
        const locIdx = headers.findIndex(h => h.includes('location') || h.includes('ទីតាំង'));

        if (titleIdx === -1 || authorIdx === -1) {
          throw new Error(language === 'kh' 
            ? 'ឯកសារ CSV ត្រូវតែមានជួរឈរ "ចំណងជើងសៀវភៅ" និង "អ្នកនិពន្ធ"!' 
            : 'CSV must contain at least "Book Title" and "Author" columns!');
        }

        const parsedBooks: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length < 2) continue; // Skip empty rows

          const rowTitle = row[titleIdx];
          const rowAuthor = row[authorIdx] || (language === 'kh' ? 'មិនស្គាល់អ្នកនិពន្ធ' : 'Unknown Author');
          const rowYear = yearIdx !== -1 ? parseInt(row[yearIdx]) || new Date().getFullYear() : new Date().getFullYear();
          const rowCatStr = catIdx !== -1 ? row[catIdx] : '';
          const rowLoc = locIdx !== -1 ? row[locIdx] : '';

          // Match category string to existing categories, or fallback to first category
          let matchedCatId = categories[0]?.id || '';
          if (rowCatStr) {
            const cleanCatStr = rowCatStr.toLowerCase();
            const matchedCat = categories.find(c => 
              c.id.toLowerCase() === cleanCatStr ||
              c.nameEn.toLowerCase() === cleanCatStr ||
              c.nameKh.toLowerCase() === cleanCatStr
            );
            if (matchedCat) {
              matchedCatId = matchedCat.id;
            }
          }

          parsedBooks.push({
            title: rowTitle,
            author: rowAuthor,
            publishYear: rowYear,
            categoryId: matchedCatId,
            location: rowLoc
          });
        }

        if (parsedBooks.length === 0) {
          throw new Error(language === 'kh' ? 'រកមិនឃើញសៀវភៅដែលមានសុពលភាពដើម្បីនាំចូលទេ!' : 'No valid books found to import!');
        }

        setCsvPreviewData(parsedBooks);
      } catch (err: any) {
        setCsvParsingError(err.message || 'Error parsing CSV file');
      }
    };
    reader.onerror = () => {
      setCsvParsingError(language === 'kh' ? 'កំហុសក្នុងការអានឯកសារ!' : 'Error reading file!');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmCsvImport = () => {
    if (csvPreviewData.length === 0) return;

    // Track sequential book count per category to generate correct barcode sequence
    const categoryCounts: { [catId: string]: number } = {};
    categories.forEach(c => {
      categoryCounts[c.id] = books.filter(b => b.categoryId === c.id).length;
    });

    csvPreviewData.forEach((item, index) => {
      const catId = item.categoryId;
      const count = categoryCounts[catId] || 0;
      categoryCounts[catId] = count + 1;

      const cat = categories.find((c) => c.id === catId);
      const prefix = cat ? cat.id.replace('cat-', '').toUpperCase() : 'BK';
      const barcode = generateBookBarcode(prefix, count);

      const newBook: Book = {
        id: `book-${Date.now()}-${index}`,
        title: item.title,
        barcode,
        categoryId: catId,
        author: item.author,
        publishYear: item.publishYear,
        status: 'available',
        location: item.location,
        addedDate: new Date().toISOString().split('T')[0],
        coverImage: '',
        images: [],
      };
      onAddBook(newBook);
    });

    onShowSuccess?.(
      language === 'kh'
        ? `បាននាំចូលសៀវភៅចំនួន ${csvPreviewData.length} ក្បាលដោយជោគជ័យ!`
        : `Successfully imported ${csvPreviewData.length} books!`
    );

    setIsCsvModalOpen(false);
    setCsvFile(null);
    setCsvPreviewData([]);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingBookId(null);
    setTitle('');
    setCategoryId(categories[0]?.id || '');
    setAuthor('');
    setPublishYear(new Date().getFullYear());
    setLocation('');
    setStatus('available');
    setCoverImage('');
    setImages([]);
    setIsModalOpen(true);
  };

  const openEditModal = (book: Book) => {
    setIsEditMode(true);
    setEditingBookId(book.id);
    setTitle(book.title);
    setCategoryId(book.categoryId);
    setAuthor(book.author);
    setPublishYear(book.publishYear);
    setLocation(book.location || '');
    setStatus(book.status);
    setCoverImage(book.coverImage || '');
    setImages(book.images || []);
    setIsModalOpen(true);
  };

  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    if (isEditMode && editingBookId) {
      const existingBook = books.find((b) => b.id === editingBookId);
      if (!existingBook) return;

      onUpdateBook({
        ...existingBook,
        title,
        categoryId,
        author,
        publishYear,
        location,
        status,
        coverImage,
        images,
      });
      setIsModalOpen(false);
    } else {
      // Auto generate barcode based on category prefix
      const cat = categories.find((c) => c.id === categoryId);
      const prefix = cat ? cat.id.replace('cat-', '').toUpperCase() : 'BK';
      const categoryBookCount = books.filter((b) => b.categoryId === categoryId).length;
      const barcode = generateBookBarcode(prefix, categoryBookCount);

      const newBook: Book = {
        id: `book-${Date.now()}`,
        title,
        barcode,
        categoryId,
        author,
        publishYear,
        status: 'available',
        location,
        addedDate: new Date().toISOString().split('T')[0],
        coverImage,
        images,
      };
      onAddBook(newBook);

      if (keepFormOpenRef.current) {
        // Clear only non-reusable fields for fast subsequent data entry
        setTitle('');
        setAuthor('');
        setPublishYear(new Date().getFullYear());
        setLocation('');
        setCoverImage('');
        setImages([]);
      } else {
        setIsModalOpen(false);
      }
    }
  };

  const handlePrintBarcode = (book: Book) => {
    const isQR = printCodeType === 'qr';
    const codeElement = isQR 
      ? `<img src="${qrCodeDataUrl}" width="160" height="160" style="margin-bottom: 10px;" />` 
      : `<div>${generateBarcodeSVG(book.barcode, 300, 100)}</div>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${book.barcode} - ${book.title}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                font-family: sans-serif;
                text-align: center;
              }
              .container {
                border: 2px dashed #000;
                padding: 20px;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              h2 {
                margin: 0 0 10px 0;
                font-size: 16px;
                max-width: 320px;
                word-wrap: break-word;
              }
              p {
                margin: 5px 0 0 0;
                font-size: 12px;
                color: #555;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>${book.title}</h2>
              ${codeElement}
              <p>Hun Sen Andoung Meas High School Library</p>
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

  return (
    <div id="book-management-view" className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-slate-200/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
              : 'bg-white/40 hover:bg-white/60 text-slate-600 border border-slate-200/50'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-white" />
          {language === 'kh' ? 'សៀវភៅក្នុងបណ្ណាល័យ' : 'Library Inventory'}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('categories-drag');
            setDragSearchTerm('');
            setDragCategoryFilter('all');
          }}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'categories-drag'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
              : 'bg-white/40 hover:bg-white/60 text-slate-600 border border-slate-200/50'
          }`}
        >
          <Tag className="w-4 h-4" />
          {language === 'kh' ? 'រៀបចំតាមប្រភេទ (ទាញទម្លាក់)' : 'Category Organizer (Drag & Drop)'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('wishlist')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'wishlist'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/10'
              : 'bg-white/40 hover:bg-white/60 text-slate-600 border border-slate-200/50'
          }`}
        >
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          {language === 'kh' ? 'បញ្ជីចង់បានសៀវភៅ (Wishlist)' : 'Book Wishlist'}
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Search and Filters Header */}
      <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            id="book-search"
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 block w-full rounded-2xl text-slate-800 text-sm focus:outline-none transition glass-input"
          />
        </div>

        {/* Filters and Add Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/45 backdrop-blur px-3 py-1.5 rounded-2xl border border-white/60 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold text-slate-600 focus:outline-none focus:ring-0 py-0 cursor-pointer"
            >
              <option value="all">{language === 'kh' ? 'គ្រប់ប្រភេទ' : 'All Categories'}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {language === 'kh' ? cat.nameKh : cat.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white/45 backdrop-blur px-3 py-1.5 rounded-2xl border border-white/60 shadow-sm">
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold text-slate-600 focus:outline-none focus:ring-0 py-0 cursor-pointer"
            >
              <option value="all">{t.filterStatus}</option>
              <option value="available">{t.available}</option>
              <option value="borrowed">{t.borrowed}</option>
              <option value="overdue">{t.overdue}</option>
              <option value="lost">{t.lost}</option>
            </select>
          </div>

          {!isStudent && (
            <>
              <button
                id="manage-categories-btn"
                onClick={handleOpenCategoryModal}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg transition duration-150 cursor-pointer"
              >
                <Tag className="w-4 h-4 text-blue-300" />
                {language === 'kh' ? 'ប្រភេទសៀវភៅ' : 'Categories'}
              </button>

              <button
                id="bulk-print-labels-btn"
                onClick={() => {
                  setSelectedBulkBookIds([]);
                  setBulkCategoryFilter('all');
                  setBulkSearchQuery('');
                  setIsBulkPrintModalOpen(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg hover:shadow-indigo-500/10 transition duration-150 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-indigo-200" />
                {language === 'kh' ? 'បោះពុម្ពស្លាកជាក្រុម' : 'Bulk Print Labels'}
              </button>

              <button
                id="bulk-import-csv-btn"
                onClick={() => {
                  setCsvFile(null);
                  setCsvParsingError(null);
                  setCsvPreviewData([]);
                  setIsCsvModalOpen(true);
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg hover:shadow-emerald-500/10 transition duration-150 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-200" />
                {language === 'kh' ? 'នាំចូលពី CSV' : 'Bulk Import CSV'}
              </button>

              <button
                id="add-book-btn"
                onClick={openAddModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg hover:shadow-blue-500/10 transition duration-150 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {language === 'kh' ? 'បន្ថែមសៀវភៅ' : 'Add Book'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Book Records Table */}
      <div className="glass-panel rounded-3xl border border-white/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/20">
            <thead className="bg-slate-100/40 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.barcode}</th>
                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'កូដ QR' : 'QR Code'}</th>
                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.bookTitle}</th>
                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.category}</th>
                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.author}</th>
                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.publishYear}</th>
                <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.status}</th>
                <th className="px-6 py-4 text-right text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20 text-sm">
              {filteredBooks.length > 0 ? (
                filteredBooks.map((book) => {
                  const cat = categories.find((c) => c.id === book.categoryId);
                  return (
                    <tr key={book.id} className="hover:bg-white/45 transition">
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-600">
                        <button
                          onClick={() => {
                            setPrintCodeType('barcode');
                            setBarcodeViewBook(book);
                          }}
                          className="hover:text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {book.barcode}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setPrintCodeType('qr');
                              setBarcodeViewBook(book);
                            }}
                            className="cursor-pointer hover:scale-110 transition active:scale-95 flex items-center justify-center"
                            title={language === 'kh' ? 'មើល និងបោះពុម្ពកូដ QR' : 'View and Print QR Code'}
                          >
                            <BookQRCode barcode={book.barcode} />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadBookQRDirect(book)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold hover:underline cursor-pointer flex items-center gap-0.5 px-2 py-0.5 bg-slate-50 border border-slate-200/60 rounded-md shadow-sm hover:bg-white transition"
                            title={language === 'kh' ? 'ទាញយកកូដ QR' : 'Download QR Image'}
                          >
                            <Download className="w-2.5 h-2.5 shrink-0" />
                            <span>{language === 'kh' ? 'ទាញយក' : 'Download'}</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        <div className="flex items-center gap-3">
                          {book.coverImage ? (
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="w-10 h-13 object-cover rounded-lg border border-white/60 shadow-md shrink-0 bg-white"
                            />
                          ) : (
                            <div className="w-10 h-13 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-300 shrink-0 font-bold text-[8px] uppercase text-center p-0.5 leading-none">
                              <span>No</span>
                              <span>Photo</span>
                            </div>
                          )}
                          <div>
                            <p className="line-clamp-2">{book.title}</p>
                            {book.location && (
                              <span className="text-[10px] text-slate-500 font-bold bg-white/50 backdrop-blur px-1.5 py-0.5 rounded border border-white/40 mt-1 inline-block">
                                {book.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cat ? (
                          <span 
                            style={{ 
                              backgroundColor: `${cat.color || '#3B82F6'}15`, 
                              color: cat.color || '#3B82F6',
                              borderColor: `${cat.color || '#3B82F6'}30`
                            }} 
                            className="px-2.5 py-1 text-xs font-black rounded-full border shadow-sm inline-block"
                          >
                            {language === 'kh' ? cat.nameKh : cat.nameEn}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-black rounded-full border border-slate-200 text-slate-500 bg-slate-50 inline-block">
                            Unknown
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-bold">{book.author}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-bold font-mono">{book.publishYear}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-black rounded-full border ${
                          book.status === 'available'
                            ? 'bg-green-100/50 text-green-700 border-green-200/40'
                            : book.status === 'borrowed'
                            ? 'bg-blue-100/50 text-blue-700 border-blue-200/40'
                            : book.status === 'overdue'
                            ? 'bg-red-100/50 text-red-700 border-red-200/40'
                            : 'bg-amber-100/50 text-amber-700 border-amber-200/40'
                        }`}>
                          {book.status === 'available'
                            ? t.available
                            : book.status === 'borrowed'
                            ? t.borrowed
                            : book.status === 'overdue'
                            ? t.overdue
                            : t.lost}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-black space-x-1.5">
                        {(book.status === 'borrowed' || book.status === 'overdue') && (
                          <button
                            onClick={() => openAlertModal(book)}
                            title={book.notificationEmail 
                              ? (language === 'kh' ? `បានកំណត់ជូនដំណឹងអ៊ីមែល៖ ${book.notificationEmail}` : `Email notification set: ${book.notificationEmail}`)
                              : (language === 'kh' ? 'កំណត់ការជូនដំណឹងតាមអ៊ីមែល' : 'Set Email Notification Alert')
                            }
                            className={`p-1.5 backdrop-blur-sm border rounded-lg transition inline-flex items-center cursor-pointer relative ${
                              book.notificationEmail
                                ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 hover:shadow-sm'
                                : 'bg-white/40 border-white/60 text-slate-600 hover:text-indigo-600 hover:bg-white/80'
                            }`}
                          >
                            <Bell className="w-3.5 h-3.5" />
                            {book.notificationEmail && (
                              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-indigo-500 animate-pulse" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setPrintCodeType('qr');
                            setBarcodeViewBook(book);
                          }}
                          title={language === 'kh' ? 'បោះពុម្ពកូដ QR' : 'Print QR Code'}
                          className="p-1.5 bg-white/40 backdrop-blur-sm border border-white/60 text-slate-600 rounded-lg hover:text-indigo-600 hover:bg-white/80 transition inline-flex items-center cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setPrintCodeType('barcode');
                            setBarcodeViewBook(book);
                          }}
                          title={t.printBarcode}
                          className="p-1.5 bg-white/40 backdrop-blur-sm border border-white/60 text-slate-600 rounded-lg hover:text-blue-600 hover:bg-white/80 transition inline-flex items-center cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {!isStudent && (
                          <>
                            <button
                              onClick={() => openEditModal(book)}
                              className="p-1.5 bg-white/40 backdrop-blur-sm border border-white/60 text-slate-600 rounded-lg hover:text-indigo-600 hover:bg-white/80 transition inline-flex items-center cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(language === 'kh' ? 'តើអ្នកប្រាកដជាចង់លុបសៀវភៅនេះមែនទេ?' : 'Are you sure you want to delete this book?')) {
                                  onDeleteBook(book.id);
                                }
                              }}
                              className="p-1.5 bg-white/40 backdrop-blur-sm border border-white/60 text-slate-600 hover:text-red-600 hover:bg-red-50/50 rounded-lg transition inline-flex items-center cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-bold text-xs">
                    {language === 'kh' ? 'មិនរកឃើញសៀវភៅតាមតម្រងឡើយ' : 'No books match the selected criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      ) : activeTab === 'categories-drag' ? (
        <>
          {/* Drag & Drop Category Organizer Workspace */}
          <div className="space-y-6 animate-fade-in">
            {/* Description Card */}
            <div className="glass-panel p-5 rounded-3xl border border-white/60 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50/50">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-indigo-700">
                  <Tag className="w-4 h-4 text-indigo-600 animate-pulse" />
                  {language === 'kh' ? 'កន្លែងរៀបចំសៀវភៅតាមប្រភេទ' : 'Category Assignment Workspace'}
                </h4>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  {language === 'kh' 
                    ? 'ងាយស្រួលគ្រប់គ្រងការរៀបចំសៀវភៅដោយគ្រាន់តែទាញ (Drag) សៀវភៅពីប្រអប់ណាមួយ រួចទម្លាក់ (Drop) ទៅក្នុងប្រអប់ប្រភេទដែលចង់បាន។' 
                    : 'Easily manage and organize library books by dragging any book from the list or other categories, and dropping them into the target category container.'}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100/80 text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {language === 'kh' ? 'ដំណើរការដោយស្វ័យប្រវត្ត' : 'Auto-saving changes'}
                </span>
              </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Books Source Pool (4 cols) */}
              <div className="lg:col-span-4 flex flex-col h-[650px] glass-panel rounded-3xl border border-white/60 shadow-sm overflow-hidden bg-white/30 backdrop-blur-md">
                
                {/* Header */}
                <div className="p-4 border-b border-white/40 bg-slate-100/40 shrink-0">
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <FolderOpen className="w-4 h-4 text-slate-500" />
                    {language === 'kh' ? 'បញ្ជីសៀវភៅសរុប' : 'Books Source Pool'}
                    <span className="ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                      {books.length}
                    </span>
                  </h3>
                  
                  {/* Internal Controls */}
                  <div className="space-y-2">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                      </span>
                      <input
                        type="text"
                        placeholder={language === 'kh' ? 'ស្វែងរកចំណងជើង, អ្នកនិពន្ធ, បារកូដ...' : 'Search books to assign...'}
                        value={dragSearchTerm}
                        onChange={(e) => setDragSearchTerm(e.target.value)}
                        className="pl-9 pr-3 py-2 block w-full rounded-xl text-slate-800 text-xs focus:outline-none transition border border-slate-200 bg-white"
                      />
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-white/70 px-2.5 py-1.5 rounded-xl border border-slate-200">
                      <Filter className="w-3 h-3 text-slate-400" />
                      <select
                        value={dragCategoryFilter}
                        onChange={(e) => setDragCategoryFilter(e.target.value)}
                        className="bg-transparent border-0 text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-0 py-0 cursor-pointer w-full"
                      >
                        <option value="all">{language === 'kh' ? 'បង្ហាញគ្រប់ប្រភេទ' : 'All Category Sources'}</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {language === 'kh' ? cat.nameKh : cat.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Scrollable Book List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] custom-scrollbar">
                  {(() => {
                    const filtered = books.filter(b => {
                      const matchesCategory = dragCategoryFilter === 'all' || b.categoryId === dragCategoryFilter;
                      const matchesSearch = 
                        b.title.toLowerCase().includes(dragSearchTerm.toLowerCase()) || 
                        b.author.toLowerCase().includes(dragSearchTerm.toLowerCase()) ||
                        b.barcode.toLowerCase().includes(dragSearchTerm.toLowerCase());
                      return matchesCategory && matchesSearch;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-10 text-slate-400 font-bold text-xs space-y-2">
                          <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                          <p>{language === 'kh' ? 'មិនរកឃើញសៀវភៅទេ' : 'No books found'}</p>
                        </div>
                      );
                    }

                    return filtered.map((book) => {
                      const isDragged = draggedBookId === book.id;
                      const cat = categories.find(c => c.id === book.categoryId);
                      return (
                        <div
                          key={book.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', book.id);
                            setDraggedBookId(book.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setDraggedBookId(null);
                            setActiveDragOverCat(null);
                          }}
                          className={`flex items-start gap-3 p-2.5 rounded-2xl border transition bg-white/80 hover:bg-white hover:border-slate-300/80 shadow-sm active:scale-98 cursor-grab group select-none ${
                            isDragged ? 'opacity-30 border-dashed border-indigo-300 bg-indigo-50/20' : 'border-slate-200/60'
                          }`}
                        >
                          <div className="flex items-center text-slate-300 group-hover:text-slate-400 shrink-0 self-stretch cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          
                          {book.coverImage ? (
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="w-9 h-12 object-cover rounded-lg border border-slate-200 shadow-sm shrink-0 bg-white"
                            />
                          ) : (
                            <div className="w-9 h-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300 shrink-0 font-extrabold text-[8px] uppercase">
                              No
                            </div>
                          )}

                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="text-xs font-bold text-slate-800 leading-snug truncate group-hover:text-indigo-600 transition" title={book.title}>
                              {book.title}
                            </h4>
                            <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                              {book.author}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                                {book.barcode}
                              </span>
                              {cat && (
                                <span 
                                  style={{ 
                                    backgroundColor: `${cat.color || '#3B82F6'}15`, 
                                    color: cat.color || '#3B82F6',
                                    borderColor: `${cat.color || '#3B82F6'}30`
                                  }} 
                                  className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border"
                                >
                                  {language === 'kh' ? cat.nameKh : cat.nameEn}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end justify-between shrink-0 self-stretch pl-1 gap-1">
                            {(book.status === 'borrowed' || book.status === 'overdue') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAlertModal(book);
                                }}
                                title={book.notificationEmail 
                                  ? (language === 'kh' ? `អ៊ីមែល៖ ${book.notificationEmail}` : `Email: ${book.notificationEmail}`)
                                  : (language === 'kh' ? 'កំណត់អ៊ីមែលជូនដំណឹង' : 'Set email alert')
                                }
                                className={`p-1 rounded-md transition border shrink-0 cursor-pointer ${
                                  book.notificationEmail
                                    ? 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                                }`}
                              >
                                <Bell className="w-3 h-3" />
                              </button>
                            )}
                            {book.status === 'borrowed' && (
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                                {language === 'kh' ? 'ខ្ចី' : 'Borrowed'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Right Column: Interactive Dropzones Grid (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-indigo-500" />
                    {language === 'kh' ? 'ប្រអប់ប្រភេទសម្រាប់ទម្លាក់សៀវភៅ' : 'Category Destination Drop-Zones'}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">
                    {categories.length} {language === 'kh' ? 'ប្រភេទសរុប' : 'Categories Total'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map((category) => {
                    const booksInCat = books.filter(b => b.categoryId === category.id);
                    const isDragOver = activeDragOverCat === category.id;
                    
                    return (
                      <div
                        key={category.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (activeDragOverCat !== category.id) {
                            setActiveDragOverCat(category.id);
                          }
                        }}
                        onDragLeave={() => {
                          setActiveDragOverCat(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const bookId = e.dataTransfer.getData('text/plain') || draggedBookId;
                          if (!bookId) return;
                          
                          const book = books.find(b => b.id === bookId);
                          if (book && book.categoryId !== category.id) {
                            onUpdateBook({
                              ...book,
                              categoryId: category.id
                            });
                          }
                          setDraggedBookId(null);
                          setActiveDragOverCat(null);
                        }}
                        className={`glass-panel p-4 rounded-3xl border transition-all duration-200 flex flex-col h-[300px] shadow-sm select-none relative ${
                          isDragOver 
                            ? 'bg-slate-50/80 shadow-lg scale-[1.01] -translate-y-0.5 font-bold' 
                            : 'bg-white/40 border-white/60 hover:border-slate-300'
                        }`}
                        style={isDragOver ? {
                          borderTop: `4px solid ${category.color || '#3B82F6'}`,
                          borderColor: category.color || '#3B82F6',
                          boxShadow: `0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02), 0 0 0 4px ${(category.color || '#3B82F6')}15`
                        } : {
                          borderTop: `4px solid ${category.color || '#3B82F6'}`
                        }}
                      >
                        {/* Drag Over Active Overlay Effect */}
                        {isDragOver && (
                          <div className="absolute inset-0 bg-white/5 rounded-3xl pointer-events-none flex items-center justify-center animate-pulse z-10">
                            <div 
                              style={{ 
                                backgroundColor: category.color || '#3B82F6',
                                borderColor: `${category.color || '#3B82F6'}d0`
                              }}
                              className="text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-full shadow-lg border flex items-center gap-1.5"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              {language === 'kh' ? 'ទម្លាក់ទីនេះដើម្បីរៀបចំ' : 'Drop Here to Assign'}
                            </div>
                          </div>
                        )}

                        {/* Category Header */}
                        <div className="flex justify-between items-start shrink-0 pb-3 border-b border-slate-200/50 mb-3">
                          <div className="text-left min-w-0 pr-2">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide truncate">
                              {category.nameEn}
                            </h4>
                            <p className="text-xs font-bold text-slate-500 mt-0.5 truncate">
                              {category.nameKh}
                            </p>
                          </div>
                          <span 
                            style={booksInCat.length > 0 ? {
                              backgroundColor: `${category.color || '#3B82F6'}15`,
                              color: category.color || '#3B82F6',
                              borderColor: `${category.color || '#3B82F6'}30`
                            } : undefined}
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 border ${
                              booksInCat.length > 0
                                ? 'font-mono'
                                : 'bg-slate-50 text-slate-400 border-slate-100 font-mono'
                            }`}
                          >
                            {booksInCat.length} {language === 'kh' ? 'ក្បាល' : 'Books'}
                          </span>
                        </div>

                        {/* Inner List: Books inside this category */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {booksInCat.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-[11px] font-bold text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/40 p-4">
                              <HelpCircle className="w-6 h-6 text-slate-300 mb-1" />
                              <p className="leading-tight">
                                {language === 'kh' ? 'ទម្លាក់សៀវភៅចូលទីនេះ' : 'Drop books here'}
                              </p>
                            </div>
                          ) : (
                            booksInCat.map((book) => {
                              const isSelfDragged = draggedBookId === book.id;
                              return (
                                <div
                                  key={book.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', book.id);
                                    setDraggedBookId(book.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                  }}
                                  onDragEnd={() => {
                                    setDraggedBookId(null);
                                    setActiveDragOverCat(null);
                                  }}
                                  className={`flex items-center gap-2.5 p-2 rounded-xl border bg-white border-slate-100 shadow-sm hover:border-slate-300 cursor-grab active:scale-97 select-none transition ${
                                    isSelfDragged ? 'opacity-25 bg-slate-50 border-dashed' : ''
                                  }`}
                                >
                                  <GripVertical className="w-3 h-3 text-slate-300" />
                                  <div className="text-left min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-800 truncate" title={book.title}>
                                      {book.title}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 font-mono">
                                      {book.barcode}
                                    </p>
                                  </div>
                                  {(book.status === 'borrowed' || book.status === 'overdue') && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openAlertModal(book);
                                      }}
                                      title={book.notificationEmail 
                                        ? (language === 'kh' ? `អ៊ីមែល៖ ${book.notificationEmail}` : `Email: ${book.notificationEmail}`)
                                        : (language === 'kh' ? 'កំណត់អ៊ីមែលជូនដំណឹង' : 'Set email alert')
                                      }
                                      className={`p-1 rounded-md transition border shrink-0 cursor-pointer ${
                                        book.notificationEmail
                                          ? 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700'
                                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                                      }`}
                                    >
                                      <Bell className="w-3 h-3" />
                                    </button>
                                  )}
                                  {book.status === 'borrowed' && (
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                                      {language === 'kh' ? 'ខ្ចី' : 'Borrowed'}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </>
      ) : (
        <>
          {/* Wishlist Search & Action Header */}
          <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 animate-fade-in">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                id="wishlist-search"
                type="text"
                placeholder={language === 'kh' ? 'ស្វែងរកសៀវភៅ ឬអ្នកស្នើសុំ...' : 'Search wishlist by book, author or requester...'}
                value={wishlistSearch}
                onChange={(e) => setWishlistSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 block w-full rounded-2xl text-slate-800 text-sm focus:outline-none transition glass-input"
              />
            </div>

            {/* Filters and Add Request Button */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white/45 backdrop-blur px-3 py-1.5 rounded-2xl border border-white/60 shadow-sm">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="wishlist-status-filter"
                  value={wishlistStatusFilter}
                  onChange={(e) => setWishlistStatusFilter(e.target.value)}
                  className="bg-transparent border-0 text-xs font-bold text-slate-600 focus:outline-none focus:ring-0 py-0 cursor-pointer"
                >
                  <option value="all">{language === 'kh' ? 'គ្រប់ស្ថានភាព' : 'All Statuses'}</option>
                  <option value="pending">{language === 'kh' ? 'កំពុងរង់ចាំ (Pending)' : 'Pending'}</option>
                  <option value="approved">{language === 'kh' ? 'បានអនុម័ត (Approved)' : 'Approved'}</option>
                  <option value="rejected">{language === 'kh' ? 'បានបដិសេធ (Rejected)' : 'Rejected'}</option>
                  <option value="purchased">{language === 'kh' ? 'បានទិញរួចរាល់ (Purchased)' : 'Purchased'}</option>
                  <option value="acquired">{language === 'kh' ? 'ទទួលបានរួចរាល់ (Acquired)' : 'Acquired'}</option>
                </select>
              </div>

              <button
                type="button"
                id="add-wishlist-btn"
                onClick={openAddWishlistModal}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg transition duration-150 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {language === 'kh' ? 'បន្ថែមការស្នើសុំ' : 'Add Request'}
              </button>
            </div>
          </div>

          {/* Wishlist Records Table */}
          <div className="glass-panel rounded-3xl border border-white/60 shadow-sm overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/20">
                <thead className="bg-slate-100/40 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'សៀវភៅដែលចង់បាន' : 'Requested Book'}</th>
                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'អ្នកនិពន្ធ' : 'Author'}</th>
                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'អ្នកស្នើសុំ' : 'Requester Name'}</th>
                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'ថ្ងៃស្នើសុំ' : 'Request Date'}</th>
                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'ស្ថានភាព' : 'Status'}</th>
                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'កំណត់សម្គាល់' : 'Notes'}</th>
                    <th className="px-6 py-4 text-right text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'សកម្មភាព' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20 text-sm">
                  {filteredWishlist.length > 0 ? (
                    filteredWishlist.map((item) => (
                      <tr key={item.id} className="hover:bg-white/45 transition">
                        <td className="px-6 py-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0 fill-rose-500/20" />
                            <span>{item.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-bold">{item.author}</td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">{item.requesterName}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{item.requestDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-black rounded-full border ${
                            item.status === 'acquired'
                              ? 'bg-teal-100/50 text-teal-700 border-teal-200/40'
                              : item.status === 'purchased'
                              ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200/40'
                              : item.status === 'approved'
                              ? 'bg-blue-100/50 text-blue-700 border-blue-200/40'
                              : item.status === 'rejected'
                              ? 'bg-red-100/50 text-red-700 border-red-200/40'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {item.status === 'acquired'
                              ? (language === 'kh' ? 'ទទួលបានរួចរាល់' : 'Acquired')
                              : item.status === 'purchased'
                              ? (language === 'kh' ? 'បានទិញរួច' : 'Purchased')
                              : item.status === 'approved'
                              ? (language === 'kh' ? 'បានអនុម័ត' : 'Approved')
                              : item.status === 'rejected'
                              ? (language === 'kh' ? 'បានបដិសេធ' : 'Rejected')
                              : (language === 'kh' ? 'កំពុងពិនិត្យ' : 'Pending')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate" title={item.notes}>
                          {item.notes || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-black space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleConvertToBook(item)}
                            title={language === 'kh' ? 'ចុះឈ្មោះជាសៀវភៅពិតប្រាកដ' : 'Register as a standard library book'}
                            className="p-1.5 bg-white/45 backdrop-blur-sm border border-white/60 text-emerald-600 rounded-lg hover:bg-emerald-50 transition inline-flex items-center cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditWishlistModal(item)}
                            title={language === 'kh' ? 'កែសម្រួលព័ត៌មាន' : 'Edit requested book info'}
                            className="p-1.5 bg-white/45 backdrop-blur-sm border border-white/60 text-slate-600 rounded-lg hover:text-indigo-600 hover:bg-white transition inline-flex items-center cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWishlistClick(item.id, item.title)}
                            title={language === 'kh' ? 'លុបចេញ' : 'Delete request'}
                            className="p-1.5 bg-white/45 backdrop-blur-sm border border-white/60 text-slate-600 hover:text-red-600 hover:bg-red-50/50 rounded-lg transition inline-flex items-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 font-bold text-xs">
                        {language === 'kh' ? 'មិនរកឃើញសៀវភៅចង់បានឡើយ' : 'No wishlist items found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-heavy rounded-3xl max-w-lg w-full shadow-2xl border border-white/80 overflow-hidden transform transition duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/40 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {isEditMode 
                  ? (language === 'kh' ? 'កែសម្រួលព័ត៌មានសៀវភៅ' : 'Edit Book Information')
                  : (language === 'kh' ? 'បន្ថែមសៀវភៅថ្មី' : 'Add New Book')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 rounded-full p-1 bg-white/40 hover:bg-white/70 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveBook} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.bookTitle} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={language === 'kh' ? 'បញ្ចូលចំណងជើងសៀវភៅ' : 'Enter book title'}
                  className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.category} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition cursor-pointer glass-input"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {language === 'kh' ? cat.nameKh : cat.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.publishYear} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1900}
                    max={2030}
                    value={publishYear}
                    onChange={(e) => setPublishYear(parseInt(e.target.value) || 2026)}
                    className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm font-mono focus:outline-none transition glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.author} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={language === 'kh' ? 'ក្រសួងអប់រំ...' : 'Ministry of Education...'}
                    className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.location}
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Shelf A1"
                    className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input"
                  />
                </div>
              </div>

              {isEditMode && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.status}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition cursor-pointer glass-input"
                  >
                    <option value="available">{t.available}</option>
                    <option value="borrowed">{t.borrowed}</option>
                    <option value="lost">{t.lost}</option>
                  </select>
                </div>
              )}

              {/* Book cover photo section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {language === 'kh' ? 'រូបភាពគម្របសៀវភៅ' : 'Book Cover'}
                </label>
                <div className="flex items-center gap-4 bg-white/20 backdrop-blur-sm border border-white/60 p-3.5 rounded-2xl">
                  {coverImage ? (
                    <div className="relative shrink-0">
                      <img
                        src={coverImage}
                        alt="Captured Cover"
                        className="w-16 h-20 object-cover rounded-xl border border-white/60 shadow-md bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setCoverImage('')}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition shadow cursor-pointer"
                        title={language === 'kh' ? 'លុបរូបថត' : 'Delete photo'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-20 rounded-xl border border-dashed border-slate-300 bg-white/40 flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <Camera className="w-5 h-5 text-slate-300" />
                      <span className="text-[8px] font-bold uppercase mt-1 text-slate-400">No Photo</span>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoTarget('cover');
                        setIsPhotoTakerOpen(true);
                      }}
                      className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition cursor-pointer"
                    >
                      {language === 'kh' ? 'ប្រើកាមេរ៉ា' : 'Use Camera'}
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCoverImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="cover-upload"
                    />
                    <label
                      htmlFor="cover-upload"
                      className="cursor-pointer text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 transition text-center"
                    >
                      {language === 'kh' ? 'ជ្រើសរើសរូបភាព' : 'Select Image'}
                    </label>
                  </div>
                </div>
              </div>

              {/* Additional Photos Section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  {language === 'kh' ? 'រូបភាពបន្ថែមច្រើនទៀត (រូបទំព័រក្នង, បារកូដ, ...)' : 'Additional Photos (Pages, barcode, status)'}
                  <span className="text-[10px] text-slate-400 font-normal lowercase">
                    ({images.length} {language === 'kh' ? 'រូបភាព' : 'photos'})
                  </span>
                </label>
                
                <div className="space-y-3 p-4 bg-white/20 backdrop-blur-sm border border-white/60 rounded-2xl">
                  {/* Thumbnails grid */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2.5">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-[3/4] bg-white rounded-xl border border-slate-200/60 overflow-hidden shadow-sm group">
                          <img
                            src={img}
                            alt={`Additional ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImages(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition shadow-md opacity-90 hover:opacity-100 cursor-pointer"
                            title={language === 'kh' ? 'លុបរូបភាពនេះ' : 'Remove image'}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Drag-and-drop & browse area */}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImages(prev => [...prev, reader.result as string]);
                          };
                          reader.readAsDataURL(file);
                        });
                      }}
                      className="hidden"
                      id="additional-images-upload"
                    />
                    <label
                      htmlFor="additional-images-upload"
                      className="flex-1 cursor-pointer flex flex-col items-center justify-center p-3 border border-dashed border-slate-300 hover:border-indigo-400 bg-white/50 hover:bg-white rounded-xl transition text-center space-y-1 group"
                    >
                      <Upload className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      <span className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-600">
                        {language === 'kh' ? 'ជ្រើសរើសរូបភាពច្រើន' : 'Upload Multiple'}
                      </span>
                      <span className="text-[8px] text-slate-400">
                        {language === 'kh' ? 'រូបភាពទំព័រមាតិកា ឬស្ថានភាពសៀវភៅ' : 'Index page or book condition'}
                      </span>
                    </label>

                    {/* Camera snapshot option for additional images */}
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoTarget('additional');
                        setIsPhotoTakerOpen(true);
                      }}
                      className="cursor-pointer text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition text-center flex flex-col justify-center items-center gap-1 shrink-0 w-20"
                    >
                      <Camera className="w-4 h-4 text-indigo-500" />
                      <span className="text-[10px] font-bold">{language === 'kh' ? 'ថតរូប' : 'Camera'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Informative info about barcode */}
              {!isEditMode && (
                <div className="bg-blue-50/60 backdrop-blur rounded-xl p-3 text-xs text-blue-800 font-bold border border-white/40 flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    {language === 'kh' 
                      ? 'បារកូដ (Barcode) នឹងត្រូវបានបង្កើតដោយស្វ័យប្រវត្តិតាមលំដាប់លំដោយមុខវិជ្ជា!' 
                      : 'The book barcode will be generated automatically based on subject sequence!'}
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
                {!isEditMode && (
                  <button
                    type="submit"
                    onClick={() => { keepFormOpenRef.current = true; }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {language === 'kh' ? 'រក្សាទុក និងបន្ថែមថ្មីទៀត' : 'Save & Add New'}
                  </button>
                )}
                <button
                  type="submit"
                  onClick={() => { keepFormOpenRef.current = false; }}
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

      {/* Wishlist Add / Edit Modal Overlay */}
      {isWishlistModalOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-heavy rounded-3xl max-w-lg w-full shadow-2xl border border-white/80 overflow-hidden transform transition duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/40 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {isWishlistEditMode 
                  ? (language === 'kh' ? 'កែសម្រួលការស្នើសុំសៀវភៅ' : 'Edit Book Wishlist Request')
                  : (language === 'kh' ? 'បន្ថែមការស្នើសុំសៀវភៅថ្មី' : 'Add New Wishlist Request')}
              </h3>
              <button
                type="button"
                onClick={() => setIsWishlistModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 rounded-full p-1 bg-white/40 hover:bg-white/70 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveWishlist} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'kh' ? 'ចំណងជើងសៀវភៅដែលចង់បាន' : 'Requested Book Title'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={wishlistTitle}
                  onChange={(e) => setWishlistTitle(e.target.value)}
                  placeholder="e.g. Physics Grade 12"
                  className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'kh' ? 'អ្នកនិពន្ធ / ស្ថាប័ន' : 'Author / Publisher'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={wishlistAuthor}
                  onChange={(e) => setWishlistAuthor(e.target.value)}
                  placeholder="e.g. Ministry of Education"
                  className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'kh' ? 'ឈ្មោះសិស្ស/បណ្ណារក្សដែលស្នើសុំ' : 'Requester Name (Student/Librarian)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={wishlistRequester}
                  onChange={(e) => setWishlistRequester(e.target.value)}
                  placeholder="e.g. Sok Kimhour"
                  className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input"
                />
              </div>

              {isWishlistEditMode && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'kh' ? 'ស្ថានភាពការស្នើសុំ' : 'Request Status'}
                  </label>
                  <select
                    value={wishlistStatus}
                    onChange={(e) => setWishlistStatus(e.target.value as any)}
                    className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition cursor-pointer glass-input"
                  >
                    <option value="pending">{language === 'kh' ? 'កំពុងរង់ចាំ (Pending)' : 'Pending'}</option>
                    <option value="approved">{language === 'kh' ? 'បានអនុម័ត (Approved)' : 'Approved'}</option>
                    <option value="rejected">{language === 'kh' ? 'បានបដិសេធ (Rejected)' : 'Rejected'}</option>
                    <option value="purchased">{language === 'kh' ? 'បានទិញរួចរាល់ (Purchased)' : 'Purchased'}</option>
                    <option value="acquired">{language === 'kh' ? 'ទទួលបានរួចរាល់ (Acquired)' : 'Acquired'}</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'kh' ? 'កំណត់សម្គាល់បន្ថែម' : 'Optional Notes'}
                </label>
                <textarea
                  value={wishlistNotes}
                  onChange={(e) => setWishlistNotes(e.target.value)}
                  placeholder="e.g. Needed for Grade 12 national exam prep"
                  rows={3}
                  className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-sm focus:outline-none transition glass-input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/40">
                <button
                  type="button"
                  onClick={() => setIsWishlistModalOpen(false)}
                  className="px-4 py-2 border border-white/60 hover:bg-white/40 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer bg-white/20 backdrop-blur"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-rose-500/10"
                >
                  <Save className="w-3.5 h-3.5" />
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode View / Preview Modal Overlay */}
      {barcodeViewBook && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-heavy rounded-3xl max-w-sm w-full shadow-2xl border border-white/80 overflow-hidden transform transition duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/40 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {printCodeType === 'qr' ? (language === 'kh' ? 'បោះពុម្ពកូដ QR' : 'Print QR Code') : t.printBarcode}
              </h3>
              <button
                onClick={() => setBarcodeViewBook(null)}
                className="text-slate-500 hover:text-slate-800 rounded-full p-1 bg-white/40 hover:bg-white/70 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
 
            {/* Barcode Body */}
            <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{t.schoolName}</span>
              <p className="text-sm font-black text-slate-800 max-w-xs">{barcodeViewBook.title}</p>
              
              {/* Type Switcher */}
              <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40 w-full">
                <button
                  type="button"
                  onClick={() => setPrintCodeType('qr')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    printCodeType === 'qr'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-750'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  {language === 'kh' ? 'កូដ QR' : 'QR Code'}
                </button>
                <button
                  type="button"
                  onClick={() => setPrintCodeType('barcode')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    printCodeType === 'barcode'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-750'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  {language === 'kh' ? 'បារកូដ' : 'Barcode'}
                </button>
              </div>
 
              {printCodeType === 'qr' ? (
                /* QR Code Rendering */
                <div className="border border-white/60 p-4 rounded-2xl shadow-inner bg-white/30 backdrop-blur-sm flex flex-col items-center justify-center w-full">
                  {qrCodeDataUrl ? (
                    <div className="relative group">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="QR Code" 
                        className="w-40 h-40 object-contain rounded-lg border border-slate-200 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleDownloadQR(barcodeViewBook)}
                        className="absolute bottom-2 right-2 p-1.5 bg-slate-950/85 hover:bg-slate-950 text-white rounded-lg transition shadow-md backdrop-blur-sm cursor-pointer flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider"
                        title={language === 'kh' ? 'ទាញយកកូដ QR' : 'Download QR Image'}
                      >
                        <Save className="w-3.5 h-3.5" />
                        {language === 'kh' ? 'ទាញយក' : 'Download'}
                      </button>
                    </div>
                  ) : (
                    <div className="w-40 h-40 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                      {language === 'kh' ? 'កំពុងបង្កើត QR...' : 'Generating QR...'}
                    </div>
                  )}
                  <span className="mt-2 font-mono font-black text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {barcodeViewBook.barcode}
                  </span>
                </div>
              ) : (
                /* Render dynamic Barcode via SVG */
                <div 
                  className="border border-white/60 p-4 rounded-2xl shadow-inner bg-white/30 backdrop-blur-sm flex items-center justify-center w-full"
                  dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(barcodeViewBook.barcode, 260, 85) }}
                />
              )}

              {printCodeType === 'qr' && (
                <div className="w-full space-y-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/50 text-left">
                  {/* Format Selector */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      {language === 'kh' ? 'ទិន្នន័យក្នុងកូដ QR' : 'QR Code Data Content'}
                    </label>
                    <select
                      value={qrFormat}
                      onChange={(e) => setQrFormat(e.target.value as any)}
                      className="px-3 py-1.5 block w-full rounded-xl text-slate-800 text-xs font-bold focus:outline-none transition border border-slate-200 bg-white"
                    >
                      <option value="barcode">{language === 'kh' ? 'តែលេខបារកូដ (ឧ. MATH-001)' : 'Barcode Only (e.g., MATH-001)'}</option>
                      <option value="rich-text">{language === 'kh' ? 'ព័ត៌មានលម្អិតសៀវភៅ' : 'Book Details Card (Text)'}</option>
                      <option value="json">{language === 'kh' ? 'កូដទិន្នន័យ JSON (ម៉ាស៊ីនស្កេន)' : 'JSON Schema (Digital Scan)'}</option>
                    </select>
                  </div>

                  {/* Color Selector */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      {language === 'kh' ? 'ពណ៌កូដ QR' : 'QR Code Theme Color'}
                    </label>
                    <div className="flex gap-2.5">
                      {[
                        { name: 'Slate', value: '#1e293b' },
                        { name: 'Blue', value: '#2563eb' },
                        { name: 'Indigo', value: '#4f46e5' },
                        { name: 'Emerald', value: '#059669' },
                        { name: 'Crimson', value: '#dc2626' }
                      ].map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setQrColor(c.value)}
                          className={`w-6 h-6 rounded-full border-2 transition relative cursor-pointer ${
                            qrColor === c.value ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        >
                          {qrColor === c.value && (
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold font-sans">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
 
              <p className="text-xs text-slate-500 font-bold">
                {language === 'kh' ? 'ទីតាំង៖' : 'Shelf Location:'} <b className="text-slate-800">{barcodeViewBook.location || 'N/A'}</b>
              </p>
            </div>
 
            {/* Footer Buttons */}
            <div className="p-4 bg-white/30 backdrop-blur-md border-t border-white/40 flex justify-end gap-2">
              <button
                onClick={() => setBarcodeViewBook(null)}
                className="px-4 py-2 border border-white/60 hover:bg-white/40 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer bg-white/20 backdrop-blur"
              >
                {t.cancel}
              </button>
              {printCodeType === 'qr' && (
                <button
                  type="button"
                  onClick={() => handleDownloadQR(barcodeViewBook)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  <Download className="w-3.5 h-3.5" />
                  {language === 'kh' ? 'ទាញយកកូដ QR' : 'Download QR'}
                </button>
              )}
              <button
                onClick={() => handlePrintBarcode(barcodeViewBook)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-500/10"
              >
                {printCodeType === 'qr' ? <QrCode className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
                {printCodeType === 'qr' ? (language === 'kh' ? 'បោះពុម្ព QR' : 'Print QR') : t.printBarcode}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Labels Print Modal Overlay */}
      {isBulkPrintModalOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-heavy rounded-3xl max-w-2xl w-full shadow-2xl border border-white/80 overflow-hidden transform transition duration-200 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/40 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600 animate-pulse" />
                {language === 'kh' ? 'បោះពុម្ពស្លាកជាក្រុម (QR / Barcode)' : 'Bulk Print Labels (QR & Barcode)'}
              </h3>
              <button
                onClick={() => setIsBulkPrintModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 rounded-full p-1 bg-white/40 hover:bg-white/70 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Print Settings & Filtering Options */}
            <div className="p-5 border-b border-white/40 bg-slate-50/70 shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  {language === 'kh' ? 'ប្រភេទបោះពុម្ព' : 'Label Output Type'}
                </label>
                <select
                  value={bulkPrintType}
                  onChange={(e) => setBulkPrintType(e.target.value as any)}
                  className="px-3 py-2 block w-full rounded-xl text-slate-800 text-xs font-bold focus:outline-none transition border border-slate-200 bg-white"
                >
                  <option value="qr">{language === 'kh' ? 'កូដ QR ព័ត៌មានលម្អិត' : 'Rich QR Codes Only'}</option>
                  <option value="barcode">{language === 'kh' ? 'បារកូដជាសកល' : 'Standard Barcodes Only'}</option>
                  <option value="both">{language === 'kh' ? 'ទាំងពីរ (QR & Barcode)' : 'Combo (QR + Barcode)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  {language === 'kh' ? 'ទំហំស្លាកបិទ' : 'Label Sticker Size'}
                </label>
                <select
                  value={bulkLabelSize}
                  onChange={(e) => setBulkLabelSize(e.target.value as any)}
                  className="px-3 py-2 block w-full rounded-xl text-slate-800 text-xs font-bold focus:outline-none transition border border-slate-200 bg-white"
                >
                  <option value="sm">{language === 'kh' ? 'តូច (Small Label)' : 'Small (Compact)'}</option>
                  <option value="md">{language === 'kh' ? 'មធ្យម (Medium Label)' : 'Medium (Standard)'}</option>
                  <option value="lg">{language === 'kh' ? 'ធំ (Large Label)' : 'Large (High Detail)'}</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handlePrintBulk}
                  disabled={selectedBulkBookIds.length === 0}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-500/10 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  {language === 'kh' ? `បោះពុម្ព (${selectedBulkBookIds.length})` : `Print Labels (${selectedBulkBookIds.length})`}
                </button>
              </div>
            </div>

            {/* Live Filter / Search within modal */}
            <div className="p-4 bg-white/20 border-b border-white/20 shrink-0 flex gap-3">
              <input
                type="text"
                placeholder={language === 'kh' ? 'ស្វែងរកសៀវភៅក្នុងបញ្ជី...' : 'Quick find book...'}
                value={bulkSearchQuery}
                onChange={(e) => setBulkSearchQuery(e.target.value)}
                className="px-3 py-1.5 block flex-1 rounded-xl text-slate-800 text-xs focus:outline-none border border-slate-200/60 bg-white/70"
              />
              <select
                value={bulkCategoryFilter}
                onChange={(e) => setBulkCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-slate-800 text-xs border border-slate-200/60 bg-white/70 font-bold focus:outline-none"
              >
                <option value="all">{language === 'kh' ? 'គ្រប់ប្រភេទសៀវភៅ' : 'All Categories'}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {language === 'kh' ? cat.nameKh : cat.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Book Selection List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30">
              {/* Select All Row */}
              <div className="flex items-center justify-between p-2.5 bg-white/50 backdrop-blur-sm rounded-xl border border-white/60">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    checked={
                      books.filter(b => {
                        const matchesCategory = bulkCategoryFilter === 'all' || b.categoryId === bulkCategoryFilter;
                        const matchesSearch = b.title.toLowerCase().includes(bulkSearchQuery.toLowerCase()) || b.barcode.toLowerCase().includes(bulkSearchQuery.toLowerCase());
                        return matchesCategory && matchesSearch;
                      }).length > 0 &&
                      books.filter(b => {
                        const matchesCategory = bulkCategoryFilter === 'all' || b.categoryId === bulkCategoryFilter;
                        const matchesSearch = b.title.toLowerCase().includes(bulkSearchQuery.toLowerCase()) || b.barcode.toLowerCase().includes(bulkSearchQuery.toLowerCase());
                        return matchesCategory && matchesSearch;
                      }).every(b => selectedBulkBookIds.includes(b.id))
                    }
                    onChange={(e) => {
                      const visibleBooks = books.filter(b => {
                        const matchesCategory = bulkCategoryFilter === 'all' || b.categoryId === bulkCategoryFilter;
                        const matchesSearch = b.title.toLowerCase().includes(bulkSearchQuery.toLowerCase()) || b.barcode.toLowerCase().includes(bulkSearchQuery.toLowerCase());
                        return matchesCategory && matchesSearch;
                      });
                      if (e.target.checked) {
                        const allCombined = Array.from(new Set([...selectedBulkBookIds, ...visibleBooks.map(b => b.id)]));
                        setSelectedBulkBookIds(allCombined);
                      } else {
                        const removed = selectedBulkBookIds.filter(id => !visibleBooks.some(vb => vb.id === id));
                        setSelectedBulkBookIds(removed);
                      }
                    }}
                  />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                    {language === 'kh' ? 'ជ្រើសរើសទាំងអស់ក្នុងបញ្ជីនេះ' : 'Select All matching search'}
                  </span>
                </label>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  {selectedBulkBookIds.length} / {books.length} {language === 'kh' ? 'បានជ្រើសរើស' : 'Selected'}
                </span>
              </div>

              {/* Individual Books */}
              {books
                .filter(b => {
                  const matchesCategory = bulkCategoryFilter === 'all' || b.categoryId === bulkCategoryFilter;
                  const matchesSearch = b.title.toLowerCase().includes(bulkSearchQuery.toLowerCase()) || b.barcode.toLowerCase().includes(bulkSearchQuery.toLowerCase()) || b.author.toLowerCase().includes(bulkSearchQuery.toLowerCase());
                  return matchesCategory && matchesSearch;
                })
                .map((book) => {
                  const isChecked = selectedBulkBookIds.includes(book.id);
                  return (
                    <div
                      key={book.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedBulkBookIds(selectedBulkBookIds.filter(id => id !== book.id));
                        } else {
                          setSelectedBulkBookIds([...selectedBulkBookIds, book.id]);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                        isChecked
                          ? 'bg-indigo-50/60 border-indigo-200/80 shadow-sm'
                          : 'bg-white/40 hover:bg-white/75 border-slate-200/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div click
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                      />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{book.title}</p>
                        <p className="text-[10px] font-medium text-slate-500 truncate">
                          {book.author} • <span className="font-mono text-slate-600 font-bold">{book.barcode}</span>
                        </p>
                      </div>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60">
                        {book.location || 'Shelf N/A'}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white/40 backdrop-blur-md border-t border-white/40 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsBulkPrintModalOpen(false)}
                className="px-4 py-2 border border-white/60 hover:bg-white/40 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer bg-white/20 backdrop-blur"
              >
                {language === 'kh' ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-heavy rounded-3xl max-w-2xl w-full shadow-2xl border border-white/80 overflow-hidden transform transition duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/40 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                {language === 'kh' ? 'គ្រប់គ្រងប្រភេទសៀវភៅ' : 'Manage Book Categories'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 rounded-full p-1 bg-white/40 hover:bg-white/70 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-white/20">
              {/* Left Panel: Form */}
              <div className="col-span-2 p-5 flex flex-col justify-between bg-slate-50/50">
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-blue-800 uppercase tracking-wider">
                      {editingCategory 
                        ? (language === 'kh' ? 'កែសម្រួលប្រភេទ' : 'Edit Category')
                        : (language === 'kh' ? 'បង្កើតប្រភេទថ្មី' : 'Create New Category')}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-semibold leading-tight">
                      {language === 'kh' 
                        ? 'កំណត់កូដសម្គាល់ និងឈ្មោះប្រភេទ' 
                        : 'Define code and translation labels'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">
                      {language === 'kh' ? 'កូដប្រភេទ (Prefix)' : 'Category Code (Prefix)'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingCategory}
                      value={catCode}
                      onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                      placeholder="e.g. MATH"
                      maxLength={6}
                      className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-xs font-bold font-mono focus:outline-none transition glass-input disabled:opacity-50"
                    />
                    <p className="text-[9px] text-slate-500 font-semibold mt-1 leading-normal">
                      {language === 'kh'
                        ? 'ប្រើជាបុព្វបទបារកូដ (ឧ. MATH-001)'
                        : 'Used as barcode prefix (e.g., MATH-001)'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">
                      {language === 'kh' ? 'ឈ្មោះជាភាសាខ្មែរ' : 'Khmer Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={catNameKh}
                      onChange={(e) => setCatNameKh(e.target.value)}
                      placeholder="ឧ. គណិតវិទ្យា"
                      className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-xs font-bold focus:outline-none transition glass-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">
                      {language === 'kh' ? 'ឈ្មោះជាភាសាអង់គ្លេស' : 'English Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={catNameEn}
                      onChange={(e) => setCatNameEn(e.target.value)}
                      placeholder="e.g. Mathematics"
                      className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-xs font-bold focus:outline-none transition glass-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">
                      {language === 'kh' ? 'ពណ៌សម្គាល់ប្រភេទ' : 'Category Accent Color'} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={catColor}
                        onChange={(e) => setCatColor(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        required
                        value={catColor}
                        onChange={(e) => {
                          if (/^#[0-9A-F]{0,6}$/i.test(e.target.value)) {
                            setCatColor(e.target.value);
                          }
                        }}
                        maxLength={7}
                        placeholder="#3B82F6"
                        className="px-3.5 py-2 block w-full rounded-xl text-slate-800 text-xs font-bold font-mono focus:outline-none transition glass-input uppercase"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCatColor(color)}
                          style={{ backgroundColor: color }}
                          className={`w-5 h-5 rounded-full border-2 transition transform active:scale-95 cursor-pointer ${
                            catColor.toLowerCase() === color.toLowerCase()
                              ? 'border-slate-800 scale-110 shadow-sm'
                              : 'border-transparent hover:scale-105'
                          }`}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  {catError && (
                    <p className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 p-2.5 rounded-xl">
                      {catError}
                    </p>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    {editingCategory && (
                      <button
                        type="button"
                        onClick={resetCategoryForm}
                        className="flex-1 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer bg-white"
                      >
                        {t.cancel}
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
                    >
                      {editingCategory ? (language === 'kh' ? 'កែសម្រួល' : 'Update') : (language === 'kh' ? 'បង្កើត' : 'Create')}
                    </button>
                  </div>
                </form>

                <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-4">
                  {language === 'kh' ? 'ប្រព័ន្ធគ្រប់គ្រងសៀវភៅបណ្ណាល័យ' : 'Library Category Control'}
                </div>
              </div>

              {/* Right Panel: Category List */}
              <div className="col-span-3 p-5 flex flex-col justify-between overflow-hidden">
                <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      {language === 'kh' ? 'បញ្ជីប្រភេទដែលមានស្រាប់' : 'Existing Categories'}
                    </h4>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      {categories.length} {language === 'kh' ? 'ប្រភេទ' : 'Categories'}
                    </span>
                  </div>

                  {/* List Container */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[360px]">
                    {categories.map((cat) => {
                      const associatedBooksCount = books.filter(b => b.categoryId === cat.id).length;
                      const code = cat.id.replace('cat-', '').toUpperCase();
                      const isEditingThis = editingCategory?.id === cat.id;

                      return (
                        <div 
                          key={cat.id} 
                          className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                            isEditingThis 
                              ? 'bg-blue-50/50 border-blue-200/60 shadow-sm' 
                              : 'bg-white/45 border-white/60 hover:bg-white/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span 
                              style={{ 
                                backgroundColor: `${cat.color || '#3B82F6'}15`, 
                                color: cat.color || '#3B82F6',
                                borderColor: `${cat.color || '#3B82F6'}30`
                              }} 
                              className="px-2 py-1 font-mono text-[9px] font-black rounded-lg border"
                            >
                              {code}
                            </span>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {language === 'kh' ? cat.nameKh : cat.nameEn}
                              </p>
                              <p className="text-[9px] text-slate-500 font-semibold truncate">
                                {language === 'kh' ? cat.nameEn : cat.nameKh} &bull; {associatedBooksCount} {language === 'kh' ? 'សៀវភៅ' : 'books'}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => handleEditCategorySelect(cat)}
                              title={language === 'kh' ? 'កែសម្រួល' : 'Edit'}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategoryClick(cat)}
                              title={language === 'kh' ? 'លុប' : 'Delete'}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPhotoTakerOpen && (
        <CameraPhotoTaker
          language={language}
          initialPhoto={photoTarget === 'cover' ? coverImage : undefined}
          onPhotoCaptured={(base64) => {
            if (photoTarget === 'cover') {
              setCoverImage(base64);
            } else {
              setImages(prev => [...prev, base64]);
            }
          }}
          onClose={() => setIsPhotoTakerOpen(false)}
        />
      )}

      {/* Email Notification Alert Modal */}
      {isAlertModalOpen && alertBook && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-heavy rounded-3xl max-w-md w-full shadow-2xl border border-white/80 overflow-hidden transform transition duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/40 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600 animate-bounce" />
                {language === 'kh' ? 'កំណត់ការជូនដំណឹងតាមអ៊ីមែល' : 'Set Email Notification Alert'}
              </h3>
              <button
                onClick={() => {
                  setIsAlertModalOpen(false);
                  setAlertBook(null);
                }}
                className="text-slate-500 hover:text-slate-800 rounded-full p-1 bg-white/40 hover:bg-white/70 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAlert} className="p-6 space-y-4">
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 flex gap-3">
                {alertBook.coverImage ? (
                  <img
                    src={alertBook.coverImage}
                    alt={alertBook.title}
                    className="w-10 h-14 object-cover rounded-lg border border-slate-200 shadow-sm shrink-0 bg-white"
                  />
                ) : (
                  <div className="w-10 h-14 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-300 shrink-0 font-bold text-[8px] uppercase">
                    No cover
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{alertBook.title}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">{alertBook.author}</p>
                  <p className="text-[10px] font-mono text-indigo-600 font-bold mt-1 inline-block bg-indigo-50/50 border border-indigo-100/40 px-1.5 py-0.5 rounded">
                    {alertBook.barcode}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  {language === 'kh' ? 'អាសយដ្ឋានអ៊ីមែលទទួលដំណឹង' : 'Notification Email Address'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder="e.g. librarian@school.edu"
                  className="px-3.5 py-2.5 block w-full rounded-xl text-slate-800 text-xs font-bold focus:outline-none transition glass-input"
                />
                <p className="text-[9px] text-slate-500 font-medium mt-1 leading-normal">
                  {language === 'kh'
                    ? 'ប្រព័ន្ធនឹងផ្ញើសារជូនដំណឹងស្វ័យប្រវត្តទៅកាន់អ៊ីមែលនេះភ្លាមៗ នៅពេលសៀវភៅនេះត្រូវបានសងវិញ។'
                    : 'An automated email alert will be dispatched to this address the exact moment this book is returned.'}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">
                  {language === 'kh' ? 'កំណត់ចំណាំបន្ថែម (ស្រេចចិត្ត)' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  value={alertNotes}
                  onChange={(e) => setAlertNotes(e.target.value)}
                  placeholder={language === 'kh' ? 'ឧ. បម្រុងទុកសម្រាប់សិស្សថ្នាក់ទី១២' : 'e.g., Hold for Grade 12 student request'}
                  rows={2}
                  className="px-3.5 py-2.5 block w-full rounded-xl text-slate-800 text-xs font-bold focus:outline-none transition glass-input resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                {alertBook.notificationEmail && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAlert(alertBook)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 hover:border-red-200 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    {language === 'kh' ? 'លុបការជូនដំណឹង' : 'Remove Alert'}
                  </button>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => {
                    setIsAlertModalOpen(false);
                    setAlertBook(null);
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer bg-white"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md shadow-indigo-500/10"
                >
                  {language === 'kh' ? 'រក្សាទុក' : 'Save Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal Overlay */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-heavy rounded-3xl max-w-xl w-full shadow-2xl border border-white/80 overflow-hidden transform transition duration-200 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/40 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    {language === 'kh' ? 'នាំចូលសៀវភៅជាក្រុមតាម CSV' : 'Bulk Import Books via CSV'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {language === 'kh' ? 'បញ្ចូលឯកសារ CSV ដើម្បីចុះឈ្មោះសៀវភៅច្រើនក្បាលក្នុងពេលតែមួយ' : 'Upload a CSV file to add multiple books at once'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 rounded-full p-1 bg-white/40 hover:bg-white/70 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 flex flex-col min-h-0">
              {/* Instructions and Download Template Link */}
              <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <div>
                    <p className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      {language === 'kh' ? 'ការណែនាំអំពីទម្រង់ឯកសារ' : 'File Format Instructions'}
                    </p>
                    <p className="text-slate-500 leading-relaxed font-semibold font-sans">
                      {language === 'kh' 
                        ? 'ឯកសារ CSV របស់អ្នកគួរតែមានជួរឈរដូចជា៖ ចំណងជើងសៀវភៅ, អ្នកនិពន្ធ, ឆ្នាំបោះពុម្ព, ប្រភេទសៀវភៅ, ទីតាំងសៀវភៅ។' 
                        : 'Your CSV should include columns like: Book Title, Author, Publish Year, Category Name or ID, Location.'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      {language === 'kh'
                        ? '* សម្គាល់៖ ចំណងជើងសៀវភៅ និង អ្នកនិពន្ធ គឺតម្រូវឱ្យមានជាដាច់ខាត។'
                        : '* Note: Book Title and Author are required fields.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[10px] uppercase tracking-wider rounded-xl border border-emerald-150 transition shrink-0 cursor-pointer animate-pulse"
                  >
                    <Download className="w-3 h-3" />
                    <span>{language === 'kh' ? 'ទាញយកគំរូ CSV' : 'Get Template CSV'}</span>
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const files = Array.from(e.dataTransfer.files);
                  if (files.length > 0 && files[0].name.endsWith('.csv')) {
                    handleCsvFileSelect(files[0]);
                  } else {
                    setCsvParsingError(language === 'kh' ? 'សូមជ្រើសរើសតែឯកសារ CSV ប៉ុណ្ណោះ!' : 'Please select a valid CSV file!');
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-50/20'
                    : 'border-slate-200 hover:border-emerald-400 bg-white/20'
                }`}
                onClick={() => document.getElementById('book-csv-file-input')?.click()}
              >
                <input
                  type="file"
                  id="book-csv-file-input"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) handleCsvFileSelect(files[0]);
                  }}
                />
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    {csvFile 
                      ? (language === 'kh' ? `បានជ្រើសរើស៖ ${csvFile.name}` : `Selected: ${csvFile.name}`)
                      : (language === 'kh' ? 'អូសទម្លាក់ឯកសារ CSV ទីនេះ ឬ ចុចដើម្បីស្វែងរក' : 'Drag & drop CSV file here, or click to browse')}
                  </p>
                  {csvFile && (
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      {(csvFile.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {csvParsingError && (
                <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-xs text-red-600 font-bold">
                  {csvParsingError}
                </div>
              )}

              {/* Preview and validation area */}
              {csvPreviewData.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0 space-y-2">
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>{language === 'kh' ? 'ការពិនិត្យមើលទិន្នន័យជាមុន' : 'Import Preview & Validation'}</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold lowercase">
                      {csvPreviewData.length} {language === 'kh' ? 'ក្បាលសៀវភៅ' : 'books'}
                    </span>
                  </p>
                  
                  <div className="flex-1 border border-slate-150 rounded-2xl overflow-hidden bg-white/50 backdrop-blur min-h-[150px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-xs font-sans">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-extrabold text-slate-500 uppercase tracking-wider">{t.bookTitle}</th>
                          <th className="px-4 py-2.5 text-left font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'អ្នកនិពន្ធ' : 'Author'}</th>
                          <th className="px-4 py-2.5 text-left font-extrabold text-slate-500 uppercase tracking-wider">{t.publishYear}</th>
                          <th className="px-4 py-2.5 text-left font-extrabold text-slate-500 uppercase tracking-wider">{t.category}</th>
                          <th className="px-4 py-2.5 text-left font-extrabold text-slate-500 uppercase tracking-wider">{language === 'kh' ? 'ទីតាំង' : 'Location'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 bg-white/30 text-slate-600">
                        {csvPreviewData.map((row, idx) => {
                          const cat = categories.find(c => c.id === row.categoryId);
                          return (
                            <tr key={idx} className="hover:bg-white/40">
                              <td className="px-4 py-2 font-bold text-slate-800 max-w-[150px] truncate">{row.title}</td>
                              <td className="px-4 py-2 max-w-[100px] truncate">{row.author}</td>
                              <td className="px-4 py-2 font-semibold">{row.publishYear}</td>
                              <td className="px-4 py-2">
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded-md font-semibold text-[10px]">
                                  {cat ? (language === 'kh' ? cat.nameKh : cat.nameEn) : 'Default'}
                                </span>
                              </td>
                              <td className="px-4 py-2 truncate max-w-[80px]">{row.location || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-150/60 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvFile(null);
                  setCsvPreviewData([]);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer bg-white"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={csvPreviewData.length === 0}
                onClick={handleConfirmCsvImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/10"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'kh' ? 'បញ្ជាក់ការនាំចូល' : 'Confirm Import'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
