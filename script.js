const fs = require('fs');
const file = 'client/src/pages/VideoGenPage.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const [fps, setFps] = useState(\'30\');',
  'const [fps, setFps] = useState(\'30\');\n  const [userReplicateKey, setUserReplicateKey] = useState(() => localStorage.getItem(\'rock_replicate_key\') || \'\');'
);

const uiSearch = '<div className="vid-setting-group">\n                <label className="tool-section-label">Framerate</label>';
const uiReplace = '<div className="vid-setting-group">\n                <label className="tool-section-label">Replicate API Key</label>\n                <input type="password" className="vid-select" style={{padding:\'6px 10px\'}} placeholder="r8_..." value={userReplicateKey} onChange={e => { setUserReplicateKey(e.target.value); localStorage.setItem(\'rock_replicate_key\', e.target.value); }} />\n              </div>\n\n              ' + uiSearch;
content = content.replace(uiSearch, uiReplace);

const generateStart = '    try {\n      const replicateKey = localStorage.getItem(\'rock_replicate_key\');\n\n      let shouldUseSlideshow = false;\n\n      try {\n        setProgress(10);';
const newGenerateStart = '    try {\n      const replicateKey = userReplicateKey.trim() || localStorage.getItem(\'rock_replicate_key\');\n\n      try {\n        setProgress(10);';
content = content.replace(generateStart, newGenerateStart);

content = content.replace(/} catch \(repErr\) \{[\s\S]*?(?=} catch \(err\) \{)/, '');

fs.writeFileSync(file, content);
console.log('File updated successfully.');
