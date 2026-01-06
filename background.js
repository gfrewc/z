// RT News Intelligence - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('RT News Intelligence extension installed');
  
  // Initialize storage
  chrome.storage.local.get(['settings', 'queue'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          apiProvider: 'gemini',
          apiKey: '',
          telegramToken: '',
          telegramChat: ''
        }
      });
    }
    if (!result.queue) {
      chrome.storage.local.set({ queue: [] });
    }
  });
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    // Forward to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'extract' }, sendResponse);
    });
    return true;
  }
  
  if (request.action === 'getQueue') {
    chrome.storage.local.get(['queue'], (result) => {
      sendResponse(result.queue || []);
    });
    return true;
  }
  
  if (request.action === 'addToQueue') {
    chrome.storage.local.get(['queue'], (result) => {
      const queue = result.queue || [];
      queue.push(request.item);
      chrome.storage.local.set({ queue }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

// Context menu for quick extraction
chrome.contextMenus?.create({
  id: 'rt-news-extract',
  title: 'استخراج الخبر - RT News',
  contexts: ['page', 'selection']
});

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'rt-news-extract') {
    chrome.action.openPopup();
  }
});
