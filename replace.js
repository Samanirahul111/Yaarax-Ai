const fs = require('fs');
const path = require('path');

const dirsToSearch = ['./client/src', './server'];
const exts = ['.js', '.jsx', '.css', '.html', '.json'];

const replacements = [
  { regex: /Rock AI/g, replace: 'Yaarax AI' },
  { regex: /rock_ai/g, replace: 'yaarax_ai' },
  { regex: /Rock/g, replace: 'Yaarax' },
  { regex: /rock-/g, replace: 'yaarax-' },
  { regex: /rock_/g, replace: 'yaarax_' },
  { regex: /rock AI/gi, replace: 'Yaarax AI' }
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        processDir(fullPath);
      }
    } else {
      if (exts.includes(path.extname(fullPath))) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let newContent = content;
        for (const rep of replacements) {
          newContent = newContent.replace(rep.regex, rep.replace);
        }
        if (content !== newContent) {
          fs.writeFileSync(fullPath, newContent);
          console.log('Updated', fullPath);
        }
      }
    }
  }
}

for (const dir of dirsToSearch) {
  if (fs.existsSync(dir)) {
    processDir(dir);
  }
}
