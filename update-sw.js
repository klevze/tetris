/**
 * A script to update the service worker with the correct asset file paths after a build.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define relevant file paths
const templatePath = join(__dirname, 'public', 'serviceWorker.template.js');
const outputPath = join(__dirname, 'dist', 'serviceWorker.js');
const assetsDir = join(__dirname, 'dist', 'assets');

// Read the service worker template
console.log('Reading service worker template...');
let swTemplate;
try {
  swTemplate = readFileSync(templatePath, 'utf8');
} catch (err) {
  console.error(`Error reading template file: ${err.message}`);
  process.exit(1);
}

// Get a list of all built assets
console.log('Reading asset directory...');
let assetFiles;
try {
  assetFiles = readdirSync(assetsDir);
} catch (err) {
  console.error(`Error reading assets directory: ${err.message}`);
  process.exit(1);
}

// Filter and format asset paths for the service worker
const jsAssets = assetFiles.filter(file => file.endsWith('.js')).map(file => `  './assets/${file}',`);
const cssAssets = assetFiles.filter(file => file.endsWith('.css')).map(file => `  './assets/${file}',`);

// Combine JS and CSS asset paths
const assetPaths = [...jsAssets, ...cssAssets].join('\n');

// Replace the placeholder in the template with the actual asset paths
const updatedServiceWorker = swTemplate.replace('  // INJECT_ASSETS_HERE - DO NOT REMOVE THIS COMMENT', assetPaths);

// Ensure the output directory exists
const outputDir = dirname(outputPath);
if (!existsSync(outputDir)) {
  console.log(`Creating directory ${outputDir}...`);
  mkdirSync(outputDir, { recursive: true });
}

// Write the updated service worker to the output file
console.log('Writing updated service worker...');
try {
  writeFileSync(outputPath, updatedServiceWorker, 'utf8');
  console.log(`Service worker updated successfully at ${outputPath}`);
} catch (err) {
  console.error(`Error writing service worker file: ${err.message}`);
  process.exit(1);
}

// Also copy the updated service worker to public directory for development
const publicSwPath = join(__dirname, 'public', 'serviceWorker.js');
try {
  writeFileSync(publicSwPath, updatedServiceWorker, 'utf8');
  console.log(`Service worker also copied to ${publicSwPath}`);
} catch (err) {
  console.error(`Error copying to public directory: ${err.message}`);
  // Not exiting here as it's not critical
}