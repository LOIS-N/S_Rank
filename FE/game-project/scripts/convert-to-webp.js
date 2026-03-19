/**
 * PNG/JPG → WebP 일괄 변환 스크립트
 * 대상: public/assets (cards 폴더 제외)
 * 실행: node scripts/convert-to-webp.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../public/assets');
const EXCLUDE_DIRS = ['cards']; // BE API URL로 제어하는 카드 이미지 제외

let converted = 0;
let totalSavedBytes = 0;

function getAllImages(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      results.push(...getAllImages(fullPath));
    } else if (/\.(png|jpg|jpeg)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function convertToWebP(filePath) {
  const ext = path.extname(filePath);
  const webpPath = filePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');

  const originalSize = fs.statSync(filePath).size;

  await sharp(filePath)
    .webp({ quality: 90, lossless: ext.toLowerCase() === '.png' && originalSize < 500 * 1024 })
    .toFile(webpPath);

  const webpSize = fs.statSync(webpPath).size;
  const saved = originalSize - webpSize;
  const ratio = ((saved / originalSize) * 100).toFixed(1);

  totalSavedBytes += saved;
  converted++;

  const rel = path.relative(ASSETS_DIR, filePath);
  console.log(`✓ ${rel} | ${(originalSize/1024).toFixed(0)}KB → ${(webpSize/1024).toFixed(0)}KB (${ratio}% 절감)`);
}

async function main() {
  console.log('🔄 WebP 변환 시작...\n');

  const images = getAllImages(ASSETS_DIR);
  console.log(`대상 파일: ${images.length}개\n`);

  for (const img of images) {
    await convertToWebP(img);
  }

  console.log(`\n✅ 완료: ${converted}개 변환`);
  console.log(`💾 총 절감: ${(totalSavedBytes / 1024 / 1024).toFixed(1)}MB`);
  console.log('\n원본 PNG/JPG 파일은 유지됩니다. 확인 후 삭제하세요.');
}

main().catch(console.error);
