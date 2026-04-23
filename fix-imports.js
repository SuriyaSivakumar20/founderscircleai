import fs from 'fs';
import path from 'path';

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Replace relative imports lacking extensions
  // e.g. import authRoutes from "../backend/routes/authRoutes"; -> import authRoutes from "../backend/routes/authRoutes.js";
  const regex = /from\s+['"](\.[^'"]+)['"]/g;
  content = content.replace(regex, (match, p1) => {
    if (!p1.endsWith('.js') && !p1.endsWith('.json')) {
      changed = true;
      return `from '${p1}.js'`;
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      fixImportsInFile(fullPath);
    }
  }
}

walkDir('./api');
walkDir('./backend');
console.log('Done fixing imports.');
