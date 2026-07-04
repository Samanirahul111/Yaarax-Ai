const fs = require('fs');
let cssPath = 'client/src/index.css';
let css = fs.readFileSync(cssPath, 'utf8');

css = css.replace(
  /\.settings-card-premium \{/,
  '.modal-card.settings-card-premium {\n    padding: 0;'
);

fs.writeFileSync(cssPath, css);
console.log('Fixed CSS');
