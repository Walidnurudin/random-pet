const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  if (!exists) return;
  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    // Only copy non-TS/JS source code (HTML, CSS, images, icons, json)
    const ext = path.extname(src).toLowerCase();
    if (['.html', '.css', '.png', '.svg', '.jpg', '.jpeg', '.gif', '.json'].includes(ext)) {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(src, dest);
    }
  }
}

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

console.log('📦 Copying static assets from src to dist...');
copyRecursiveSync(path.join(srcDir, 'assets'), path.join(distDir, 'assets'));
copyRecursiveSync(path.join(srcDir, 'renderer'), path.join(distDir, 'renderer'));
console.log('✅ Static assets copied successfully.');
