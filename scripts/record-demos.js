/**
 * Nimbus Demo Recorder & GIF Generator
 * Runs real Chrome with Puppeteer, executes typing scenarios,
 * captures frame sequences, and encodes optimized GIFs via ffmpeg.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG_PATH = 'C:\\Users\\smash\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0-full_build\\bin\\ffmpeg.exe';
const EXTENSION_PATH = path.join(__dirname, '..', 'extension');
const HARNESS_PATH = path.join(__dirname, '..', 'test-harness');
const GIFS_DIR = path.join(__dirname, '..', 'gifs');
const TMP_DIR = path.join(__dirname, '..', '.tmp_frames');

// Ensure output directories exist
if (!fs.existsSync(GIFS_DIR)) fs.mkdirSync(GIFS_DIR, { recursive: true });
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// Start local HTTP server to host test harness & extension files
function startServer(port = 8765) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/') reqPath = '/twitter.html';

      let filePath = '';
      if (reqPath.startsWith('/extension/')) {
        filePath = path.join(__dirname, '..', reqPath);
      } else {
        filePath = path.join(HARNESS_PATH, reqPath);
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.png': 'image/png',
          '.svg': 'image/svg+xml'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(fs.readFileSync(filePath));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, () => {
      console.log(`[Server] Local test harness server running on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

// Clean temporary frame directory
function cleanFramesDir() {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Helper to capture a frame
async function captureFrame(page, frameIndex) {
  const padded = String(frameIndex).padStart(4, '0');
  const framePath = path.join(TMP_DIR, `frame_${padded}.png`);
  await page.screenshot({ path: framePath, type: 'png' });
}

// Compile captured PNG frames into an optimized animated GIF
function compileGif(outputName, fps = 10) {
  const outPath = path.join(GIFS_DIR, outputName);
  console.log(`[FFmpeg] Compiling ${outPath} at ${fps} fps...`);
  
  const cmd = `"${FFMPEG_PATH}" -y -framerate ${fps} -i "${path.join(TMP_DIR, 'frame_%04d.png')}" -vf "fps=${fps},scale=flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:reserve_transparent=0[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" "${outPath}"`;
  
  execSync(cmd, { stdio: 'inherit' });
  console.log(`[Success] Created ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const server = await startServer(8765);

  console.log('[Puppeteer] Launching Chrome with Nimbus extension loaded...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false, // Real browser rendering
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=980,780',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: { width: 880, height: 680 }
  });

  const page = await browser.newPage();

  // =========================================================================
  // SCENARIO 1: X / Twitter Thread Reply Demo
  // =========================================================================
  console.log('\n--- [1/4] Recording X / Twitter Demo ---');
  cleanFramesDir();
  await page.goto('http://127.0.0.1:8765/twitter.html', { waitUntil: 'networkidle0' });
  await page.bringToFront();
  await sleep(1000);

  let frame = 1;
  // Step 1: Initial view
  for (let i = 0; i < 5; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  // Step 2: Focus the tweet editor
  console.log('Focusing tweet reply box...');
  await page.click('#tweet-editor');
  for (let i = 0; i < 6; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  // Step 3: Nimbus pill and ghost box condense
  await sleep(400);
  for (let i = 0; i < 12; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  // Step 4: Cycle tone using Alt + ] to "Witty"
  console.log('Pressing Alt + ] to cycle tone to Witty...');
  await page.keyboard.down('Alt');
  await page.keyboard.press(']');
  await page.keyboard.up('Alt');
  await sleep(500);

  for (let i = 0; i < 12; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  // Step 5: Press Tab to accept suggestion!
  console.log('Pressing Tab to accept ghost text...');
  await page.keyboard.press('Tab');
  await sleep(400);

  for (let i = 0; i < 14; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  compileGif('demo-twitter.gif', 8);

  // =========================================================================
  // SCENARIO 2: LinkedIn Post Comment Demo
  // =========================================================================
  console.log('\n--- [2/4] Recording LinkedIn Demo ---');
  cleanFramesDir();
  frame = 1;

  await page.goto('http://127.0.0.1:8765/linkedin.html', { waitUntil: 'networkidle0' });
  await sleep(1000);

  for (let i = 0; i < 5; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  console.log('Focusing LinkedIn editor...');
  await page.click('#linkedin-editor');
  for (let i = 0; i < 8; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  // Type prefix "Thanks "
  console.log('Typing prefix: Thanks ...');
  await page.keyboard.type('Thanks ', { delay: 120 });
  for (let i = 0; i < 8; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  await sleep(500);
  for (let i = 0; i < 10; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  // Press Tab to complete
  console.log('Pressing Tab to accept LinkedIn suggestion...');
  await page.keyboard.press('Tab');
  await sleep(400);

  for (let i = 0; i < 14; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  compileGif('demo-linkedin.gif', 8);

  // =========================================================================
  // SCENARIO 3: Gmail Compose Reply Demo
  // =========================================================================
  console.log('\n--- [3/4] Recording Gmail Demo ---');
  cleanFramesDir();
  frame = 1;

  await page.goto('http://127.0.0.1:8765/gmail.html', { waitUntil: 'networkidle0' });
  await sleep(1000);

  for (let i = 0; i < 5; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  console.log('Focusing Gmail editor...');
  await page.click('#gmail-editor');
  for (let i = 0; i < 10; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  // Cycle tone to Brief
  console.log('Pressing Alt + ] to cycle tone...');
  await page.keyboard.down('Alt');
  await page.keyboard.press(']');
  await page.keyboard.up('Alt');
  await sleep(400);

  await page.keyboard.down('Alt');
  await page.keyboard.press(']');
  await page.keyboard.up('Alt');
  await sleep(500);

  for (let i = 0; i < 10; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  // Press Tab to complete
  console.log('Pressing Tab to accept in Gmail...');
  await page.keyboard.press('Tab');
  await sleep(400);

  for (let i = 0; i < 14; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  compileGif('demo-gmail.gif', 8);

  // =========================================================================
  // SCENARIO 4: Nimbus Popup & Playground Demo
  // =========================================================================
  console.log('\n--- [4/4] Recording Nimbus Popup Demo ---');
  cleanFramesDir();
  frame = 1;

  await page.setViewport({ width: 420, height: 540 });
  await page.goto('http://127.0.0.1:8765/extension/popup/popup.html', { waitUntil: 'networkidle0' });
  await sleep(800);

  for (let i = 0; i < 6; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  // Type in playground input
  console.log('Typing in popup playground...');
  await page.click('#playground-input');
  await page.keyboard.type('Congrats ', { delay: 100 });
  for (let i = 0; i < 8; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  // Click "Witty" tone pill
  console.log('Clicking Witty tone pill in popup...');
  await page.click('.tone-pill[data-tone="Witty"]');
  await sleep(400);

  for (let i = 0; i < 10; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  // Accept with Tab in playground
  console.log('Pressing Tab in playground...');
  await page.keyboard.press('Tab');
  await sleep(400);

  for (let i = 0; i < 14; i++) {
    await captureFrame(page, frame++);
    await sleep(100);
  }

  compileGif('demo-popup.gif', 8);

  console.log('\n[Done] All 4 demonstration GIFs generated successfully in /gifs directory!');

  await browser.close();
  server.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('[Error] Recording failed:', err);
  process.exit(1);
});
