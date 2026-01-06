import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Send,
  Clock,
  Play,
  Pause,
  Trash2,
  Edit3,
  GripVertical,
  Check,
  X,
  Zap,
  Image as ImageIcon,
  ExternalLink,
  Settings
} from 'lucide-react';
import useStore from '../store/useStore';
import publishService from '../services/publishService';

function PublishQueue() {
  const {
    publishQueue,
    removeFromPublishQueue,
    updatePostStatus,
    updatePost,
    publishInterval,
    setPublishInterval,
    isPublishing,
    setIsPublishing,
    publishImmediately,
    socialAccounts,
    addNotification,
    incrementStat
  } = useStore();

  const [editingPost, setEditingPost] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const pendingPosts = publishQueue.filter(p => p.status === 'pending');
  const publishedPosts = publishQueue.filter(p => p.status === 'published');

  useEffect(() => {
    let interval;
    if (isPublishing && countdown !== null) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return publishInterval * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPublishing, publishInterval, countdown]);

  const startPublishing = () => {
    if (pendingPosts.length === 0) {
      addNotification({
        type: 'error',
        message: 'لا توجد منشورات في الانتظار'
      });
      return;
    }

    const allAccounts = [
      ...socialAccounts.twitter,
      ...socialAccounts.facebook,
      ...socialAccounts.telegram
    ];

    if (allAccounts.length === 0) {
      addNotification({
        type: 'error',
        message: 'الرجاء إضافة حساب تواصل اجتماعي أولاً'
      });
      return;
    }

    setIsPublishing(true);
    setCountdown(publishInterval * 60);

    publishService.startScheduledPublishing(
      pendingPosts,
      allAccounts,
      publishInterval,
      (postId, results) => {
        const success = results.some(r => r.success);
        updatePostStatus(postId, success ? 'published' : 'failed');
        if (success) {
          incrementStat('totalPublished');
          addNotification({
            type: 'success',
            message: 'تم نشر المنشور بنجاح'
          });
        } else {
          addNotification({
            type: 'error',
            message: 'فشل نشر المنشور'
          });
        }
      },
      () => {
        setIsPublishing(false);
        setCountdown(null);
        addNotification({
          type: 'info',
          message: 'اكتمل النشر المجدول'
        });
      }
    );
  };

  const stopPublishing = () => {
    publishService.stopScheduledPublishing();
    setIsPublishing(false);
    setCountdown(null);
    addNotification({
      type: 'info',
      message: 'تم إيقاف النشر المجدول'
    });
  };

  const handleInstantPublish = () => {
    publishImmediately();
    addNotification({
      type: 'info',
      message: 'جاري النشر الفوري...'
    });
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Send className="w-8 h-8 text-neon-green" />
          قائمة النشر
        </h1>
        
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSettings(!showSettings)}
            className="btn-neon px-4 py-2 flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            الإعدادات
          </motion.button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card-3d p-6"
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-neon-blue" />
              إعدادات النشر المجدول
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  الفاصل الزمني بين المنشورات (بالدقائق)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={publishInterval}
                  onChange={(e) => setPublishInterval(parseInt(e.target.value) || 5)}
                  className="input-neon"
                />
              </div>
              
              <div className="flex items-end">
                <p className="text-gray-400 text-sm">
                  سيتم نشر منشور كل {publishInterval} دقيقة
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-3d p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold neon-text-blue">{pendingPosts.length}</p>
              <p className="text-sm text-gray-400">في الانتظار</p>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-bold neon-text-green">{publishedPosts.length}</p>
              <p className="text-sm text-gray-400">تم النشر</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isPublishing && countdown !== null && (
              <div className="px-4 py-2 rounded-xl bg-neon-blue/20 border border-neon-blue/30">
                <p className="text-neon-blue font-mono text-lg">
                  {formatCountdown(countdown)}
                </p>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleInstantPublish}
              disabled={pendingPosts.length === 0}
              className="btn-neon-pink px-6 py-3 flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              نشر فوري
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isPublishing ? stopPublishing : startPublishing}
              disabled={pendingPosts.length === 0}
              className={`px-6 py-3 flex items-center gap-2 ${
                isPublishing ? 'btn-neon-pink' : 'btn-neon-green'
              }`}
            >
              {isPublishing ? (
                <>
                  <Pause className="w-5 h-5" />
                  إيقاف
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  بدء النشر المجدول
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Queue List */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">المنشورات في الانتظار</h3>
        
        {pendingPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-3d p-12 text-center"
          >
            <Send className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
            <p className="text-gray-400 text-lg">لا توجد منشورات في الانتظار</p>
            <p className="text-gray-500 text-sm mt-2">
              ابحث عن أخبار وأضفها إلى قائمة النشر
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {pendingPosts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                index={index}
                onEdit={() => setEditingPost(post)}
                onDelete={() => removeFromPublishQueue(post.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Published Posts */}
      {publishedPosts.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-neon-green">تم النشر</h3>
          <div className="space-y-3">
            {publishedPosts.slice(0, 10).map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card-3d p-4 opacity-70"
              >
                <div className="flex items-center gap-4">
                  <Check className="w-6 h-6 text-neon-green" />
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1">{post.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(post.publishedAt).toLocaleString('ar-EG')}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingPost && (
          <EditPostModal
            post={editingPost}
            onSave={(updates) => {
              updatePost(editingPost.id, updates);
              setEditingPost(null);
              addNotification({
                type: 'success',
                message: 'تم تحديث المنشور'
              });
            }}
            onClose={() => setEditingPost(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PostCard({ post, index, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card-3d p-4 group"
    >
      <div className="flex gap-4">
        <div className="flex items-center">
          <GripVertical className="w-5 h-5 text-gray-500 cursor-grab" />
        </div>

        {post.image && (
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={post.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-neon-blue line-clamp-1">{post.title}</h4>
          <p className="text-sm text-gray-400 line-clamp-2 mt-1">{post.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{post.source}</span>
            <span>{new Date(post.createdAt).toLocaleString('ar-EG')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-white/10 text-neon-blue"
          >
            <Edit3 className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-white/10 text-neon-red"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function EditPostModal({ post, onSave, onClose }) {
  const [title, setTitle] = useState(post.title);
  const [description, setDescription] = useState(post.description);
  const [content, setContent] = useState(post.content);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card-3d p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">تعديل المنشور</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              العنوان
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-neon"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              الوصف
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input-neon resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              المحتوى
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="input-neon resize-none"
            />
          </div>

          {post.image && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                الصورة
              </label>
              <img
                src={post.image}
                alt=""
                className="w-full h-48 object-cover rounded-xl"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSave({ title, description, content })}
            className="btn-neon-green flex-1"
          >
            <Check className="w-5 h-5 inline ml-2" />
            حفظ التغييرات
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="btn-neon px-6"
          >
            إلغاء
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default PublishQueue;
