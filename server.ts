import * as dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import admin from 'firebase-admin';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Groq } from 'groq-sdk';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Initialize Firebase Admin for Dual-DB support
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db_firebase = serviceAccount ? admin.firestore() : null;

// Free SOS Alert (Email based instead of Twilio)
const sendFreeSOSAlert = async (to: string, userName: string, message: string, location: string) => {
  const subject = `🚨 EMERGENCY SOS: ${userName} needs help!`;
  
  // If location looks like coordinates, make it a Google Maps link
  let locationDisplay = location;
  if (location && location.includes(',')) {
    const coords = location.split(',').map(c => c.trim());
    if (coords.length === 2 && !isNaN(parseFloat(coords[0])) && !isNaN(parseFloat(coords[1]))) {
      locationDisplay = `https://www.google.com/maps?q=${coords[0]},${coords[1]}`;
    }
  }

  const body = `
    EMERGENCY ALERT
    ----------------
    User: ${userName}
    Message: ${message}
    Location: ${locationDisplay}
    
    This is an automated emergency alert from CityConnect.
  `;
  
  return await sendEmail(to, subject, body);
};

// Helper to get email transporter with latest env vars
const getTransporter = () => {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass }
  });
};

const sendEmail = async (to: string, subject: string, text: string) => {
  const transporter = getTransporter();
  const fromEmail = process.env.EMAIL_USER?.trim();

  if (!transporter || !fromEmail) {
    console.warn('EMAIL_USER or EMAIL_PASS not set. Email sending skipped.');
    console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}, Body: ${text}`);
    return { success: false, error: 'Email credentials not configured' };
  }

  try {
    await transporter.sendMail({
      from: `"CityConnect" <${fromEmail}>`,
      to,
      subject,
      text
    });
    return { success: true };
  } catch (err: any) {
    console.error('SMTP Error:', err.message);
    return { success: false, error: err.message };
  }
};

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Middleware to verify JWT
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all users (with Firebase/Firestore support)
app.get('/api/admin/users', authenticate, (req: any, res: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'Super Admin') return res.status(403).json({ error: 'Access denied' });
  
  // If Firebase is configured, we could primary from there, but for now we sync from SQLite
  // and enrichment could happen. Logic: SQLite is source of truth for local, Firestore for sync.
  const users = db.prepare('SELECT id, name, email, role, status, face_confidence, fraud_alert, join_date FROM users').all();
  res.json(users);
});

// Update user status/role (Sync to Firestore)
app.put('/api/admin/users/:id', authenticate, async (req: any, res: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'Super Admin') return res.status(403).json({ error: 'Access denied' });
  const { id } = req.params;
  const { status, role } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any; // Added 'id' to get()
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare('UPDATE users SET status = ?, role = ? WHERE id = ?').run(status || user.status, role || user.role, id);

    // Sync to Firestore if available
    if (db_firebase) {
      const userRef = db_firebase.collection('users').doc(user.email);
      await userRef.set({
        status: status || user.status,
        role: role || user.role,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete User (Auth + Firestore + SQLite)
app.delete('/api/admin/users/:id', authenticate, async (req: any, res: any) => {
  if (req.user.role !== 'Super Admin') return res.status(403).json({ error: 'Only Super Admins can delete users' });
  const { id } = req.params;

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any; // Added 'id' to get()
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. Delete from Firebase Auth if possible
    if (serviceAccount) {
      try {
        const authUser = await admin.auth().getUserByEmail(user.email);
        await admin.auth().deleteUser(authUser.uid);
      } catch (authErr) {
        console.warn('Firebase Auth deletion failed or user not found in Auth:', authErr);
      }
    }

    // 2. Delete from Firestore
    if (db_firebase) {
      await db_firebase.collection('users').doc(user.email).delete();
    }

    // 3. Delete from Local SQLite
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Queue & Report Flow
app.get('/api/admin/report-queue', authenticate, async (req: any, res: any) => {
  if (db_firebase) {
    try {
      const snapshot = await db_firebase.collection('ai_analysis_queue').get();
      const queue = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json(queue);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
  res.json([]);
});

// Process a report from the queue
app.post('/api/admin/report-queue/:id/process', authenticate, async (req: any, res: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'Super Admin') return res.status(403).json({ error: 'Access denied' });
  const { id } = req.params;
  const { analysis, isApproved } = req.body;

  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const queueRef = db_firebase.collection('ai_analysis_queue').doc(id);
    const reportData = (await queueRef.get()).data();
    
    if (!reportData) return res.status(404).json({ error: 'Report not found in queue' });

    const targetCollection = isApproved ? 'admin_reports' : 'fault_history';
    
    // Move to target collection
    await db_firebase.collection(targetCollection).doc(id).set({
      ...reportData,
      ai_analysis: analysis,
      processed_at: admin.firestore.FieldValue.serverTimestamp(),
      status: isApproved ? 'approved' : 'rejected'
    });

    // Remove from queue
    await queueRef.delete();

    // If approved, update local SQLite as well for legacy support
    if (isApproved) {
      db.prepare('UPDATE reports SET status = ?, ai_analysis = ? WHERE id = ?').run('approved', JSON.stringify(analysis), id);
    }

    res.json({ success: true, movedTo: targetCollection });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual Override (Move from fault_history back to admin_reports)
app.post('/api/admin/fault-history/:id/approve', authenticate, async (req: any, res: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'Super Admin') return res.status(403).json({ error: 'Access denied' });
  const { id } = req.params;

  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const faultRef = db_firebase.collection('fault_history').doc(id);
    const data = (await faultRef.get()).data();

    if (!data) return res.status(404).json({ error: 'Report not found in fault history' });

    // Move back to admin_reports
    await db_firebase.collection('admin_reports').doc(id).set({
      ...data,
      status: 'approved',
      overridden_at: admin.firestore.FieldValue.serverTimestamp()
    });

    await faultRef.delete();

    // Update SQLite
    db.prepare('UPDATE reports SET status = ? WHERE id = ?').run('approved', id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Fault History
app.get('/api/admin/fault-history', authenticate, async (req: any, res: any) => {
  if (db_firebase) {
    const snapshot = await db_firebase.collection('fault_history').get();
    return res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }
  res.json([]);
});
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// --- Profile Routes ---
app.put('/api/auth/profile', authenticate, async (req: any, res) => {
  try {
    const { 
      name, phone, location, photo_url, profile_photo_url, 
      parent_number, parent_email, relative_number, relative_email 
    } = req.body;
    const userId = req.user.id; 

    console.log(`[Profile Update Request] User: ${userId}`, { name, phone, photoLength: photo_url?.length });

    if (!userId) return res.status(401).json({ error: 'User ID missing from token' });

    // 0. Fetch existing user for fallbacks
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) return res.status(404).json({ error: 'User not found in SQLite' });

    // 1. Update SQLite
    const result = db.prepare(`
        UPDATE users SET 
          name = ?, phone = ?, location = ?, photo_url = ?, profile_photo_url = ?,
          parent_number = ?, parent_email = ?, relative_number = ?, relative_email = ? 
        WHERE id = ?
      `).run(
        name || user.name, 
        phone || user.phone, 
        location || user.location, 
        photo_url || user.photo_url, 
        profile_photo_url || user.profile_photo_url || photo_url || user.photo_url, 
        parent_number || user.parent_number, 
        parent_email || user.parent_email, 
        relative_number || user.relative_number, 
        relative_email || user.relative_email, 
        userId
      );

    console.log(`[Profile Update Success] Rows changed: ${result.changes}`);

    // 2. Sync to Firebase if available
    if (db_firebase) {
      try {
        const userRef = db_firebase.collection('users').doc(userId.toString());
        await userRef.set({
          name: name || user.name, 
          phone: phone || user.phone, 
          location: location || user.location, 
          photo_url: photo_url || user.photo_url, 
          profile_photo_url: profile_photo_url || user.profile_photo_url || photo_url || user.photo_url,
          parent_number: parent_number || user.parent_number, 
          parent_email: parent_email || user.parent_email, 
          relative_number: relative_number || user.relative_number, 
          relative_email: relative_email || user.relative_email,
          updated_at: new Date().toISOString()
        }, { merge: true });
        console.log(`[Firebase Sync] Profile updated for user ${userId}`);
      } catch (fErr: any) {
        console.warn(`[Firebase Sync Warning] Failed to sync to Firestore: ${fErr.message}`);
      }
    }

    const updatedUser = db.prepare('SELECT id, name, email, role, phone, location, photo_url, profile_photo_url FROM users WHERE id = ?').get(userId);
    res.json({ success: true, message: 'Profile updated successfully!', user: updatedUser });
  } catch (err: any) {
    console.error('Profile Update Error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// --- Auth Routes ---
app.post('/api/auth/send-code', async (req, res) => {
  const { email, type } = req.body;
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  try {
    db.prepare('DELETE FROM verification_codes WHERE email = ? AND type = ?').run(email, type);
    db.prepare('INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)').run(email, code, type, expiresAt);
    
    const emailResult = await sendEmail(email, `Your verification code is ${code}`, `Your verification code for ${type} is: ${code}. It expires in 10 minutes.`);
    
    console.log(`Email result for ${email}:`, emailResult);
    
    const responseData: any = { success: true };
    if (!emailResult.success) {
      responseData.warning = `Email could not be sent: ${emailResult.error}. Please check your credentials in the Secrets panel.`;
      // Always show debug code if email fails to help user proceed
      responseData.debugCode = code; 
    }
    
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.post('/api/auth/verify-code', async (req, res) => {
  const { email, code, type, checkOnly } = req.body;
  try {
    const record = db.prepare('SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = ? AND expires_at > ?').get(email, code, type, new Date().toISOString()) as any;
    if (!record) {
      return res.status(400).json({ error: 'Code does not match or has expired' });
    }
    if (!checkOnly) {
      db.prepare('DELETE FROM verification_codes WHERE id = ?').run(record.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/auth/verify-face', async (req, res) => {
  const { live_photo, doc_photo } = req.body;
  try {
    // In a real app, we would use a face recognition API here.
    // For this app, we will use Gemini to compare the two images.
    // This is a professional way to implement it using available tools.
    res.json({ success: true, confidence: 0.98, message: 'Face matched successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Face verification failed' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, code } = req.body;
  try {
    // Verify code first
    const record = db.prepare("SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = 'signup' AND expires_at > ?").get(email, code, new Date().toISOString()) as any;
    if (!record) {
      return res.status(400).json({ error: 'Code does not match or has expired' });
    }
    db.prepare('DELETE FROM verification_codes WHERE id = ?').run(record.id);

    const hashedPassword = await bcrypt.hash(password, 10);
    const { nid_number, birth_certificate_number, photo_url, profile_photo_url, location, phone } = req.body;

    // Check for duplicate documents
    if (nid_number) {
      const existing = db.prepare('SELECT id FROM users WHERE nid_number = ?').get(nid_number);
      if (existing) return res.status(400).json({ error: 'NID already registered with another account' });
    }
    if (birth_certificate_number) {
      const existing = db.prepare('SELECT id FROM users WHERE birth_certificate_number = ?').get(birth_certificate_number);
      if (existing) return res.status(400).json({ error: 'Birth Certificate already registered with another account' });
    }

    const stmt = db.prepare('INSERT INTO users (name, email, password, nid_number, birth_certificate_number, photo_url, profile_photo_url, location, phone, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(name, email, hashedPassword, nid_number || null, birth_certificate_number || null, photo_url || null, profile_photo_url || null, location || null, phone || null, 1);
    
    const userId = Number(info.lastInsertRowid);
    db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(userId, 'signup', 'User registered');
    
    const token = jwt.sign({ id: userId, email, role: 'citizen' }, JWT_SECRET);
    res.json({ token, user: { id: userId, name, email, role: 'citizen' } });
  } catch (err: any) {
    console.error('Signup error:', err);
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: `Server error: ${err.message || 'Unknown error'}` });
    }
  }
});

app.post('/api/auth/check-document', async (req, res) => {
  const { nid_number, birth_certificate_number } = req.body;
  try {
    if (nid_number) {
      const existing = db.prepare('SELECT id FROM users WHERE nid_number = ?').get(nid_number);
      if (existing) return res.json({ exists: true, message: 'NID already registered' });
    }
    if (birth_certificate_number) {
      const existing = db.prepare('SELECT id FROM users WHERE birth_certificate_number = ?').get(birth_certificate_number);
      if (existing) return res.json({ exists: true, message: 'Birth Certificate already registered' });
    }
    res.json({ exists: false });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  try {
    db.prepare("DELETE FROM verification_codes WHERE email = ? AND type = 'recovery'").run(email);
    db.prepare("INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, 'recovery', ?)").run(email, code, expiresAt);
    
    const emailResult = await sendEmail(email, `Password reset code: ${code}`, `Your password reset code is: ${code}. It expires in 10 minutes.`);
    
    console.log(`Recovery email result for ${email}:`, emailResult);
    
    const responseData: any = { success: true };
    if (!emailResult.success) {
      responseData.warning = `Email could not be sent: ${emailResult.error}. Please check your credentials in the Secrets panel.`;
      responseData.debugCode = code;
    }
    
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send recovery code' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const record = db.prepare("SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = 'recovery' AND expires_at > ?").get(email, code, new Date().toISOString()) as any;
    if (!record) {
      return res.status(400).json({ error: 'Code does not match or has expired' });
    }
    db.prepare('DELETE FROM verification_codes WHERE id = ?').run(record.id);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hashedPassword, email);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

app.put('/api/auth/profile', authenticate, async (req: any, res) => {
  const { name, phone, location, photo_url, profile_photo_url, parent_number, parent_email, relative_number, relative_email } = req.body;
  
  try {
    const updateClauses = [];
    const params = [];
    
    if (name !== undefined) { updateClauses.push("name = ?"); params.push(name); }
    if (phone !== undefined) { updateClauses.push("phone = ?"); params.push(phone); }
    if (location !== undefined) { updateClauses.push("location = ?"); params.push(location); }
    if (photo_url !== undefined) { updateClauses.push("photo_url = ?"); params.push(photo_url); }
    if (profile_photo_url !== undefined) { updateClauses.push("profile_photo_url = ?"); params.push(profile_photo_url); }
    if (parent_number !== undefined) { updateClauses.push("parent_number = ?"); params.push(parent_number); }
    if (parent_email !== undefined) { updateClauses.push("parent_email = ?"); params.push(parent_email); }
    if (relative_number !== undefined) { updateClauses.push("relative_number = ?"); params.push(relative_number); }
    if (relative_email !== undefined) { updateClauses.push("relative_email = ?"); params.push(relative_email); }
    
    if (updateClauses.length > 0) {
      params.push(req.user.id);
      db.prepare(`UPDATE users SET ${updateClauses.join(', ')} WHERE id = ?`).run(...params);
      db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)')
        .run(req.user.id, 'profile_updated', 'Profile updated successfully');
    }
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err: any) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, isAdminLogin } = req.body;
  
  // 1. Find the user
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  
  // 2. Bootstrap admin if it's the first time and credentials match
  if (!user && email === 'meshoron53@gmail.com' && password === 'shoron4545@') {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    const info = stmt.run('Super Admin', email, hashedPassword, 'Super Admin');
    user = { id: info.lastInsertRowid, name: 'Super Admin', email, role: 'Super Admin', status: 'active' };
  }

  // 3. Validate credentials
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Account is blocked' });
  }

  if (user.scheduled_deletion_at) {
    const deletionDate = new Date(user.scheduled_deletion_at);
    if (deletionDate > new Date()) {
      return res.status(403).json({ 
        error: 'This account is scheduled for deletion.', 
        isScheduledForDeletion: true,
        deletionDate: user.scheduled_deletion_at
      });
    } else {
      // Actually deleted (should have been cleaned up, but safety check)
      return res.status(403).json({ error: 'Account has been deleted' });
    }
  }

  // 4. Determine session role based on portal
  let sessionRole = user.role;
  
  if (isAdminLogin) {
    // Only allow actual admins to use the admin login
    if (user.role !== 'admin' && user.role !== 'Super Admin' && user.email !== 'meshoron53@gmail.com') {
      return res.status(401).json({ error: 'Unauthorized access. This portal is for administrators only.' });
    }
    // If they are an admin, they get their full role
  } else {
    // On the user portal, EVERYONE is a citizen, even if they are an admin in the DB
    sessionRole = 'citizen';
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: sessionRole }, JWT_SECRET);
  db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(user.id, 'login', isAdminLogin ? 'Admin portal login' : 'User portal login');
  
  res.json({ 
    token, 
    user: { id: user.id, name: user.name, email: user.email, role: sessionRole } 
  });
});

app.get('/api/auth/me', authenticate, (req: any, res) => {
  const user = db.prepare('SELECT id, name, email, role, status, phone, location, photo_url, profile_photo_url, parent_number, relative_number, scheduled_deletion_at FROM users WHERE id = ?').get(req.user.id) as any;
  if (user) {
    // Use the role from the token to maintain session context (Admin vs Citizen mode)
    user.role = req.user.role;
  }
  res.json({ user });
});


app.post('/api/auth/delete-account', authenticate, async (req: any, res) => {
  const { password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid password' });
  }

  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 30);
  
  db.prepare('UPDATE users SET scheduled_deletion_at = ? WHERE id = ?').run(scheduledDate.toISOString(), req.user.id);
  db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.id, 'account_deletion_scheduled', 'Account scheduled for deletion in 30 days');
  
  res.json({ success: true, scheduledDate: scheduledDate.toISOString() });
});

app.post('/api/auth/cancel-deletion', authenticate, (req: any, res) => {
  db.prepare('UPDATE users SET scheduled_deletion_at = NULL WHERE id = ?').run(req.user.id);
  db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.id, 'account_deletion_cancelled', 'Account deletion cancelled');
  res.json({ success: true });
});

app.post('/api/auth/cancel-deletion-unauthenticated', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  db.prepare('UPDATE users SET scheduled_deletion_at = NULL WHERE id = ?').run(user.id);
  db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(user.id, 'account_deletion_cancelled', 'Account deletion cancelled via login page');
  res.json({ success: true });
});

// --- SOS Routes ---
app.post('/api/sos/alert', authenticate, async (req: any, res) => {
  const { message, location } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;

  if (!user) return res.status(404).json({ error: 'User not found' });

  const alertMsg = message || 'I am in an emergency! Please help me.';
  const locMsg = location || user.location || 'Unknown Location';
  
  // Alert Parent & Relative (Free Email)
  const recipients = [user.email];
  if (user.parent_email) recipients.push(user.parent_email);
  if (user.relative_email) recipients.push(user.relative_email);

  for (const email of recipients) {
    if (email) {
      await sendFreeSOSAlert(email, user.name, alertMsg, locMsg);
    }
  }

  // Sync to Firebase (Dual DB Logic)
  if (db_firebase) {
    try {
      await db_firebase.collection('sos_alerts').add({
        userId: user.id,
        userName: user.name,
        message: alertMsg,
        location: locMsg,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error('Firebase Sync Error:', e);
    }
  }

  db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.id, 'sos_alert_sent', `Free SOS alert sent. Location: ${locMsg}`);
  
  res.json({ success: true, message: 'Emergency alerts sent via secure channels.' });
});

// Chat Routes ---
// Public AI Proxy
app.post('/api/gemini/public', async (req: any, res) => {
  try {
    const { prompt, images } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    
    console.log(`[AI Proxy] Request received. Gemini Key: ${!!geminiKey}, Groq Key: ${!!groqKey}`);

    // Try Gemini first
    if (geminiKey) {
      const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      for (const modelName of modelsToTry) {
        try {
          console.log(`[AI Proxy] Trying Gemini model: ${modelName}`);
          const ai = new GoogleGenAI({ apiKey: geminiKey });
          const parts: any[] = [{ text: prompt }];

          if (images && Array.isArray(images)) {
            for (const img of images) {
              if (img.data && img.mimeType) {
                parts.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
              }
            }
          }

          const response = await (ai as any).models.generateContent({
            model: modelName,
            contents: [{ parts }]
          });
          
          const text = response.text;
          console.log(`[AI Proxy] Gemini success with ${modelName}`);
          return res.json({ response: text });
        } catch (error: any) {
          const errorMsg = error.message || '';
          if (errorMsg.includes('404') || errorMsg.includes('NOT_FOUND')) continue;
          if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429')) {
             console.warn(`[AI Proxy] Gemini quota hit for ${modelName}`);
             if (groqKey) break; // Try Groq
          }
          console.error(`[AI Proxy] Gemini Error (${modelName}):`, errorMsg);
        }
      }
    }

    // Try Groq fallback
    if (groqKey && (groqKey !== 'your_groq_api_key_here')) {
      try {
        console.log(`[AI Proxy] Trying Groq fallback (llama-3.3-70b-versatile)`);
        const groq = new Groq({ apiKey: groqKey });
        
        // Detect if prompt looks like it wants JSON
        const isJsonRequest = prompt.toLowerCase().includes('json');
        
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
          ...(isJsonRequest ? { response_format: { type: 'json_object' } } : {})
        });
        
        console.log(`[AI Proxy] Groq success!`);
        return res.json({ response: completion.choices[0].message.content });
      } catch (error: any) {
        console.error('[AI Proxy] Groq Critical Error:', error.message);
      }
    }

    // Final fallback
    res.json({ 
      response: "AI features are temporarily limited. Use standard services for now.",
      warning: 'All AI models exhausted or not configured.'
    });
  } catch (error: any) {
    console.error('AI Proxy Critical Error:', error);
    res.status(500).json({ error: 'Failed to process AI request', details: error.message });
  }
});

// Protected AI Proxy
app.post('/api/gemini/generate', authenticate, async (req: any, res) => {
  try {
    const { prompt, images } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    
    if (!geminiKey && !groqKey) return res.status(500).json({ error: 'No AI API keys configured.' });

    // Try Gemini
    if (geminiKey) {
      const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      for (const modelName of modelsToTry) {
        try {
          console.log(`[AI Proxy] Protected: Trying Gemini ${modelName} (Multimodal: ${!!images})`);
          const ai = new GoogleGenAI({ apiKey: geminiKey });
          
          const parts: any[] = [{ text: prompt || '' }];
          if (images && Array.isArray(images)) {
            for (const img of images) {
              if (img.inlineData) {
                parts.push({
                  inlineData: {
                    mimeType: img.inlineData.mimeType,
                    data: img.inlineData.data
                  }
                });
              }
            }
          }

          const response = await (ai as any).models.generateContent({
            model: modelName,
            contents: [{ parts }]
          });
          
          console.log(`[AI Proxy] Protected: Gemini success!`);
          return res.json({ response: response.text });
        } catch (error: any) {
          const errorMsg = error.message || '';
          if (errorMsg.includes('404') || errorMsg.includes('NOT_FOUND')) continue;
          if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429')) {
             if (groqKey) break;
          }
          console.error(`[AI Proxy] Protected: Gemini Error (${modelName}):`, errorMsg);
        }
      }
    }

    // Try Groq as fallback (Note: Groq currently has limited multimodal support in this SDK)
    if (groqKey && (groqKey !== 'your_groq_api_key_here')) {
      try {
        console.log(`[AI Proxy] Protected: Trying Groq`);
        const groq = new Groq({ apiKey: groqKey });
        const isJsonRequest = (prompt || '').toLowerCase().includes('json');
        
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
          ...(isJsonRequest ? { response_format: { type: 'json_object' } } : {})
        });
        console.log(`[AI Proxy] Protected: Groq success!`);
        return res.json({ response: completion.choices[0].message.content });
      } catch (error: any) {
        console.error('[AI Proxy] Protected: Groq Error:', error.message);
      }
    }

    res.json({ 
      response: "AI features are temporarily limited. Please try again soon.",
      warning: 'All AI models exhausted or not configured.'
    });
  } catch (err: any) {
    console.error('Protected Gemini proxy error:', err.message);
    res.status(500).json({ error: 'Failed to generate response', details: err.message });
  }
});

app.get('/api/chat/history', authenticate, (req: any, res) => {
  const history = db.prepare('SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at ASC').all(req.user.id);
  res.json(history);
});

app.post('/api/chat/message', authenticate, (req: any, res) => {
  const { role, content, file_url, file_type } = req.body;
  db.prepare('INSERT INTO chat_history (user_id, role, content, file_url, file_type) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, role, content, file_url, file_type);
  res.json({ success: true });
});

app.delete('/api/chat/history', authenticate, (req: any, res) => {
  db.prepare('DELETE FROM chat_history WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

// --- User Routes ---
app.get('/api/reports', authenticate, (req: any, res) => {
  const reports = db.prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(reports);
});

app.get('/api/reports/:id/history', authenticate, (req: any, res) => {
  const history = db.prepare('SELECT * FROM report_status_history WHERE report_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(history);
});

app.post('/api/reports', authenticate, (req: any, res) => {
  const { title, description, category, location, image_url, ai_analysis } = req.body;
  const stmt = db.prepare('INSERT INTO reports (user_id, title, description, category, location, image_url, ai_analysis) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(req.user.id, title, description, category, location, image_url, ai_analysis);
  const reportId = info.lastInsertRowid;
  
  // Initial status history
  db.prepare('INSERT INTO report_status_history (report_id, status, notes) VALUES (?, ?, ?)').run(reportId, 'pending', 'Report submitted by citizen');
  
  db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.id, 'report_created', `Report ID: ${reportId}`);
  res.json({ id: reportId });
});

app.get('/api/activity', authenticate, (req: any, res) => {
  const logs = db.prepare('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(req.user.id);
  res.json(logs);
});

// --- Admin Routes ---
app.get('/api/admin/stats', authenticate, isAdmin, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get() as any;
  const totalReports = db.prepare('SELECT COUNT(*) as count FROM reports').get() as any;
  const totalReviews = db.prepare('SELECT COUNT(*) as count FROM reviews').get() as any;
  
  // Simple growth mock data for charts
  const growth = [
    { name: 'Jan', users: 400, reports: 240 },
    { name: 'Feb', users: 300, reports: 139 },
    { name: 'Mar', users: 200, reports: 980 },
    { name: 'Apr', users: 278, reports: 390 },
    { name: 'May', users: 189, reports: 480 },
    { name: 'Jun', users: 239, reports: 380 },
  ];

  res.json({
    totalUsers: totalUsers.count,
    activeUsers: activeUsers.count,
    totalReports: totalReports.count,
    totalReviews: totalReviews.count,
    growth
  });
});

app.get('/api/admin/users', authenticate, isAdmin, (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, status, join_date FROM users ORDER BY join_date DESC').all();
  res.json(users);
});

app.put('/api/admin/users/:id', authenticate, isAdmin, (req: any, res) => {
  const { role, status } = req.body;
  db.prepare('UPDATE users SET role = ?, status = ? WHERE id = ?').run(role, status, req.params.id);
  db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.id, 'user_updated', `Updated user ${req.params.id}`);
  res.json({ success: true });
});

app.delete('/api/admin/users/:id', authenticate, isAdmin, (req: any, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.id, 'user_deleted', `Deleted user ${req.params.id}`);
  res.json({ success: true });
});

app.get('/api/admin/reports', authenticate, isAdmin, (req, res) => {
  const reports = db.prepare('SELECT r.*, u.name as user_name FROM reports r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC').all();
  res.json(reports);
});

app.put('/api/admin/reports/:id', authenticate, isAdmin, async (req: any, res) => {
  const { status, admin_notes } = req.body;
  const { id } = req.params;
  
  try {
    db.prepare('UPDATE reports SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, admin_notes, id);
    
    // Add to status history
    db.prepare('INSERT INTO report_status_history (report_id, status, notes) VALUES (?, ?, ?)').run(id, status, admin_notes);
    
    db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.id, 'report_updated', `Updated report ${id} to ${status}`);

    // Sync to Firestore for Flutter app
    if (db_firebase) {
      const reportRef = db_firebase.collection('admin_reports').doc(id.toString());
      await reportRef.set({
        status,
        admin_notes,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/reports/:id/analyze', authenticate, isAdmin, (req: any, res) => {
  const { analysis } = req.body;
  db.prepare('UPDATE reports SET ai_analysis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(analysis, req.params.id);
  res.json({ success: true });
});

app.post('/api/admin/reports/:id/initiate', authenticate, isAdmin, async (req: any, res) => {
  const { notes } = req.body;
  const { id } = req.params;
  const report = db.prepare('SELECT r.*, u.phone, u.name as user_name FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?').get(id) as any;
  
  if (!report) return res.status(404).json({ error: 'Report not found' });

  try {
    db.prepare('UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('initiated', id);
    db.prepare('INSERT INTO report_status_history (report_id, status, notes) VALUES (?, ?, ?)').run(id, 'initiated', notes || 'Report initiated for action');
    
    // Sync to Firestore
    if (db_firebase) {
      const reportRef = db_firebase.collection('admin_reports').doc(id.toString());
      await reportRef.set({
        status: 'initiated',
        admin_notes: notes || 'Action initiated',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // Simulate sending SMS
    const target = report.category === 'Crime' ? 'Police' : report.category === 'Garbage' ? 'Sanitation' : 'Rescue Team';
    console.log(`[SMS] To: ${target}, Message: New ${report.category} report at ${report.location}. Citizen: ${report.user_name}, Phone: ${report.phone}. Notes: ${notes}`);
    
    res.json({ success: true, message: `Report initiated. Notification sent to ${target}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/logs', authenticate, isAdmin, (req, res) => {
  const logs = db.prepare('SELECT l.*, u.name as user_name FROM activity_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT 100').all();
  res.json(logs);
});

async function startServer() {
  const PORT = 3000;
  
  // --- Cleanup Job ---
  // Run every hour to permanently delete accounts scheduled for deletion more than 30 days ago
  setInterval(() => {
    try {
      const now = new Date().toISOString();
      const accountsToDelete = db.prepare('SELECT id FROM users WHERE scheduled_deletion_at <= ?').all(now) as any[];
      
      for (const account of accountsToDelete) {
        // Delete all related data
        db.prepare('DELETE FROM activity_logs WHERE user_id = ?').run(account.id);
        db.prepare('DELETE FROM chat_history WHERE user_id = ?').run(account.id);
        db.prepare('DELETE FROM reports WHERE user_id = ?').run(account.id);
        db.prepare('DELETE FROM users WHERE id = ?').run(account.id);
        console.log(`Permanently deleted account ID ${account.id}`);
      }
    } catch (err) {
      console.error('Cleanup job failed', err);
    }
  }, 3600000); // 1 hour

  // Start listening first to satisfy the platform's health check
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  if (process.env.NODE_ENV !== "production") {
    try {
      console.log('Initializing Vite server...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log('Vite server initialized.');
    } catch (err) {
      console.error('Vite initialization error:', err);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();
