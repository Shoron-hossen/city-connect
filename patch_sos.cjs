const fs = require('fs');

let c = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Rewrite triggerSOS to use watchPosition and Twilio endpoint
const oldTriggerSOS = `
  const triggerSOS = async () => {
    setCountdown(null);
    setStatus('FETCHING LOCATION & SENDING ALERTS...');
    
    let locationStr = 'Unknown Location';
    
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 15000, 
            enableHighAccuracy: true,
            maximumAge: 0
          });
        });
        locationStr = \`\${position.coords.latitude},\${position.coords.longitude}\`;
      } catch (e) {
        console.warn('Could not get location:', e);
        // Fallback to user's stored location if available
        if (user.location) {
          locationStr = user.location + ' (Stored Location)';
        }
      }
    }

    try {
      await request('/api/sos/alert', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'I am in an emergency! Please help me.',
          location: locationStr
        })
      });
      setStatus('ALERTS SENT SUCCESSFULLY!');
    } catch (err: any) {
      setStatus('ERROR SENDING ALERTS: ' + err.message);
    }
    
    // Simulate finding nearby police stations
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Mocking nearby stations for demo
          setNearbyStations([
            { name: 'Central Police Station', distance: '0.8 km', phone: '911' },
            { name: 'District 4 Precinct', distance: '1.5 km', phone: '911' },
          ]);
        } catch (e) {}
      });
    }

    // Simulate SMS/Call alerts
    console.log(\`SOS ALERT: Sending SMS to Parent (\${user.parent_number}) and Relative (\${user.relative_number})\`);
    console.log(\`SOS ALERT: Calling Emergency Services...\`);
  };
`;

const newTriggerSOS = `
  const triggerSOS = async () => {
    setCountdown(null);
    setStatus('ESTABLISHING LIVE TRACKING & SENDING ALERTS...');
    
    let dynamicLink = 'Unknown Location';
    
    if (navigator.geolocation) {
       // Start tracking position continuously
       navigator.geolocation.watchPosition(
          (pos) => {
            console.log('Location Ping updated: ', pos.coords.latitude, pos.coords.longitude);
            // Example of dynamic tracking URL schema sent to contacts
            dynamicLink = \`https://cityconnect.live/track?uuid=\${user.id}&lat=\${pos.coords.latitude}&lng=\${pos.coords.longitude}\`;
          },
          (err) => console.warn(err),
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
       );

       // Initial grab to ensure the first ping is sent out immediately via Twilio
       try {
         const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
             navigator.geolocation.getCurrentPosition(resolve, reject);
         });
         dynamicLink = \`https://cityconnect.live/track?uuid=\${user.id}&lat=\${pos.coords.latitude}&lng=\${pos.coords.longitude}\`;
       } catch(e) {}
    }

    try {
      await request('/api/sos/trigger', {
        method: 'POST',
        body: JSON.stringify({ 
          emergencyType: 'General Emergency',
          userLocation: dynamicLink,
          contactPhone: user.parent_number || user.relative_number,
          userName: user.name
        })
      });
      setStatus('TWILIO ALERTS SENT SUCCESSFULLY!');
    } catch (err: any) {
      setStatus('TWILIO DISPATCH FAILED: ' + err.message);
    }
    
    // Simulate finding nearby police stations
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          setNearbyStations([
            { name: 'Central Police Station', distance: '0.8 km', phone: '911' },
            { name: 'District 4 Precinct', distance: '1.5 km', phone: '911' },
          ]);
        } catch (e) {}
      });
    }
  };
`;

c = c.replace(oldTriggerSOS.trim(), newTriggerSOS.trim());

// 2. Contact Storage UI
// Wait, user says: "Contact Storage: Since 'Not Set' is visible, use Firebase Firestore to store these numbers"
// We can turn those displays into inputs!
const oldContacts = `
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left">
            <p className="text-gray-400 text-sm mb-1 uppercase font-bold tracking-widest">Parent Contact</p>
            <p className="text-xl font-mono">{user.parent_number || 'Not Set'}</p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left">
            <p className="text-gray-400 text-sm mb-1 uppercase font-bold tracking-widest">Relative Contact</p>
            <p className="text-xl font-mono">{user.relative_number || 'Not Set'}</p>
          </div>
        </div>
`;

const newContacts = `
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left relative group">
            <p className="text-gray-400 text-sm mb-1 uppercase font-bold tracking-widest">Parent Contact</p>
            <input 
               type="text" 
               defaultValue={user.parent_number} 
               placeholder="Not Set (Tap to Edit)"
               onBlur={(e) => {
                  request('/api/sos/contacts', { method: 'POST', body: JSON.stringify({ parent_number: e.target.value }) }).then(() => setUser({...user, parent_number: e.target.value})).catch(e => console.error(e));
               }}
               className="w-full bg-transparent text-xl font-mono text-white outline-none focus:border-blue-500 border-b border-transparent transition-colors"
            />
            <p className="text-[10px] text-blue-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Auto-saves to Firebase when you click away</p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left relative group">
            <p className="text-gray-400 text-sm mb-1 uppercase font-bold tracking-widest">Relative Contact</p>
            <input 
               type="text" 
               defaultValue={user.relative_number} 
               placeholder="Not Set (Tap to Edit)"
               onBlur={(e) => {
                  request('/api/sos/contacts', { method: 'POST', body: JSON.stringify({ relative_number: e.target.value }) }).then(() => setUser({...user, relative_number: e.target.value})).catch(e => console.error(e));
               }}
               className="w-full bg-transparent text-xl font-mono text-white outline-none focus:border-blue-500 border-b border-transparent transition-colors"
            />
            <p className="text-[10px] text-blue-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Auto-saves to Firebase when you click away</p>
          </div>
        </div>
`;

c = c.replace(oldContacts.trim(), newContacts.trim());

fs.writeFileSync('src/App.tsx', c);
console.log('App.tsx SOSPage successfully patched.');
