const fs = require('fs');

let c = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace 1: Import
c = c.replace(
  "import EnvironmentPage from './EnvironmentPage';",
  "import EnvironmentPage from './EnvironmentPage';\nimport DisasterAlertPage from './DisasterAlertPage';"
);

// Replace 2: Route
c = c.replace(
  '<Route path="/environment" element={<ProtectedRoute user={user}><EnvironmentPage user={user!} setUser={setUser} /></ProtectedRoute>} />',
  '<Route path="/environment" element={<ProtectedRoute user={user}><EnvironmentPage user={user!} setUser={setUser} /></ProtectedRoute>} />\n          <Route path="/disaster-alert" element={<ProtectedRoute user={user}><DisasterAlertPage user={user!} setUser={setUser} /></ProtectedRoute>} />'
);

// Replace 3: isDashboard
c = c.replace(
  "location.pathname.startsWith('/environment');",
  "location.pathname.startsWith('/environment') || location.pathname.startsWith('/disaster-alert');"
);

// Replace 4: Navbar Link
c = c.replace(
  "            </Link>\n            <Link to=\"/ai-chat\"",
  "            </Link>\n            <Link to=\"/disaster-alert\" className={`flex items-center gap-2 transition-colors font-medium ${location.pathname === '/disaster-alert' ? 'text-orange-400 border-b-2 border-orange-400 pb-1' : 'text-gray-300 hover:text-orange-400'}`}>\n              <BellRing size={18} className={location.pathname === '/disaster-alert' ? 'text-orange-300' : 'text-orange-400'} /> Disaster Alert\n            </Link>\n            <Link to=\"/ai-chat\""
);

fs.writeFileSync('src/App.tsx', c);
console.log('App.tsx successfully patched with Disaster Alert page!');
