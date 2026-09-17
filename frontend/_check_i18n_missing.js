const fs = require('fs');
const path = require('path');
const htmlFiles = ['frontend/help.html','frontend/join.html','frontend/shop.html'];
const i18nFile = 'frontend/i18n.js';
const htmlText = htmlFiles.map(f => fs.readFileSync(path.resolve(f), 'utf8'));
const keyRegex = /data-i18n(?:-placeholder|-html|-value|-title|-alt|-aria)?="([^"]+)"/g;
const keys = new Set();
htmlText.forEach(text => {
  let m;
  while ((m = keyRegex.exec(text))) {
    keys.add(m[1]);
  }
});
const fileText = fs.readFileSync(path.resolve(i18nFile), 'utf8');
const dictRegex = /([a-zA-Z0-9_]+):\s*'([^']*)'/g;
const allKeys = new Set();
for (const m of fileText.matchAll(dictRegex)) allKeys.add(m[1]);
const missing = [];
for (const key of keys) {
  if (!allKeys.has(key)) missing.push(key);
}
console.log('HTML keys total', keys.size);
console.log('Missing keys', missing.length);
console.log(missing.sort().join('\n'));