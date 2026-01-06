import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Plus,
  Trash2,
  Check,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import useStore from '../store/useStore';
import aiService from '../services/aiService';

const providers = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    color: 'blue',
    description: 'نماذج Gemini من Google',
    icon: '🔷'
  },
  {
    id: 'groq',
    name: 'Groq',
    color: 'green',
    description: 'نماذج سريعة من Groq',
    icon: '⚡'
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    color: 'yellow',
    description: 'نماذج مفتوحة المصدر',
    icon: '🤗'
  }
];

function ApiKeysManager() {
  const {
    apiKeys,
    addApiKey,
    removeApiKey,
    activeProvider,
    setActiveProvider,
    selectedModel,
    setSelectedModel,
    availableModels,
    updateAvailableModels,
    activeKeyIndex,
    addNotification
  } = useStore();

  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyProvider, setNewKeyProvider] = useState('gemini');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [showKeys, setShowKeys] = useState({});
  const [testingKey, setTestingKey] = useState(null);
  const [fetchingModels, setFetchingModels] = useState(null);

  const handleAddKey = () => {
    if (!newKeyValue.trim()) {
      addNotification({
        type: 'error',
        message: 'الرجاء إدخال المفتاح'
      });
      return;
    }

    addApiKey(newKeyProvider, newKeyValue.trim(), newKeyName.trim() || `مفتاح ${apiKeys[newKeyProvider].length + 1}`);
    setNewKeyValue('');
    setNewKeyName('');
    setShowAddKey(false);
    
    addNotification({
      type: 'success',
      message: 'تمت إضافة المفتاح بنجاح'
    });
  };

  const handleTestKey = async (provider, key) => {
    setTestingKey(key.id);
    
    try {
      const result = await aiService.testConnection(provider, key.key, selectedModel[provider]);
      
      addNotification({
        type: result.success ? 'success' : 'error',
        message: result.message
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.message
      });
    } finally {
      setTestingKey(null);
    }
  };

  const handleFetchModels = async (provider) => {
    const keys = apiKeys[provider];
    if (keys.length === 0) {
      addNotification({
        type: 'error',
        message: 'الرجاء إضافة مفتاح أولاً'
      });
      return;
    }

    setFetchingModels(provider);
    
    try {
      let models = [];
      const apiKey = keys[activeKeyIndex[provider]]?.key;
      
      if (provider === 'gemini') {
        models = await aiService.fetchGeminiModels(apiKey);
      } else if (provider === 'groq') {
        models = await aiService.fetchGroqModels(apiKey);
      }
      
      if (models.length > 0) {
        updateAvailableModels(provider, models);
        addNotification({
          type: 'success',
          message: `تم تحديث النماذج: ${models.length} نموذج`
        });
      } else {
        addNotification({
          type: 'info',
          message: 'لم يتم العثور على نماذج جديدة'
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.message
      });
    } finally {
      setFetchingModels(null);
    }
  };

  const toggleShowKey = (keyId) => {
    setShowKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const maskKey = (key) => {
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Key className="w-8 h-8 text-neon-pink" />
          إدارة مفاتيح API
        </h1>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddKey(true)}
          className="btn-neon-green flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          إضافة مفتاح
        </motion.button>
      </div>

      {/* Active Provider Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-3d p-6"
      >
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-neon-yellow" />
          المزود النشط
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providers.map((provider) => {
            const isActive = activeProvider === provider.id;
            const keyCount = apiKeys[provider.id].length;
            
            return (
              <motion.button
                key={provider.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveProvider(provider.id)}
                className={`p-4 rounded-xl border-2 transition-all text-right ${
                  isActive
                    ? `border-neon-${provider.color} bg-neon-${provider.color}/10 shadow-neon-${provider.color}`
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <p className="font-bold">{provider.name}</p>
                    <p className="text-xs text-gray-400">{keyCount} مفتاح</p>
                  </div>
                  {isActive && (
                    <CheckCircle className={`w-5 h-5 mr-auto text-neon-${provider.color}`} />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Provider Sections */}
      {providers.map((provider) => (
        <motion.div
          key={provider.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-3d p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <span className="text-xl">{provider.icon}</span>
              {provider.name}
              <span className="text-sm text-gray-400">({apiKeys[provider.id].length} مفتاح)</span>
            </h3>
            
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFetchModels(provider.id)}
                disabled={fetchingModels === provider.id}
                className="btn-neon text-sm px-3 py-1 flex items-center gap-1"
              >
                {fetchingModels === provider.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                تحديث النماذج
              </motion.button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              النموذج المستخدم
            </label>
            <select
              value={selectedModel[provider.id]}
              onChange={(e) => setSelectedModel(provider.id, e.target.value)}
              className="select-neon"
            >
              {availableModels[provider.id].map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {/* Keys List */}
          {apiKeys[provider.id].length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد مفاتيح لـ {provider.name}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys[provider.id].map((key, index) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border ${
                    activeKeyIndex[provider.id] === index
                      ? `border-neon-${provider.color}/50 bg-neon-${provider.color}/10`
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {activeKeyIndex[provider.id] === index && (
                        <span className={`px-2 py-0.5 rounded text-xs bg-neon-${provider.color}/20 text-neon-${provider.color}`}>
                          نشط
                        </span>
                      )}
                      <span className="font-medium">{key.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-gray-400 font-mono">
                        {showKeys[key.id] ? key.key : maskKey(key.key)}
                      </code>
                      
                      <button
                        onClick={() => toggleShowKey(key.id)}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        {showKeys[key.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleTestKey(provider.id, key)}
                        disabled={testingKey === key.id}
                        className="p-2 hover:bg-white/10 rounded text-neon-blue"
                      >
                        {testingKey === key.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeApiKey(provider.id, key.id)}
                        className="p-2 hover:bg-white/10 rounded text-neon-red"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>الاستخدام: {key.usageCount}</span>
                    {key.lastUsed && (
                      <span>آخر استخدام: {new Date(key.lastUsed).toLocaleString('ar-EG')}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      ))}

      {/* Add Key Modal */}
      <AnimatePresence>
        {showAddKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddKey(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card-3d p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">إضافة مفتاح جديد</h3>
                <button
                  onClick={() => setShowAddKey(false)}
                  className="p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    المزود
                  </label>
                  <select
                    value={newKeyProvider}
                    onChange={(e) => setNewKeyProvider(e.target.value)}
                    className="select-neon"
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    اسم المفتاح (اختياري)
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="مثال: مفتاح العمل"
                    className="input-neon"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    المفتاح
                  </label>
                  <input
                    type="password"
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    placeholder="الصق المفتاح هنا..."
                    className="input-neon font-mono"
                  />
                </div>

                <div className="p-3 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
                  <p className="text-sm text-neon-blue flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {newKeyProvider === 'gemini' && 'احصل على مفتاح من: aistudio.google.com'}
                      {newKeyProvider === 'groq' && 'احصل على مفتاح من: console.groq.com'}
                      {newKeyProvider === 'huggingface' && 'احصل على مفتاح من: huggingface.co/settings/tokens'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddKey}
                  className="btn-neon-green flex-1"
                >
                  <Plus className="w-5 h-5 inline ml-2" />
                  إضافة
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddKey(false)}
                  className="btn-neon px-6"
                >
                  إلغاء
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ApiKeysManager;
