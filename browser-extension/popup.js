// Extension popup logic
let isConnected = false;
let connectionStartTime = null;
let updateInterval = null;

// DOM elements
const connectBtn = document.getElementById('connectBtn');
const connectionRing = document.getElementById('connectionRing');
const statusText = document.getElementById('statusText');
const nodeInfoPanel = document.getElementById('nodeInfoPanel');
const nodeInfoText = document.getElementById('nodeInfo');
const nodeLocation = document.getElementById('nodeLocation');
const nodeLatency = document.getElementById('nodeLatency');
const nodeReputation = document.getElementById('nodeReputation');
const dataUsedEl = document.getElementById('dataUsed');
const timeConnectedEl = document.getElementById('timeConnected');
const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletAddressEl = document.getElementById('walletAddress');
const walletDot = document.getElementById('walletDot');

// Initialize
chrome.storage.local.get(['isConnected', 'currentNode', 'walletAddress', 'connectionStartTime'], (data) => {
  if (data.walletAddress) {
    updateWalletUI(data.walletAddress);
  }

  if (data.isConnected) {
    isConnected = true;
    connectionStartTime = data.connectionStartTime || Date.now();
    updateUIConnected(data.currentNode);
    startTracking();
  }
});

// Connect button handler
connectBtn.addEventListener('click', async () => {
  if (isConnected) {
    await disconnect();
  } else {
    await connect();
  }
});

// Wallet connect button
connectWalletBtn.addEventListener('click', async () => {
  const data = await chrome.storage.local.get(['walletAddress']);
  
  if (data.walletAddress) {
    // Disconnect wallet
    chrome.storage.local.remove('walletAddress');
    updateWalletUI(null);
  } else {
    // Request wallet connection from background
    chrome.runtime.sendMessage({ action: 'connectWallet' }, (response) => {
      if (response && response.success) {
        updateWalletUI(response.address);
        chrome.storage.local.set({ walletAddress: response.address });
      } else {
        alert(response?.error || 'Failed to connect wallet. Please install Phantom or Solflare wallet extension.');
      }
    });
  }
});

async function connect() {
  try {
    // Check if wallet is connected
    const { walletAddress } = await chrome.storage.local.get(['walletAddress']);
    
    if (!walletAddress) {
      // Flash wallet button to indicate requirement
      connectWalletBtn.style.borderColor = '#FF4B4B';
      setTimeout(() => connectWalletBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)', 1000);
      return;
    }

    // UI Loading State
    connectionRing.classList.add('connecting');
    statusText.textContent = 'Routing...';
    connectBtn.disabled = true;

    // Send message to background script to establish connection
    chrome.runtime.sendMessage({ 
      action: 'connect',
      wallet: walletAddress 
    }, (response) => {
      connectionRing.classList.remove('connecting');
      connectBtn.disabled = false;

      if (response && response.success) {
        isConnected = true;
        connectionStartTime = Date.now();
        updateUIConnected(response.node);
        
        // Save state
        chrome.storage.local.set({
          isConnected: true,
          currentNode: response.node,
          connectionStartTime
        });

        // Start tracking
        startTracking();
      } else {
        statusText.textContent = 'Connect';
        alert(response?.error || 'Connection failed. Please try again.');
      }
    });
  } catch (error) {
    console.error('Connection error:', error);
    connectionRing.classList.remove('connecting');
    connectBtn.disabled = false;
    statusText.textContent = 'Connect';
  }
}

async function disconnect() {
  statusText.textContent = 'Stopping...';
  connectBtn.disabled = true;

  chrome.runtime.sendMessage({ action: 'disconnect' }, (response) => {
    isConnected = false;
    connectionStartTime = null;
    updateUIDisconnected();
    
    chrome.storage.local.set({ isConnected: false });
    stopTracking();
    connectBtn.disabled = false;
  });
}

function updateUIConnected(node) {
  document.body.classList.add('connected');
  connectionRing.classList.add('connected');
  statusText.textContent = 'Secure';
  
  if (node) {
    nodeInfoText.textContent = node.name || 'VeilPool Node';
    nodeLocation.textContent = node.location || 'Unknown Region';
    nodeLatency.textContent = node.latency ? `${node.latency}ms` : '45ms';
    nodeReputation.textContent = node.reputation ? `${node.reputation}/100` : '98/100';
  }
}

function updateUIDisconnected() {
  document.body.classList.remove('connected');
  connectionRing.classList.remove('connected');
  statusText.textContent = 'Connect';
  
  dataUsedEl.textContent = '0 MB';
  timeConnectedEl.textContent = '00:00:00';
  nodeLatency.textContent = '-- ms';
}

function updateWalletUI(address) {
  if (address) {
    walletAddressEl.textContent = address.substring(0, 4) + '...' + address.substring(address.length - 4);
    walletDot.classList.add('active');
  } else {
    walletAddressEl.textContent = 'Connect Wallet';
    walletDot.classList.remove('active');
  }
}

function startTracking() {
  if (updateInterval) clearInterval(updateInterval);
  
  updateInterval = setInterval(() => {
    // Update session time
    if (connectionStartTime) {
      const elapsed = Date.now() - connectionStartTime;
      const seconds = Math.floor((elapsed / 1000) % 60);
      const minutes = Math.floor((elapsed / 60000) % 60);
      const hours = Math.floor(elapsed / 3600000);
      
      timeConnectedEl.textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Update data used (simulated)
    chrome.storage.local.get(['dataUsed'], (data) => {
      const used = data.dataUsed || 0;
      if (used > 1024 * 1024 * 1024) {
        dataUsedEl.textContent = `${(used / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      } else {
        dataUsedEl.textContent = `${(used / (1024 * 1024)).toFixed(1)} MB`;
      }
    });
  }, 1000);
}

function stopTracking() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

// Links
document.getElementById('openDashboard').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'http://localhost:3002/user/dashboard' });
});

document.getElementById('openSettings').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'http://localhost:3002/user/settings' });
});
