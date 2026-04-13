const fs = require('fs');

try {
  let file = fs.readFileSync('src/App.tsx', 'utf-8');

  // Replace heavy backgrounds
  file = file.replace(/bg-\[#00103a\]/g, 'bg-white');
  file = file.replace(/from-\[#00103a\]/g, 'from-gray-50');
  file = file.replace(/via-\[#1a0b3c\]/g, 'via-white');
  file = file.replace(/to-\[#600050\]/g, 'to-gray-50');
  
  // Replace semi-transparent white/black backgrounds
  file = file.replace(/bg-white\/5/g, 'bg-white');
  file = file.replace(/bg-white\/10/g, 'bg-white');
  file = file.replace(/bg-white\/20/g, 'bg-white');
  file = file.replace(/bg-black\/40/g, 'bg-gray-100');
  
  // Replace borders
  file = file.replace(/border-white\/10/g, 'border-gray-200');
  file = file.replace(/border-white\/20/g, 'border-gray-300');
  file = file.replace(/border-white\/5/g, 'border-gray-100');
  
  // Re-map text colors where they are generally white wrappers.
  // Note: we can't blindly replace "text-white" because of buttons.
  // We look for text-white that are clearly on containers, NOT buttons.
  // This is a bit risky. A safer bet is replacing text-white inside <div>s and <p>s, <h>s.
  file = file.replace(/<div([^>]*)text-white/g, '<div$1text-gray-900');
  file = file.replace(/<p([^>]*)text-white/g, '<p$1text-gray-900');
  file = file.replace(/<h([1-6])([^>]*)text-white/g, '<h$1$2text-gray-900');
  file = file.replace(/<span([^>]*)text-white/g, '<span$1text-gray-900');
  
  file = file.replace(/text-gray-300/g, 'text-gray-600');
  file = file.replace(/text-gray-400/g, 'text-gray-500');

  fs.writeFileSync('src/App.tsx', file);
  console.log("Updated App.tsx successfully.");
} catch (e) {
  console.error("Error:", e);
}
