const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <radialGradient id="sky" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#3f2063" />
      <stop offset="50%" stop-color="#1d1030" />
      <stop offset="100%" stop-color="#07040c" />
    </radialGradient>
    <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f4ebef" />
      <stop offset="35%" stop-color="#c8aed6" />
      <stop offset="70%" stop-color="#8655b0" />
      <stop offset="100%" stop-color="#3f2063" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  
  <!-- Outer Dark Pill / Rounded Square -->
  <rect x="4" y="4" width="120" height="120" rx="28" fill="url(#sky)" stroke="#5a2f86" stroke-width="2.5"/>
  
  <!-- Ambient Lilac Glow -->
  <circle cx="64" cy="62" r="38" fill="#8655b0" opacity="0.3" filter="url(#glow)"/>

  <!-- Mystical Cloud Formation -->
  <g filter="url(#glow)">
    <path d="M 44 82
             C 32 82 24 73 24 62
             C 24 52 32 44 42 43
             C 47 31 60 24 74 26
             C 87 28 98 38 100 51
             C 107 53 112 60 112 68
             C 112 76 105 82 96 82
             Z" 
          fill="url(#cloudGrad)" 
          stroke="#07040c" 
          stroke-width="2.5" />
          
    <!-- Inner Swirls / Contour -->
    <path d="M 40 64 C 48 58 58 56 68 60 C 78 64 88 58 96 54" 
          fill="none" 
          stroke="#1d1030" 
          stroke-width="2" 
          stroke-linecap="round" 
          opacity="0.8"/>
          
    <path d="M 52 74 C 62 70 74 72 84 68" 
          fill="none" 
          stroke="#3f2063" 
          stroke-width="1.8" 
          stroke-linecap="round" 
          opacity="0.7"/>
  </g>

  <!-- Constellation Stars -->
  <circle cx="34" cy="30" r="1.8" fill="#f4ebef" opacity="0.9" />
  <circle cx="98" cy="28" r="1.5" fill="#c8aed6" opacity="0.85" />
  <circle cx="28" cy="94" r="1.4" fill="#c8aed6" opacity="0.7" />
  <circle cx="94" cy="98" r="1.8" fill="#f4ebef" opacity="0.95" />
  
  <!-- Tab Key Symbol accent -->
  <g transform="translate(56, 88)" opacity="0.9">
    <rect x="-8" y="-4" width="32" height="18" rx="4" fill="#1d1030" stroke="#8655b0" stroke-width="1.2"/>
    <path d="M -2 5 L 14 5 M 10 1 L 14 5 L 10 9 M 18 1 L 18 9" stroke="#f4ebef" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;

async function generate() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  const sizes = [16, 32, 48, 128];
  
  for (const size of sizes) {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background: transparent; overflow: hidden;">
        <div style="width: ${size}px; height: ${size}px;">
          ${svg.replace('width="128" height="128"', `width="${size}" height="${size}"`)}
        </div>
      </body>
      </html>
    `;
    await page.setContent(html);
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    const outPath = path.join(__dirname, '..', 'extension', 'icons', `icon-${size}.png`);
    await page.screenshot({ path: outPath, omitBackground: true });
    console.log(`Generated ${outPath}`);
  }
  
  await browser.close();
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
