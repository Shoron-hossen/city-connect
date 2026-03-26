import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'citizen',
    status TEXT DEFAULT 'active',
    phone TEXT,
    location TEXT,
    photo_url TEXT,
    parent_number TEXT,
    relative_number TEXT,
    nid_number TEXT UNIQUE,
    birth_certificate_number TEXT UNIQUE,
    is_verified INTEGER DEFAULT 0,
    live_photo_url TEXT,
    face_confidence REAL,
    fraud_alert INTEGER DEFAULT 0,
    join_date DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add missing columns if they don't exist (for existing databases)
const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
const columns = tableInfo.map(c => c.name);

if (!columns.includes('live_photo_url')) {
  db.exec("ALTER TABLE users ADD COLUMN live_photo_url TEXT");
}
if (!columns.includes('face_confidence')) {
  db.exec("ALTER TABLE users ADD COLUMN face_confidence REAL");
}
if (!columns.includes('fraud_alert')) {
  db.exec("ALTER TABLE users ADD COLUMN fraud_alert INTEGER DEFAULT 0");
}
if (!columns.includes('phone')) {
  db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
}
if (!columns.includes('location')) {
  db.exec("ALTER TABLE users ADD COLUMN location TEXT");
}
if (!columns.includes('photo_url')) {
  db.exec("ALTER TABLE users ADD COLUMN photo_url TEXT");
}
if (!columns.includes('parent_number')) {
  db.exec("ALTER TABLE users ADD COLUMN parent_number TEXT");
}
if (!columns.includes('relative_number')) {
  db.exec("ALTER TABLE users ADD COLUMN relative_number TEXT");
}
if (!columns.includes('parent_email')) {
  db.exec("ALTER TABLE users ADD COLUMN parent_email TEXT");
}
if (!columns.includes('relative_email')) {
  db.exec("ALTER TABLE users ADD COLUMN relative_email TEXT");
}
if (!columns.includes('nid_number')) {
  db.exec("ALTER TABLE users ADD COLUMN nid_number TEXT");
}
if (!columns.includes('birth_certificate_number')) {
  db.exec("ALTER TABLE users ADD COLUMN birth_certificate_number TEXT");
}
if (!columns.includes('is_verified')) {
  db.exec("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0");
}

if (!columns.includes('scheduled_deletion_at')) {
  db.exec("ALTER TABLE users ADD COLUMN scheduled_deletion_at DATETIME");
}
if (!columns.includes('profile_photo_url')) {
  db.exec("ALTER TABLE users ADD COLUMN profile_photo_url TEXT");
}

// Ensure unique indexes for NID and Birth Certificate
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nid ON users(nid_number) WHERE nid_number IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_birth_cert ON users(birth_certificate_number) WHERE birth_certificate_number IS NOT NULL;
`);
if (!columns.includes('is_verified')) {
  db.exec("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'model'
    content TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'initiated', 'completed'
    location TEXT NOT NULL,
    image_url TEXT,
    ai_analysis TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    admin_notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS report_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id)
  );
`);

// Add missing columns to reports if they don't exist
const reportTableInfo = db.prepare("PRAGMA table_info(reports)").all() as any[];
const reportColumns = reportTableInfo.map(c => c.name);
if (!reportColumns.includes('updated_at')) {
  db.exec("ALTER TABLE reports ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL, -- 'signup' or 'recovery'
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
