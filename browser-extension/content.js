// Content script to access window.solana (Phantom/Solflare)
// This runs in the page context and can access wallet objects

(function() {
  'use strict';

  // Listen for wallet connection requests from extension
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectWallet') {
      detectAndConnectWallet()
        .then(address => sendResponse({ success: true, address }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
    }
  });

  async function detectAndConnectWallet() {
    // Check for Phantom wallet
    if (window.solana && window.solana.isPhantom) {
      try {
        const response = await window.solana.connect({ onlyIfTrusted: false });
        return response.publicKey.toString();
      } catch (error) {
        throw new Error('Phantom wallet connection rejected');
      }
    }
    
    // Check for Solflare wallet
    if (window.solflare && window.solflare.isSolflare) {
      try {
        await window.solflare.connect();
        return window.solflare.publicKey.toString();
      } catch (error) {
        throw new Error('Solflare wallet connection rejected');
      }
    }

    // Check for other Solana wallets
    if (window.solana) {
      try {
        const response = await window.solana.connect();
        return response.publicKey.toString();
      } catch (error) {
        throw new Error('Wallet connection rejected');
      }
    }

    throw new Error('No Solana wallet detected. Please install Phantom or Solflare.');
  }

  // Auto-detect wallet on page load
  window.addEventListener('load', () => {
    if (window.solana || window.solflare) {
      console.log('VeilPool: Solana wallet detected');
    }
  });
})();
