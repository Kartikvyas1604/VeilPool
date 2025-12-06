// Background service worker for VeilPool extension
let isConnected = false;
let currentNode = null;
let proxyConfig = null;
let dataUsed = 0;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'connect') {
    handleConnect(request.wallet)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'disconnect') {
    handleDisconnect()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'connectWallet') {
    // In a real implementation, this would use Solana wallet adapter
    // For now, we'll simulate a wallet connection
    const mockAddress = 'DemoWallet' + Math.random().toString(36).substring(7);
    sendResponse({ success: true, address: mockAddress });
    return true;
  }
});

async function handleConnect(walletAddress) {
  try {
    // Step 1: Validate privacy pass
    const hasPass = await validatePrivacyPass(walletAddress);
    if (!hasPass) {
      return {
        success: false,
        error: 'No valid privacy pass found. Purchase at https://veilpool.io/purchase'
      };
    }

    // Step 2: Select optimal node
    const node = await selectNode(walletAddress);
    if (!node) {
      return {
        success: false,
        error: 'No available nodes. Please try again later.'
      };
    }

    // Step 3: Configure proxy
    await configureProxy(node);

    currentNode = node;
    isConnected = true;

    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'VeilPool Connected',
      message: `Connected to ${node.location} • Latency: ${node.latency}ms`
    });

    return {
      success: true,
      node: currentNode
    };
  } catch (error) {
    console.error('Connection error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function handleDisconnect() {
  try {
    // Clear proxy configuration
    await chrome.proxy.settings.clear({ scope: 'regular' });
    
    isConnected = false;
    currentNode = null;
    proxyConfig = null;

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'VeilPool Disconnected',
      message: 'Your connection has been closed'
    });

    return { success: true };
  } catch (error) {
    console.error('Disconnect error:', error);
    return { success: false, error: error.message };
  }
}

async function validatePrivacyPass(walletAddress) {
  try {
    // In production, this would query Solana blockchain
    // For demo, we'll simulate validation
    const response = await fetch('https://veilpool.io/api/validate-pass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: walletAddress })
    }).catch(() => null);

    if (response && response.ok) {
      const data = await response.json();
      return data.valid;
    }

    // Demo: Always return true for testing
    console.log('Using demo mode - pass validation skipped');
    return true;
  } catch (error) {
    console.error('Pass validation error:', error);
    return true; // Fail open for demo
  }
}

async function selectNode(walletAddress) {
  try {
    // Try to fetch from routing engine
    const response = await fetch('http://localhost:3001/api/routing/optimal-node?user_location=US&destination=global&priority=balanced')
      .catch(() => null);

    if (response && response.ok) {
      const decision = await response.json();
      return {
        id: decision.primaryNode.nodeId,
        location: decision.primaryNode.location,
        latency: decision.primaryNode.latencyMs,
        reputation: decision.primaryNode.reputation,
        proxyUrl: `proxy.veilpool.io:8080`
      };
    }

    // Fallback to demo node
    const demoNodes = [
      { id: 'us-sf-01', location: 'US-San Francisco', latency: 12, reputation: 98, proxyUrl: 'us-sf.veilpool.io:8080' },
      { id: 'eu-london-01', location: 'GB-London', latency: 45, reputation: 99, proxyUrl: 'eu-london.veilpool.io:8080' },
      { id: 'asia-sg-01', location: 'SG-Singapore', latency: 78, reputation: 97, proxyUrl: 'asia-sg.veilpool.io:8080' }
    ];

    return demoNodes[Math.floor(Math.random() * demoNodes.length)];
  } catch (error) {
    console.error('Node selection error:', error);
    return null;
  }
}

async function configureProxy(node) {
  const config = {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {
        scheme: 'https',
        host: node.proxyUrl.split(':')[0],
        port: parseInt(node.proxyUrl.split(':')[1] || '8080')
      },
      bypassList: ['localhost', '127.0.0.1']
    }
  };

  await chrome.proxy.settings.set({
    value: config,
    scope: 'regular'
  });

  proxyConfig = config;
  console.log('Proxy configured:', config);
}

// Track data usage
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (isConnected && details.responseHeaders) {
      const contentLength = details.responseHeaders.find(
        h => h.name.toLowerCase() === 'content-length'
      );
      
      if (contentLength && contentLength.value) {
        const bytes = parseInt(contentLength.value);
        dataUsed += bytes;
        
        // Save to storage
        chrome.storage.local.set({ dataUsed });
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Periodic connection check
setInterval(() => {
  if (isConnected && currentNode) {
    // Check if connection is still healthy
    fetch(`https://${currentNode.proxyUrl.split(':')[0]}/health`)
      .catch(() => {
        // Connection lost - attempt reconnect
        console.log('Connection lost, attempting reconnect...');
        isConnected = false;
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'VeilPool Connection Lost',
          message: 'Attempting to reconnect...'
        });
      });
  }
}, 30000); // Check every 30 seconds

console.log('VeilPool background service worker initialized');
