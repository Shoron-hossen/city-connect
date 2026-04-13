import * as dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import twilio from 'twilio';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { Groq } from 'groq-sdk';
import { startDisasterAlertService } from './disasterService';
// SQLite removed for Vercel deployment

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Initialize Firebase Admin for Dual-DB support
let db_firebase: admin.firestore.Firestore | null = null;
let firebase_init_error: string | null = null;

const loadFirebaseServiceAccount = (): string | null => {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || '';

  if (!raw && process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      raw = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      console.log('ℹ️ FIREBASE_SERVICE_ACCOUNT loaded from base64 variable');
    } catch (err: any) {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_BASE64 could not be decoded:', err.message);
    }
  }

  if (!raw && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      raw = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
      console.log(`ℹ️ FIREBASE_SERVICE_ACCOUNT loaded from file path ${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}`);
    } catch (err: any) {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_PATH file read failed:', err.message);
    }
  }

  if (!raw) {
    const paths = [
      path.join(process.cwd(), 'firebase-service-account.json'),
      path.join(process.cwd(), 'serviceAccountKey.json'),
      path.join(process.cwd(), 'firebase-adminsdk.json')
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        raw = fs.readFileSync(p, 'utf8');
        console.log(`ℹ️ FIREBASE_SERVICE_ACCOUNT loaded from local file ${p}`);
        break;
      }
    }
  }

  if (raw && ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"')))) {
    raw = raw.slice(1, -1);
  }

  return raw || null;
};

const sanitizeServiceAccount = (input: string) => {
  let candidate = input.trim();

  // Pre-process: fix double-escaped newlines and remove invalid JSON escape sequences
  // This handles cases where .env vars have \\n instead of \n, or invalid \g etc.
  const preProcessRawJson = (raw: string): string => {
    // Replace \\n (double-escaped newline) with actual \n inside JSON strings
    // We do this on the raw string before JSON.parse
    return raw.replace(/\\\\n/g, '\\n').replace(/\\\\r/g, '').replace(/\\([^"\\/bfnrtu])/g, '$1');
  };

  const normalizePrivateKey = (rawKey: string) => {
    // rawKey at this point may still have literal \n sequences (from JSON string values)
    let normalized = rawKey.replace(/\\r/g, '').replace(/\\n/g, '\n').trim();
    if (!normalized.startsWith('-----BEGIN PRIVATE KEY-----')) {
      // Some keys may omit the header in the value; reformat if needed.
      normalized = normalized.replace(/\s+/g, '\n');
    }
    return normalized;
  };

  const validateAccount = (parsed: any) => {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Firebase service account is not an object');
    }
    if (!parsed.private_key || !parsed.client_email) {
      throw new Error('Firebase service account is missing required fields (private_key or client_email)');
    }
    parsed.private_key = normalizePrivateKey(parsed.private_key);
    if (!parsed.private_key.includes('-----BEGIN PRIVATE KEY-----') || !parsed.private_key.includes('-----END PRIVATE KEY-----')) {
      throw new Error('Invalid PEM formatted private_key (missing BEGIN/END markers)');
    }
    parsed.private_key = parsed.private_key.replace(/\r/g, '');
    return parsed;
  };

  try {
    const processed = preProcessRawJson(candidate);
    const parsed = JSON.parse(processed);
    return validateAccount(parsed);
  } catch (err) {
    try {
      // Try interpreting as base64
      const maybeBase64 = Buffer.from(candidate, 'base64').toString('utf8');
      const processedBase64 = preProcessRawJson(maybeBase64);
      const parsed = JSON.parse(processedBase64);
      return validateAccount(parsed);
    } catch {
      throw new Error('Invalid Firebase service account JSON (not parsable as JSON or base64 JSON)');
    }
  }
};

try {
  const raw = loadFirebaseServiceAccount();
  if (!raw) {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT not found. Firestore features will be disabled.');
  } else {
    const serviceAccount = sanitizeServiceAccount(raw);
    if (!serviceAccount || !serviceAccount.private_key) {
      throw new Error('Firebase service account is missing private_key.');
    }

    const calculatedBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`;
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: calculatedBucket
    });

    const databaseId = process.env.FIREBASE_DATABASE_ID;
    const storageBucket = calculatedBucket;
      
      if (databaseId && databaseId !== '(default)' && databaseId.trim() !== '') {
        const fs = getFirestore(app);
        fs.settings({ databaseId, ignoreUndefinedProperties: true });
        db_firebase = fs;
        console.log(`✅ Firebase initialized successfully (Database: ${databaseId}, Storage: ${storageBucket})`);
      } else {
        const fs = getFirestore(app);
        fs.settings({ ignoreUndefinedProperties: true });
        db_firebase = fs;
        console.log(`✅ Firebase initialized successfully (Database: default, Storage: ${storageBucket})`);
      }
      
      // Initialize Storage
      admin.storage().bucket(storageBucket);
    
    // Start background services after Firebase completes setup
    startDisasterAlertService();
  }
} catch (err: any) {
  firebase_init_error = err.message;
  console.error('❌ Firebase initialization error:', err.message);
  if (err.message.includes('NOT_FOUND')) {
    console.error('TIP: Check if your Project ID or Database ID is correct in .env');
  }
  if (err.message.includes('Invalid PEM formatted message')) {
    console.error('TIP: Check your private_key string formatting (ensure proper newlines in PEM, e.g. "\\n" escaped in .env).');
  }
}

app.get('/api/health', (req, res) => {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  res.json({
    status: 'ok',
    firebase: db_firebase ? 'connected' : 'not configured',
    firebase_apps: admin.apps.length,
    cwd: process.cwd(),
    has_sa_var: !!sa,
    database_id: process.env.FIREBASE_DATABASE_ID || 'default',
    error: firebase_init_error,
    timestamp: new Date().toISOString()
  });
});

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

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

const verifyIdentity = async (nidPhoto: string, selfiePhoto: string, profilePhoto?: string) => {
  if (!nidPhoto || !selfiePhoto) return { success: false, confidence: 0, message: 'Missing documentation photos' };
  
  const GENAI_KEY = process.env.GEMINI_API_KEY;
  if (!GENAI_KEY) {
    console.warn('⚠️ GEMINI_API_KEY missing, using mock verification');
    const confidence = 0.95 + (Math.random() * 0.04);
    return { success: confidence > 0.9, confidence, message: 'Identity verified (MOCK)' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GENAI_KEY });

    const prepareImage = (dataUrl: string) => {
      const parts = dataUrl.split(',');
      if (parts.length < 2) return null;
      return {
        inlineData: {
          data: parts[parts.length - 1],
          mimeType: dataUrl.split(';')[0].split(':')[1] || 'image/jpeg'
        }
      };
    };

    const nidPart = prepareImage(nidPhoto);
    const selfiePart = prepareImage(selfiePhoto);
    const profilePart = profilePhoto ? prepareImage(profilePhoto) : null;

    if (!nidPart || !selfiePart) return { success: false, confidence: 0, message: 'Invalid image format' };

    const prompt = "Compare these three images. The first is a live capture (Selfie). The second is an NID card or Birth Certificate. The third (if provided) is a clear profile photo. Determine if the person in the Selfie is the same person as in the document. Provide the response strictly in JSON format: { \"match\": boolean, \"confidence\": number (0.0 to 1.0), \"reason\": \"string\" }";

    const parts: any[] = [{ text: prompt }, { inlineData: selfiePart.inlineData }, { inlineData: nidPart.inlineData }];
    if (profilePart) parts.push({ inlineData: profilePart.inlineData });

    const result = await (ai as any).models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ parts }]
    });

    const responseText = result.text || '';
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const data = JSON.parse(cleanJson);

    return { 
      success: data.match === true && data.confidence > 0.75, 
      confidence: data.confidence || 0, 
      message: data.reason || (data.match ? 'Identity verified successfully' : 'Identity verification failed')
    };
  } catch (err: any) {
    console.error('❌ Face Verification Error:', err.message);
    return { success: false, confidence: 0, message: 'Verification engine error: ' + err.message };
  }
};

const uploadBase64ToStorage = async (base64Data: string, path: string): Promise<string | null> => {
  if (!base64Data || !base64Data.includes('base64,')) return null;
  if (!db_firebase) return null;

  try {
    const bucket = admin.storage().bucket();
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const file = bucket.file(path);

    await file.save(buffer, {
      metadata: { contentType }
    });

    try {
      await file.makePublic();
      return `https://storage.googleapis.com/${bucket.name}/${path}`;
    } catch (e: any) {
      // Fallback: if bucket blocks public access, generate a long-lived signed URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '01-01-2100' // Practically permanent
      });
      return url;
    }
  } catch (err: any) {
    console.error('❌ Storage Upload Error:', err.message);
    return null;
  }
};

