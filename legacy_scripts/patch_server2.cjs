const fs = require('fs');

let c = fs.readFileSync('server.ts', 'utf-8');

const newEndpoint = `
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
`;

if (!c.includes('/api/sos/contacts')) {
  c = c.replace("async function startServer() {", newEndpoint + "\n\nasync function startServer() {");
}

fs.writeFileSync('server.ts', c);
console.log('server.ts patched with /api/sos/contacts endpoint!');
