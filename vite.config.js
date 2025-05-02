import { defineConfig } from 'vite';
import { resolve } from 'path';
import * as sass from 'sass';
import sassOptions from './sassOptions.js';
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';  // Added for executing the combine script

// Function to copy directory recursively
function copyDir(src, dest) {
  // Check if source directory exists
  if (!existsSync(src)) {
    console.error(`Source directory does not exist: ${src}`);
    return;
  }

  try {
    // Create destination directory if it doesn't exist
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }

    // Read source directory
    const entries = readdirSync(src, { withFileTypes: true });

    // Copy each entry recursively
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        try {
          copyFileSync(srcPath, destPath);
        } catch (error) {
          mkdirSync(dirname(destPath), { recursive: true });
          copyFileSync(srcPath, destPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error copying directory: ${error.message}`);
  }
}

export default defineConfig({
  root: 'src',
  base: './',
  publicDir: '../public', // Correctly set the public directory relative to root
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 4096, // Only inline assets smaller than 4kb
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.logs in production build
        drop_console: true,
        // Keep console.error and console.warn for important messages
        pure_funcs: ['console.log']
      }
    }
  },
  server: {
    open: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        implementation: sass,
        ...sassOptions
      },
    },
  },
  plugins: [
    // Copy assets plugin
    {
      name: 'copy-assets-plugin',
      apply: 'build',
      enforce: 'post',
      closeBundle: async () => {
        console.log('Copying assets to build directory...');
        
        // If you have any additional assets in src/assets, copy them too
        const srcAssetsDir = resolve(__dirname, 'src/assets');
        const destAssetsDir = resolve(__dirname, 'dist/assets');
        
        if (existsSync(srcAssetsDir)) {
          try {
            copyDir(srcAssetsDir, destAssetsDir);
            console.log('✓ Assets copied successfully from src/assets to dist/assets');
          } catch (error) {
            console.error(`Error copying assets: ${error.message}`);
          }
        }
      }
    }
  ]
})