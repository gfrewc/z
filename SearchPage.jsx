import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Clock,
  Globe,
  ExternalLink,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  FileText,
  Plus,
  Check,
  X,
  AlertCircle,
  Zap,
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  Trash2
} from 'lucide-react';
import useStore from '../store/useStore';
import aiService from '../services/aiService';
import searchService from '../services/searchService';

const timeRanges = [
  { value: '1h', label: 'آخر ساعة' },
  { value: '2h', label: 'آخر ساعتين' },
  { value: '6h', label: 'آخر 6 ساعات' },
  { value: '12h', label: 'آخر 12 ساعة' },
  { value: '24h', label: 'آخر 24 ساعة' },
  { value: '7d', label: 'آخر أسبوع' }
];

function SearchPage() {
  const {
    searchQuery,
    setSearchQuery,
    searchTimeRange,
    setSearchTimeRange,
    isSearching,
    setIsSearching,
    excludedDomains,
    addExcludedDomain,
    removeExcludedDomain,
    isNewsDuplicate,
    addToArchive,
    addToPublishQueue,
    apiKeys,
    activeProvider,
    selectedModel,
    activeKeyIndex,
    rotateApiKey,
    addNotification,
    incrementStat,
    // استخدام الـ store لحفظ النتائج
    foundResults,
    setFoundResults,
    clearFoundResults,
    processedNews,
    addProcessedNews,
    clearProcessedNews,
    autoAddToQueue,
    setAutoAddToQueue,
    maxResults,
    setMaxResults
  } = useStore();

  const [processingUrls, setProcessingUrls] = useState(new Set());
  const [newDomain, setNewDomain] = useState('');
  const [error, setError] = useState(null);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const stopProcessingRef = useRef(false);

  // البحث التلقائي وجلب النتائج
  const handleAutoSearch = async () => {
    if (!searchQuery.trim()) {
      setError('الرجاء إدخال كلمة البحث');
      return;
    }

    const keys = apiKeys[activeProvider];
    if (!keys || keys.length === 0) {
      setError('الرجاء إضافة مفتاح API أولاً من صفحة مفاتيح API');
      return;
    }

    setIsSearching(true);
    setError(null);
    clearProcessedNews();
    clearFoundResults();
    setProcessingProgress({ current: 0, total: 0 });
    stopProcessingRef.current = false;

    try {
      addNotification({
        type: 'info',
        message: `جاري البحث عن "${searchQuery}" في آخر ${timeRanges.find(t => t.value === searchTimeRange)?.label || searchTimeRange}...`
      });

      // جلب نتائج البحث من Google News RSS
      const results = await searchService.searchAndFetchNews(
        searchQuery,
        searchTimeRange,
        excludedDomains,
        maxResults
      );

      if (results.length === 0) {
        // إذا لم نجد نتائج، نفتح البحث في المتصفح
        const searchData = await searchService.searchNews(searchQuery, searchTimeRange, excludedDomains);
        if (window.electronAPI) {
          window.electronAPI.openInEdge(searchData.searchUrl);
        } else {
          window.open(searchData.searchUrl, '_blank');
        }
        addNotification({
          type: 'info',
          message: 'لم يتم العثور على نتائج في الفترة المحددة، تم فتح البحث في المتصفح'
        });
        setIsSearching(false);
        return;
      }

      setFoundResults(results);
      addNotification({
        type: 'success',
        message: `تم العثور على ${results.length} خبر في الفترة المحددة، جاري المعالجة...`
      });

      incrementStat('totalSearches');

      // بدء المعالجة التلقائية
      await processAllResults(results);

    } catch (err) {
      setError(err.message);
      addNotification({
        type: 'error',
        message: `خطأ في البحث: ${err.message}`
      });
    } finally {
      setIsSearching(false);
      setAutoProcessing(false);
    }
  };

  // معالجة جميع النتائج تلقائياً
  const processAllResults = async (results) => {
    setAutoProcessing(true);
    setProcessingProgress({ current: 0, total: results.length });

    const keys = apiKeys[activeProvider];
    const activeKey = keys[activeKeyIndex[activeProvider]]?.key;

    // تهيئة خدمة الذكاء الاصطناعي
    if (activeProvider === 'gemini') {
      aiService.initGemini(activeKey);
    } else if (activeProvider === 'groq') {
      aiService.initGroq(activeKey);
    } else if (activeProvider === 'huggingface') {
      aiService.initHuggingFace(activeKey);
    }
    aiService.setProvider(activeProvider);

    let processedCount = 0;

    for (let i = 0; i < results.length; i++) {
      // التحقق من طلب الإيقاف
      if (stopProcessingRef.current) {
        addNotification({
          type: 'info',
          message: `تم إيقاف المعالجة بعد ${processedCount} خبر`
        });
        break;
      }

      const result = results[i];
      setProcessingProgress({ current: i + 1, total: results.length });

      try {
        // استخراج محتوى المقال
        addNotification({
          type: 'info',
          message: `جاري معالجة الخبر ${i + 1}/${results.length}...`
        });

        const article = await searchService.extractArticleContent(result.url);

        // التحقق من التكرار
        if (isNewsDuplicate(article.title, article.content)) {
          addNotification({
            type: 'info',
            message: `تم تخطي خبر مكرر: ${article.title.substring(0, 40)}...`
          });
          continue;
        }

        // إعادة صياغة الخبر
        const rewritten = await aiService.rewriteNews(
          article.title,
          article.content,
          selectedModel[activeProvider],
          () => rotateApiKey(activeProvider),
          {
            location: article.location,
            publishDate: article.publishDate
          }
        );

        const processedArticle = {
          id: Date.now() + i,
          originalUrl: result.url,
          originalTitle: article.title,
          originalContent: article.content,
          title: rewritten.title,
          description: rewritten.description,
          content: rewritten.content,
          image: article.image,
          source: article.source,
          location: article.location || rewritten.location,
          publishDate: article.publishDate || rewritten.publishDate,
          processedAt: new Date().toISOString()
        };

        // إضافة للـ store (محفوظة)
        addProcessedNews(processedArticle);
        addToArchive(processedArticle);
        incrementStat('totalNewsProcessed');
        processedCount++;

        // إضافة تلقائية لقائمة النشر مع كل البيانات
        if (autoAddToQueue) {
          addToPublishQueue({
            title: processedArticle.title,
            description: processedArticle.description,
            content: processedArticle.content,
            image: processedArticle.image,
            source: processedArticle.source,
            location: processedArticle.location,
            publishDate: processedArticle.publishDate,
            originalUrl: processedArticle.originalUrl
          });
        }

        addNotification({
          type: 'success',
          message: `✅ تم معالجة ونشر: ${rewritten.title.substring(0, 40)}...`
        });

        // تأخير قصير بين الطلبات
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (err) {
        console.error(`Error processing ${result.url}:`, err);
        addNotification({
          type: 'error',
          message: `❌ فشل معالجة خبر: ${err.message}`
        });
        // الاستمرار في المعالجة رغم الخطأ
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setAutoProcessing(false);
    if (!stopProcessingRef.current) {
      addNotification({
        type: 'success',
        message: `🎉 تم الانتهاء من معالجة ${processedCount} خبر وإضافتهم لقائمة النشر!`
      });
    }
  };

  // البحث العادي (فتح في المتصفح)
  const handleManualSearch = async () => {
    if (!searchQuery.trim()) {
      setError('الرجاء إدخال كلمة البحث');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchData = await searchService.searchNews(searchQuery, searchTimeRange, excludedDomains);
      
      if (window.electronAPI) {
        window.electronAPI.openInEdge(searchData.searchUrl);
      } else {
        window.open(searchData.searchUrl, '_blank');
      }

      addNotification({
        type: 'info',
        message: `تم فتح البحث عن "${searchQuery}" في المتصفح`
      });

      incrementStat('totalSearches');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const processArticle = async (url) => {
    if (processingUrls.has(url)) return;

    const keys = apiKeys[activeProvider];
    if (!keys || keys.length === 0) {
      setError('الرجاء إضافة مفتاح API أولاً');
      return;
    }

    setProcessingUrls(prev => new Set([...prev, url]));
    setError(null);

    try {
      const article = await searchService.extractArticleContent(url);

      if (isNewsDuplicate(article.title, article.content)) {
        addNotification({
          type: 'info',
          message: 'تم تخطي هذا الخبر - موجود مسبقاً في الأرشيف'
        });
        setProcessingUrls(prev => {
          const newSet = new Set(prev);
          newSet.delete(url);
          return newSet;
        });
        return;
      }

      const activeKey = keys[activeKeyIndex[activeProvider]]?.key;
      if (activeProvider === 'gemini') {
        aiService.initGemini(activeKey);
      } else if (activeProvider === 'groq') {
        aiService.initGroq(activeKey);
      } else if (activeProvider === 'huggingface') {
        aiService.initHuggingFace(activeKey);
      }
      aiService.setProvider(activeProvider);

      const rewritten = await aiService.rewriteNews(
        article.title,
        article.content,
        selectedModel[activeProvider],
        () => rotateApiKey(activeProvider),
        {
          location: article.location,
          publishDate: article.publishDate
        }
      );

      const processedArticle = {
        id: Date.now(),
        originalUrl: url,
        originalTitle: article.title,
        originalContent: article.content,
        title: rewritten.title,
        description: rewritten.description,
        content: rewritten.content,
        image: article.image,
        source: article.source,
        location: article.location || rewritten.location,
        publishDate: article.publishDate || rewritten.publishDate,
        processedAt: new Date().toISOString()
      };

      // إضافة للـ store (محفوظة)
      addProcessedNews(processedArticle);
      addToArchive(processedArticle);
      incrementStat('totalNewsProcessed');

      if (autoAddToQueue) {
        addToPublishQueue({
          title: processedArticle.title,
          description: processedArticle.description,
          content: processedArticle.content,
          image: processedArticle.image,
          source: processedArticle.source,
          location: processedArticle.location,
          publishDate: processedArticle.publishDate,
          originalUrl: processedArticle.originalUrl
        });
      }

      addNotification({
        type: 'success',
        message: `تم معالجة الخبر: ${rewritten.title.substring(0, 50)}...`
      });
    } catch (err) {
      setError(err.message);
      addNotification({
        type: 'error',
        message: `خطأ في معالجة المقال: ${err.message}`
      });
    } finally {
      setProcessingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  };

  const addToQueue = (news) => {
    addToPublishQueue({
      title: news.title,
      description: news.description,
      content: news.content,
      image: news.image,
      source: news.source,
      location: news.location,
      publishDate: news.publishDate,
      originalUrl: news.originalUrl
    });

    addNotification({
      type: 'success',
      message: 'تمت إضافة الخبر إلى قائمة النشر'
    });
  };

  const handleAddDomain = () => {
    if (newDomain.trim()) {
      addExcludedDomain(newDomain.trim().toLowerCase());
      setNewDomain('');
    }
  };

  const stopProcessing = () => {
    stopProcessingRef.current = true;
    setAutoProcessing(false);
    addNotification({
      type: 'info',
      message: 'جاري إيقاف المعالجة...'
    });
  };

  const clearResults = () => {
    clearProcessedNews();
    clearFoundResults();
    addNotification({
      type: 'info',
      message: 'تم مسح النتائج'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Search className="w-8 h-8 text-neon-blue" />
          البحث الذكي عن الأخبار
        </h1>
        <div className="flex items-center gap-3">
          {(processedNews.length > 0 || foundResults.length > 0) && !autoProcessing && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearResults}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-red/20 border border-neon-red/30 text-neon-red hover:bg-neon-red/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              مسح النتائج
            </motion.button>
          )}
          {autoProcessing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green/20 border border-neon-green/30"
            >
              <Loader2 className="w-5 h-5 animate-spin text-neon-green" />
              <span className="text-neon-green">
                جاري المعالجة: {processingProgress.current}/{processingProgress.total}
              </span>
              <button
                onClick={stopProcessing}
                className="p-1 hover:bg-neon-red/20 rounded-lg transition-colors"
              >
                <Pause className="w-4 h-4 text-neon-red" />
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Search Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-3d p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              كلمة البحث
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAutoSearch()}
                placeholder="مثال: أخبار إيران، الشرق الأوسط، غزة..."
                className="input-neon pr-12"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              <Clock className="w-4 h-4 inline ml-1" />
              الفترة الزمنية
            </label>
            <select
              value={searchTimeRange}
              onChange={(e) => setSearchTimeRange(e.target.value)}
              className="select-neon"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max Results */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              <FileText className="w-4 h-4 inline ml-1" />
              عدد النتائج
            </label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="select-neon"
            >
              <option value={5}>5 أخبار</option>
              <option value={10}>10 أخبار</option>
              <option value={15}>15 خبر</option>
              <option value={20}>20 خبر</option>
            </select>
          </div>
        </div>

        {/* Options */}
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoAddToQueue}
              onChange={(e) => setAutoAddToQueue(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-dark-700 text-neon-green focus:ring-neon-green"
            />
            <span className="text-sm text-gray-300">إضافة تلقائية لقائمة النشر</span>
          </label>
        </div>

        {/* Search Buttons */}
        <div className="mt-6 flex gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAutoSearch}
            disabled={isSearching || autoProcessing}
            className="btn-neon flex-1 flex items-center justify-center gap-2"
          >
            {isSearching || autoProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                بحث ومعالجة تلقائية
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleManualSearch}
            disabled={isSearching}
            className="btn-neon-pink px-6 flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            فتح في المتصفح
          </motion.button>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 rounded-xl bg-neon-red/10 border border-neon-red/30 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-neon-red" />
              <p className="text-neon-red">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Found Results Preview */}
      <AnimatePresence>
        {foundResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card-3d p-6"
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-neon-blue" />
              النتائج المكتشفة ({foundResults.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {foundResults.map((result, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-dark-700/50 border border-white/5 flex items-center gap-3"
                >
                  {processingProgress.current > index ? (
                    <CheckCircle2 className="w-5 h-5 text-neon-green flex-shrink-0" />
                  ) : processingProgress.current === index && autoProcessing ? (
                    <Loader2 className="w-5 h-5 text-neon-blue animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-gray-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{result.title}</p>
                    <p className="text-xs text-gray-500">{result.source} • {result.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Excluded Domains */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-3d p-6"
      >
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-neon-pink" />
          المواقع المستبعدة
        </h3>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
            placeholder="أضف موقع للاستبعاد (مثال: example.com)"
            className="input-neon flex-1"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddDomain}
            className="btn-neon-pink px-4"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="flex flex-wrap gap-2">
          {excludedDomains.map((domain) => (
            <motion.span
              key={domain}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="px-3 py-1 rounded-full bg-neon-pink/20 border border-neon-pink/30 text-sm flex items-center gap-2"
            >
              {domain}
              <button
                onClick={() => removeExcludedDomain(domain)}
                className="hover:text-neon-red transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.span>
          ))}
          {excludedDomains.length === 0 && (
            <p className="text-gray-400 text-sm">لا توجد مواقع مستبعدة</p>
          )}
        </div>
      </motion.div>

      {/* Manual URL Processing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-3d p-6"
      >
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-neon-green" />
          معالجة رابط مباشر
        </h3>
        
        <ManualUrlProcessor onProcess={processArticle} isProcessing={processingUrls.size > 0} />
      </motion.div>

      {/* Processed News */}
      <AnimatePresence>
        {processedNews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <FileText className="w-6 h-6 text-neon-blue" />
                الأخبار المعالجة ({processedNews.length})
              </h3>
              {!autoAddToQueue && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    processedNews.forEach(news => addToQueue(news));
                    addNotification({
                      type: 'success',
                      message: `تمت إضافة ${processedNews.length} خبر لقائمة النشر`
                    });
                  }}
                  className="btn-neon-green text-sm px-4 py-2 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة الكل لقائمة النشر
                </motion.button>
              )}
            </div>

            {processedNews.map((news, index) => (
              <motion.div
                key={news.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card-3d p-6"
              >
                <div className="flex gap-4">
                  {news.image && (
                    <div className="w-40 h-32 rounded-xl overflow-hidden flex-shrink-0 bg-dark-700">
                      <img
                        src={news.image}
                        alt={news.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-500"><svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg text-neon-blue mb-2 leading-relaxed">
                      {news.title}
                    </h4>
                    
                    {/* Location and Date */}
                    <div className="flex items-center gap-4 mb-2 text-sm text-gray-400">
                      {news.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {news.location}
                        </span>
                      )}
                      {news.publishDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {news.publishDate}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-3 leading-relaxed">
                      {news.description}
                    </p>
                    <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">
                      {news.content}
                    </p>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-dark-700">
                          المصدر: {news.source}
                        </span>
                        <a
                          href={news.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-neon-blue hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          الرابط الأصلي
                        </a>
                      </div>
                      
                      {!autoAddToQueue && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => addToQueue(news)}
                          className="btn-neon-green text-sm px-4 py-2 flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          إضافة لقائمة النشر
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ManualUrlProcessor({ onProcess, isProcessing }) {
  const [url, setUrl] = useState('');

  const handleProcess = () => {
    if (url.trim()) {
      onProcess(url.trim());
      setUrl('');
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleProcess()}
        placeholder="الصق رابط المقال هنا..."
        className="input-neon flex-1"
      />
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleProcess}
        disabled={isProcessing || !url.trim()}
        className="btn-neon-green px-6 flex items-center gap-2"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <RefreshCw className="w-5 h-5" />
            معالجة
          </>
        )}
      </motion.button>
    </div>
  );
}

export default SearchPage;
