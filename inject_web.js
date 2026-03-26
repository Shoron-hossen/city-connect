const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The AI endpoint fetch in HomepageChatBox
code = code.replace(/fetch\('\/api\/gemini\/generate'/g, "fetch('/api/gemini/public'");
// Remove authentication header from the HomepageChatBox fetch
code = code.replace(/'Authorization': \`Bearer \$\{localStorage.getItem\('token'\)\}\`/g, "");

// GlobalFooter Component
const globalFooterStr = `
function GlobalFooter() {
  const location = useLocation();
  const hideRoutes = ['/login', '/signup', '/admin', '/admin/login'];
  if (hideRoutes.includes(location.pathname) || location.pathname.startsWith('/admin')) {
    return null;
  }
  return <ContactFooter />;
}
`;

if (!code.includes('function GlobalFooter')) {
  // Add GlobalFooter below ContactFooter
  code = code.replace(/function ContactFooter.*?\n}\n/s, match => match + '\\n' + globalFooterStr);
  
  // Inject <GlobalFooter /> below <Routes> inside App
  code = code.replace(/<\\/Routes>\\s*<\\/div>\\s*<\\/BrowserRouter>/g, '</Routes>\\n        <GlobalFooter />\\n      </div>\\n    </BrowserRouter>');
  
  // Remove ContactFooter from LandingPage
  code = code.replace(/<ContactFooter \/>\\n      <HomepageChatBox \/>/g, '<HomepageChatBox />');
}

fs.writeFileSync('src/App.tsx', code);
console.log('Web changes injected');
