// RT News Intelligence - Content Script

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    const content = extractPageContent();
    sendResponse(content);
  }
  return true;
});

function extractPageContent() {
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

  // Get publish date
  const publishDate = document.querySelector('meta[property="article:published_time"]')?.content ||
                      document.querySelector('time[datetime]')?.getAttribute('datetime') ||
                      '';

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

  return {
    title,
    description,
    content,
    image,
    publishDate,
    url: window.location.href,
    source: window.location.hostname
  };
}

// Add floating button for quick extraction
function addFloatingButton() {
  const button = document.createElement('div');
  button.id = 'rt-news-float-btn';
  button.innerHTML = '⚡';
  button.title = 'RT News - استخراج الخبر';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #00f3ff, #ff00ff);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    z-index: 999999;
    box-shadow: 0 0 20px rgba(0, 243, 255, 0.5);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 0 30px rgba(0, 243, 255, 0.7)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 0 20px rgba(0, 243, 255, 0.5)';
  });

  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });

  document.body.appendChild(button);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addFloatingButton);
} else {
  addFloatingButton();
}
