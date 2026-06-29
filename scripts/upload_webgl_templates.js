const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('https');

// Helper to get remote R2 keys from the worker debug endpoint
function getRemoteKeys() {
  return new Promise((resolve, reject) => {
    http.get('https://funnystation.agavoubj.workers.dev/list-objects-debug', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Failed to parse remote keys JSON: " + e.message));
        }
      });
    }).on('error', (err) => reject(err));
  });
}

// Helper to recursively walk a directory
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function main() {
  console.log("Fetching remote keys from Cloudflare Worker...");
  let remoteKeys = [];
  try {
    remoteKeys = await getRemoteKeys();
    console.log(`Found ${remoteKeys.length} objects currently in R2 bucket.`);
  } catch (e) {
    console.error("Could not fetch remote keys:", e.message);
    console.log("Will check and upload all files.");
  }

  const localBaseDir = path.join(__dirname, '../public/games');
  if (!fs.existsSync(localBaseDir)) {
    console.error(`Local games folder does not exist at ${localBaseDir}`);
    process.exit(1);
  }

  console.log(`\nAnalyzing all files under public/games...`);
  const localFiles = walkDir(localBaseDir);
  console.log(`Found ${localFiles.length} local files in total.`);

  let uploadCount = 0;
  let skipCount = 0;
  
  for (const filePath of localFiles) {
    // Get the relative path from the public/games folder
    const relPath = path.relative(localBaseDir, filePath).replace(/\\/g, '/');
    
    // Skip runner templates that are same-origin on Vercel
    if (relPath === 'gba-runner.html' || 
        relPath === 'nes-runner.html' || 
        relPath === 'snes-runner.html' || 
        relPath === 'psp-runner.html') {
      console.log(`[SKIP RUNNER] ${relPath}`);
      skipCount++;
      continue;
    }

    const r2Key = `games/${relPath}`;

    // Check if file is already in R2
    if (remoteKeys.includes(r2Key)) {
      skipCount++;
      continue;
    }

    console.log(`\n[UPLOAD] Missing: ${r2Key} (Local: ${filePath})`);
    const cmd = `npx wrangler r2 object put "funnystation-roms/${r2Key}" --file "${filePath}" --remote`;
    
    try {
      console.log(`Executing: ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
      console.log(`Successfully uploaded ${r2Key}`);
      uploadCount++;
    } catch (err) {
      console.error(`Failed to upload ${r2Key}:`, err.message);
    }
  }

  console.log(`\nAll checks and uploads complete!`);
  console.log(`Uploaded: ${uploadCount} files.`);
  console.log(`Skipped: ${skipCount} files.`);
}

main().catch(console.error);
