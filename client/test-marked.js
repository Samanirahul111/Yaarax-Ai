import { marked } from 'marked'; 
const renderer = new marked.Renderer(); 
renderer.code = (...args) => { 
  console.log('ARGS:', args); 
  return 'x'; 
}; 
marked.setOptions({ renderer }); 
marked.parse('```python\nprint(1)\n```');
