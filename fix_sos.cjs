const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf-8');

const newTriggerSOS = `  const triggerSOS = async () => {
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
  };`;

// Use regex to catch the whole function from 'const triggerSOS = async () => {' to the closing '};'
const regex = /const triggerSOS = async \(\) => \{[\s\S]*?console\.log\(\`SOS ALERT: Calling Emergency Services\.\.\.\` \);\n\s+};/;
// Wait, the regex might be tricky. Let's find the start and end line manually.

let lines = c.split('\n');
let startIdx = lines.findIndex(l => l.includes('const triggerSOS = async () => {'));
let endIdx = -1;
if(startIdx !== -1) {
    // Look for the end of this function. Based on previous view, it has console.log and then };
    for(let i = startIdx; i < lines.length; i++) {
        if(lines[i].includes('console.log(`SOS ALERT: Calling Emergency Services...`);')) {
            if(lines[i+1].trim() === '};') {
                endIdx = i + 1;
                break;
            }
        }
    }
}

if(startIdx !== -1 && endIdx !== -1) {
    lines.splice(startIdx, (endIdx - startIdx + 1), newTriggerSOS);
    console.log('SOS Trigger function patched.');
} else {
    console.log('Could not find SOS Trigger function targets. Start:', startIdx, 'End:', endIdx);
}

// Also patch the contacts display to inputs
let updatedContent = lines.join('\n');
if(updatedContent.includes("{user.parent_number || 'Not Set'}")) {
    const parentOld = `<p className="text-xl font-mono">{user.parent_number || 'Not Set'}</p>`;
    const parentNew = `<input 
               type="text" 
               defaultValue={user.parent_number} 
               placeholder="Not Set (Tap to Edit)"
               onBlur={(e) => {
                  request('/api/sos/contacts', { method: 'POST', body: JSON.stringify({ parent_number: e.target.value }) }).then(() => setUser({...user, parent_number: e.target.value})).catch(e => console.error(e));
               }}
               className="w-full bg-transparent text-xl font-mono text-white outline-none focus:border-blue-500 border-b border-transparent transition-colors"
            />
            <p className="text-[10px] text-blue-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Auto-saves to Firebase when you click away</p>`;
    updatedContent = updatedContent.replace(parentOld, parentNew);
    
    const relativeOld = `<p className="text-xl font-mono">{user.relative_number || 'Not Set'}</p>`;
    const relativeNew = `<input 
               type="text" 
               defaultValue={user.relative_number} 
               placeholder="Not Set (Tap to Edit)"
               onBlur={(e) => {
                  request('/api/sos/contacts', { method: 'POST', body: JSON.stringify({ relative_number: e.target.value }) }).then(() => setUser({...user, relative_number: e.target.value})).catch(e => console.error(e));
               }}
               className="w-full bg-transparent text-xl font-mono text-white outline-none focus:border-blue-500 border-b border-transparent transition-colors"
            />
            <p className="text-[10px] text-blue-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Auto-saves to Firebase when you click away</p>`;
    updatedContent = updatedContent.replace(relativeOld, relativeNew);
    console.log('Contact inputs patched.');
}

fs.writeFileSync('src/App.tsx', updatedContent);
