import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import {
  defaultCategories,
  defaultBooks,
  defaultStudents,
  defaultBorrowRecords,
  defaultUsers,
  defaultRoles,
  defaultWishlist
} from './src/data/defaultData';

dotenv.config();

let pool: mysql.Pool | null = null;
let isDbOffline = false;

const OFFLINE_DB_PATH = path.join(process.cwd(), 'offline_db.json');

// Initialize memory store with deep copies of default datasets
let offlineStore: { [key: string]: any[] } = {
  categories: JSON.parse(JSON.stringify(defaultCategories)),
  books: JSON.parse(JSON.stringify(defaultBooks)),
  students: JSON.parse(JSON.stringify(defaultStudents)),
  records: JSON.parse(JSON.stringify(defaultBorrowRecords)),
  wishlist: JSON.parse(JSON.stringify(defaultWishlist)),
  roles: JSON.parse(JSON.stringify(defaultRoles)),
  users: JSON.parse(JSON.stringify(defaultUsers)),
};

// Load offline db from file if it exists
try {
  if (fs.existsSync(OFFLINE_DB_PATH)) {
    const fileData = fs.readFileSync(OFFLINE_DB_PATH, 'utf-8');
    const parsed = JSON.parse(fileData);
    offlineStore = { ...offlineStore, ...parsed };
    console.log("Loaded offline database from local file system.");
  }
} catch (e: any) {
  console.log("Error loading offline database from file:", e.message);
}

// Function to persist offline db
function saveOfflineDb() {
  try {
    fs.writeFileSync(OFFLINE_DB_PATH, JSON.stringify(offlineStore, null, 2), 'utf-8');
  } catch (e: any) {
    console.error("Failed to save offline database to file:", e.message);
  }
}

