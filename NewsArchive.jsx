import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Archive,
  Search,
  Trash2,
  ExternalLink,
  Calendar,
  Globe,
  Filter,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import useStore from '../store/useStore';

function NewsArchive() {
  const { newsArchive, clearArchive, addNotification } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedNews, setExpandedNews] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredNews = useMemo(() => {
    let filtered = [...newsArchive];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(news => 
        news.title?.toLowerCase().includes(term) ||
        news.content?.toLowerCase().includes(term) ||
        news.source?.toLowerCase().includes(term)
      );
    }
    
    filtered.sort((a, b) => {
      const dateA = new Date(a.archivedAt || 0);
      const dateB = new Date(b.archivedAt || 0);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  }, [newsArchive, searchTerm, sortOrder]);

  const handleClearArchive = () => {
    clearArchive();
    setShowClearConfirm(false);
    addNotification({
      type: 'success',
      message: 'تم مسح الأرشيف بنجاح'
    });
  };

  const toggleExpand = (id) => {
    setExpandedNews(expandedNews === id ? null : id);
  };

  // Group by source
  const sourceStats = useMemo(() => {
    const stats = {};
    newsArchive.forEach(news => {
      const source = news.source || 'غير معروف';
      stats[source] = (stats[source] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [newsArchive]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Archive className="w-8 h-8 text-neon-purple" />
          أرشيف الأخبار
        </h1>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowClearConfirm(true)}
          disabled={newsArchive.length === 0}
          className="btn-neon-pink flex items-center gap-2"
        >
          <Trash2 className="w-5 h-5" />
          مسح الأرشيف
        </motion.button>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-3d p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold gradient-text">{newsArchive.length}</p>
            <p className="text-sm text-gray-400 mt-1">إجمالي الأخبار</p>
          </div>
          
          <div className="md:col-span-2">
            <h4 className="text-sm font-medium text-gray-400 mb-3">أكثر المصادر</h4>
            <div className="flex flex-wrap gap-2">
              {sourceStats.map(([source, count]) => (
                <span
                  key={source}
                  className="px-3 py-1 rounded-full bg-neon-blue/20 border border-neon-blue/30 text-sm"
                >
                  {source}: {count}
                </span>
              ))}
              {sourceStats.length === 0 && (
                <span className="text-gray-500">لا توجد بيانات</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search & Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-3d p-4"
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث في الأرشيف..."
              className="input-neon pr-10"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="btn-neon flex items-center gap-2"
          >
            <Filter className="w-5 h-5" />
            {sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}
          </motion.button>
        </div>
      </motion.div>

      {/* News List */}
      {filteredNews.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-3d p-12 text-center"
        >
          <Archive className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <p className="text-gray-400 text-lg">
            {searchTerm ? 'لا توجد نتائج للبحث' : 'الأرشيف فارغ'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredNews.map((news, index) => (
            <motion.div
              key={news.archivedAt + index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="card-3d overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleExpand(news.archivedAt + index)}
              >
                <div className="flex items-start gap-4">
                  {news.image && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={news.image}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-neon-blue line-clamp-1">{news.title}</h4>
                    <p className="text-sm text-gray-400 line-clamp-1 mt-1">
                      {news.description || news.content?.substring(0, 100)}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {news.source}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(news.archivedAt).toLocaleString('ar-EG')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    {expandedNews === news.archivedAt + index ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedNews === news.archivedAt + index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/10"
                  >
                    <div className="p-4 space-y-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-400 mb-2">المحتوى المعاد صياغته</h5>
                        <p className="text-sm whitespace-pre-wrap">{news.content}</p>
                      </div>
                      
                      {news.originalTitle && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-400 mb-2">العنوان الأصلي</h5>
                          <p className="text-sm text-gray-300">{news.originalTitle}</p>
                        </div>
                      )}
                      
                      {news.originalUrl && (
                        <a
                          href={news.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-neon-blue hover:underline text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          عرض المصدر الأصلي
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card-3d p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-neon-red/20 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-neon-red" />
                </div>
                <h3 className="text-xl font-bold mb-2">تأكيد مسح الأرشيف</h3>
                <p className="text-gray-400 mb-6">
                  سيتم حذف {newsArchive.length} خبر من الأرشيف. هذا الإجراء لا يمكن التراجع عنه.
                </p>
                
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClearArchive}
                    className="btn-neon-pink flex-1"
                  >
                    نعم، امسح الأرشيف
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowClearConfirm(false)}
                    className="btn-neon flex-1"
                  >
                    إلغاء
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NewsArchive;
