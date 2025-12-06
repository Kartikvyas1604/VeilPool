// Extension popup logic
let isConnected = false;
let connectionStartTime = null;
let dataUsed = 0;
let updateInterval = null;

// DOM elements
const connectBtn = document.getElementById('connectBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const nodeInfo = document.getElementById('nodeInfo');
const nodeLocation = document.getElementById('nodeLocation');
const nodeLatency = document.getElementById('nodeLatency');
const nodeReputation = document.getElementById('nodeReputation');
const dataUsedEl = document.getElementById('dataUsed');
const timeConnectedEl = document.getElementById('timeConnected');
const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletAddress = document.getElementById('walletAddress');

// Initialize
chrome.storage.local.get(['isConnected', 'currentNode', 'walletAddress'], (data) => {
  if (data.isConnected) {
    isConnected = true;
    updateUIConnected(data.currentNode);
  }
  
  if (data.walletAddress) {
    updateWalletUI(data.walletAddress);
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
  const wallet = await chrome.storage.local.get(['walletAddress']);
  
  if (wallet.walletAddress) {
    // Disconnect wallet
    chrome.storage.local.remove('walletAddress');
    connectWalletBtn.textContent = 'Connect Wallet';
    walletAddress.style.display = 'none';
  } else {
    // Request wallet connection from background
    chrome.runtime.sendMessage({ action: 'connectWallet' }, (response) => {
      if (response.success) {
        updateWalletUI(response.address);
        chrome.storage.local.set({ walletAddress: response.address });
      } else {
        alert('Failed to connect wallet. Please visit veilpool.io to connect.');
      }
    });
  }
});

async function connect() {
  try {
    // Check if wallet is connected
    const { walletAddress: wallet } = await chrome.storage.local.get(['walletAddress']);
    
    if (!wallet) {
      alert('Please connect your wallet first');
      return;
    }

    connectBtn.textContent = 'Connecting...';
    connectBtn.disabled = true;

    // Send message to background script to establish connection
    chrome.runtime.sendMessage({ 
      action: 'connect',
      wallet 
    }, (response) => {
      if (response.success) {
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
        alert(response.error || 'Connection failed. Please ensure you have a valid privacy pass.');
        connectBtn.textContent = 'Connect';
        connectBtn.disabled = false;
      }
    });
  } catch (error) {
    console.error('Connection error:', error);
    alert('Connection failed: ' + error.message);
    connectBtn.textContent = 'Connect';
    connectBtn.disabled = false;
  }
}

async function disconnect() {
  connectBtn.textContent = 'Disconnecting...';
  connectBtn.disabled = true;

  chrome.runtime.sendMessage({ action: 'disconnect' }, (response) => {
    if (response.success) {
      isConnected = false;
      connectionStartTime = null;
      updateUIDisconnected();
      
      chrome.storage.local.set({ isConnected: false });
      stopTracking();
    }
  });
}

function updateUIConnected(node) {
  statusIndicator.classList.add('connected');
  statusText.textContent = 'Connected to VeilPool';
  connectBtn.textContent = 'Disconnect';
  connectBtn.classList.add('connected');
  connectBtn.disabled = false;
  
  if (node) {
    nodeInfo.classList.add('active');
    nodeLocation.textContent = node.location || 'Unknown';
    nodeLatency.textContent = node.latency ? `${node.latency}ms` : '-';
    nodeReputation.textContent = node.reputation ? `${node.reputation}/100` : '-';
  }
}

function updateUIDisconnected() {
  statusIndicator.classList.remove('connected');
  statusText.textContent = 'Not Connected';
  connectBtn.textContent = 'Connect';
  connectBtn.classList.remove('connected');
  connectBtn.disabled = false;
  nodeInfo.classList.remove('active');
  dataUsedEl.textContent = '0 MB';
  timeConnectedEl.textContent = '0m';
}

function updateWalletUI(address) {
  if (address) {
    connectWalletBtn.textContent = 'Disconnect';
    walletAddress.textContent = address.substring(0, 8) + '...' + address.substring(address.length - 6);
    walletAddress.style.display = 'block';
  }
}

function startTracking() {
  updateInterval = setInterval(() => {
    // Update session time
    if (connectionStartTime) {
      const elapsed = Date.now() - connectionStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        timeConnectedEl.textContent = `${hours}h ${minutes % 60}m`;
      } else {
        timeConnectedEl.textContent = `${minutes}m`;
      }
    }

    // Update data used (simulated - would be tracked by background script)
    chrome.storage.local.get(['dataUsed'], (data) => {
      if (data.dataUsed) {
        const mb = (data.dataUsed / (1024 * 1024)).toFixed(1);
        const gb = (data.dataUsed / (1024 * 1024 * 1024)).toFixed(2);
        
        if (data.dataUsed > 1024 * 1024 * 1024) {
          dataUsedEl.textContent = `${gb} GB`;
        } else {
          dataUsedEl.textContent = `${mb} MB`;
        }
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

// Settings link
document.getElementById('settingsLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://veilpool.io/settings' });
});
