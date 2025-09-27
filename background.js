// Background service worker for saving and loading metronome settings

// Default settings
const defaultSettings = {
  tempo: 120,
  timeSignature: '4/4',
  soundType: 'click',
  volume: 70,
  recentTempos: [60, 80, 100, 120, 140, 160]
};

// Initialize settings on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('metronomeSettings', (result) => {
    if (!result.metronomeSettings) {
      chrome.storage.local.set({ metronomeSettings: defaultSettings });
    }
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveSettings') {
    chrome.storage.local.set({ metronomeSettings: request.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'loadSettings') {
    chrome.storage.local.get('metronomeSettings', (result) => {
      sendResponse({ 
        settings: result.metronomeSettings || defaultSettings 
      });
    });
    return true;
  }
  
  if (request.action === 'saveTapHistory') {
    chrome.storage.local.get('tapHistory', (result) => {
      const history = result.tapHistory || [];
      history.push({
        tempo: request.tempo,
        timestamp: Date.now()
      });
      // Keep only last 20 entries
      const trimmedHistory = history.slice(-20);
      chrome.storage.local.set({ tapHistory: trimmedHistory });
    });
  }
});