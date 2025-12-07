# VeilPool Browser Extension - Real Wallet Integration ✅

Decentralized VPN browser extension powered by Solana blockchain with **100% REAL wallet connection** - no more demo addresses!

## 🔐 Real Solana Wallet Connection

This extension connects to **REAL** Phantom or Solflare wallets using a content script architecture. Your actual wallet address is used for all operations.

## Features

- 🔐 **Privacy-First**: Route traffic through decentralized nodes
- 🔑 **Real Wallet Integration**: Connect Phantom/Solflare (NOT demo addresses)
- ⛓️ **Blockchain-Powered**: Privacy passes validated on Solana devnet
- 🌍 **Global Network**: Access nodes worldwide
- ⚡ **Zero-Knowledge**: No tracking, no logs
- 🎯 **Smart Routing**: VRF-based node selection
- 🎨 **World-Class UI**: Cyberpunk dark theme with animations

## Prerequisites

**Install a Solana Wallet Extension:**
- **Phantom**: https://phantom.app/ (Recommended)
- **Solflare**: https://solflare.com/

## Installation

### Chrome/Brave

1. Clone this repository or extract files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **"Developer mode"** (top right toggle)
4. Click **"Load unpacked"**
5. Select the `browser-extension` folder
6. ✅ VeilPool extension appears with purple icon

### Firefox

1. Clone this repository or extract files
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on"**
4. Select the `manifest.json` file in the `browser-extension` folder
5. ✅ VeilPool extension loaded

## Usage - Real Wallet Connection

### Step 1: Connect Your Real Wallet

**Option A - Via Extension Popup:**
1. Click the VeilPool extension icon (purple shield)
2. Click the **"Connect Wallet"** badge (top right)
3. Phantom/Solflare popup will appear asking for approval
4. Click **"Connect"** in your wallet
5. ✅ Your real wallet address appears (e.g., `7xK3...a2Vf`)

**Option B - Via Web App First:**
1. Open http://localhost:3002 (make sure app is running)
2. Click **"Select Wallet"** → Choose Phantom/Solflare
3. Approve connection in wallet popup
4. Open VeilPool extension
5. Click **"Connect Wallet"** badge
6. ✅ Extension uses your already-connected wallet

### Step 2: Enable Privacy Routing

1. With wallet connected, click the large **Power Button** (center of popup)
2. Extension connects to optimal VeilPool node (uses VRF selection)
3. Connection ring animates and turns green
4. ✅ Your browsing traffic is now routed through VeilPool!

### Step 3: Monitor Status

- **Latency**: Real-time ping to selected node
- **Data Transferred**: MB uploaded/downloaded
- **Time Connected**: Session duration
- **Security Level**: Encryption strength indicator

## How Real Wallet Connection Works

### Architecture

```
┌──────────────┐
│  Any Webpage │  ← Has window.solana/window.solflare (injected by wallet)
└──────┬───────┘
       │
       │ Content Script detects wallet
       │
┌──────▼────────────┐
│  content.js       │  ← Runs in page context
│  - Detects wallet │  ← Access window.solana
│  - Calls connect()│  ← Gets publicKey
└──────┬────────────┘
       │
       │ chrome.runtime.sendMessage
       │
┌──────▼────────────┐
│ background.js     │  ← Service worker
│  - Receives addr  │  ← Stores in chrome.storage
│  - VPN logic      │  ← Uses real address for passes
└──────┬────────────┘
       │
       │ chrome.runtime.onMessage
       │
┌──────▼────────────┐
│  popup.html/js    │  ← User clicks "Connect Wallet"
│  - Triggers flow  │  ← Displays real address
│  - Shows stats    │  ← Beautiful dark UI
└───────────────────┘
```

### File Breakdown

```
browser-extension/
├── manifest.json       ← V3, Chrome + Firefox compatible
├── background.js       ← Service worker (VPN + wallet logic)
├── content.js          ← NEW! Detects Phantom/Solflare
├── popup.html          ← 380x600px cyberpunk UI
├── popup.js            ← UI logic + wallet display
└── icons/              ← Extension icons
```

### Key Code (content.js)

