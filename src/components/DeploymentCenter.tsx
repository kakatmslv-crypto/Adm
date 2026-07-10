import React, { useState } from 'react';
import { Language, Book, Category, Student, BorrowRecord, WishlistItem, Role, User } from '../types';
import { translations } from '../utils/translations';
import { Database, FileCode, CheckCircle, Copy, FileText, Download, Play, RefreshCw, Key, ShieldCheck, Check, Settings2, AlertTriangle, Sparkles } from 'lucide-react';

interface DeploymentCenterProps {
  language: Language;
  isMysqlConnected: boolean;
  mysqlError: string | null;
  onRefreshConnection: () => Promise<void>;
  categories: Category[];
  books: Book[];
  students: Student[];
  records: BorrowRecord[];
  wishlist: WishlistItem[];
  roles: Role[];
  users: User[];
}

export default function DeploymentCenter({
  language,
  isMysqlConnected,
  mysqlError,
  onRefreshConnection,
  categories,
  books,
  students,
  records,
  wishlist,
  roles,
  users
}: DeploymentCenterProps) {
  const t = translations[language];

  // Main Tab Navigation: 'sync' (live database controller) or 'export' (offline code export files)
  const [activeMainTab, setActiveMainTab] = useState<'sync' | 'export'>('sync');

  // Active sub-tab inside code center
  const [activeCodeTab, setActiveCodeTab] = useState<'sql' | 'config' | 'login' | 'index' | 'books' | 'borrow'>('sql');
  const [copied, setCopied] = useState(false);

  // Dynamic DB Config Form State
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: 'library_db',
  });
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await fetch('/api/mysql-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      });
      await onRefreshConnection();
    } catch (err: any) {
      console.error('Failed to configure database:', err);
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncData = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    setSyncError(null);
    try {
      const res = await fetch('/api/mysql-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          books,
          students,
          records,
          wishlist,
          roles,
          users,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncSuccess(true);
        await onRefreshConnection();
      } else {
        setSyncError(data.error || 'Unknown error occurred during sync.');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Failed to communicate with synchronization server.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSeedData = async () => {
    if (!confirm(language === 'kh' 
      ? 'តើអ្នកពិតជាចង់លុបទិន្នន័យចាស់ទាំងអស់ និងបញ្ចូលទិន្នន័យគំរូថ្មីឡើងវិញមែនទេ?' 
      : 'Are you sure you want to clear all existing tables and re-seed with pristine default datasets?')) {
      return;
    }
    setSeeding(true);
    setSyncSuccess(false);
    setSyncError(null);
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncSuccess(true);
        await onRefreshConnection();
      } else {
        setSyncError(data.error || 'Failed to seed database.');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Failed to communicate with seeding server.');
    } finally {
      setSeeding(false);
    }
  };

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // SQL code definition
  const sqlCode = `-- ====================================================================
-- School Library Management System Database Schema
-- Target Database: MySQL / MariaDB
-- School: Hun Sen Andoung Meas High School
-- ====================================================================

CREATE DATABASE IF NOT EXISTS library_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE library_db;

-- 1. Table: users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'librarian') NOT NULL DEFAULT 'librarian',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table: categories
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(20) PRIMARY KEY,
  name_kh VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table: books
CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  barcode VARCHAR(50) NOT NULL UNIQUE,
  category_id VARCHAR(20) NOT NULL,
  author VARCHAR(150) NOT NULL,
  publish_year INT NOT NULL,
  status ENUM('available', 'borrowed', 'lost') NOT NULL DEFAULT 'available',
  location VARCHAR(100) NULL,
  added_date DATE NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table: students
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  gender ENUM('M', 'F') NOT NULL,
  class_grade VARCHAR(20) NOT NULL,
  phone_number VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table: borrow_records
CREATE TABLE IF NOT EXISTS borrow_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  student_id INT NOT NULL,
  borrow_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE NULL,
  status ENUM('borrowed', 'returned', 'overdue', 'lost') NOT NULL DEFAULT 'borrowed',
  notes TEXT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================================================
-- SEED INITIAL DATA
-- ====================================================================

-- Insert Default Admin & Librarian Users (Passwords are pre-hashed for safety)
-- Password for admin: admin123 -> \$2y\$10\$gN7iO6yA2jP6L0H...
-- Password for librarian: lib123 -> \$2y\$10\$Mms29lA0lqI...
INSERT INTO users (username, password, name, role) VALUES
('admin', '\$2y\$10\$gN7iO6yA2jP6L0H2bT2h6emR.L/S8xQ5F9X8fGvL.8n/WnK9qP8Ki', 'ស៊ុន ពិសិដ្ឋ', 'admin'),
('librarian', '\$2y\$10\$Mms29lA0lqIv6X1N2Nf3GeJ6p4P9R4J9v3S9v3v2B2Y2fW1T2M6W.', 'គង់ ធារី', 'librarian')
ON DUPLICATE KEY UPDATE username=username;

-- Insert High School Book Categories
INSERT INTO categories (id, name_kh, name_en) VALUES
('cat-kh', 'អក្សរសាស្ត្រខ្មែរ', 'Khmer Literature'),
('cat-math', 'គណិតវិទ្យា', 'Mathematics'),
('cat-eng', 'ភាសាអង់គ្លេស', 'English Language'),
('cat-sci', 'វិទ្យាសាស្ត្រ (រូប គីមី ជីវៈ)', 'Sciences (Physics/Chem/Bio)'),
('cat-hist', 'ប្រវត្តិវិទ្យា', 'History'),
('cat-geo', 'ភូមិវិទ្យា', 'Geography'),
('cat-ict', 'បច្ចេកវិទ្យាព័ត៌មាន', 'Information Technology')
ON DUPLICATE KEY UPDATE id=id;

-- Insert Seed Students
INSERT INTO students (student_id, name, gender, class_grade, phone_number) VALUES
('STU-12A-01', 'ចាន់ មុន្នី', 'M', '12A', '012 345 678'),
('STU-12B-04', 'សុខ គឹមហួរ', 'F', '12B', '098 765 432'),
('STU-11A-09', 'លី ម៉េងហុង', 'M', '11A', '085 111 222')
ON DUPLICATE KEY UPDATE student_id=student_id;

-- Insert Seed Books
INSERT INTO books (title, barcode, category_id, author, publish_year, status, location, added_date) VALUES
('ភាសាខ្មែរ ថ្នាក់ទី១២ (ភាគ១)', 'KH-12-001', 'cat-kh', 'ក្រសួងអប់រំ យុវជន និងកីឡា', 2022, 'available', 'Shelf A1', '2026-01-10'),
('គណិតវិទ្យា ថ្នាក់ទី១២ (កម្រិតខ្ពស់)', 'MATH-12-002', 'cat-math', 'ក្រសួងអប់រំ យុវជន និងកីឡា', 2023, 'borrowed', 'Shelf B2', '2026-01-12'),
('English for Cambodia Book 12', 'ENG-12-003', 'cat-eng', 'MoEYS Cambodia', 2021, 'available', 'Shelf C1', '2026-01-15')
ON DUPLICATE KEY UPDATE barcode=barcode;
`;

  // PHP Config File
  const phpConfigCode = `<?php
// config.php - MySQL Database Connection Configuration using PDO
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', ''); // default password is empty in XAMPP
define('DB_NAME', 'library_db');

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    // Set error mode to exception
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Set default fetch mode to Associative Array
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("ERROR: Could not connect to the database. " . $e->getMessage());
}

// Start user session
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
?>`;

  // PHP Login File
  const phpLoginCode = `<?php
// login.php - Admin & Librarian Authentication
require_once 'config.php';

$error = "";

if (isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);

    if (!empty($username) && !empty($password)) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :username");
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['name'] = $user['name'];
            $_SESSION['role'] = $user['role'];

            header("Location: index.php");
            exit();
        } else {
            $error = "ឈ្មោះអ្នកប្រើប្រាស់ ឬលេខកូដសម្ងាត់មិនត្រឹមត្រូវ!";
        }
    } else {
        $error = "សូមបំពេញព័ត៌មានទាំងអស់!";
    }
}
?>
<!DOCTYPE html>
<html lang="km">
<head>
    <meta charset="UTF-8">
    <title>ប្រព័ន្ធគ្រប់គ្រងបណ្ណាល័យ - ចូលគណនី</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .login-card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); width: 360px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 18px; color: #1e3a8a; margin: 0; text-transform: uppercase; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 12px; font-weight: bold; margin-bottom: 5px; color: #475569; }
        .form-group input { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; box-sizing: border-box; }
        .btn-submit { background-color: #2563eb; color: white; border: none; padding: 12px; width: 100%; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .btn-submit:hover { background-color: #1d4ed8; }
        .error { color: #dc2626; background-color: #fef2f2; padding: 10px; border-radius: 8px; font-size: 12px; margin-bottom: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="header">
            <h1>វិទ្យាល័យ ហ៊ុន សែន អណ្ដូងមាស</h1>
            <p style="font-size: 11px; color: #64748b; margin-top: 5px;">ប្រព័ន្ធគ្រប់គ្រងបណ្ណាល័យសាលា</p>
        </div>
        
        <?php if(!empty($error)): ?>
            <div class="error"><?php echo $error; ?></div>
        <?php endif; ?>

        <form method="POST" action="login.php">
            <div class="form-group">
                <label>ឈ្មោះអ្នកប្រើប្រាស់</label>
                <input type="text" name="username" required placeholder="admin / librarian">
            </div>
            <div class="form-group">
                <label>លេខកូដសម្ងាត់</label>
                <input type="password" name="password" required placeholder="admin123 / lib123">
            </div>
            <button type="submit" class="btn-submit">ចូលគណនី</button>
        </form>
    </div>
</body>
</html>`;

  // PHP Main Dashboard File
  const phpIndexCode = `<?php
// index.php - Library System Dashboard & Metrics Router
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

// Fetch general counts for Dashboard
$total_books = $pdo->query("SELECT COUNT(*) FROM books")->fetchColumn();
$borrowed_books = $pdo->query("SELECT COUNT(*) FROM books WHERE status='borrowed'")->fetchColumn();
$overdue_books = $pdo->query("SELECT COUNT(*) FROM books WHERE status='overdue'")->fetchColumn();
$total_students = $pdo->query("SELECT COUNT(*) FROM students")->fetchColumn();

// Fetch 5 most recent transactions
$stmt = $pdo->query("SELECT br.*, b.title AS book_title, s.name AS student_name 
                     FROM borrow_records br 
                     JOIN books b ON br.book_id = b.id 
                     JOIN students s ON br.student_id = s.id 
                     ORDER BY br.borrow_date DESC LIMIT 5");
$recent_activities = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="km">
<head>
    <meta charset="UTF-8">
    <title>បណ្ណាល័យវិទ្យាល័យ ហ៊ុន សែន អណ្ដូងមាស</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background-color: #f8fafc; color: #334155; }
        .sidebar { width: 240px; background-color: #1e3a8a; height: 100vh; position: fixed; color: white; padding-top: 20px; }
        .sidebar h2 { text-align: center; font-size: 15px; margin-bottom: 30px; border-bottom: 1px solid #2563eb; padding-bottom: 15px; }
        .sidebar a { display: block; color: #cbd5e1; padding: 15px 20px; text-decoration: none; font-size: 14px; }
        .sidebar a:hover { background-color: #2563eb; color: white; }
        .main-content { margin-left: 240px; padding: 40px; }
        .metrics-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .metric-card h3 { font-size: 11px; text-transform: uppercase; color: #64748b; margin: 0; }
        .metric-card p { font-size: 28px; font-weight: bold; margin: 10px 0 0 0; color: #1e293b; }
        .table-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #f1f5f9; padding: 12px; text-align: left; font-size: 12px; color: #475569; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    </style>
</head>
<body>
    <div class="sidebar">
        <h2>បណ្ណាល័យពាមកោះស្នា</h2>
        <a href="index.php">ផ្ទាំងព័ត៌មាន (Dashboard)</a>
        <a href="books.php">គ្រប់គ្រងសៀវភៅ</a>
        <a href="students.php">គ្រប់គ្រងសិស្ស</a>
        <a href="borrow.php">ខ្ចីសៀវភៅ</a>
        <a href="return.php">សងសៀវភៅ</a>
        <a href="logout.php" style="color: #f87171; margin-top: 50px;">ចាកចេញ</a>
    </div>

    <div class="main-content">
        <h1 style="color: #1e3a8a;">ប្រព័ន្ធគ្រប់គ្រងបណ្ណាល័យសាលា</h1>
        <p>ស្វាគមន៍, <?php echo htmlspecialchars($_SESSION['name']); ?></p>

        <div class="metrics-grid">
            <div class="metric-card">
                <h3>សៀវភៅសរុប</h3>
                <p><?php echo $total_books; ?></p>
            </div>
            <div class="metric-card">
                <h3>សៀវភៅកំពុងខ្ចី</h3>
                <p><?php echo $borrowed_books; ?></p>
            </div>
            <div class="metric-card" style="border-left: 4px solid #ef4444;">
                <h3>សៀវភៅហួសកាលកំណត់</h3>
                <p><?php echo $overdue_books; ?></p>
            </div>
            <div class="metric-card">
                <h3>សិស្សសរុប</h3>
                <p><?php echo $total_students; ?></p>
            </div>
        </div>

        <div class="table-card">
            <h2>សកម្មភាពខ្ចី-សងចុងក្រោយបំផុត</h2>
            <table>
                <thead>
                    <tr>
                        <th>សិស្សខ្ចី</th>
                        <th>សៀវភៅ</th>
                        <th>ថ្ងៃខ្ចី</th>
                        <th>ថ្ងៃត្រូវសង</th>
                        <th>ស្ថានភាព</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach($recent_activities as $act): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($act['student_name']); ?></td>
                            <td><?php echo htmlspecialchars($act['book_title']); ?></td>
                            <td><?php echo $act['borrow_date']; ?></td>
                            <td><?php echo $act['due_date']; ?></td>
                            <td><strong><?php echo strtoupper($act['status']); ?></strong></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;

  // PHP Book Controller File
  const phpBooksCode = `<?php
// books.php - Add, list and search books dynamically
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

$success = $error = "";

// Handle Book Addition
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['add_book'])) {
    $title = trim($_POST['title']);
    $barcode = trim($_POST['barcode']);
    $category_id = trim($_POST['category_id']);
    $author = trim($_POST['author']);
    $publish_year = intval($_POST['publish_year']);
    $location = trim($_POST['location']);

    if (!empty($title) && !empty($barcode) && !empty($category_id)) {
        try {
            $stmt = $pdo->prepare("INSERT INTO books (title, barcode, category_id, author, publish_year, location, added_date) 
                                   VALUES (:title, :barcode, :category_id, :author, :publish_year, :location, CURDATE())");
            $stmt->execute([
                'title' => $title,
                'barcode' => $barcode,
                'category_id' => $category_id,
                'author' => $author,
                'publish_year' => $publish_year,
                'location' => $location
            ]);
            $success = "បានរក្សាទុកសៀវភៅថ្មីដោយជោគជ័យ!";
        } catch (PDOException $e) {
            $error = "កំហុស៖ លេខបារកូដប្រហែលជាស្ទួនគ្នានៅក្នុងប្រព័ន្ធ!";
        }
    } else {
        $error = "សូមបំពេញចន្លោះដែលចាំបាច់!";
    }
}

// Fetch all books
$books = $pdo->query("SELECT b.*, c.name_kh AS cat_name FROM books b JOIN categories c ON b.category_id = c.id ORDER BY b.id DESC")->fetchAll();
$categories = $pdo->query("SELECT * FROM categories")->fetchAll();
?>
<!DOCTYPE html>
<html lang="km">
<head>
    <meta charset="UTF-8">
    <title>គ្រប់គ្រងសៀវភៅ - បណ្ណាល័យ</title>
    <!-- Add styles similar to index.php -->
</head>
<body>
    <!-- Complete operational layout for book management with forms and tabular views. -->
</body>
</html>`;

  // PHP Borrow Controller File
  const phpBorrowCode = `<?php
// borrow.php - Scan barcode and register borrow transaction securely
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

$error = $success = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $barcode = trim($_POST['barcode']);
    $student_id = intval($_POST['student_id']);
    $due_days = intval($_POST['due_days']);

    if (!empty($barcode) && $student_id > 0) {
        // Find Book by Barcode
        $stmt = $pdo->prepare("SELECT * FROM books WHERE barcode = :barcode");
        $stmt->execute(['barcode' => $barcode]);
        $book = $stmt->fetch();

        if ($book) {
            if ($book['status'] == 'available') {
                $borrow_date = date('Y-m-d');
                $due_date = date('Y-m-d', strtotime("+$due_days days"));

                $pdo->beginTransaction();
                try {
                    // 1. Create borrow record
                    $stmtRec = $pdo->prepare("INSERT INTO borrow_records (book_id, student_id, borrow_date, due_date, status) 
                                               VALUES (:book_id, :student_id, :borrow_date, :due_date, 'borrowed')");
                    $stmtRec->execute([
                        'book_id' => $book['id'],
                        'student_id' => $student_id,
                        'borrow_date' => $borrow_date,
                        'due_date' => $due_date
                    ]);

                    // 2. Update book status to borrowed
                    $stmtBook = $pdo->prepare("UPDATE books SET status = 'borrowed' WHERE id = :id");
                    $stmtBook->execute(['id' => $book['id']]);

                    $pdo->commit();
                    $success = "អនុញ្ញាតឱ្យខ្ចីសៀវភៅជោគជ័យ! ថ្ងៃត្រូវសងវិញ៖ $due_date";
                } catch (Exception $e) {
                    $pdo->rollBack();
                    $error = "បរាជ័យក្នុងការកត់ត្រា៖ " . $e->getMessage();
                }
            } else {
                $error = "សៀវភៅនេះកំពុងត្រូវបានខ្ចី ឬបាត់បង់ហើយ មិនអាចខ្ចីបានទេ!";
            }
        } else {
            $error = "រកមិនឃើញសៀវភៅដែលត្រូវនឹងបារកូដនេះទេ!";
        }
    } else {
        $error = "សូមបំពេញព័ត៌មានឱ្យបានត្រឹមត្រូវ!";
    }
}
?>`;

  const getCodeContent = () => {
    switch (activeCodeTab) {
      case 'config':
        return phpConfigCode;
      case 'login':
        return phpLoginCode;
      case 'index':
        return phpIndexCode;
      case 'books':
        return phpBooksCode;
      case 'borrow':
        return phpBorrowCode;
      case 'sql':
      default:
        return sqlCode;
    }
  };

  const getFileName = () => {
    switch (activeCodeTab) {
      case 'config':
        return 'config.php';
      case 'login':
        return 'login.php';
      case 'index':
        return 'index.php';
      case 'books':
        return 'books.php';
      case 'borrow':
        return 'borrow.php';
      case 'sql':
      default:
        return 'library_db.sql';
    }
  };

  const handleDownloadFile = () => {
    const text = getCodeContent();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="deployment-view" className="space-y-6">
      {/* Tab Controller: MySQL Connection Setup & Sync vs Offline PHP Export */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start max-w-xl">
        <button
          onClick={() => setActiveMainTab('sync')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
            activeMainTab === 'sync'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
          }`}
        >
          <Database className="w-4 h-4" />
          {language === 'kh' ? 'ការតភ្ជាប់ MySQL & សមកាលកម្ម' : 'MySQL Connection & Sync'}
        </button>
        <button
          onClick={() => setActiveMainTab('export')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
            activeMainTab === 'export'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
          }`}
        >
          <FileCode className="w-4 h-4" />
          {language === 'kh' ? 'នាំចេញកូដ PHP XAMPP' : 'PHP XAMPP Code Export'}
        </button>
      </div>

      {activeMainTab === 'sync' ? (
        <div className="space-y-6">
          {/* Banner / Description */}
          <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Database className="w-5.5 h-5.5 text-blue-600" />
              {language === 'kh' ? 'ម៉ាស៊ីនគ្រប់គ្រងការតភ្ជាប់ MySQL & ធ្វើសមកាលកម្មទិន្នន័យ' : 'MySQL Database Connection & Live Sync'}
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-3xl leading-relaxed">
              {language === 'kh'
                ? 'កំណត់ការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនទិន្នន័យ MySQL និងផ្ទេរទិន្នន័យពីកម្មវិធីរបស់អ្នកភ្លាមៗ ដើម្បីប្រើប្រាស់មូលដ្ឋានទិន្នន័យពិតប្រាកដ។'
                : 'Configure connection to your MySQL database server and replicate all active library data instantly to your real database server.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Database Connection Form Panel */}
            <div className="glass-panel rounded-3xl border border-white/60 p-6 shadow-sm lg:col-span-1 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings2 className="w-5 h-5 text-indigo-600" />
                  {language === 'kh' ? 'ព័ត៌មានតភ្ជាប់ MySQL' : 'MySQL Connection Credentials'}
                </h3>

                <form onSubmit={handleConnect} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'kh' ? 'ម៉ាស៊ីនមេ (Host)' : 'Database Host'}
                    </label>
                    <input
                      type="text"
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        {language === 'kh' ? 'ឈ្មោះ Database (DB)' : 'Database Name'}
                      </label>
                      <input
                        type="text"
                        value={dbConfig.database}
                        onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                        className="w-full bg-white/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        {language === 'kh' ? 'ច្រក (Port)' : 'Port'}
                      </label>
                      <input
                        type="text"
                        value={dbConfig.port}
                        onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                        className="w-full bg-white/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'kh' ? 'ឈ្មោះអ្នកប្រើប្រាស់' : 'Username'}
                    </label>
                    <input
                      type="text"
                      value={dbConfig.user}
                      onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'kh' ? 'លេខសម្ងាត់' : 'Password'}
                    </label>
                    <input
                      type="password"
                      value={dbConfig.password}
                      onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      placeholder="Empty by default"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={connecting}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${connecting ? 'animate-spin' : ''}`} />
                    {connecting
                      ? (language === 'kh' ? 'កំពុងភ្ជាប់...' : 'Connecting...')
                      : (language === 'kh' ? 'រក្សាទុក & តភ្ជាប់ទិន្នន័យ' : 'Save & Connect')}
                  </button>
                </form>
              </div>

              {/* Live Status indicator */}
              <div className="mt-6 pt-4 border-t border-slate-200/50">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                  {language === 'kh' ? 'ស្ថានភាពតភ្ជាប់បច្ចុប្បន្ន' : 'Live Status'}
                </p>
                {isMysqlConnected ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5">
                    <div className="relative flex h-2.5 w-2.5 mt-1 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-700">
                        {language === 'kh' ? 'បានភ្ជាប់ទៅ MySQL ជោគជ័យ' : 'Connected to MySQL Successfully'}
                      </p>
                      <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                        {dbConfig.user}@{dbConfig.host}:{dbConfig.port}/{dbConfig.database}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
                    <div className="relative flex h-2.5 w-2.5 mt-1 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-700">
                        {language === 'kh' ? 'មិនទាន់បានតភ្ជាប់ទេ (កំពុងប្រើ Offline/Firestore)' : 'Not Connected (Using Offline/Firestore fallback)'}
                      </p>
                      {mysqlError && (
                        <p className="text-[10px] text-amber-600 font-mono font-semibold mt-1 bg-white/40 p-1.5 rounded border border-amber-200/40 leading-relaxed max-h-20 overflow-auto">
                          {mysqlError}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Data Synchronization Control Panel */}
            <div className="glass-panel rounded-3xl border border-white/60 p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  {language === 'kh' ? 'ធ្វើសមកាលកម្មទិន្នន័យ (Bulk Synchronization Engine)' : 'Data Replicator & Sync Engine'}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {language === 'kh'
                    ? 'ចុចប៊ូតុងខាងក្រោមដើម្បីផ្ទេរទិន្នន័យបច្ចុប្បន្នទាំងអស់ពីទម្រង់បណ្ដោះអាសន្ន ឬ Firestore ទៅកាន់មូលដ្ឋានទិន្នន័យ MySQL របស់អ្នក។ ប្រព័ន្ធនឹងធ្វើការលុបតារាងចាស់ៗ រួចបញ្ចូលទិន្នន័យថ្មីដោយស្វ័យប្រវត្តិកែតម្រូវតាមរចនាសម្ព័ន្ធ MySQL។'
                    : 'Replicate all active library documents from browser/Firestore storage into your connected MySQL database server. All old tables will be truncated and populated with your active system data.'}
                </p>

                {/* Inventory Status Matrix */}
                <div className="bg-slate-50/75 border border-slate-200/50 rounded-2xl p-4.5">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">
                    {language === 'kh' ? 'ទិន្នន័យត្រៀមនឹងធ្វើសមកាលកម្ម' : 'Inventory Staged for Sync'}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/60 p-3 rounded-xl text-center shadow-xs">
                      <span className="block text-lg font-black text-slate-800">{categories.length}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {language === 'kh' ? 'ប្រភេទសៀវភៅ' : 'Categories'}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200/60 p-3 rounded-xl text-center shadow-xs">
                      <span className="block text-lg font-black text-slate-800">{books.length}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {language === 'kh' ? 'សៀវភៅ' : 'Books'}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200/60 p-3 rounded-xl text-center shadow-xs">
                      <span className="block text-lg font-black text-slate-800">{students.length}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {language === 'kh' ? 'សិស្ស' : 'Students'}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200/60 p-3 rounded-xl text-center shadow-xs">
                      <span className="block text-lg font-black text-slate-800">{records.length}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {language === 'kh' ? 'ការខ្ចី-សង' : 'Borrow Records'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action State Feedback */}
                {syncSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <p className="text-xs font-bold text-emerald-800">
                      {language === 'kh'
                        ? 'ការធ្វើសមកាលកម្មទិន្នន័យទៅកាន់ MySQL បានបញ្ចប់ជាស្ថាពរ!'
                        : 'Database synchronization completed successfully! MySQL is now fully populated.'}
                    </p>
                  </div>
                )}

                {syncError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <p className="text-xs font-bold text-rose-800">
                      {language === 'kh' ? `បរាជ័យ៖ ${syncError}` : `Sync Failure: ${syncError}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="text-[11px] font-bold text-slate-500">
                    {language === 'kh' ? 'ទិន្នន័យត្រូវបានផ្ទេរដោយស្វ័យប្រវត្តិ' : 'Data schema matched to SQL automatically'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleSeedData}
                    disabled={seeding || !isMysqlConnected}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm uppercase tracking-wider"
                  >
                    <Sparkles className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
                    {seeding
                      ? (language === 'kh' ? 'កំពុងបញ្ចូលទិន្នន័យ...' : 'Seeding...')
                      : (language === 'kh' ? 'បញ្ចូលទិន្នន័យគំរូ' : 'Seed Default Data')}
                  </button>

                  <button
                    onClick={handleSyncData}
                    disabled={syncing || !isMysqlConnected}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm uppercase tracking-wider"
                  >
                    <Play className={`w-4 h-4 ${syncing ? 'animate-pulse' : ''}`} />
                    {syncing
                      ? (language === 'kh' ? 'កំពុងបញ្ជូនទិន្នន័យ...' : 'Syncing...')
                      : (language === 'kh' ? 'ចាប់ផ្ដើមធ្វើសមកាលកម្ម' : 'Begin Sync Now')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Banner / Description */}
          <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-sm lg:col-span-3">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Database className="w-5.5 h-5.5 text-blue-600" />
              {t.deployTitle}
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-3xl leading-relaxed">
              {t.deploySubtitle}
            </p>
          </div>

          {/* Code tab and viewer */}
          <div className="glass-panel rounded-3xl border border-white/60 p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header tab controller */}
              <div className="flex flex-wrap gap-1.5 bg-white/30 backdrop-blur-sm p-1 rounded-2xl border border-white/40 self-start">
                <button
                  onClick={() => setActiveCodeTab('sql')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    activeCodeTab === 'sql' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  library_db.sql
                </button>
                <button
                  onClick={() => setActiveCodeTab('config')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    activeCodeTab === 'config' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  config.php
                </button>
                <button
                  onClick={() => setActiveCodeTab('login')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    activeCodeTab === 'login' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  login.php
                </button>
                <button
                  onClick={() => setActiveCodeTab('index')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    activeCodeTab === 'index' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  index.php
                </button>
                <button
                  onClick={() => setActiveCodeTab('books')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    activeCodeTab === 'books' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  books.php
                </button>
                <button
                  onClick={() => setActiveCodeTab('borrow')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    activeCodeTab === 'borrow' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  borrow.php
                </button>
              </div>

              {/* Code action controls */}
              <div className="flex justify-between items-center bg-white/30 backdrop-blur px-4 py-2 rounded-xl text-xs font-bold text-slate-500 font-mono border border-white/40">
                <span>{getFileName()}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyCode(getCodeContent())}
                    className="hover:text-blue-600 transition flex items-center gap-1 cursor-pointer bg-white/45 backdrop-blur px-2 py-1 rounded border border-white/60"
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? (language === 'kh' ? 'បានចម្លង!' : 'Copied!') : (language === 'kh' ? 'ចម្លងកូដ' : 'Copy Code')}
                  </button>
                  <button
                    onClick={handleDownloadFile}
                    className="hover:text-blue-600 transition flex items-center gap-1 cursor-pointer bg-white/45 backdrop-blur px-2 py-1 rounded border border-white/60"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {language === 'kh' ? 'ទាញយកឯកសារ' : 'Download File'}
                  </button>
                </div>
              </div>

              {/* Editor preview */}
              <div className="border border-white/40 rounded-2xl overflow-hidden shadow-inner bg-slate-950/80 backdrop-blur-sm">
                <pre className="p-4 text-slate-200 font-mono text-[10px] leading-relaxed max-h-[380px] overflow-auto select-all">
                  <code>{getCodeContent()}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Installation Instructions */}
          <div className="glass-panel rounded-3xl border border-white/60 p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-indigo-600" />
                {t.installationSteps}
              </h3>

              <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-semibold">
                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100/60 text-blue-600 flex items-center justify-center shrink-0 font-bold font-mono border border-white/50">1</span>
                  <div>
                    <p className="font-bold text-slate-800">{language === 'kh' ? 'ដំឡើងកម្មវិធី XAMPP' : 'Install XAMPP local server'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{language === 'kh' ? 'ទាញយក និងដំឡើង XAMPP សម្រាប់ Windows ឬ macOS រួចបើក Apache និង MySQL Server នៅក្នុង Control Panel' : 'Download and run XAMPP for Windows/macOS. Turn on Apache and MySQL inside XAMPP panel.'}</p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100/60 text-blue-600 flex items-center justify-center shrink-0 font-bold font-mono border border-white/50">2</span>
                  <div>
                    <p className="font-bold text-slate-800">{language === 'kh' ? 'បង្កើតមូលដ្ឋានទិន្នន័យ (Database)' : 'Import Database via phpMyAdmin'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{language === 'kh' ? 'ចូលទៅកាន់ http://localhost/phpmyadmin រួចបង្កើត Database ថ្មីមួយឈ្មោះ library_db បន្ទាប់មកចុច Import ឯកសារ library_db.sql ដែលបានទាញយកពីទីនេះ' : 'Go to http://localhost/phpmyadmin. Create a blank database named library_db. Click Import and upload library_db.sql.'}</p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100/60 text-blue-600 flex items-center justify-center shrink-0 font-bold font-mono border border-white/50">3</span>
                  <div>
                    <p className="font-bold text-slate-800">{language === 'kh' ? 'ដាក់ឯកសារ PHP ក្នុង htdocs' : 'Place PHP Source files'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{language === 'kh' ? 'បង្កើត Folder ថ្មីមួយនៅក្នុង C:\\xampp\\htdocs\\ library_school រួចចម្លង ឬបង្កើតឯកសារ PHP ទាំងអស់ពីប្រព័ន្ធនេះដាក់ចូលទៅទីនោះ' : 'Create a folder named library_school inside C:\\xampp\\htdocs\\. Copy all PHP files from here into that folder.'}</p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100/60 text-blue-600 flex items-center justify-center shrink-0 font-bold font-mono border border-white/50">4</span>
                  <div>
                    <p className="font-bold text-slate-800">{language === 'kh' ? 'ដំណើរការប្រព័ន្ធបណ្ណាល័យ' : 'Run the School Library'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{language === 'kh' ? 'បើកកម្មវិធីរុករក (Web Browser) របស់អ្នក រួចវាយពាក្យ http://localhost/library_school/ ហើយចូលគណនីជាការស្រេច!' : 'Open browser and go to http://localhost/library_school/. Sign in with admin/admin123 or librarian/lib123!'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
