const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'dummy-data');
if (!fs.existsSync(dir)) process.exit(0);

const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace: export const myVar: MyType[] = [ ... ]; -> export const myVar: MyType[] = [];
  // Using a robust regex to handle multi-line arrays
  content = content.replace(/export\s+const\s+([A-Za-z0-9_]+)(\s*:\s*[^=]+)?\s*=\s*\[[\s\S]*?\];/g, 'export const $1$2 = [];');
  
  // Replace: let myVar: MyType[] = [ ... ]; -> let myVar: MyType[] = [];
  content = content.replace(/let\s+([A-Za-z0-9_]+)(\s*:\s*[^=]+)?\s*=\s*\[[\s\S]*?\];/g, 'let $1$2 = [];');

  fs.writeFileSync(filePath, content, 'utf-8');
});
console.log("Dummy data arrays emptied.");
