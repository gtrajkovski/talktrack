/**
 * Generate PNG icons from SVG for PWA compatibility
 *
 * Usage: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

// Standard PWA icon sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Apple touch icon sizes
const appleSizes = [180];

async function generateIcons() {
  const svgPath = join(iconsDir, 'icon.svg');
  const svgBuffer = readFileSync(svgPath);

  console.log('Generating PNG icons from SVG...\n');

  // Generate standard icons
  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ icon-${size}x${size}.png`);
  }

  // Generate Apple touch icon
  for (const size of appleSizes) {
    const outputPath = join(iconsDir, `apple-touch-icon.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ apple-touch-icon.png (${size}x${size})`);
  }

  // Generate favicon
  const faviconPath = join(__dirname, '..', 'public', 'favicon.ico');
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(iconsDir, 'favicon-32x32.png'));
  console.log('✓ favicon-32x32.png');

  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(join(iconsDir, 'favicon-16x16.png'));
  console.log('✓ favicon-16x16.png');

  console.log('\n✅ All icons generated successfully!');
  console.log('\nRemember to update manifest.json with the new PNG icons.');
}

generateIcons().catch(console.error);