// Get all users (Firestore Primary)
app.get('/api/admin/users', authenticate, async (req: any, res: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'Super Admin') return res.status(403).json({ error: 'Access denied' });
  
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const snapshot = await db_firebase.collection('users').get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Serialize Firestore Timestamp to ISO string
      let joinDate = data.join_date;
      if (joinDate && typeof joinDate.toDate === 'function') {
        joinDate = joinDate.toDate().toISOString();
      } else if (joinDate && joinDate._seconds) {
        joinDate = new Date(joinDate._seconds * 1000).toISOString();
      }

      return { 
        id: doc.id, 
        ...data,
        join_date: joinDate || new Date().toISOString(),
        face_confidence: data.verification_confidence || data.face_confidence || 0,
        status: data.status || 'active'
      };
    });
    res.json(users);
  } catch (err: any) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
});

// Update user status/role (Firestore Primary)
app.put('/api/admin/users/:id', authenticate, async (req: any, res: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'Super Admin') return res.status(403).json({ error: 'Access denied' });
  const { id } = req.params; // In the new system, 'id' will be the email or a unique string
  const { status, role } = req.body;

  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const userRef = db_firebase.collection('users').doc(id);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    await userRef.update({
      status: status || userDoc.data()?.status,
      role: role || userDoc.data()?.role,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Firestore update failed: ' + err.message });
  }
})// Delete User (Firestore Primary)
app.delete('/api/admin/users/:id', authenticate, async (req: any, res: any) => {
  if (req.user.role !== 'Super Admin' && req.user.role !== 'admin' && req.user.email !== 'meshoron53@gmail.com') {
    return res.status(403).json({ error: 'Not authorized to delete users' });
  }
  const { id } = req.params; // Using email or unique ID

  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const userRef = db_firebase.collection('users').doc(id);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const email = userDoc.data()?.email;

    // 1. Delete from Firebase Auth if possible
    if (email) {
      try {
        const authUser = await admin.auth().getUserByEmail(email);
        await admin.auth().deleteUser(authUser.uid);
      } catch (authErr) {
        console.warn('Firebase Auth deletion failed or user not found in Auth:', authErr);
      }
    }

    // 2. Delete from Firestore
    await userRef.delete();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Firestore deletion failed: ' + err.message });
  }
});

