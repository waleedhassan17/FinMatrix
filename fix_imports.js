const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Simple hack to replace imports
    // Instead of completely changing paths, let's just make the typescript compile
    // By creating src/types/index.ts and pointing everything to it? No.
    
    // We deleted dummy-data. We can restore dummy-data but rename it to `src/types/legacyTypes.ts`?
  }
});
