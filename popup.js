// RT News Intelligence - Extension Popup

class RTNewsExtension {
  constructor() {
    this.queue = [];
    this.settings = {
      apiProvider: 'gemini',
      apiKey: '',
      telegramToken: '',
      telegramChat: ''
    };
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadQueue();
    this.setupEventListeners();
    this.getCurrentPageInfo();
  }

  async loadSettings() {
    const result = await chrome.storage.local.get(['settings']);
    if (result.settings) {
      this.settings = { ...this.settings, ...result.settings };
      document.getElementById('api-provider').value = this.settings.apiProvider;
      document.getElementById('api-key').value = this.settings.apiKey;
      document.getElementById('telegram-token').value = this.settings.telegramToken;
      document.getElementById('telegram-chat').value = this.settings.telegramChat;
    }
  }

  async saveSettings() {
    await chrome.storage.local.set({ settings: this.settings });
  }

  async loadQueue() {
    const result = await chrome.storage.local.get(['queue']);
    if (result.queue) {
      this.queue = result.queue;
      this.renderQueue();
    }
  }

  async saveQueue() {
    await chrome.storage.local.set({ queue: this.queue });
    this.renderQueue();
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Extract button
    document.getElementById('extract-btn').addEventListener('click', () => this.extractContent());

    // Rewrite button
    document.getElementById('rewrite-btn').addEventListener('click', () => this.rewriteContent());

    // Add to queue button
    document.getElementById('add-queue-btn').addEventListener('click', () => this.addToQueue());

    // Publish all button
    document.getElementById('publish-all-btn').addEventListener('click', () => this.publishAll());

    // Save API settings
    document.getElementById('save-api-btn').addEventListener('click', () => {
      this.settings.apiProvider = document.getElementById('api-provider').value;
      this.settings.apiKey = document.getElementById('api-key').value;
      this.saveSettings();
      this.showStatus('تم حفظ إعدادات API', 'success');
    });

    // Save Telegram settings
    document.getElementById('save-telegram-btn').addEventListener('click', () => {
      this.settings.telegramToken = document.getElementById('telegram-token').value;
      this.settings.telegramChat = document.getElementById('telegram-chat').value;
      this.saveSettings();
      this.showStatus('تم حفظ إعدادات Telegram', 'success');
    });

    // Test Telegram
    document.getElementById('test-telegram-btn').addEventListener('click', () => this.testTelegram());
  }

  switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
  }

  async getCurrentPageInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      document.getElementById('page-title').textContent = tab.title || 'بدون عنوان';
      document.getElementById('page-url').textContent = tab.url;
    } catch (error) {
      console.error('Error getting page info:', error);
    }
  }

  async extractContent() {
    this.showLoading(true);
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageContent
      });

      const content = results[0]?.result;
      
      if (content) {
        document.getElementById('news-title').value = content.title;
        document.getElementById('news-description').value = content.description;
        document.getElementById('news-content').value = content.content;
        
        if (content.image) {
          document.getElementById('news-image').src = content.image;
          document.getElementById('news-image-container').classList.remove('hidden');
        }
        
        document.getElementById('extracted-content').classList.remove('hidden');
        this.showStatus('تم استخراج المحتوى بنجاح', 'success');
      } else {
        this.showStatus('فشل استخراج المحتوى', 'error');
      }
    } catch (error) {
      console.error('Extract error:', error);
      this.showStatus('حدث خطأ أثناء الاستخراج', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async rewriteContent() {
    if (!this.settings.apiKey) {
      this.showStatus('الرجاء إدخال مفتاح API أولاً', 'error');
      return;
    }

    this.showLoading(true);

    try {
      const title = document.getElementById('news-title').value;
      const content = document.getElementById('news-content').value;

      const rewritten = await this.callAI(title, content);

      if (rewritten) {
        document.getElementById('news-title').value = rewritten.title;
        document.getElementById('news-description').value = rewritten.description;
        document.getElementById('news-content').value = rewritten.content;
        this.showStatus('تمت إعادة الصياغة بنجاح', 'success');
      }
    } catch (error) {
      console.error('Rewrite error:', error);
      this.showStatus('فشل إعادة الصياغة: ' + error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async callAI(title, content) {
    const prompt = `أنت كاتب أخبار محترف. أعد صياغة الخبر التالي بأسلوب جذاب ومثير:

العنوان الأصلي: ${title}
المحتوى الأصلي: ${content}

المطلوب:
1. عنوان جديد ناري وجذاب يبدأ بكلمة "عاجل" مع تهويل مقبول
2. وصف قصير مثير (سطرين)
3. محتوى معاد صياغته بأسلوب شيق

أجب بالتنسيق:
العنوان: [العنوان]
الوصف: [الوصف]
المحتوى: [المحتوى]`;

    if (this.settings.apiProvider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.settings.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (text) {
        return this.parseRewrittenNews(text);
      }
      throw new Error('No response from API');
    } else if (this.settings.apiProvider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2048
        })
      });

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      
      if (text) {
        return this.parseRewrittenNews(text);
      }
      throw new Error('No response from API');
    }

    throw new Error('Unsupported API provider');
  }

  parseRewrittenNews(text) {
    const lines = text.split('\n').filter(l => l.trim());
    let title = '', description = '', content = '';
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('العنوان:')) {
        title = line.replace('العنوان:', '').trim();
        currentSection = 'title';
      } else if (line.startsWith('الوصف:')) {
        description = line.replace('الوصف:', '').trim();
        currentSection = 'description';
      } else if (line.startsWith('المحتوى:')) {
        content = line.replace('المحتوى:', '').trim();
        currentSection = 'content';
      } else if (currentSection === 'content') {
        content += '\n' + line;
      }
    }

    return { title, description, content };
  }

  addToQueue() {
    const item = {
      id: Date.now(),
      title: document.getElementById('news-title').value,
      description: document.getElementById('news-description').value,
      content: document.getElementById('news-content').value,
      image: document.getElementById('news-image').src || null,
      createdAt: new Date().toISOString()
    };

    this.queue.push(item);
    this.saveQueue();
    this.showStatus('تمت الإضافة إلى قائمة النشر', 'success');
    
    // Clear form
    document.getElementById('extracted-content').classList.add('hidden');
    document.getElementById('news-title').value = '';
    document.getElementById('news-description').value = '';
    document.getElementById('news-content').value = '';
  }

  renderQueue() {
    const container = document.getElementById('queue-list');
    const countBadge = document.getElementById('queue-count');
    const publishBtn = document.getElementById('publish-all-btn');

    countBadge.textContent = this.queue.length;
    publishBtn.disabled = this.queue.length === 0;

    if (this.queue.length === 0) {
      container.innerHTML = '<p class="empty-state">لا توجد منشورات في القائمة</p>';
      return;
    }

    container.innerHTML = this.queue.map(item => `
      <div class="queue-item" data-id="${item.id}">
        <h4>${item.title.substring(0, 50)}...</h4>
        <p>${new Date(item.createdAt).toLocaleString('ar-EG')}</p>
        <div class="actions">
          <button class="btn btn-outline" onclick="extension.publishItem(${item.id})">
            <span class="btn-icon">📤</span> نشر
          </button>
          <button class="btn btn-outline" onclick="extension.removeFromQueue(${item.id})">
            <span class="btn-icon">🗑️</span> حذف
          </button>
        </div>
      </div>
    `).join('');
  }

  removeFromQueue(id) {
    this.queue = this.queue.filter(item => item.id !== id);
    this.saveQueue();
    this.showStatus('تم الحذف من القائمة', 'success');
  }

  async publishItem(id) {
    const item = this.queue.find(i => i.id === id);
    if (!item) return;

    if (!this.settings.telegramToken || !this.settings.telegramChat) {
      this.showStatus('الرجاء إعداد حساب Telegram أولاً', 'error');
      return;
    }

    this.showLoading(true);

    try {
      await this.publishToTelegram(item);
      this.removeFromQueue(id);
      this.showStatus('تم النشر بنجاح', 'success');
    } catch (error) {
      this.showStatus('فشل النشر: ' + error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async publishAll() {
    if (this.queue.length === 0) return;

    this.showLoading(true);
    let published = 0;

    for (const item of [...this.queue]) {
      try {
        await this.publishToTelegram(item);
        this.queue = this.queue.filter(i => i.id !== item.id);
        published++;
        await new Promise(r => setTimeout(r, 2000)); // Delay between posts
      } catch (error) {
        console.error('Publish error:', error);
      }
    }

    this.saveQueue();
    this.showLoading(false);
    this.showStatus(`تم نشر ${published} منشور`, 'success');
  }

  async publishToTelegram(item) {
    const text = `<b>${item.title}</b>\n\n${item.description}\n\n${item.content}`;
    
    let endpoint, body;
    
    if (item.image) {
      endpoint = `https://api.telegram.org/bot${this.settings.telegramToken}/sendPhoto`;
      body = {
        chat_id: this.settings.telegramChat,
        photo: item.image,
        caption: text.substring(0, 1024),
        parse_mode: 'HTML'
      };
    } else {
      endpoint = `https://api.telegram.org/bot${this.settings.telegramToken}/sendMessage`;
      body = {
        chat_id: this.settings.telegramChat,
        text: text.substring(0, 4096),
        parse_mode: 'HTML'
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.description || 'Telegram error');
    }

    return data;
  }

  async testTelegram() {
    if (!this.settings.telegramToken || !this.settings.telegramChat) {
      this.showStatus('الرجاء إدخال بيانات Telegram', 'error');
      return;
    }

    this.showLoading(true);

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.settings.telegramToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.settings.telegramChat,
            text: '✅ تم الاتصال بنجاح! - RT News Intelligence'
          })
        }
      );

      const data = await response.json();
      
      if (data.ok) {
        this.showStatus('تم الاتصال بنجاح', 'success');
      } else {
        this.showStatus('فشل الاتصال: ' + data.description, 'error');
      }
    } catch (error) {
      this.showStatus('خطأ: ' + error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
  }

  showStatus(message, type = 'info') {
    const statusBar = document.getElementById('status-bar');
    const statusMessage = document.getElementById('status-message');
    
    statusBar.className = `status-bar ${type}`;
    statusMessage.textContent = message;
    statusBar.classList.remove('hidden');

    setTimeout(() => {
      statusBar.classList.add('hidden');
    }, 3000);
  }
}