// AI Queue & Report Flow (Already Firestore primary)
app.get('/api/admin/report-queue', authenticate, async (req: any, res: any) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    const snapshot = await db_firebase.collection('ai_analysis_queue').get();
    const queue = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(queue);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Process a report from the queue (Firestore Primary)
app.post('/api/admin/report-queue/:id/process', authenticate, async (req: any, res: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'Super Admin') return res.status(403).json({ error: 'Access denied' });
  const { id } = req.params;
  const { analysis, isApproved } = req.body;

  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const queueRef = db_firebase.collection('ai_analysis_queue').doc(id);
    const reportSnapshot = await queueRef.get();
    const reportData = reportSnapshot.data();
    
    if (!reportData) return res.status(404).json({ error: 'Report not found in queue' });

    const targetCollection = isApproved ? 'admin_reports' : 'fault_history';
    
    // Move to target collection
    await db_firebase.collection(targetCollection).doc(id).set({
      ...reportData,
      ai_analysis: analysis,
      processed_at: admin.firestore.FieldValue.serverTimestamp(),
      status: isApproved ? 'approved' : 'rejected'
    });

    // Also update a global "reports" collection for the citizen dashboard
    await db_firebase.collection('reports').doc(id).set({
      ...reportData,
      status: isApproved ? 'approved' : 'rejected',
      ai_analysis: analysis,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Remove from queue
    await queueRef.delete();

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
    const reportSnapshot = await faultRef.get();
    const data = reportSnapshot.data();

    if (!data) return res.status(404).json({ error: 'Report not found in fault history' });

    // Move back to admin_reports
    await db_firebase.collection('admin_reports').doc(id).set({
      ...data,
      status: 'approved',
      overridden_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Also update a global "reports" collection for the citizen dashboard
    await db_firebase.collection('reports').doc(id).set({
      ...data,
      status: 'approved',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await faultRef.delete();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Manual override failed: ' + err.message });
  }
});

// Fetch All Admin Reports (Unified)
app.get('/api/admin/reports', authenticate, isAdmin, async (req: any, res: any) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    const snapshot = await db_firebase.collection('reports').get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch admin reports: ' + err.message });
  }
});

// Update Report Status (Admin) — handles status, admin_notes, ai_analysis
app.put('/api/admin/reports/:id', authenticate, async (req: any, res: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'Super Admin') return res.status(403).json({ error: 'Access denied' });
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  const { id } = req.params;
  const { status, admin_notes, ai_analysis } = req.body;

  try {
    const updateData: any = {
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (status !== undefined) updateData.status = status;
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
    if (ai_analysis !== undefined) updateData.ai_analysis = ai_analysis;

    // Use set with merge so it works whether or not the doc exists in admin_reports
    await db_firebase.collection('admin_reports').doc(id).set(updateData, { merge: true });

    // Always sync to the main user-visible reports collection
    await db_firebase.collection('reports').doc(id).set(updateData, { merge: true });

    // Add timeline entry when sending to manual review
    if (status === 'pending_manual') {
      await db_firebase.collection('report_status_history').add({
        report_id: id,
        status: 'pending_manual',
        notes: 'Report analyzed by AI and sent to manual admin review.',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Remove from AI queue since it's now in manual review
      await db_firebase.collection('ai_analysis_queue').doc(id).delete();
    }

    res.json({ success: true, message: 'Report updated successfully' });
  } catch (err: any) {
    console.error('[PUT /api/admin/reports/:id] Error:', err.message);
    res.status(500).json({ error: 'Failed to update report: ' + err.message });
  }
});

// Bulk AI Refresh
app.post('/api/admin/reports/refresh-ai', authenticate, isAdmin, async (req: any, res: any) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'Groq API Key not configured' });

  try {
    const snapshot = await db_firebase.collection('reports')
      .where('status', '==', 'pending_ai')
      .get();

    if (snapshot.empty) return res.json({ message: 'No pending reports to analyze.', count: 0 });

    const groq = new Groq({ apiKey: groqKey });
    let processedCount = 0;

    for (const doc of snapshot.docs) {
      const report = doc.data();
      const reportId = doc.id;

      const prompt = `
        ACT AS A PROFESSIONAL CITY CONNECT REPORT VALIDATOR.
        ANALYZE THIS REPORT:
        TITLE: ${report.title}
        DESCRIPTION: ${report.description}
        CATEGORY: ${report.category}
        
        TASK:
        1. Determine if this report is a 'FAKE' or 'INTERNET COLLECTED' photo/issue.
        2. If it looks like a legitimate citizen-captured photo of a real urban issue, respond with 'PASS'.
        3. If it is likely fake or generic, respond with 'REJECT'.
        
        RESPONSE FORMAT (JSON):
        {
          "status": "PASS" or "REJECT",
          "feedback": "Detailed professional feedback or reason for rejection"
        }
      `;

      try {
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' }
        });

        const aiResult = JSON.parse(completion.choices[0].message.content || '{}');
        const isApproved = aiResult.status === 'PASS';

        await db_firebase.collection('reports').doc(reportId).update({
          status: isApproved ? 'pending_admin' : 'fault_history',
          ai_feedback: aiResult.feedback,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        processedCount++;
      } catch (err: any) {
        console.error(`Error processing report ${reportId}:`, err.message);
      }
    }

    res.json({ success: true, count: processedCount });
  } catch (err: any) {
    res.status(500).json({ error: 'Bulk AI refresh failed: ' + err.message });
  }
});

// Manual Approve
app.post('/api/admin/reports/:id/manual-approve', authenticate, isAdmin, async (req: any, res: any) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  const { id } = req.params;

  try {
    await db_firebase.collection('reports').doc(id).update({
      status: 'pending_admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      manual_approval: true
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Manual approval failed: ' + err.message });
  }
});

// --- Manual Review Reports (Admin reviews after AI) ---
app.get('/api/admin/manual-reports', authenticate, isAdmin, async (req: any, res: any) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    const snapshot = await db_firebase.collection('reports')
      .where('status', 'in', ['pending', 'pending_manual'])
      .get();
    const reports = snapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data };
    });
    // Sort by created_at descending
    reports.sort((a: any, b: any) => {
      const aTime = a.created_at?._seconds || a.createdAt?._seconds || 0;
      const bTime = b.created_at?._seconds || b.createdAt?._seconds || 0;
      return bTime - aTime;
    });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch manual reports: ' + err.message });
  }
});

// Approve a report from manual review
app.post('/api/admin/manual-reports/:id/approve', authenticate, isAdmin, async (req: any, res: any) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  const { id } = req.params;
  const { admin_notes } = req.body;
  try {
    const updateData: any = {
      status: 'approved',
      admin_notes: admin_notes || 'Approved by administrator',
      approved_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db_firebase.collection('reports').doc(id).update(updateData);
    // Also add to status history for user tracking
    await db_firebase.collection('report_status_history').add({
      report_id: id,
      status: 'approved',
      notes: admin_notes || 'Report approved by administrator after manual review.',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true, message: 'Report approved successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to approve report: ' + err.message });
  }
});

// Reject a report from manual review
app.post('/api/admin/manual-reports/:id/reject', authenticate, isAdmin, async (req: any, res: any) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  const { id } = req.params;
  const { admin_notes } = req.body;
  try {
    const updateData: any = {
      status: 'rejected',
      admin_notes: admin_notes || 'Rejected by administrator',
      rejected_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db_firebase.collection('reports').doc(id).update(updateData);
    await db_firebase.collection('report_status_history').add({
      report_id: id,
      status: 'rejected',
      notes: admin_notes || 'Report rejected by administrator after manual review.',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true, message: 'Report rejected successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reject report: ' + err.message });
  }
});


