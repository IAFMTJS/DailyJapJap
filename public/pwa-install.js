// PWA Install Handler
let deferredPrompt;
let installButton = null;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA install prompt available');
  // Prevent the mini-infobar from appearing
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Show install button
  showInstallButton();
});

// Show install button in UI
function showInstallButton() {
  // Check if button already exists
  if (document.getElementById('pwa-install-btn')) {
    document.getElementById('pwa-install-btn').style.display = 'block';
    return;
  }

  // Create install button
  const installBtn = document.createElement('button');
  installBtn.id = 'pwa-install-btn';
  installBtn.className = 'pwa-install-btn';
  installBtn.innerHTML = `
    <span class="install-icon">📱</span>
    <span class="install-text">Install App</span>
  `;
  installBtn.onclick = installPWA;

  // Add to header or navigation
  const header = document.querySelector('.header') || document.querySelector('header') || document.body;
  if (header) {
    header.appendChild(installBtn);
  }
}

// Install PWA
async function installPWA() {
  if (!deferredPrompt) {
    console.log('Install prompt not available');
    return;
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`User response to install prompt: ${outcome}`);
  
  if (outcome === 'accepted') {
    console.log('User accepted the install prompt');
    // Hide install button
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  } else {
    console.log('User dismissed the install prompt');
  }

  // Clear the deferredPrompt
  deferredPrompt = null;
}

// Check if app is already installed
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  deferredPrompt = null;
  
  // Hide install button
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.style.display = 'none';
  }

  // Show success message
  if (window.celebrationService) {
    window.celebrationService.celebrate('App Installed! 🎉', 'success');
  }
});

// Check if running as PWA
function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone ||
         document.referrer.includes('android-app://');
}

// Update UI based on PWA status
if (isPWA()) {
  document.documentElement.classList.add('pwa-mode');
  console.log('Running as PWA');
}

// Export for global access
window.pwaInstall = {
  install: installPWA,
  isPWA: isPWA,
  showInstallButton: showInstallButton
};

