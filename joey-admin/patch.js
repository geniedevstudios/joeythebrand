const fs = require('fs');
const file = 'src/app/products/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const importStr = 'import ProductWizard from "./ProductWizard";\n';
if (!content.includes('ProductWizard')) {
  content = content.replace('import { toast } from "sonner";', 'import { toast } from "sonner";\n' + importStr);
}

const startMatch = content.indexOf('{isModalOpen && (');
if (startMatch !== -1) {
  const endMatch = content.indexOf('{collectionModalOpen && (', startMatch);
  if (endMatch !== -1) {
    const endStr = ')}\n\n      {collectionModalOpen';
    const exactEnd = content.indexOf(endStr, startMatch);
    if (exactEnd !== -1) {
      const before = content.substring(0, startMatch);
      const after = content.substring(exactEnd + 4);
      const replacement = '<ProductWizard isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingProduct={editingProduct} collections={collections} onSuccess={() => { setIsModalOpen(false); load(); }} />\n\n      ';
      
      fs.writeFileSync(file, before + replacement + after, 'utf8');
      console.log('Successfully patched page.tsx!');
    } else {
      console.log('exactEnd not found');
    }
  } else {
    console.log('endMatch not found');
  }
} else {
  console.log('startMatch not found');
}
