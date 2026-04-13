const fs = require('fs');

// App.tsx logic
let c = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Remove HomepageChatBox
c = c.replace('          <HomepageChatBox />', '');

// 2. Add Disaster Alert to Navbar
// Find the exact line for Greenery
const greeneryLine = "              <Activity size={18} className={location.pathname === '/environment' ? 'text-green-300' : 'text-green-400'} /> Greenery\n            </Link>";
const replacement = greeneryLine + "\n            <Link to=\"/disaster-alert\" className={`flex items-center gap-2 transition-colors font-medium ${location.pathname === '/disaster-alert' ? 'text-orange-400 border-b-2 border-orange-400 pb-1' : 'text-gray-300 hover:text-orange-400'}`}>\n              <BellRing size={18} className={location.pathname === '/disaster-alert' ? 'text-orange-300' : 'text-orange-400'} /> Disaster Alert\n            </Link>";
c = c.replace(greeneryLine, replacement);

fs.writeFileSync('src/App.tsx', c);

// RemarkableDatesWidget.tsx logic
let r = fs.readFileSync('src/RemarkableDatesWidget.tsx', 'utf-8');
const regex = /\{\s*\/\/ A test date matching today's date[\s\S]*?id: 99,[\s\S]*?type: 'awareness',[\s\S]*?title: 'Global Citizen Safety Day \(Demo\)',[\s\S]*?\},?\s*(?=\])/;
r = r.replace(regex, '');
// Clean up comma before array end if needed
r = r.replace(/,\s*\]/, '\n]');
fs.writeFileSync('src/RemarkableDatesWidget.tsx', r);

console.log('Patch complete.');