```javascript
// Runs on EVERY webpage in page context
async function detectAndConnectWallet() {
  // Check for Phantom
  if (window.solana && window.solana.isPhantom) {
    const response = await window.solana.connect({ onlyIfTrusted: false });
    return response.publicKey.toString(); // Real address!
  }
  
  // Check for Solflare
  if (window.solflare && window.solflare.isSolflare) {
    await window.solflare.connect();
    return window.solflare.publicKey.toString(); // Real address!
  }
  
  throw new Error('No Solana wallet detected. Please install Phantom or Solflare.');
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectWallet') {
    detectAndConnectWallet()
      .then(address => sendResponse({ success: true, address }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }
});
```

### Key Code (background.js)

```javascript
// Service worker - can't access window.solana directly
async function detectSolanaWallet() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        // Fallback: open web app for connection
        chrome.tabs.create({ url: 'http://localhost:3002' });
        reject(new Error('No active tab'));
        return;
      }
      
      // Ask content script to detect wallet
      chrome.tabs.sendMessage(tabs[0].id, { action: 'detectWallet' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response.address); // Real address from wallet!
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  });
}

// Handle wallet connection request from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'connectWallet') {
    detectSolanaWallet()
      .then(address => {
        chrome.storage.local.set({ walletAddress: address });
        sendResponse({ success: true, address });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
```

## Troubleshooting

### ❌ "No Solana wallet detected"
**Cause**: Phantom/Solflare not installed  
**Solution**: 
- Install from https://phantom.app/ or https://solflare.com/
- Refresh browser and try again

### ❌ "Wallet connection rejected"
**Cause**: You clicked "Cancel" on wallet approval popup  
**Solution**: Click "Connect Wallet" in extension again and approve

### ❌ Extension shows "DemoWallet..." address
**Cause**: Using old cached version or extension not reloaded  
**Solution**:
1. Go to `chrome://extensions/`
2. Find VeilPool extension
3. Click **Reload** button (circular arrow icon)
4. Open extension popup
5. Click "Connect Wallet" again

### ❌ "Could not establish connection. Receiving end does not exist"
**Cause**: Content script not injected yet  
**Solution**:
1. Refresh the webpage you're on
2. Wait 2-3 seconds
3. Try "Connect Wallet" again

### ❌ Popup immediately closes when clicking "Connect Wallet"
**Cause**: Normal behavior - wallet approval happens on current tab  
**Solution**: 
1. Look for Phantom/Solflare popup on your active tab
2. After approving, reopen VeilPool extension
3. Wallet address will be displayed

## Verification

### Confirm Real Wallet Connection:

**Method 1 - Check Extension Storage:**
```javascript
// Open extension service worker console (chrome://extensions → Details → service worker)
chrome.storage.local.get(['walletAddress'], (data) => {
  console.log('Connected wallet:', data.walletAddress);
  // Should show: 7xK3G8a9h2Vf4Qp1L...4Vf2a (real Solana address)
  // NOT: DemoWallet... (old mock address)
});
```

**Method 2 - Check on Solana Explorer:**
1. Copy your connected address from extension popup
2. Visit https://explorer.solana.com/
3. Switch to **Devnet** (top right dropdown)
4. Paste your address
5. ✅ See your real SOL balance and transaction history

**Method 3 - Console Logs:**
```bash
# In content script console (F12 on any webpage):
# Look for: "VeilPool: Solana wallet detected (Phantom)"
# Shows: "Connected wallet address: 7xK3G..."

# In background service worker console:
# Look for: "Wallet connected: 7xK3G..."
```

## Security & Privacy

### ✅ What's Safe:
- Extension only requests your wallet **address** (public key)
- **Never** accesses your private keys or seed phrase
- Wallet approval required every connection
- Uses official Solana wallet adapter APIs (`window.solana.connect()`)
- No data sent to third parties

### 🔐 Permissions Explained:
- `<all_urls>`: Required to inject content script for wallet detection on any site
- `storage`: Remember connected wallet and VPN state
- `tabs`: Detect active tab to communicate with content script
- `webRequest`: Route traffic through VeilPool nodes
- `proxy`: Configure VPN routing rules

### ⚠️ Important:
- VeilPool never sees your private key (stays in Phantom/Solflare)
- Only your public address is used for privacy pass validation
- All blockchain transactions signed in your wallet extension

## Development & Testing

