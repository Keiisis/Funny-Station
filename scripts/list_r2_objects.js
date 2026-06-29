// List all objects in R2 bucket via the worker debug endpoint
const https = require('https');

const url = 'https://funnystation.agavoubj.workers.dev/list-objects-debug';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const objects = JSON.parse(data);
      console.log(`\n=== R2 BUCKET OBJECTS (${objects.length} total) ===\n`);
      objects.forEach(key => console.log(key));
    } catch(e) {
      console.error('Failed to parse response:', data.substring(0, 500));
    }
  });
}).on('error', (e) => {
  console.error('Request failed:', e.message);
});