// Save AI Analysis to Report
app.post('/api/admin/reports/:id/analyze', authenticate, async (req: any, res: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'Super Admin') return res.status(403).json({ error: 'Access denied' });
  const { id } = req.params;
  const { analysis } = req.body;
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const analysisData = {
      ai_analysis: analysis,
      analyzed_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Save to both admin_reports (create if missing) and main reports collection
    await db_firebase.collection('admin_reports').doc(id).set(analysisData, { merge: true });
    await db_firebase.collection('reports').doc(id).set(analysisData, { merge: true });

    res.json({ success: true });
  } catch (err: any) {
    console.error('[Analyze] Error saving analysis:', err.message);
    res.status(500).json({ error: 'Failed to save analysis: ' + err.message });
  }
});

// Initiate Action for Report
app.post('/api/admin/reports/:id/initiate', authenticate, async (req: any, res: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'Super Admin') return res.status(403).json({ error: 'Access denied' });
  const { id } = req.params;
  const { notes } = req.body;
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const reportRef = db_firebase.collection('admin_reports').doc(id);
    await reportRef.update({ status: 'initiated' });
    await db_firebase.collection('reports').doc(id).update({ status: 'initiated' });

    await db_firebase.collection('report_status_history').add({
      report_id: id,
      status: 'initiated',
      notes: notes || 'Action initiated by administrator.',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to initiate action: ' + err.message });
  }
});

// Fetch Fault History (Firestore Primary)
app.get('/api/admin/fault-history', authenticate, async (req: any, res: any) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    const snapshot = await db_firebase.collection('fault_history').get();
    return res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch fault history: ' + err.message });
  }
});

