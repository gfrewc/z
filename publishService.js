class PublishService {
  constructor() {
    this.publishInterval = null;
    this.isRunning = false;
  }

  // Twitter/X Publishing
  async publishToTwitter(account, post) {
    try {
      // Twitter API v2 implementation
      const { apiKey, apiSecret, accessToken, accessSecret } = account;
      
      // For now, return a mock response
      // In production, implement OAuth 1.0a signing and API call
      console.log('Publishing to Twitter:', post.title);
      
      return {
        success: true,
        platform: 'twitter',
        postId: `tw_${Date.now()}`,
        url: `https://twitter.com/status/${Date.now()}`
      };
    } catch (error) {
      console.error('Twitter publish error:', error);
      return { success: false, error: error.message };
    }
  }

  // Facebook Publishing
  async publishToFacebook(account, post) {
    try {
      const { accessToken, pageId, type } = account;
      
      let endpoint;
      if (type === 'page') {
        endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
      } else if (type === 'group') {
        endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
      }

      const formData = new FormData();
      formData.append('message', `${post.title}\n\n${post.description}\n\n${post.content}`);
      formData.append('access_token', accessToken);
      
      if (post.image) {
        formData.append('link', post.image);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.id) {
        return {
          success: true,
          platform: 'facebook',
          postId: data.id,
          url: `https://facebook.com/${data.id}`
        };
      }
      
      return { success: false, error: data.error?.message || 'Unknown error' };
    } catch (error) {
      console.error('Facebook publish error:', error);
      return { success: false, error: error.message };
    }
  }

  // Telegram Publishing
  async publishToTelegram(account, post) {
    try {
      const { botToken, chatId } = account;
      
      const text = `<b>${post.title}</b>\n\n${post.description}\n\n${post.content}`;
      
      let endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
      let body = {
        chat_id: chatId,
        text: text.substring(0, 4096), // Telegram limit
        parse_mode: 'HTML'
      };

      // If there's an image, send photo with caption
      if (post.image) {
        endpoint = `https://api.telegram.org/bot${botToken}/sendPhoto`;
        body = {
          chat_id: chatId,
          photo: post.image,
          caption: text.substring(0, 1024), // Caption limit
          parse_mode: 'HTML'
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      if (data.ok) {
        return {
          success: true,
          platform: 'telegram',
          postId: data.result.message_id,
          url: `https://t.me/c/${chatId}/${data.result.message_id}`
        };
      }
      
      return { success: false, error: data.description || 'Unknown error' };
    } catch (error) {
      console.error('Telegram publish error:', error);
      return { success: false, error: error.message };
    }
  }

  async publishPost(post, accounts) {
    const results = [];
    
    for (const account of accounts) {
      let result;
      
      switch (account.platform) {
        case 'twitter':
          result = await this.publishToTwitter(account, post);
          break;
        case 'facebook':
          result = await this.publishToFacebook(account, post);
          break;
        case 'telegram':
          result = await this.publishToTelegram(account, post);
          break;
        default:
          result = { success: false, error: 'Unknown platform' };
      }
      
      results.push({ ...result, accountId: account.id });
    }
    
    return results;
  }

  startScheduledPublishing(queue, accounts, interval, onPublish, onComplete) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    let currentIndex = 0;
    
    const publishNext = async () => {
      if (!this.isRunning || currentIndex >= queue.length) {
        this.stopScheduledPublishing();
        if (onComplete) onComplete();
        return;
      }
      
      const post = queue[currentIndex];
      if (post.status === 'pending') {
        const results = await this.publishPost(post, accounts);
        if (onPublish) onPublish(post.id, results);
      }
      
      currentIndex++;
    };
    
    // Publish first immediately
    publishNext();
    
    // Then schedule the rest
    this.publishInterval = setInterval(publishNext, interval * 60 * 1000);
  }

  stopScheduledPublishing() {
    this.isRunning = false;
    if (this.publishInterval) {
      clearInterval(this.publishInterval);
      this.publishInterval = null;
    }
  }

  async testTelegramBot(botToken, chatId) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '✅ تم الاتصال بنجاح! - RT News Intelligence'
          })
        }
      );
      
      const data = await response.json();
      return { success: data.ok, message: data.ok ? 'تم الاتصال بنجاح' : data.description };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async testFacebookPage(accessToken, pageId) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?access_token=${accessToken}`
      );
      
      const data = await response.json();
      
      if (data.id) {
        return { success: true, message: `تم الاتصال بالصفحة: ${data.name}` };
      }
      
      return { success: false, message: data.error?.message || 'فشل الاتصال' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

export const publishService = new PublishService();
export default publishService;
