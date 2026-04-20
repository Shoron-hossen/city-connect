const fs = require('fs');

let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("} /> Greenery") && lines[i+1].includes("</Link>")) {
    const insertIdx = i + 2;
    const disasterStr = "            <Link to=\"/disaster-alert\" className={`flex items-center gap-2 transition-colors font-medium ${location.pathname === '/disaster-alert' ? 'text-orange-400 border-b-2 border-orange-400 pb-1' : 'text-gray-300 hover:text-orange-400'}`}>\n              <BellRing size={18} className={location.pathname === '/disaster-alert' ? 'text-orange-300' : 'text-orange-400'} /> Disaster Alert\n            </Link>"; 
    lines.splice(insertIdx, 0, ...disasterStr.split('\n'));
    break;
  }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('App.tsx string array patch applied successfully.');