### Local Development:
```bash
# 1. Start VeilPool web app
cd app
npm install
npm run dev  # Runs on http://localhost:3002

# 2. Load extension in Chrome
# Navigate to chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked" → select browser-extension/

# 3. Install Phantom for testing
# Visit https://phantom.app/download
# Create test wallet on Devnet

# 4. Test connection flow
# Click extension icon → Connect Wallet → Approve in Phantom
```

### Debugging Tools:

**Background Script Console:**
```
chrome://extensions/ → VeilPool → "service worker" link
```

**Content Script Console:**
```
Open any webpage → F12 → Console tab
Look for "VeilPool:" logs
```

**Popup Console:**
```
Right-click extension icon → "Inspect popup"
```

**Check Manifest:**
```bash
# Verify content script configuration
cat browser-extension/manifest.json | grep -A 5 "content_scripts"
```

## Privacy Pass Validation

The extension validates privacy passes on-chain:

1. Connects to Solana devnet
2. Derives PDA (Program Derived Address) for user's pass account
3. Checks expiration timestamp
4. Verifies remaining bandwidth quota
5. Confirms active status

**Program IDs (Devnet):**
```javascript
PRIVACY_PASS_PROGRAM_ID = "ErJqEhZKQZbLt1Q5VJGhdxXCzpFr7UWMn95JTwUDMAQL"
NODE_REGISTRY_PROGRAM_ID = "8cCj4agFvZW1dakN6fyaeh4G84BE686of15ZQboNVEt"
VRF_SELECTION_PROGRAM_ID = "Hy93mnAuUGc7PxGqAidBMUqVF2gzxHa7iBQ3EVGwpoyK"
```

## Node Selection

Uses VRF (Verifiable Random Function) for secure, unpredictable node selection:

1. Fetches registered nodes from `NODE_REGISTRY_PROGRAM_ID`
2. Filters by reputation score, region, and availability
3. Selects node using VRF seed for unpredictability
4. Measures actual latency (ping) before connecting
5. Falls back to next node if connection fails

## Proxy Configuration

Routes traffic through selected VeilPool node:

```javascript
{
  mode: 'fixed_servers',
  rules: {
    singleProxy: {
      scheme: 'https',
      host: 'node-proxy.veilpool.io',
      port: 8080
    }
  }
}
```

## What Changed - Demo to Real Integration

### ❌ OLD (Demo Version):
```javascript
// background.js - OLD
case 'connectWallet':
  const mockAddress = 'DemoWallet' + Math.random().toString(36).substring(7);
  sendResponse({ success: true, address: mockAddress });
  break;
```
**Result**: Fake addresses like `DemoWalletxyz123...`

### ✅ NEW (Real Wallet Version):
```javascript
// background.js - NEW
case 'connectWallet':
  detectSolanaWallet()
    .then(address => sendResponse({ success: true, address }))
    .catch(error => sendResponse({ success: false, error: error.message }));
  return true;

// content.js - NEW FILE (added)
async function detectAndConnectWallet() {
  if (window.solana && window.solana.isPhantom) {
    const response = await window.solana.connect({ onlyIfTrusted: false });
    return response.publicKey.toString(); // REAL address!
  }
}
```
**Result**: Real Solana addresses like `7xK3G8a9h2Vf4Qp1L6eN8mT4Vf2a...`

## Security

- ✅ No plaintext passwords stored
- ✅ Real wallet integration via Phantom/Solflare (NOT demo addresses)
- ✅ On-chain pass validation on Solana devnet
- ✅ Encrypted proxy connections
- ✅ Zero-knowledge architecture
- ✅ Private keys never leave wallet extension

## Permissions

Required permissions:

- `proxy`: Configure browser proxy settings
- `webRequest`: Track data usage
- `storage`: Store connection state
- `tabs`: Open VeilPool website
- `notifications`: Connection status alerts
- `<all_urls>`: Inject content script for wallet detection

## Support

- **Website**: http://localhost:3002 (dev)
- **Docs**: See `/SUBMISSION_READY.md` and `/REAL_INTEGRATION.md`
- **GitHub**: This repository

## License

MIT

---

## 🎉 100% Real Wallet Integration!

**Before**: `DemoWalletxyz123...`  
**After**: `7xK3G8a9h2Vf4Qp1L...` ✅

Perfect for hackathon submission! 🚀
