/**
 * PWA Helper Utilities
 * Handles "Add to Home Screen" functionality and fullscreen experience
 */

// Variables to track install prompt and status
let deferredPrompt;
let installPromptShown = false;

/**
 * Initialize PWA functionality
 */
export function initPWA() {
  // Handle beforeinstallprompt event (fired when PWA is installable)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the browser's default install prompt
    e.preventDefault();
    // Store the event for later use
    deferredPrompt = e;
    // Show our custom install prompt after a short delay (give the game time to load)
    setTimeout(() => {
      if (!installPromptShown) {
        showInstallPrompt();
      }
    }, 3000);
  });

  // Handle orientation changes
  window.addEventListener('orientationchange', handleOrientation);
  // Initial check
  handleOrientation();

  // Handle iOS full screen
  handleIOSFullscreen();
}

/**
 * Shows a custom install prompt to add the game to home screen
 */
function showInstallPrompt() {
  if (installPromptShown || !deferredPrompt) return;

  installPromptShown = true;
  const promptElement = document.createElement('div');
  promptElement.className = 'install-prompt';
  promptElement.innerHTML = `
    <span>Add to Home Screen for the best experience!</span>
    <button id="install-button">Install</button>
    <button id="dismiss-install">×</button>
  `;

  document.body.appendChild(promptElement);

  // Handle install button click
  document.getElementById('install-button').addEventListener('click', async () => {
    // Show the actual install prompt
    if (deferredPrompt) {
      deferredPrompt.prompt();
      
      // Wait for user response
      const { outcome } = await deferredPrompt.userChoice;
      
      // Clear the prompt variable
      deferredPrompt = null;
      
      // Remove our custom prompt regardless of outcome
      document.body.removeChild(promptElement);
    }
  });

  // Handle dismiss button
  document.getElementById('dismiss-install').addEventListener('click', () => {
    document.body.removeChild(promptElement);
  });

  // Auto-hide after 15 seconds
  setTimeout(() => {
    if (document.body.contains(promptElement)) {
      document.body.removeChild(promptElement);
    }
  }, 15000);
}

/**
 * Handle orientation changes on mobile devices
 */
function handleOrientation() {
  const warningElement = document.querySelector('.orientation-warning');
  
  if (!warningElement) return;
  
  // Show warning in landscape mode on mobile devices with small height
  if (window.innerHeight < 450 && window.innerWidth > window.innerHeight) {
    warningElement.style.display = 'flex';
  } else {
    warningElement.style.display = 'none';
  }
}

/**
 * Handle iOS fullscreen mode quirks
 */
function handleIOSFullscreen() {
  // iOS doesn't properly handle fullscreen without some help
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  if (isIOS) {
    // Add viewport height fix for iOS
    const viewportMetaTag = document.querySelector('meta[name="viewport"]');
    if (viewportMetaTag) {
      viewportMetaTag.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }

    // Handle iOS status bar in fullscreen web app mode
    document.addEventListener('touchmove', (e) => {
      if (window.navigator.standalone === true) {
        // In standalone mode, prevent default for at least one touch (prevents overscroll)
        e.preventDefault();
      }
    }, { passive: false });
  }
}

/**
 * Request fullscreen mode
 */
export function requestFullscreen() {
  const element = document.documentElement;
  
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) { /* Safari */
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) { /* IE11 */
    element.msRequestFullscreen();
  }
}

/**
 * Exit fullscreen mode
 */
export function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) { /* Safari */
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) { /* IE11 */
    document.msExitFullscreen();
  }
}

/**
 * Check if currently in fullscreen mode
 */
export function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}

/**
 * Toggle fullscreen mode
 */
export function toggleFullscreen() {
  if (isFullscreen()) {
    exitFullscreen();
  } else {
    requestFullscreen();
  }
}

// Export an API
export default {
  init: initPWA,
  requestFullscreen,
  exitFullscreen,
  isFullscreen,
  toggleFullscreen
};