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
  if (filePath.endsWith('.module.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Update .qtyControl
    content = content.replace(/\.qtyControl\s*\{([^}]+)\}/g, (match, p1) => {
      let newBody = p1.replace(/border-radius:\s*var\(--radius-sm\);/g, 'border-radius: 100px;\n  overflow: hidden;');
      // If it doesn't have overflow: hidden, and we just changed border-radius, it's fine.
      // But let's make sure overflow: hidden is there.
      if (!newBody.includes('overflow: hidden')) {
        newBody = newBody.replace(/border-radius:\s*100px;/, 'border-radius: 100px;\n  overflow: hidden;');
      }
      return `.qtyControl {${newBody}}`;
    });

    // Update .qtyBox (for CartClient.module.css)
    content = content.replace(/\.qtyBox\s*\{([^}]+)\}/g, (match, p1) => {
      let newBody = p1.replace(/border-radius:\s*var\(--radius-sm\);/g, 'border-radius: 100px;');
      newBody = newBody.replace(/border-radius:\s*4px;/g, 'border-radius: 100px;');
      return `.qtyBox {${newBody}}`;
    });

    // Update .sizeGuideBtn
    content = content.replace(/\.sizeGuideBtn\s*\{([^}]+)\}/g, (match, p1) => {
      let newBody = p1;
      newBody = newBody.replace(/background:\s*none;/g, 'background: transparent;');
      newBody = newBody.replace(/border:\s*none;/g, 'border: 1px solid rgba(0,0,0,0.1);');
      newBody = newBody.replace(/text-decoration:\s*underline;/g, 'text-decoration: none;');
      newBody = newBody.replace(/padding:\s*0;/g, 'padding: 4px 12px;\n  border-radius: 100px;');
      return `.sizeGuideBtn {${newBody}}`;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
