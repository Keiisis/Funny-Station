// Test the actual headers sent by the Vercel deployment
const https = require('https');

const testUrls = [
  // Main page
  'https://funny-station.vercel.app/',
  // GBA runner
  'https://funny-station.vercel.app/games/gba-runner.html',
  // Racing game index from R2
  'https://funnystation.agavoubj.workers.dev/games/racing-game/index.html',
  // Racing game loader from R2
  'https://funnystation.agavoubj.workers.dev/games/racing-game/Build/racing-game.loader.js',
  // A ROM from R2
  'https://funnystation.agavoubj.workers.dev/games/Spider-Man%203%20(USA).gba',
  // EmulatorJS CDN (check if CORP is present)
  'https://cdn.emulatorjs.org/stable/data/loader.js',
];

async function testUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        url: url,
        status: res.statusCode,
        coep: res.headers['cross-origin-embedder-policy'] || 'NONE',
        coop: res.headers['cross-origin-opener-policy'] || 'NONE',
        corp: res.headers['cross-origin-resource-policy'] || 'NONE',
        cors: res.headers['access-control-allow-origin'] || 'NONE',
        contentType: res.headers['content-type'] || 'NONE',
      });
    });
    req.on('error', (e) => resolve({ url, status: 'ERROR', error: e.message }));
    req.end();
  });
}

async function run() {
  console.log('\n=== CROSS-ORIGIN HEADER AUDIT ===\n');
  for (const url of testUrls) {
    const r = await testUrl(url);
    const shortUrl = url.replace('https://', '');
    console.log(`${r.status} | ${shortUrl}`);
    console.log(`  COEP: ${r.coep}`);
    console.log(`  COOP: ${r.coop}`);
    console.log(`  CORP: ${r.corp}`);
    console.log(`  CORS: ${r.cors}`);
    console.log('');
  }
}

run();
