const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

if (process.platform === 'darwin') {
  const electronAppPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'Electron.app');
  if (fs.existsSync(electronAppPath)) {
    try {
      console.log('🍎 Clearing macOS quarantine attributes from Electron.app...');
      execSync(`xattr -cr "${electronAppPath}"`, { stdio: 'ignore' });
      execSync(`xattr -r -d com.apple.quarantine "${electronAppPath}" 2>/dev/null || true`, { stdio: 'ignore' });
      execSync(`/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -u "${electronAppPath}" 2>/dev/null || true`, { stdio: 'ignore' });
      console.log('✅ Electron.app unquarantined for macOS.');
    } catch (e) {
      console.warn('Could not unquarantine Electron.app:', e.message);
    }
  }
}
