import * as cheerio from 'cheerio';

class SearchService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    this.corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      'https://api.codetabs.com/v1/proxy?quest='
    ];
    this.currentProxyIndex = 0;
  }

  getTimeRangeParam(timeRange) {
    const ranges = {
      '1h': 'qdr:h',
      '2h': 'qdr:h2',
      '6h': 'qdr:h6',
      '12h': 'qdr:h12',
      '24h': 'qdr:d',
      '7d': 'qdr:w',
      '30d': 'qdr:m'
    };
    return ranges[timeRange] || 'qdr:h';
  }

  buildGoogleSearchUrl(query, timeRange) {
    const tbs = this.getTimeRangeParam(timeRange);
    const encodedQuery = encodeURIComponent(query);
    return `https://www.google.com/search?q=${encodedQuery}&tbs=${tbs}&tbm=nws&hl=ar`;
  }

  // Get next CORS proxy
  getNextProxy() {
    const proxy = this.corsProxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
    return proxy;
  }

  // Fetch with CORS proxy fallback
  async fetchWithProxy(url, retries = 3) {
    // First try direct fetch
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ar,en;q=0.9'
        }
      });
      if (response.ok) {
        return await response.text();
      }
    } catch (e) {
      console.log('Direct fetch failed, trying proxies...');
    }

    // Try with CORS proxies
    for (let i = 0; i < retries; i++) {
      try {
        const proxy = this.getNextProxy();
        const proxyUrl = proxy + encodeURIComponent(url);
        const response = await fetch(proxyUrl);
        if (response.ok) {
          return await response.text();
        }
      } catch (e) {
        console.log(`Proxy ${i + 1} failed:`, e.message);
      }
    }
    
    throw new Error('فشل في جلب المحتوى من جميع المصادر');
  }

  async searchNews(query, timeRange, excludedDomains = []) {
    const searchUrl = this.buildGoogleSearchUrl(query, timeRange);
    
    return {
      searchUrl,
      query,
      timeRange,
      excludedDomains
    };
  }

  // Get time limit in milliseconds based on time range
  getTimeLimitMs(timeRange) {
    const limits = {
      '1h': 60 * 60 * 1000,           // 1 hour
      '2h': 2 * 60 * 60 * 1000,       // 2 hours
      '6h': 6 * 60 * 60 * 1000,       // 6 hours
      '12h': 12 * 60 * 60 * 1000,     // 12 hours
      '24h': 24 * 60 * 60 * 1000,     // 24 hours
      '7d': 7 * 24 * 60 * 60 * 1000,  // 7 days
      '30d': 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    return limits[timeRange] || limits['24h'];
  }

  // Check if article is within time range
  isWithinTimeRange(pubDate, timeRange) {
    if (!pubDate) return true; // If no date, include it
    
    try {
      const articleDate = new Date(pubDate);
      const now = new Date();
      const timeDiff = now - articleDate;
      const timeLimit = this.getTimeLimitMs(timeRange);
      
      return timeDiff <= timeLimit;
    } catch {
      return true; // If can't parse date, include it
    }
  }

  // Search and fetch results automatically using Google News RSS
  async searchAndFetchNews(query, timeRange, excludedDomains = [], maxResults = 10) {
    const results = [];
    
    try {
      // Use Google News RSS feed for better results
      // Add "when:" parameter for time filtering
      const whenParam = this.getWhenParam(timeRange);
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' ' + whenParam)}&hl=ar&gl=EG&ceid=EG:ar`;
      
      const html = await this.fetchWithProxy(rssUrl);
      const $ = cheerio.load(html, { xmlMode: true });
      
      const allItems = [];
      
      $('item').each((index, element) => {
        const $item = $(element);
        const title = $item.find('title').text().trim();
        const link = $item.find('link').text().trim();
        const pubDate = $item.find('pubDate').text().trim();
        const source = $item.find('source').text().trim();
        const description = $item.find('description').text().trim();
        
        // Check if domain is excluded and within time range
        if (link && !this.isDomainExcluded(link, excludedDomains)) {
          // Filter by time range
          if (this.isWithinTimeRange(pubDate, timeRange)) {
            allItems.push({
              title,
              url: link,
              publishDate: pubDate,
              source,
              snippet: description,
              time: this.formatDate(pubDate),
              timestamp: new Date(pubDate).getTime()
            });
          }
        }
      });
      
      // Sort by date (newest first) and limit results
      allItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      return allItems.slice(0, maxResults);
    } catch (error) {
      console.error('RSS search error:', error);
      // Fallback to returning search URL
      return [];
    }
  }

  // Get Google News "when" parameter for time filtering
  getWhenParam(timeRange) {
    const params = {
      '1h': 'when:1h',
      '2h': 'when:2h',
      '6h': 'when:6h',
      '12h': 'when:12h',
      '24h': 'when:1d',
      '7d': 'when:7d',
      '30d': 'when:30d'
    };
    return params[timeRange] || '';
  }

  formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays < 7) return `منذ ${diffDays} يوم`;
      
      return date.toLocaleDateString('ar-EG');
    } catch {
      return dateStr;
    }
  }

  async extractArticleContent(url) {
    try {
      const html = await this.fetchWithProxy(url);
      const $ = cheerio.load(html);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .ads, .advertisement, .social-share, .comments, .related, .sidebar, iframe, noscript').remove();
      
      // Extract title
      let title = $('h1').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  $('meta[name="title"]').attr('content') ||
                  $('title').text().trim();
      
      // Extract main image
      let image = $('meta[property="og:image"]').attr('content') ||
                  $('meta[name="twitter:image"]').attr('content') ||
                  $('article img').first().attr('src') ||
                  $('.article-image img, .post-image img, .featured-image img, .main-image img').first().attr('src') ||
                  $('img[src*="upload"], img[src*="image"], img[src*="photo"]').first().attr('src');
      
      // Make image URL absolute
      if (image && !image.startsWith('http')) {
        const baseUrl = new URL(url);
        image = new URL(image, baseUrl.origin).href;
      }
      
      // Extract publish date
      let publishDate = $('meta[property="article:published_time"]').attr('content') ||
                        $('meta[name="date"]').attr('content') ||
                        $('time[datetime]').attr('datetime') ||
                        $('[class*="date"], [class*="time"], [class*="publish"]').first().text().trim();
      
      // Extract location/country from content
      let location = this.extractLocation($, html);
      
      // Extract content
      let content = '';
      
      // Try common article selectors
      const articleSelectors = [
        'article',
        '.article-content',
        '.article-body',
        '.post-content',
        '.entry-content',
        '.story-body',
        '.story-content',
        '[itemprop="articleBody"]',
        '.content-body',
        '.news-content',
        '.text-content',
        'main article',
        '.main-content'
      ];
      
      for (const selector of articleSelectors) {
        const element = $(selector);
        if (element.length) {
          content = element.find('p').map((_, el) => $(el).text().trim()).get()
            .filter(p => p.length > 30)
            .join('\n\n');
          if (content.length > 200) break;
        }
      }
      
      // Fallback to all paragraphs
      if (!content || content.length < 200) {
        content = $('p').map((_, el) => $(el).text().trim()).get()
          .filter(p => p.length > 40 && !p.includes('cookie') && !p.includes('privacy'))
          .slice(0, 15)
          .join('\n\n');
      }
      
      // Clean content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      
      // Extract source
      const source = new URL(url).hostname.replace('www.', '');
      
      return {
        url,
        title: this.cleanText(title),
        content: this.cleanText(content),
        image,
        publishDate: this.formatPublishDate(publishDate),
        location,
        source,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Article extraction error:', error);
      throw new Error(`فشل في استخراج المحتوى: ${error.message}`);
    }
  }

  extractLocation($, html) {
    // Common location patterns in Arabic news
    const locationPatterns = [
      /في\s+([\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+)?)/,
      /من\s+([\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+)?)/,
      /بـ?([\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+)?)\s*[-–]/
    ];
    
    // Known countries and cities
    const knownLocations = [
      'مصر', 'القاهرة', 'السعودية', 'الرياض', 'الإمارات', 'دبي', 'أبوظبي',
      'قطر', 'الدوحة', 'الكويت', 'البحرين', 'عمان', 'الأردن', 'عمّان',
      'لبنان', 'بيروت', 'سوريا', 'دمشق', 'العراق', 'بغداد', 'فلسطين',
      'غزة', 'القدس', 'اليمن', 'صنعاء', 'ليبيا', 'طرابلس', 'تونس',
      'الجزائر', 'المغرب', 'السودان', 'إيران', 'طهران', 'تركيا', 'أنقرة',
      'إسطنبول', 'روسيا', 'موسكو', 'أمريكا', 'واشنطن', 'الصين', 'بكين',
      'إسرائيل', 'تل أبيب', 'أوكرانيا', 'كييف', 'أوروبا', 'بريطانيا', 'لندن',
      'فرنسا', 'باريس', 'ألمانيا', 'برلين'
    ];
    
    const text = $('body').text();
    
    for (const location of knownLocations) {
      if (text.includes(location)) {
        return location;
      }
    }
    
    // Try patterns
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const loc = match[1].trim();
        if (knownLocations.some(k => loc.includes(k))) {
          return loc;
        }
      }
    }
    
    return '';
  }

  formatPublishDate(dateStr) {
    if (!dateStr) return new Date().toLocaleDateString('ar-EG');
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/[\r\n]+/g, '\n')
      .replace(/\s+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .trim();
  }

  parseSearchResults(html) {
    const $ = cheerio.load(html);
    const results = [];
    
    // Google News results - multiple selectors for different layouts
    const selectors = [
      'div.SoaBEf', 'div.xuvV6b', 'div.WlydOe', 
      'div.dbsr', 'div.g', 'article'
    ];
    
    $(selectors.join(', ')).each((_, element) => {
      const $el = $(element);
      const link = $el.find('a').first().attr('href');
      const title = $el.find('div.n0jPhd, div.mCBkyc, h3, .title').first().text().trim();
      const snippet = $el.find('div.GI74Re, div.st, .snippet, .description').first().text().trim();
      const source = $el.find('div.CEMjEf span, .NUnG9d span, .source').first().text().trim();
      const time = $el.find('div.OSrXXb span, span.WG9SHc, .time').first().text().trim();
      
      if (link && title && !results.some(r => r.url === link)) {
        let finalUrl = link;
        if (link.startsWith('/url?')) {
          finalUrl = new URLSearchParams(link.split('?')[1]).get('q') || link;
        }
        
        results.push({
          url: finalUrl,
          title,
          snippet,
          source,
          time
        });
      }
    });
    
    return results;
  }

  isDomainExcluded(url, excludedDomains) {
    try {
      const hostname = new URL(url).hostname.replace('www.', '').toLowerCase();
      return excludedDomains.some(domain => 
        hostname.includes(domain.toLowerCase()) || 
        domain.toLowerCase().includes(hostname)
      );
    } catch {
      return false;
    }
  }

  async downloadImage(imageUrl) {
    try {
      // Try direct fetch first
      let response;
      try {
        response = await fetch(imageUrl);
      } catch {
        // Try with proxy
        const proxy = this.getNextProxy();
        response = await fetch(proxy + encodeURIComponent(imageUrl));
      }
      
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Image download error:', error);
      return imageUrl; // Return original URL as fallback
    }
  }

  // Batch process multiple URLs
  async batchExtractArticles(urls, excludedDomains = [], onProgress = null) {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      // Skip excluded domains
      if (this.isDomainExcluded(url, excludedDomains)) {
        continue;
      }
      
      try {
        const article = await this.extractArticleContent(url);
        results.push(article);
        
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: urls.length,
            article,
            status: 'success'
          });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        errors.push({ url, error: error.message });
        
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: urls.length,
            url,
            status: 'error',
            error: error.message
          });
        }
      }
    }
    
    return { results, errors };
  }
}

export const searchService = new SearchService();
export default searchService;
