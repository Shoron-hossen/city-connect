const fs = require('fs');

let c = fs.readFileSync('server.ts', 'utf-8');

// Add HTTP and Socket.IO imports at top
if(!c.includes("import { Server as SocketServer }")) {
    c = c.replace("import express from 'express';", "import express from 'express';\nimport http from 'http';\nimport { Server as SocketServer } from 'socket.io';\nimport twilio from 'twilio';");
}


// Replace app.listen with server instance logic
const listenBlock = `
  // Start listening
  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
`;

const replaceListenBlock = `
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
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
`;

c = c.replace(listenBlock.trim(), replaceListenBlock.trim());

// Add the Twilio endpoints somewhere above startServer();
const sosEndpoints = `
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
      navUrl = \`https://www.google.com/maps?q=\${userLocation.lat},\${userLocation.lng}\`;
    }

    const msg = \`EMERGENCY ALERT from \${userName || 'CityConnect User'}. Reason: \${emergencyType}. Immediate assistance required. Live location: \${navUrl}\`;
    
    // Send SMS
    await client.messages.create({
      body: msg,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: contactPhone
    });
    
    // Optional: Make Call
    await client.calls.create({
      twiml: \`<Response><Say>Emergency Alert! \${userName || 'A user'} needs immediate assistance for \${emergencyType}. Check your SMS for their live location.</Say></Response>\`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: contactPhone
    });

    res.json({ success: true, message: 'SOS Dispatched via Twilio!' });
  } catch (err: any) {
    console.error('Twilio Error:', err.message);
    res.json({ success: false, error: err.message });
  }
});
`;

if (!c.includes('/api/sos/trigger')) {
   c = c.replace('async function startServer() {', sosEndpoints + '\nasync function startServer() {');
}

fs.writeFileSync('server.ts', c);
console.log('server.ts successfully patched for Twilio and Socket.io');