// Content extraction function (runs in page context)
function extractPageContent() {
  // Remove unwanted elements
  const unwanted = document.querySelectorAll('script, style, nav, header, footer, aside, .ads, .advertisement');
  
  // Get title
  const title = document.querySelector('h1')?.textContent?.trim() ||
                document.querySelector('meta[property="og:title"]')?.content ||
                document.title;

  // Get description
  const description = document.querySelector('meta[property="og:description"]')?.content ||
                      document.querySelector('meta[name="description"]')?.content ||
                      '';

  // Get main image
  const image = document.querySelector('meta[property="og:image"]')?.content ||
                document.querySelector('article img')?.src ||
                document.querySelector('.article-image img, .post-image img')?.src;

  // Get content
  let content = '';
  const articleSelectors = [
    'article',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.story-body',
    '[itemprop="articleBody"]',
    'main'
  ];

  for (const selector of articleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const paragraphs = element.querySelectorAll('p');
      content = Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(t => t.length > 30)
        .join('\n\n');
      if (content.length > 100) break;
    }
  }

  // Fallback
  if (!content || content.length < 100) {
    const allParagraphs = document.querySelectorAll('p');
    content = Array.from(allParagraphs)
      .map(p => p.textContent.trim())
      .filter(t => t.length > 50)
      .slice(0, 10)
      .join('\n\n');
  }

  return { title, description, content, image };
}

// Initialize extension
const extension = new RTNewsExtension();
