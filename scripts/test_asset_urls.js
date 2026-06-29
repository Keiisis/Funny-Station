// Test specific game URLs to verify they resolve correctly
const https = require('https');

const testUrls = [
  // Racing Game - WebGL
  'https://funnystation.agavoubj.workers.dev/games/racing-game/index.html',
  // Spider-Man 3 - GBA ROM
  'https://funnystation.agavoubj.workers.dev/games/Spider-Man%203%20(USA).gba',
  // Top Down Horror - WebGL
  'https://funnystation.agavoubj.workers.dev/games/top-down-horror/index.html',
  // Serpens - WebGL
  'https://funnystation.agavoubj.workers.dev/games/serpens/index.html',
];

async function testUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      const coep = res.headers['cross-origin-embedder-policy'];
      const corp = res.headers['cross-origin-resource-policy'];
      const cors = res.headers['access-control-allow-origin'];
      resolve({
        url: url.replace('https://funnystation.agavoubj.workers.dev/', ''),
        status: res.statusCode,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length'],
        cors,
        coep,
        corp
      });
    });
    req.on('error', (e) => resolve({ url, status: 'ERROR', error: e.message }));
    req.end();
  });
}

async function run() {
  console.log('\n=== TESTING GAME ASSET URLS ===\n');
  for (const url of testUrls) {
    const result = await testUrl(url);
    console.log(`${result.status} | ${result.url}`);
    console.log(`  Type: ${result.contentType}, Size: ${result.contentLength}`);
    console.log(`  CORS: ${result.cors}, COEP: ${result.coep}, CORP: ${result.corp}`);
    console.log('');
  }
}

run();