// --- Profile Routes ---
app.put('/api/auth/profile', authenticate, async (req: any, res) => {
  const { 
    name, phone, location, bio, photo_url, profile_photo_url, 
    parent_number, parent_email, relative_number, relative_email 
  } = req.body;
  const email = req.user.email; 

  if (!email) return res.status(401).json({ error: 'User email missing from token' });
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const userRef = db_firebase.collection('users').doc(email);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data() || {};
    
    // Try to upload photos to Firebase Storage; fall back to storing base64 directly if storage fails
    let finalPhotoUrl: string | null = photo_url || userData.photo_url || null;
    let finalProfilePhotoUrl: string | null = profile_photo_url || userData.profile_photo_url || null;

    if (photo_url && photo_url.includes('base64,')) {
      const uploaded = await uploadBase64ToStorage(photo_url, `users/${email}/photo_${Date.now()}.jpg`);
      // If storage upload succeeds use the URL, otherwise keep the base64 string (max 500KB)
      finalPhotoUrl = uploaded || photo_url;
    }
    if (profile_photo_url && profile_photo_url.includes('base64,')) {
      const uploaded = await uploadBase64ToStorage(profile_photo_url, `users/${email}/profile_${Date.now()}.jpg`);
      finalProfilePhotoUrl = uploaded || profile_photo_url;
    }

    const updatedFields: any = {
      name: name || userData.name,
      phone: phone !== undefined ? phone : (userData.phone || ''),
      location: location !== undefined ? location : (userData.location || ''),
      bio: bio !== undefined ? bio : (userData.bio || ''),
      parent_number: parent_number !== undefined ? parent_number : (userData.parent_number || ''),
      parent_email: parent_email !== undefined ? parent_email : (userData.parent_email || ''),
      relative_number: relative_number !== undefined ? relative_number : (userData.relative_number || ''),
      relative_email: relative_email !== undefined ? relative_email : (userData.relative_email || ''),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Always update photo fields if we have a value (URL or base64)
    if (finalPhotoUrl) {
      updatedFields.photo_url = finalPhotoUrl;
    }
    if (finalProfilePhotoUrl) {
      updatedFields.profile_photo_url = finalProfilePhotoUrl;
    } else if (finalPhotoUrl) {
      // Use the main photo as profile photo fallback
      updatedFields.profile_photo_url = finalPhotoUrl;
    }

    await userRef.update(updatedFields);
    
    await db_firebase.collection('activity_logs').add({
      user_email: email,
      user_name: userData.name || name || email,
      action: 'profile_updated',
      details: 'User updated profile information',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Return clean data (fetch from DB to get real values, not FieldValue objects)
    const freshDoc = await userRef.get();
    const freshData = freshDoc.data() as any;
    const { password: _pw, ...safeData } = freshData;
    res.json({ success: true, user: { id: email, ...safeData, role: req.user.role } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

// --- Auth Routes ---
app.post('/api/auth/send-code', async (req, res) => {
  const { email, type } = req.body;
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const codeId = `${email}_${type}`;
    await db_firebase.collection('verification_codes').doc(codeId).set({
      email,
      code,
      type,
      expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const emailResult = await sendEmail(email, `Your CityConnect verification code: ${code}`, `Your code is: ${code}. It expires in 10 minutes.`);
    
    const responseData: any = { success: true };
    if (!emailResult.success) {
      responseData.warning = `Email could not be sent.`;
      responseData.debugCode = code; 
    }
    
    res.json(responseData);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to send code: ' + err.message });
  }
});

app.post('/api/auth/verify-code', async (req: any, res) => {
  const { email, code, type, checkOnly } = req.body;
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const codeId = `${email}_${type}`;
    const codeDoc = await db_firebase.collection('verification_codes').doc(codeId).get();
    
    if (!codeDoc.exists || codeDoc.data()?.code !== code || codeDoc.data()?.expires_at.toDate() < new Date()) {
      return res.status(400).json({ error: 'Code does not match or has expired' });
    }

    if (!checkOnly) {
      await db_firebase.collection('verification_codes').doc(codeId).delete();
    }
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Verification failed: ' + err.message });
  }
});

app.post('/api/auth/verify-face', async (req, res) => {
  const { doc_photo, selfie_photo, profile_photo, live_photo } = req.body;
  // Handle various naming conventions from different screens
  const doc = doc_photo || req.body.nid_photo;
  const selfie = live_photo || selfie_photo;
  const profile = profile_photo;

  if (!doc || !selfie) {
    return res.status(400).json({ success: false, message: 'Missing photos for verification' });
  }

  const result = await verifyIdentity(doc, selfie, profile);
  res.json(result);
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, code } = req.body;
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    // 1. Verify code
    const codeId = `${email}_signup`;
    const codeDoc = await db_firebase.collection('verification_codes').doc(codeId).get();
    
    if (!codeDoc.exists || codeDoc.data()?.code !== code || codeDoc.data()?.expires_at.toDate() < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // 2. Already verified? Logic check
    const userRef = db_firebase.collection('users').doc(email);
    if ((await userRef.get()).exists) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // 3. Clear code
    await db_firebase.collection('verification_codes').doc(codeId).delete();

    const hashedPassword = await bcrypt.hash(password, 10);
    const { 
      nid_number, birth_certificate_number, photo_url, profile_photo_url, 
      location, phone, nid_photo, selfie_photo, live_photo_url 
    } = req.body;

    // 3.5 Strictly check NID uniqueness
    if (nid_number) {
       const nidCheck = await db_firebase.collection('users').where('nid_number', '==', nid_number).get();
       if (!nidCheck.empty) {
         return res.status(400).json({ error: 'This NID number is already registered to another account. The exact profile must be deleted from the system first to reuse this NID.' });
       }
    }

    // Standardize photo fields across Web/Mobile
    const finalNidPhoto = nid_photo || photo_url;
    const finalSelfiePhoto = selfie_photo || live_photo_url;
    const finalProfilePhoto = profile_photo_url || photo_url;

    // 4. Identity Verification (Done with base64 for AI analysis)
    const idResult = await verifyIdentity(finalNidPhoto, finalSelfiePhoto, finalProfilePhoto);

    // 5. Upload images to Storage to avoid Firestore limits
    console.log('📤 Uploading documents for:', email);
    const [nidUrl, selfieUrl, profileUrl] = await Promise.all([
      uploadBase64ToStorage(finalNidPhoto, `users/${email}/nid_${Date.now()}.jpg`),
      uploadBase64ToStorage(finalSelfiePhoto, `users/${email}/selfie_${Date.now()}.jpg`),
      uploadBase64ToStorage(finalProfilePhoto, `users/${email}/profile_${Date.now()}.jpg`)
    ]);

    const userData = {
      name,
      email,
      password: hashedPassword,
      role: 'citizen',
      status: 'active',
      phone: phone || null,
      location: location || null,
      photo_url: profileUrl || null,
      profile_photo_url: profileUrl || null,
      nid_number: nid_number || null,
      birth_certificate_number: birth_certificate_number || null,
      nid_photo_url: nidUrl || null,
      selfie_photo_url: selfieUrl || null,
      is_verified: idResult.success,
      verification_confidence: idResult.confidence,
      join_date: admin.firestore.FieldValue.serverTimestamp()
    };

    await userRef.set(userData);

    if (!idResult.success) {
      // Log to registration_faults
      await db_firebase.collection('registration_faults').add({
        user_email: email,
        reason: idResult.message,
        confidence: idResult.confidence,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Log activity in Firestore
    await db_firebase.collection('activity_logs').add({
      user_email: email,
      action: 'signup',
      details: idResult.success ? 'User registered and verified' : 'User registered (Verification Pending)',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    const token = jwt.sign({ id: email, email, role: 'citizen' }, JWT_SECRET);
    res.json({ 
      token, 
      user: { id: email, name, email, role: 'citizen', is_verified: idResult.success },
      verification: idResult
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Signup failed: ' + err.message });
  }
});

app.post('/api/auth/check-document', async (req, res) => {
  const { nid_number, birth_certificate_number } = req.body;
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    if (nid_number) {
      const snapshot = await db_firebase.collection('users').where('nid_number', '==', nid_number).get();
      if (!snapshot.empty) return res.json({ exists: true, message: 'NID already registered' });
    }
    if (birth_certificate_number) {
      const snapshot = await db_firebase.collection('users').where('birth_certificate_number', '==', birth_certificate_number).get();
      if (!snapshot.empty) return res.json({ exists: true, message: 'Birth Certificate already registered' });
    }
    res.json({ exists: false });
  } catch (err: any) {
    res.status(500).json({ error: 'Database check failed: ' + err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const userDoc = await db_firebase.collection('users').doc(email).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const codeId = `${email}_recovery`;

    await db_firebase.collection('verification_codes').doc(codeId).set({
      email,
      code,
      type: 'recovery',
      expires_at: admin.firestore.Timestamp.fromDate(expiresAt),
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const emailResult = await sendEmail(email, `Password reset code: ${code}`, `Your password reset code is: ${code}. It expires in 10 minutes.`);
    
    const responseData: any = { success: true };
    if (!emailResult.success) {
      responseData.warning = `Email could not be sent.`;
      responseData.debugCode = code;
    }
    
    res.json(responseData);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process request: ' + err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const codeId = `${email}_recovery`;
    const codeDoc = await db_firebase.collection('verification_codes').doc(codeId).get();
    
    if (!codeDoc.exists || codeDoc.data()?.code !== code || codeDoc.data()?.expires_at.toDate() < new Date()) {
      return res.status(400).json({ error: 'Code does not match or has expired' });
    }

    // Clear code
    await db_firebase.collection('verification_codes').doc(codeId).delete();

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db_firebase.collection('users').doc(email).update({
      password: hashedPassword,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});


app.post('/api/auth/login', async (req, res) => {
  let { email, password, isAdminLogin } = req.body;
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    email = email.trim().toLowerCase();

    const userRef = db_firebase.collection('users').doc(email);
    let userDoc = await userRef.get();
    let user = userDoc.data() as any;

    // Bootstrap admin feature disabled - admin must be created manually or through signup

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account has been blocked by an administrator.' });
    }
    
    if (user.status === 'suspended') {
      if (user.suspended_until) {
        const suspendDate = user.suspended_until.toDate();
        if (suspendDate > new Date()) {
          return res.status(403).json({ 
            error: `Account suspended until ${suspendDate.toLocaleDateString()}. Reason: ${user.suspension_reason || 'Unknown'}` 
          });
        } else {
          // Suspension expired, un-suspend
          await userRef.update({ status: 'active', suspended_until: null, suspension_reason: null });
          user.status = 'active';
        }
      } else {
         return res.status(403).json({ error: 'Your account has been suspended indefinitely.' });
      }
    }

    if (user.scheduled_deletion_at) {
      const deletionDate = user.scheduled_deletion_at.toDate();
      if (deletionDate > new Date()) {
        return res.status(403).json({ 
          error: 'This account is scheduled for deletion.', 
          isScheduledForDeletion: true,
          deletionDate: user.scheduled_deletion_at
        });
      }
    }

    let sessionRole = user.role;
    if (isAdminLogin) {
      if (user.role !== 'admin' && user.role !== 'Super Admin' && user.email !== 'meshoron53@gmail.com') {
        return res.status(401).json({ error: 'Unauthorized access. This portal is for administrators only.' });
      }
    } else {
      sessionRole = 'citizen';
    }

    const token = jwt.sign({ id: email, email: user.email, role: sessionRole }, JWT_SECRET);
    
    await db_firebase.collection('activity_logs').add({
      user_email: email,
      action: 'login',
      details: isAdminLogin ? 'Admin portal login' : 'User portal login',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      token, 
      user: { 
        id: email, 
        name: user.name, 
        email: user.email, 
        role: sessionRole,
        photo_url: user.photo_url,
        profile_photo_url: user.profile_photo_url,
        phone: user.phone,
        location: user.location
      } 
    });
  } catch (err: any) {
    console.error(`[Login Error] Email: ${req.body.email}, Error:`, err.message);
    let errorMessage = 'Login failed';
    if (err.message.includes('NOT_FOUND')) {
      errorMessage += ': Database connectivity issue (NOT_FOUND). Please check server logs.';
    } else {
      errorMessage += ': ' + err.message;
    }
    res.status(500).json({ error: errorMessage });
  }
});

app.get('/api/auth/me', authenticate, async (req: any, res) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const userDoc = await db_firebase.collection('users').doc(req.user.email).get();
    if (userDoc.exists) {
      const rawData = userDoc.data() as any;
      // Strip sensitive fields before sending to client
      const { password: _pw, ...safeData } = rawData;
      const user = { id: req.user.email, ...safeData };
      // Maintain session role from token
      user.role = req.user.role;
      res.json({ user });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user: ' + err.message });
  }
});


app.post('/api/auth/delete-account', authenticate, async (req: any, res) => {
  const { password } = req.body;
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const userRef = db_firebase.collection('users').doc(req.user.email);
    const userSnapshot = await userRef.get();
    const user = userSnapshot.data();
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Immediately delete the user profile so the NID is freed
    await userRef.delete();

    // Also try to clean up Auth if it was connected
    try {
      const authUser = await admin.auth().getUserByEmail(req.user.email);
      await admin.auth().deleteUser(authUser.uid);
    } catch {}

    await db_firebase.collection('activity_logs').add({
      user_email: req.user.email,
      action: 'account_deleted',
      details: 'Account instantly deleted by user',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete account: ' + err.message });
  }
});

app.post('/api/auth/cancel-deletion', authenticate, async (req: any, res) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    await db_firebase.collection('users').doc(req.user.email).update({
      scheduled_deletion_at: null
    });
    await db_firebase.collection('activity_logs').add({
      user_email: req.user.email,
      action: 'account_deletion_cancelled',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to cancel deletion: ' + err.message });
  }
});

app.post('/api/auth/cancel-deletion-unauthenticated', async (req, res) => {
  const { email, password } = req.body;
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const userRef = db_firebase.collection('users').doc(email);
    const userSnapshot = await userRef.get();
    const user = userSnapshot.data();
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    await userRef.update({ scheduled_deletion_at: null });
    await db_firebase.collection('activity_logs').add({
      user_email: email,
      action: 'account_deletion_cancelled',
      details: 'Cancelled via login page',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to cancel deletion: ' + err.message });
  }
});

// --- SOS Routes ---
app.post('/api/sos/alert', authenticate, async (req: any, res) => {
  const { message, location } = req.body;
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const userDoc = await db_firebase.collection('users').doc(req.user.email).get();
    const user = userDoc.data();

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

    const sosId = `sos_${Date.now()}`;
    await db_firebase.collection('sos_alerts').doc(sosId).set({
      user_email: user.email,
      userName: user.name,
      message: alertMsg,
      location: locMsg,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    await db_firebase.collection('activity_logs').add({
      user_email: user.email,
      action: 'sos_alert_sent',
      details: `Location: ${locMsg}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, message: 'Emergency alerts sent via secure channels.' });
  } catch (err: any) {
    res.status(500).json({ error: 'SOS Alert failed: ' + err.message });
  }
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

app.get('/api/chat/history', authenticate, async (req: any, res) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    const snapshot = await db_firebase.collection('chat_history')
      .where('user_email', '==', req.user.email)
      .orderBy('timestamp', 'asc')
      .get();
    const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch history: ' + err.message });
  }
});

app.post('/api/chat/message', authenticate, async (req: any, res) => {
  const { role, content, file_url, file_type } = req.body;
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  
  try {
    await db_firebase.collection('chat_history').add({
      user_email: req.user.email,
      role,
      content,
      file_url: file_url || null,
      file_type: file_type || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save message: ' + err.message });
  }
});

app.delete('/api/chat/history', authenticate, async (req: any, res) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    const snapshot = await db_firebase.collection('chat_history')
      .where('user_email', '==', req.user.email)
      .get();
    const batch = db_firebase.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear history: ' + err.message });
  }
});

// --- User Reports ---
app.post('/api/reports', authenticate, async (req: any, res) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  const { title, description, category, location, image_url, ai_analysis } = req.body;
  const email = req.user.email;

  try {
    // Fetch user info for richer report data
    const userDoc = await db_firebase.collection('users').doc(email).get();
    const userData = userDoc.data() || {};

    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Upload image to storage if it's base64, otherwise store as-is
    let finalImageUrl = image_url || null;
    if (image_url && image_url.includes('base64,')) {
      const uploaded = await uploadBase64ToStorage(image_url, `reports/${reportId}/image_${Date.now()}.jpg`);
      finalImageUrl = uploaded || image_url; // Keep full base64 if storage fails
    }

    const newReport = {
      reportId,
      userId: email,
      user_email: email,
      user_name: userData.name || email,
      user_photo: userData.photo_url || userData.profile_photo_url || null,
      title: title || category || 'Untitled Report',
      description,
      category: category || title || 'Other',
      location: location || 'Unknown Location',
      image_url: finalImageUrl,
      status: 'pending',
      ai_analysis: ai_analysis || null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      // Legacy fields for compatibility
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 1. Save to main reports collection (user can see it in My Reports)
    await db_firebase.collection('reports').doc(reportId).set(newReport);

    // 2. CRITICAL: Also add to ai_analysis_queue so admin AI Analyzer sees it
    //    Preserve full image_url (including https:// storage URLs) so AI can analyze photo
    await db_firebase.collection('ai_analysis_queue').doc(reportId).set(newReport);

    // 3. Log the activity with report tracking
    await db_firebase.collection('activity_logs').add({
      user_email: email,
      user_name: userData.name || email,
      action: 'report_submitted',
      details: `Report submitted: "${title}" at ${location}`,
      report_id: reportId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 4. Add initial status to report_status_history for user tracking
    await db_firebase.collection('report_status_history').add({
      report_id: reportId,
      status: 'pending',
      notes: 'Report submitted and queued for AI analysis.',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, reportId });
  } catch (err: any) {
    console.error('[Reports] Failed to submit report:', err.message);
    res.status(500).json({ error: 'Failed to submit report: ' + err.message });
  }
});

app.get('/api/reports', authenticate, async (req: any, res) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    // Try ordered query first, fall back to unordered if index missing
    let reports: any[] = [];
    try {
      const snapshot = await db_firebase.collection('reports')
        .where('user_email', '==', req.user.email)
        .orderBy('createdAt', 'desc')
        .get();
      reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (indexErr) {
      // Fallback: fetch without ordering if composite index not set up
      const snapshot = await db_firebase.collection('reports')
        .where('user_email', '==', req.user.email)
        .get();
      reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory
      reports.sort((a: any, b: any) => {
        const aTime = a.createdAt?._seconds || a.created_at?._seconds || 0;
        const bTime = b.createdAt?._seconds || b.created_at?._seconds || 0;
        return bTime - aTime;
      });
    }
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch reports: ' + err.message });
  }
});

// --- Extended Reports & Activity ---
app.get('/api/reports/:id/history', authenticate, async (req: any, res) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  const reportId = req.params.id;
  try {
    // Fetch from report_status_history - primary source for user-facing timeline
    const statusSnapshot = await db_firebase.collection('report_status_history')
      .where('report_id', '==', reportId)
      .get();

    // Also grab report_submitted activity logs for this report
    const activitySnapshot = await db_firebase.collection('activity_logs')
      .where('report_id', '==', reportId)
      .get();

    const statusEntries = statusSnapshot.docs.map(doc => {
      const data = doc.data();
      const ts = data.timestamp || data.created_at;
      const date = ts?._seconds ? new Date(ts._seconds * 1000) : (ts?.toDate ? ts.toDate() : new Date());
      return { id: doc.id, ...data, _sortKey: date.getTime() };
    });

    const activityEntries = activitySnapshot.docs.map(doc => {
      const data = doc.data();
      const ts = data.timestamp || data.created_at;
      const date = ts?._seconds ? new Date(ts._seconds * 1000) : (ts?.toDate ? ts.toDate() : new Date());
      return { 
        id: doc.id, 
        ...data, 
        status: data.action || 'submitted',
        notes: data.details || 'Report activity logged',
        _sortKey: date.getTime()
      };
    });

    // Deduplicate and merge, sort by time ascending
    const allEntries = [...statusEntries, ...activityEntries];
    allEntries.sort((a: any, b: any) => (a._sortKey || 0) - (b._sortKey || 0));

    // Serialize timestamps
    const serialized = allEntries.map((entry: any) => {
      const { _sortKey, ...rest } = entry;
      const ts = rest.timestamp || rest.created_at;
      let isoDate: string;
      if (ts?._seconds) isoDate = new Date(ts._seconds * 1000).toISOString();
      else if (ts?.toDate) isoDate = ts.toDate().toISOString();
      else isoDate = new Date().toISOString();
      return { ...rest, created_at: isoDate, timestamp: isoDate };
    });

    // If no history entries found, generate a synthetic submission entry from the report itself
    if (serialized.length === 0) {
      const reportDoc = await db_firebase.collection('reports').doc(reportId).get();
      if (reportDoc.exists) {
        const data = reportDoc.data() as any;
        const ts = data.created_at || data.createdAt;
        const isoDate = ts?._seconds ? new Date(ts._seconds * 1000).toISOString() : new Date().toISOString();
        serialized.push({
          id: 'initial',
          report_id: reportId,
          status: 'pending',
          notes: 'Report submitted and queued for AI analysis.',
          created_at: isoDate,
          timestamp: isoDate
        });
      }
    }

    res.json(serialized);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch history: ' + err.message });
  }
});

app.get('/api/activity', authenticate, async (req: any, res) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    const snapshot = await db_firebase.collection('activity_logs')
      .where('user_email', '==', req.user.email)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch activity: ' + err.message });
  }
});

// --- Admin Extended Routes ---
app.get('/api/admin/stats', authenticate, isAdmin, async (req, res) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    const usersSnap = await db_firebase.collection('users').get();
    const activeUsersSnap = await db_firebase.collection('users').where('status', '==', 'active').get();
    const reportsSnap = await db_firebase.collection('reports').get();
    const reviewsSnap = await db_firebase.collection('reviews').get();
    
    // Mock growth data as before
    const growth = [
      { name: 'Jan', users: 400, reports: 240 },
      { name: 'Feb', users: 300, reports: 139 },
      { name: 'Mar', users: 200, reports: 980 },
      { name: 'Apr', users: 278, reports: 390 },
      { name: 'May', users: 189, reports: 480 },
      { name: 'Jun', users: 239, reports: 380 },
    ];

    res.json({
      totalUsers: usersSnap.size,
      activeUsers: activeUsersSnap.size,
      totalReports: reportsSnap.size,
      totalReviews: reviewsSnap.size,
      growth
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch stats: ' + err.message });
  }
});

app.get('/api/admin/logs', authenticate, isAdmin, async (req, res) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    const snapshot = await db_firebase.collection('activity_logs')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch logs: ' + err.message });
  }
});

// Note: /api/admin/users GET and PUT/DELETE are defined earlier in the file (near line 359)
// The routes below handle extended admin user actions

app.post('/api/admin/users/:id/suspend', authenticate, isAdmin, async (req, res) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    const { id } = req.params;
    const { status, duration } = req.body; // 'suspended' or 'active', duration: 7 or 30 days
    
    let updateData: any = { status };
    if (status === 'suspended') {
      const days = duration || 7;
      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + days);
      updateData.suspended_until = admin.firestore.Timestamp.fromDate(suspendedUntil);
      updateData.suspension_reason = req.body.reason || 'Multiple fault reports';
    } else {
      updateData.suspended_until = null;
    }

    await db_firebase.collection('users').doc(id).update(updateData);
    
    await db_firebase.collection('activity_logs').add({
      user_email: id,
      action: status === 'suspended' ? 'account_suspended' : 'account_activated',
      details: status === 'suspended' ? `Suspended for ${duration || 7} days` : 'Account activated by admin',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: `User ${status === 'suspended' ? 'suspended' : 'activated'} successfully` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to change user status: ' + err.message });
  }
});

app.delete('/api/admin/users/:id', authenticate, isAdmin, async (req, res) => {
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });
  try {
    const { id } = req.params;
    await db_firebase.collection('users').doc(id).delete();
    // Also delete from Auth if needed, but for now we focus on Firestore
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete user: ' + err.message });
  }
});

// Delete ALL users (except Super Admin) - Firestore Primary
app.delete('/api/admin/users-all', authenticate, isAdmin, async (req: any, res: any) => {
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'Only Super Admin can delete all users' });
  }
  
  if (!db_firebase) return res.status(500).json({ error: 'Firebase not configured' });

  try {
    const usersSnapshot = await db_firebase.collection('users').get();
    const batch = db_firebase.batch();
    let deletedCount = 0;
    const protectedEmails = ['meshoron53@gmail.com'];
    
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      // Skip Super Admin and protected accounts
      if (userData.role !== 'Super Admin' && !protectedEmails.includes(userData.email)) {
        batch.delete(doc.ref);
        deletedCount++;
      }
    });

    await batch.commit();
    
    // Log the action
    await db_firebase.collection('activity_logs').add({
      user_email: req.user.email,
      action: 'delete_all_users',
      details: `Deleted ${deletedCount} users from the system`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: `Successfully deleted ${deletedCount} users`, deletedCount });
  } catch (err: any) {
    console.error('Delete all users error:', err);
    res.status(500).json({ error: 'Failed to delete users: ' + err.message });
  }
});


// -----------------------------
// ADVANCED SOS WITH TWILIO
// -----------------------------
app.post('/api/sos/trigger', authenticate, async (req: any, res: any) => {
  const { userLocation, emergencyType, contactPhone, userName } = req.body;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.error('Twilio env missing, falling back.');
    return res.json({ success: false, error: 'Twilio configuration is missing from the environment.' });
  }

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    let navUrl = userLocation;
    if (userLocation && userLocation.lat && userLocation.lng) {
      navUrl = `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}`;
    }

    const msg = `EMERGENCY ALERT from ${userName || 'CityConnect User'}. Reason: ${emergencyType}. Immediate assistance required. Live location: ${navUrl}`;
    
    // Send SMS
    await client.messages.create({
      body: msg,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: contactPhone
    });
    
    // Optional: Make Call
    await client.calls.create({
      twiml: `<Response><Say>Emergency Alert! ${userName || 'A user'} needs immediate assistance for ${emergencyType}. Check your SMS for their live location.</Say></Response>`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: contactPhone
    });

    res.json({ success: true, message: 'SOS Dispatched via Twilio!' });
  } catch (err: any) {
    console.error('Twilio Error:', err.message);
    res.json({ success: false, error: err.message });
  }
});


// Contact Storage Endpoint via Firebase
app.post('/api/sos/contacts', authenticate, async (req: any, res: any) => {
  const { parent_number, relative_number } = req.body;
  
  if (!db_firebase) {
    return res.json({ success: false, error: 'Firebase is not initialized on the backend' });
  }

  try {
     const userRef = db_firebase.collection('users').doc(req.user.id.toString());
     const updateData: any = {};
     if (parent_number !== undefined) updateData.parent_number = parent_number;
     if (relative_number !== undefined) updateData.relative_number = relative_number;
     
     await userRef.set(updateData, { merge: true });
     
     // Note: local SQLite fallback (if SQLite returns) isn't patched here intentionally per pure Firebase requirement
     res.json({ success: true, message: 'Contacts saved to Firebase' });
  } catch (err: any) {
     console.error('Firebase save error:', err.message);
     res.json({ success: false, error: err.message });
  }
});


async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  
  // --- Cleanup Job (Firestore Version) ---
  // Run every hour to permanently delete accounts scheduled for deletion more than 30 days ago
  setInterval(async () => {
    if (!db_firebase) return;
    try {
      console.log('[Cleanup Job] Checking for expired accounts...');
      const now = admin.firestore.Timestamp.now();
      const snapshot = await db_firebase.collection('users')
        .where('scheduled_deletion_at', '<=', now)
        .get();
      
      if (snapshot.empty) {
        console.log('[Cleanup Job] No accounts to delete.');
        return;
      }

      for (const doc of snapshot.docs) {
        const email = doc.id;
        console.log(`[Cleanup Job] Permanently deleting account: ${email}`);
        
        // In a real app, use a recursive delete or a Cloud Function.
        // For this migration, we'll do manual cleanup of key collections.
        
        // 1. Delete reports
        const reportsSnap = await db_firebase.collection('reports').where('user_email', '==', email).get();
        const batch = db_firebase.batch();
        reportsSnap.forEach(rDoc => batch.delete(rDoc.ref));
        
        // 2. Delete activity logs
        const logsSnap = await db_firebase.collection('activity_logs').where('user_email', '==', email).get();
        logsSnap.forEach(lDoc => batch.delete(lDoc.ref));
        
        // 3. Delete user doc
        batch.delete(doc.ref);
        
        await batch.commit();
        console.log(`[Cleanup Job] Successfully deleted all data for ${email}`);
      }
    } catch (err: any) {
      console.error('[Cleanup Job Error]:', err.message);
    }
  }, 3600000); // 1 hour

  // Init HTTP and Socket.io
  const server = http.createServer(app);
  const io = new SocketServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });
  
  // Set io mapping globally so disasterService can emit
  const globalAny = global as any;
  globalAny.io = io;
  
  io.on('connection', (socket) => {
    console.log('🔗 Socket connected:', socket.id);
  });

  // Start listening
  server.listen(PORT, "0.0.0.0", () => {
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
