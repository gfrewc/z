import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// Helper function to calculate text similarity
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

const useStore = create(
  persist(
    (set, get) => ({
      // Theme & UI Settings
      theme: 'cyber', // cyber, fire, matrix, galaxy
      fontSize: 'md', // sm, md, lg, xl, 2xl
      sidebarOpen: true,
      
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // API Keys Management
      apiKeys: {
        gemini: [],
        groq: [],
        huggingface: []
      },
      activeKeyIndex: {
        gemini: 0,
        groq: 0,
        huggingface: 0
      },
      availableModels: {
        gemini: ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro'],
        groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
        huggingface: ['meta-llama/Llama-3.2-3B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3']
      },
      selectedModel: {
        gemini: 'gemini-2.0-flash-exp',
        groq: 'llama-3.3-70b-versatile',
        huggingface: 'meta-llama/Llama-3.2-3B-Instruct'
      },
      activeProvider: 'gemini',

      addApiKey: (provider, key, name = '') => set((state) => ({
        apiKeys: {
          ...state.apiKeys,
          [provider]: [...state.apiKeys[provider], { id: uuidv4(), key, name, usageCount: 0, lastUsed: null, isActive: true }]
        }
      })),

      removeApiKey: (provider, id) => set((state) => ({
        apiKeys: {
          ...state.apiKeys,
          [provider]: state.apiKeys[provider].filter(k => k.id !== id)
        }
      })),

      updateApiKeyUsage: (provider, id) => set((state) => ({
        apiKeys: {
          ...state.apiKeys,
          [provider]: state.apiKeys[provider].map(k => 
            k.id === id ? { ...k, usageCount: k.usageCount + 1, lastUsed: new Date().toISOString() } : k
          )
        }
      })),

      rotateApiKey: (provider) => set((state) => {
        const keys = state.apiKeys[provider];
        if (keys.length <= 1) return state;
        const nextIndex = (state.activeKeyIndex[provider] + 1) % keys.length;
        return {
          activeKeyIndex: {
            ...state.activeKeyIndex,
            [provider]: nextIndex
          }
        };
      }),

      setActiveProvider: (provider) => set({ activeProvider: provider }),
      
      setSelectedModel: (provider, model) => set((state) => ({
        selectedModel: {
          ...state.selectedModel,
          [provider]: model
        }
      })),

      updateAvailableModels: (provider, models) => set((state) => ({
        availableModels: {
          ...state.availableModels,
          [provider]: models
        }
      })),

      getActiveApiKey: () => {
        const state = get();
        const provider = state.activeProvider;
        const keys = state.apiKeys[provider];
        const index = state.activeKeyIndex[provider];
        return keys[index]?.key || null;
      },

      // Search Settings
      searchQuery: '',
      searchTimeRange: '1h', // 1h, 2h, 6h, 12h, 24h
      searchResults: [],
      isSearching: false,
      processedUrls: [],
      excludedDomains: [],
      // حفظ نتائج البحث والأخبار المعالجة
      foundResults: [],
      processedNews: [],
      autoAddToQueue: true,
      maxResults: 10,

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchTimeRange: (range) => set({ searchTimeRange: range }),
      setSearchResults: (results) => set({ searchResults: results }),
      setIsSearching: (isSearching) => set({ isSearching }),
      addProcessedUrl: (url) => set((state) => ({ processedUrls: [...state.processedUrls, url] })),
      clearProcessedUrls: () => set({ processedUrls: [] }),
      addExcludedDomain: (domain) => set((state) => ({ excludedDomains: [...state.excludedDomains, domain] })),
      removeExcludedDomain: (domain) => set((state) => ({ excludedDomains: state.excludedDomains.filter(d => d !== domain) })),
      
      // حفظ نتائج البحث
      setFoundResults: (results) => set({ foundResults: results }),
      clearFoundResults: () => set({ foundResults: [] }),
      
      // حفظ الأخبار المعالجة
      setProcessedNews: (news) => set({ processedNews: news }),
      addProcessedNews: (news) => set((state) => ({ processedNews: [...state.processedNews, news] })),
      clearProcessedNews: () => set({ processedNews: [] }),
      
      // إعدادات البحث
      setAutoAddToQueue: (value) => set({ autoAddToQueue: value }),
      setMaxResults: (value) => set({ maxResults: value }),

      // News Archive (for duplicate detection)
      newsArchive: [],
      
      addToArchive: (news) => set((state) => ({
        newsArchive: [...state.newsArchive, { ...news, archivedAt: new Date().toISOString() }]
      })),

      isNewsDuplicate: (title, content) => {
        const state = get();
        const normalizeText = (text) => text.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').trim();
        const normalizedTitle = normalizeText(title);
        const normalizedContent = normalizeText(content.substring(0, 200));
        
        return state.newsArchive.some(archived => {
          const archivedTitle = normalizeText(archived.title);
          const archivedContent = normalizeText((archived.content || '').substring(0, 200));
          
          // Check title similarity (>80% match)
          const titleSimilarity = calculateSimilarity(normalizedTitle, archivedTitle);
          if (titleSimilarity > 0.8) return true;
          
          // Check content similarity (>70% match)
          const contentSimilarity = calculateSimilarity(normalizedContent, archivedContent);
          if (contentSimilarity > 0.7) return true;
          
          return false;
        });
      },

      clearArchive: () => set({ newsArchive: [] }),

      // Publishing Queue
      publishQueue: [],
      publishInterval: 5, // minutes
      isPublishing: false,
      lastPublishTime: null,

      addToPublishQueue: (post) => set((state) => ({
        publishQueue: [...state.publishQueue, { 
          ...post, 
          id: uuidv4(), 
          status: 'pending',
          createdAt: new Date().toISOString(),
          scheduledAt: null
        }]
      })),

      removeFromPublishQueue: (id) => set((state) => ({
        publishQueue: state.publishQueue.filter(p => p.id !== id)
      })),

      updatePostStatus: (id, status) => set((state) => ({
        publishQueue: state.publishQueue.map(p => 
          p.id === id ? { ...p, status, publishedAt: status === 'published' ? new Date().toISOString() : p.publishedAt } : p
        )
      })),

      updatePost: (id, updates) => set((state) => ({
        publishQueue: state.publishQueue.map(p => 
          p.id === id ? { ...p, ...updates } : p
        )
      })),

      setPublishInterval: (interval) => set({ publishInterval: interval }),
      setIsPublishing: (isPublishing) => set({ isPublishing }),
      setLastPublishTime: (time) => set({ lastPublishTime: time }),

      reorderPublishQueue: (fromIndex, toIndex) => set((state) => {
        const newQueue = [...state.publishQueue];
        const [removed] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, removed);
        return { publishQueue: newQueue };
      }),

      publishImmediately: () => {
        const state = get();
        const pendingPosts = state.publishQueue.filter(p => p.status === 'pending');
        if (pendingPosts.length > 0) {
          set((state) => ({
            publishQueue: state.publishQueue.map(p => 
              p.status === 'pending' ? { ...p, status: 'publishing' } : p
            )
          }));
        }
      },

      // Social Media Accounts
      socialAccounts: {
        twitter: [],
        facebook: [],
        telegram: []
      },

      addSocialAccount: (platform, account) => set((state) => ({
        socialAccounts: {
          ...state.socialAccounts,
          [platform]: [...state.socialAccounts[platform], { ...account, id: uuidv4() }]
        }
      })),

      removeSocialAccount: (platform, id) => set((state) => ({
        socialAccounts: {
          ...state.socialAccounts,
          [platform]: state.socialAccounts[platform].filter(a => a.id !== id)
        }
      })),

      updateSocialAccount: (platform, id, updates) => set((state) => ({
        socialAccounts: {
          ...state.socialAccounts,
          [platform]: state.socialAccounts[platform].map(a => 
            a.id === id ? { ...a, ...updates } : a
          )
        }
      })),

      // Notifications
      notifications: [],
      
      addNotification: (notification) => set((state) => ({
        notifications: [...state.notifications, { ...notification, id: uuidv4(), timestamp: new Date().toISOString() }]
      })),

      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),

      clearNotifications: () => set({ notifications: [] }),

      // Statistics
      stats: {
        totalSearches: 0,
        totalNewsProcessed: 0,
        totalPublished: 0,
        apiCallsToday: 0
      },

      incrementStat: (stat) => set((state) => ({
        stats: {
          ...state.stats,
          [stat]: state.stats[stat] + 1
        }
      })),

      resetDailyStats: () => set((state) => ({
        stats: {
          ...state.stats,
          apiCallsToday: 0
        }
      }))
    }),
    {
      name: 'rt-news-intelligence-storage',
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        apiKeys: state.apiKeys,
        activeKeyIndex: state.activeKeyIndex,
        selectedModel: state.selectedModel,
        activeProvider: state.activeProvider,
        publishInterval: state.publishInterval,
        socialAccounts: state.socialAccounts,
        excludedDomains: state.excludedDomains,
        newsArchive: state.newsArchive.slice(-1000) // Keep last 1000 items
      })
    }
  )
);

export default useStore;