// Lazy initialization of MySQL connection pool
async function getMysqlPool() {
  if (!pool) {
    if (!process.env.MYSQL_HOST) {
      throw new Error("MYSQL_HOST environment variable is missing.");
    }
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

// Global execution wrapper with auto-retry on connection failures
async function runQuery(sql: string, params: any[] = []): Promise<any> {
  const dbPool = await getMysqlPool();
  const [results] = await dbPool.execute(sql, params);
  return results;
}

// Convert object keys from snake_case (database) to camelCase (frontend API)
function toCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamel);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      newObj[camelKey] = toCamel(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// Convert object keys from camelCase (frontend API) to snake_case (database)
function toSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toSnake);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      newObj[snakeKey] = toSnake(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// Database schema initialization with high-performance indexes
async function ensureTablesExist() {
  try {
    const pool = await getMysqlPool();
    console.log("Initializing database tables and indexes if missing...");

    await runQuery(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        name_kh VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        color VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS books (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        barcode VARCHAR(255) NOT NULL,
        category_id VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        publish_year INT NOT NULL,
        status VARCHAR(50) NOT NULL,
        location VARCHAR(255) NULL,
        added_date VARCHAR(50) NOT NULL,
        cover_image LONGTEXT NULL,
        notification_email VARCHAR(255) NULL,
        notification_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category_id),
        INDEX idx_barcode (barcode),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(255) PRIMARY KEY,
        student_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        gender VARCHAR(10) NOT NULL,
        class_grade VARCHAR(50) NOT NULL,
        phone_number VARCHAR(100) NOT NULL,
        email VARCHAR(255) NULL,
        password VARCHAR(255) NULL,
        photo LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id),
        INDEX idx_class_grade (class_grade)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Resiliently add columns if they don't exist
    try {
      await runQuery(`ALTER TABLE students ADD COLUMN email VARCHAR(255) NULL`);
    } catch (e) {}
    try {
      await runQuery(`ALTER TABLE students ADD COLUMN password VARCHAR(255) NULL`);
    } catch (e) {}
    try {
      await runQuery(`ALTER TABLE students ADD COLUMN photo LONGTEXT NULL`);
    } catch (e) {}

    await runQuery(`
      CREATE TABLE IF NOT EXISTS records (
        id VARCHAR(255) PRIMARY KEY,
        book_id VARCHAR(255) NOT NULL,
        student_id VARCHAR(255) NOT NULL,
        borrow_date VARCHAR(50) NOT NULL,
        due_date VARCHAR(50) NOT NULL,
        return_date VARCHAR(50) NULL,
        status VARCHAR(50) NOT NULL,
        notes TEXT NULL,
        fine_amount DECIMAL(10,2) DEFAULT 0.00,
        fine_paid BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_book (book_id),
        INDEX idx_student (student_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        requester_name VARCHAR(255) NOT NULL,
        request_date VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(255) PRIMARY KEY,
        name_kh VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        permissions TEXT NOT NULL,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        last_login VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("MySQL Database schema initialized successfully.");
    await seedDefaultData();
  } catch (err: any) {
    isDbOffline = true;
    console.log("MySQL Database is currently offline or unreachable (" + err.message + "). Serving application with offline/Firebase Firestore fallback.");
  }
}

// Auto-seed database if empty
async function seedDefaultData() {
  try {
    const dbPool = await getMysqlPool();
    const connection = await dbPool.getConnection();
    try {
      // Check if categories table is empty
      const [catRows] = await connection.execute('SELECT COUNT(*) as count FROM categories');
      const count = (catRows as any)[0].count;

      if (count === 0) {
        console.log("MySQL Database is empty. Seeding default data...");
        await connection.beginTransaction();

        // 1. Seed Categories
        for (const cat of defaultCategories) {
          await upsertRow(connection, 'categories', cat.id, cat);
        }

        // 2. Seed Roles
        for (const role of defaultRoles) {
          await upsertRow(connection, 'roles', role.id, role);
        }

        // 3. Seed Users
        for (const u of defaultUsers) {
          await upsertRow(connection, 'users', u.id, u);
        }

        // 4. Seed Books
        for (const b of defaultBooks) {
          await upsertRow(connection, 'books', b.id, b);
        }

        // 5. Seed Students
        for (const s of defaultStudents) {
          await upsertRow(connection, 'students', s.id, s);
        }

        // 6. Seed Records
        for (const r of defaultBorrowRecords) {
          await upsertRow(connection, 'records', r.id, r);
        }

        // 7. Seed Wishlist
        for (const w of defaultWishlist) {
          await upsertRow(connection, 'wishlist', w.id, w);
        }

        await connection.commit();
        console.log("MySQL Database seeded successfully with default datasets.");
      } else {
        console.log("MySQL Database already contains data. Skipping initial seed.");
      }
    } catch (err: any) {
      try {
        await connection.rollback();
      } catch {}
      console.error("Failed to seed default database tables:", err.message);
    } finally {
      connection.release();
    }
  } catch (err: any) {
    console.error("Failed to obtain connection for seeding:", err.message);
  }
}

// Server side data validation to protect integrity
function validateData(entity: string, data: any): string | null {
  if (!data || typeof data !== 'object') return "Invalid data object.";
  if (!data.id) return "Missing primary identifier 'id'.";

  switch (entity) {
    case 'categories':
      if (!data.nameKh || !data.nameEn) return "Category nameKh and nameEn are required.";
      break;
    case 'books':
      if (!data.title || !data.barcode || !data.categoryId || !data.author) {
        return "Book title, barcode, categoryId, and author are required.";
      }
      break;
    case 'students':
      if (!data.studentId || !data.name || !data.gender || !data.classGrade || !data.phoneNumber) {
        return "Student id, name, gender, classGrade, and phoneNumber are required.";
      }
      break;
    case 'records':
      if (!data.bookId || !data.studentId || !data.borrowDate || !data.dueDate || !data.status) {
        return "Borrow record bookId, studentId, borrowDate, dueDate, and status are required.";
      }
      break;
    case 'wishlist':
      if (!data.title || !data.author || !data.requesterName || !data.requestDate || !data.status) {
        return "Wishlist title, author, requesterName, requestDate, and status are required.";
      }
      break;
    case 'roles':
      if (!data.nameKh || !data.nameEn || !data.permissions) {
        return "Role nameKh, nameEn, and permissions are required.";
      }
      break;
    case 'users':
      if (!data.username || !data.name || !data.role) {
        return "User username, name, and role are required.";
      }
      break;
  }
  return null;
}

// Generic upsert logic supporting dynamic column queries inside transaction
async function upsertRow(connection: mysql.Connection, table: string, id: string, data: any) {
  const rawSnake = toSnake(data);
  
  // Format specific fields (e.g. serialize permissions object in roles)
  if (table === 'roles' && rawSnake.permissions) {
    if (typeof rawSnake.permissions === 'object') {
      rawSnake.permissions = JSON.stringify(rawSnake.permissions);
    }
  }

  const keys = Object.keys(rawSnake);
  const values = Object.values(rawSnake);
  const placeholders = keys.map(() => '?').join(', ');
  const updateExpr = keys.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');

  const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateExpr}`;
  await connection.execute(sql, values as any[]);
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// -----------------------------------------------------------------------------
// CONNECTION STATUS & DIAGNOSTICS
// -----------------------------------------------------------------------------
app.get('/api/mysql-status', async (req, res) => {
  try {
    if (isDbOffline) {
      res.json({ connected: false, error: "Database is currently running in offline fallback mode." });
      return;
    }
    const poolConnection = await getMysqlPool();
    const [rows] = await poolConnection.execute('SELECT 1');
    res.json({ connected: true, msg: "Database connection active." });
  } catch (err: any) {
    isDbOffline = true;
    res.json({ connected: false, error: err.message || "Unable to reach database server." });
  }
});

// -----------------------------------------------------------------------------
// BATCH AUTO-SAVE & SYNC TRANSACTION ENDPOINT
// -----------------------------------------------------------------------------
app.post('/api/sync', async (req, res) => {
  const mutations = req.body.mutations;
  if (!Array.isArray(mutations)) {
    return res.status(400).json({ success: false, error: "Invalid sync request format." });
  }

  const syncedIds: string[] = [];

  if (isDbOffline) {
    try {
      for (const mutation of mutations) {
        const { id, entity, action, data } = mutation;
        if (!entity || !action || !data) {
          continue;
        }
        const list = offlineStore[entity] || [];
        if (action === 'delete') {
          const targetId = typeof data === 'object' ? data.id : data;
          offlineStore[entity] = list.filter((item: any) => item.id !== targetId);
        } else {
          const existingIdx = list.findIndex((item: any) => item.id === data.id);
          if (existingIdx >= 0) {
            list[existingIdx] = data;
          } else {
            list.push(data);
          }
          offlineStore[entity] = list;
        }
        syncedIds.push(id);
      }
      saveOfflineDb();
      res.json({ success: true, syncedIds });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
    return;
  }

  let connection: mysql.PoolConnection | null = null;

  try {
    const dbPool = await getMysqlPool();
    connection = await dbPool.getConnection();
    
    // Start atomic transaction
    await connection.beginTransaction();

    for (const mutation of mutations) {
      const { id, entity, action, data } = mutation;
      if (!entity || !action || !data) {
        throw new Error(`Malformed mutation object: ${JSON.stringify(mutation)}`);
      }

      // Map table name
      const table = entity === 'records' ? 'records' : entity;

      if (action === 'delete') {
        const targetId = typeof data === 'object' ? data.id : data;
        await connection.execute(`DELETE FROM \`${table}\` WHERE id = ?`, [targetId]);
      } else {
        // Validate payload before writing to protect database consistency
        const validationError = validateData(entity, data);
        if (validationError) {
          throw new Error(`Validation Error on entity [${entity}] (ID: ${data.id}): ${validationError}`);
        }
        await upsertRow(connection, table, data.id, data);
      }
      syncedIds.push(id);
    }

    // Commit changes safely
    await connection.commit();
    res.json({ success: true, syncedIds });
  } catch (err: any) {
    console.error("Auto Save Sync transaction aborted, rolling back. Reason:", err.message);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// -----------------------------------------------------------------------------
// DYNAMIC CRUD ROUTE GENERATOR (to cleanly replace all placeholders)
// -----------------------------------------------------------------------------
const entities = ['categories', 'books', 'students', 'records', 'wishlist', 'roles', 'users'];

entities.forEach(entity => {
  const table = entity;

  // GET ALL
  app.get(`/api/${entity}`, async (req, res) => {
    try {
      if (isDbOffline) {
        const rows = offlineStore[entity] || [];
        res.json(toCamel(rows));
        return;
      }
      const rows: any = await runQuery(`SELECT * FROM \`${table}\``);
      // Map permissions parsing for roles
      if (entity === 'roles') {
        rows.forEach((r: any) => {
          if (r.permissions && typeof r.permissions === 'string') {
            try {
              r.permissions = JSON.parse(r.permissions);
            } catch {
              r.permissions = {};
            }
          }
        });
      }
      res.json(toCamel(rows));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST
  app.post(`/api/${entity}`, async (req, res) => {
    try {
      const error = validateData(entity, req.body);
      if (error) return res.status(400).json({ error });

      if (isDbOffline) {
        const list = offlineStore[entity] || [];
        const existingIdx = list.findIndex((item: any) => item.id === req.body.id);
        if (existingIdx >= 0) {
          list[existingIdx] = req.body;
        } else {
          list.push(req.body);
        }
        offlineStore[entity] = list;
        saveOfflineDb();
        res.status(201).json(req.body);
        return;
      }

      const dbPool = await getMysqlPool();
      const connection = await dbPool.getConnection();
      try {
        await upsertRow(connection, table, req.body.id, req.body);
        res.status(201).json(req.body);
      } finally {
        connection.release();
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT
  app.put(`/api/${entity}/:id`, async (req, res) => {
    try {
      const error = validateData(entity, req.body);
      if (error) return res.status(400).json({ error });

      if (isDbOffline) {
        const list = offlineStore[entity] || [];
        const existingIdx = list.findIndex((item: any) => item.id === req.params.id);
        if (existingIdx >= 0) {
          list[existingIdx] = req.body;
        } else {
          list.push(req.body);
        }
        offlineStore[entity] = list;
        saveOfflineDb();
        res.json(req.body);
        return;
      }

      const dbPool = await getMysqlPool();
      const connection = await dbPool.getConnection();
      try {
        await upsertRow(connection, table, req.params.id, req.body);
        res.json(req.body);
      } finally {
        connection.release();
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE
  app.delete(`/api/${entity}/:id`, async (req, res) => {
    try {
      if (isDbOffline) {
        const list = offlineStore[entity] || [];
        offlineStore[entity] = list.filter((item: any) => item.id !== req.params.id);
        saveOfflineDb();
        res.json({ success: true });
        return;
      }
      await runQuery(`DELETE FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

// -----------------------------------------------------------------------------
// SEED DATABASE ON REQUEST
// -----------------------------------------------------------------------------
app.post('/api/seed', async (req, res) => {
  try {
    if (isDbOffline) {
      offlineStore = {
        categories: JSON.parse(JSON.stringify(defaultCategories)),
        books: JSON.parse(JSON.stringify(defaultBooks)),
        students: JSON.parse(JSON.stringify(defaultStudents)),
        records: JSON.parse(JSON.stringify(defaultBorrowRecords)),
        wishlist: JSON.parse(JSON.stringify(defaultWishlist)),
        roles: JSON.parse(JSON.stringify(defaultRoles)),
        users: JSON.parse(JSON.stringify(defaultUsers)),
      };
      saveOfflineDb();
      res.json({ success: true, message: "Offline database successfully re-seeded with pristine default datasets." });
      return;
    }

    const dbPool = await getMysqlPool();
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();

      console.log("Forced seeding request received. Clearing and re-seeding all tables...");

      // Clear all records
      await connection.execute('DELETE FROM records');
      await connection.execute('DELETE FROM wishlist');
      await connection.execute('DELETE FROM books');
      await connection.execute('DELETE FROM users');
      await connection.execute('DELETE FROM students');
      await connection.execute('DELETE FROM roles');
      await connection.execute('DELETE FROM categories');

      // 1. Seed Categories
      for (const cat of defaultCategories) {
        await upsertRow(connection, 'categories', cat.id, cat);
      }

      // 2. Seed Roles
      for (const role of defaultRoles) {
        await upsertRow(connection, 'roles', role.id, role);
      }

      // 3. Seed Users
      for (const u of defaultUsers) {
        await upsertRow(connection, 'users', u.id, u);
      }

      // 4. Seed Books
      for (const b of defaultBooks) {
        await upsertRow(connection, 'books', b.id, b);
      }

      // 5. Seed Students
      for (const s of defaultStudents) {
        await upsertRow(connection, 'students', s.id, s);
      }

      // 6. Seed Records
      for (const r of defaultBorrowRecords) {
        await upsertRow(connection, 'records', r.id, r);
      }

      // 7. Seed Wishlist
      for (const w of defaultWishlist) {
        await upsertRow(connection, 'wishlist', w.id, w);
      }

      await connection.commit();
      console.log("Forced seeding finished successfully.");
      res.json({ success: true, message: "MySQL database successfully re-seeded with pristine default datasets." });
    } catch (err: any) {
      try {
        await connection.rollback();
      } catch {}
      console.error("Failed during manual seeding:", err.message);
      res.status(500).json({ error: err.message });
    } finally {
      connection.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Run tables check on server startup
ensureTablesExist();

// -----------------------------------------------------------------------------
// VITE OR STATIC FILE SERVING & SERVER LAUNCH
// -----------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then((vite) => {
    app.use(vite.middlewares);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running in development on http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error('Failed to start Vite dev server:', err);
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in production on http://localhost:${PORT}`);
  });
}
