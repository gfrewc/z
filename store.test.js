import { describe, it, expect, beforeEach } from 'vitest';
import useStore from '../store/useStore';

describe('Store Tests', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStore.setState({
      theme: 'cyber',
      fontSize: 'md',
      apiKeys: { gemini: [], groq: [], huggingface: [] },
      activeKeyIndex: { gemini: 0, groq: 0, huggingface: 0 },
      newsArchive: [],
      publishQueue: [],
      socialAccounts: { twitter: [], facebook: [], telegram: [] },
      notifications: [],
      excludedDomains: []
    });
  });

  describe('Theme Settings', () => {
    it('should set theme correctly', () => {
      const { setTheme } = useStore.getState();
      setTheme('fire');
      expect(useStore.getState().theme).toBe('fire');
    });

    it('should set font size correctly', () => {
      const { setFontSize } = useStore.getState();
      setFontSize('xl');
      expect(useStore.getState().fontSize).toBe('xl');
    });
  });

  describe('API Keys Management', () => {
    it('should add API key', () => {
      const { addApiKey } = useStore.getState();
      addApiKey('gemini', 'test-key-123', 'Test Key');
      
      const keys = useStore.getState().apiKeys.gemini;
      expect(keys).toHaveLength(1);
      expect(keys[0].key).toBe('test-key-123');
      expect(keys[0].name).toBe('Test Key');
    });

    it('should remove API key', () => {
      const { addApiKey, removeApiKey } = useStore.getState();
      addApiKey('gemini', 'test-key-123', 'Test Key');
      
      const keyId = useStore.getState().apiKeys.gemini[0].id;
      removeApiKey('gemini', keyId);
      
      expect(useStore.getState().apiKeys.gemini).toHaveLength(0);
    });

    it('should rotate API key', () => {
      const { addApiKey, rotateApiKey } = useStore.getState();
      addApiKey('gemini', 'key-1', 'Key 1');
      addApiKey('gemini', 'key-2', 'Key 2');
      
      expect(useStore.getState().activeKeyIndex.gemini).toBe(0);
      
      rotateApiKey('gemini');
      expect(useStore.getState().activeKeyIndex.gemini).toBe(1);
      
      rotateApiKey('gemini');
      expect(useStore.getState().activeKeyIndex.gemini).toBe(0);
    });
  });

  describe('News Archive', () => {
    it('should add news to archive', () => {
      const { addToArchive } = useStore.getState();
      addToArchive({
        title: 'Test News',
        content: 'Test content',
        source: 'test.com'
      });
      
      const archive = useStore.getState().newsArchive;
      expect(archive).toHaveLength(1);
      expect(archive[0].title).toBe('Test News');
    });

    it('should detect duplicate news', () => {
      const { addToArchive, isNewsDuplicate } = useStore.getState();
      addToArchive({
        title: 'Breaking News About Technology',
        content: 'This is a test content about technology news',
        source: 'test.com'
      });
      
      // Same title should be detected as duplicate
      expect(isNewsDuplicate('Breaking News About Technology', 'Different content')).toBe(true);
      
      // Different title should not be duplicate
      expect(isNewsDuplicate('Completely Different Title', 'Different content')).toBe(false);
    });

    it('should clear archive', () => {
      const { addToArchive, clearArchive } = useStore.getState();
      addToArchive({ title: 'Test 1', content: 'Content 1', source: 'test.com' });
      addToArchive({ title: 'Test 2', content: 'Content 2', source: 'test.com' });
      
      clearArchive();
      expect(useStore.getState().newsArchive).toHaveLength(0);
    });
  });

  describe('Publish Queue', () => {
    it('should add post to queue', () => {
      const { addToPublishQueue } = useStore.getState();
      addToPublishQueue({
        title: 'Test Post',
        description: 'Test description',
        content: 'Test content'
      });
      
      const queue = useStore.getState().publishQueue;
      expect(queue).toHaveLength(1);
      expect(queue[0].title).toBe('Test Post');
      expect(queue[0].status).toBe('pending');
    });

    it('should remove post from queue', () => {
      const { addToPublishQueue, removeFromPublishQueue } = useStore.getState();
      addToPublishQueue({ title: 'Test Post', description: 'Test', content: 'Test' });
      
      const postId = useStore.getState().publishQueue[0].id;
      removeFromPublishQueue(postId);
      
      expect(useStore.getState().publishQueue).toHaveLength(0);
    });

    it('should update post status', () => {
      const { addToPublishQueue, updatePostStatus } = useStore.getState();
      addToPublishQueue({ title: 'Test Post', description: 'Test', content: 'Test' });
      
      const postId = useStore.getState().publishQueue[0].id;
      updatePostStatus(postId, 'published');
      
      expect(useStore.getState().publishQueue[0].status).toBe('published');
    });

    it('should set publish interval', () => {
      const { setPublishInterval } = useStore.getState();
      setPublishInterval(10);
      expect(useStore.getState().publishInterval).toBe(10);
    });
  });

  describe('Social Accounts', () => {
    it('should add social account', () => {
      const { addSocialAccount } = useStore.getState();
      addSocialAccount('telegram', {
        name: 'Test Bot',
        botToken: 'test-token',
        chatId: '123456'
      });
      
      const accounts = useStore.getState().socialAccounts.telegram;
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('Test Bot');
    });

    it('should remove social account', () => {
      const { addSocialAccount, removeSocialAccount } = useStore.getState();
      addSocialAccount('telegram', { name: 'Test Bot', botToken: 'test', chatId: '123' });
      
      const accountId = useStore.getState().socialAccounts.telegram[0].id;
      removeSocialAccount('telegram', accountId);
      
      expect(useStore.getState().socialAccounts.telegram).toHaveLength(0);
    });
  });

  describe('Excluded Domains', () => {
    it('should add excluded domain', () => {
      const { addExcludedDomain } = useStore.getState();
      addExcludedDomain('spam.com');
      
      expect(useStore.getState().excludedDomains).toContain('spam.com');
    });

    it('should remove excluded domain', () => {
      const { addExcludedDomain, removeExcludedDomain } = useStore.getState();
      addExcludedDomain('spam.com');
      removeExcludedDomain('spam.com');
      
      expect(useStore.getState().excludedDomains).not.toContain('spam.com');
    });
  });

  describe('Notifications', () => {
    it('should add notification', () => {
      const { addNotification } = useStore.getState();
      addNotification({ type: 'success', message: 'Test notification' });
      
      const notifications = useStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Test notification');
    });

    it('should remove notification', () => {
      const { addNotification, removeNotification } = useStore.getState();
      addNotification({ type: 'success', message: 'Test' });
      
      const notifId = useStore.getState().notifications[0].id;
      removeNotification(notifId);
      
      expect(useStore.getState().notifications).toHaveLength(0);
    });

    it('should clear all notifications', () => {
      const { addNotification, clearNotifications } = useStore.getState();
      addNotification({ type: 'success', message: 'Test 1' });
      addNotification({ type: 'error', message: 'Test 2' });
      
      clearNotifications();
      expect(useStore.getState().notifications).toHaveLength(0);
    });
  });
});
