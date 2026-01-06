import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Twitter,
  Facebook,
  Send,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import useStore from '../store/useStore';
import publishService from '../services/publishService';

const platforms = [
  {
    id: 'twitter',
    name: 'Twitter / X',
    icon: Twitter,
    color: 'blue',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'apiSecret', label: 'API Secret', type: 'password' },
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'accessSecret', label: 'Access Token Secret', type: 'password' }
    ]
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'blue',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'pageId', label: 'Page/Group ID', type: 'text' },
      { key: 'type', label: 'النوع', type: 'select', options: [
        { value: 'page', label: 'صفحة' },
        { value: 'group', label: 'مجموعة' }
      ]}
    ]
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: Send,
    color: 'blue',
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password' },
      { key: 'chatId', label: 'Chat ID', type: 'text' }
    ]
  }
];

function SocialAccounts() {
  const {
    socialAccounts,
    addSocialAccount,
    removeSocialAccount,
    addNotification
  } = useStore();

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('telegram');
  const [formData, setFormData] = useState({});
  const [accountName, setAccountName] = useState('');
  const [testingAccount, setTestingAccount] = useState(null);

  const handleAddAccount = () => {
    const platform = platforms.find(p => p.id === selectedPlatform);
    const missingFields = platform.fields.filter(f => !formData[f.key]);
    
    if (missingFields.length > 0) {
      addNotification({
        type: 'error',
        message: `الرجاء ملء جميع الحقول المطلوبة`
      });
      return;
    }

    addSocialAccount(selectedPlatform, {
      ...formData,
      name: accountName || `حساب ${socialAccounts[selectedPlatform].length + 1}`,
      platform: selectedPlatform
    });

    setFormData({});
    setAccountName('');
    setShowAddAccount(false);
    
    addNotification({
      type: 'success',
      message: 'تمت إضافة الحساب بنجاح'
    });
  };

  const handleTestAccount = async (platform, account) => {
    setTestingAccount(account.id);
    
    try {
      let result;
      
      if (platform === 'telegram') {
        result = await publishService.testTelegramBot(account.botToken, account.chatId);
      } else if (platform === 'facebook') {
        result = await publishService.testFacebookPage(account.accessToken, account.pageId);
      } else {
        result = { success: false, message: 'اختبار غير متاح لهذه المنصة' };
      }
      
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
      setTestingAccount(null);
    }
  };

  const handleDeleteAccount = (platform, accountId) => {
    removeSocialAccount(platform, accountId);
    addNotification({
      type: 'info',
      message: 'تم حذف الحساب'
    });
  };

  const totalAccounts = Object.values(socialAccounts).reduce((sum, accounts) => sum + accounts.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Share2 className="w-8 h-8 text-neon-blue" />
          حسابات التواصل الاجتماعي
        </h1>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddAccount(true)}
          className="btn-neon-green flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          إضافة حساب
        </motion.button>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-3d p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold gradient-text">{totalAccounts}</p>
            <p className="text-sm text-gray-400">إجمالي الحسابات</p>
          </div>
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <div key={platform.id} className="text-center">
                <p className="text-3xl font-bold">{socialAccounts[platform.id].length}</p>
                <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
                  <Icon className="w-4 h-4" />
                  {platform.name}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Platform Sections */}
      {platforms.map((platform) => {
        const Icon = platform.icon;
        const accounts = socialAccounts[platform.id];
        
        return (
          <motion.div
            key={platform.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-3d p-6"
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Icon className="w-5 h-5 text-neon-blue" />
              {platform.name}
              <span className="text-sm text-gray-400">({accounts.length} حساب)</span>
            </h3>

            {accounts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد حسابات {platform.name}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account, index) => (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-neon-blue" />
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-gray-400">
                          {platform.id === 'telegram' && `Chat ID: ${account.chatId}`}
                          {platform.id === 'facebook' && `${account.type === 'page' ? 'صفحة' : 'مجموعة'}: ${account.pageId}`}
                          {platform.id === 'twitter' && 'Twitter Account'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleTestAccount(platform.id, account)}
                        disabled={testingAccount === account.id}
                        className="p-2 hover:bg-white/10 rounded text-neon-green"
                        title="اختبار الاتصال"
                      >
                        {testingAccount === account.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Check className="w-5 h-5" />
                        )}
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteAccount(platform.id, account.id)}
                        className="p-2 hover:bg-white/10 rounded text-neon-red"
                        title="حذف"
                      >
                        <Trash2 className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Add Account Modal */}
      <AnimatePresence>
        {showAddAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddAccount(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card-3d p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">إضافة حساب جديد</h3>
                <button
                  onClick={() => setShowAddAccount(false)}
                  className="p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    المنصة
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {platforms.map((platform) => {
                      const Icon = platform.icon;
                      const isSelected = selectedPlatform === platform.id;
                      
                      return (
                        <motion.button
                          key={platform.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSelectedPlatform(platform.id);
                            setFormData({});
                          }}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-neon-blue bg-neon-blue/10'
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mx-auto mb-1 ${isSelected ? 'text-neon-blue' : ''}`} />
                          <p className="text-xs">{platform.name}</p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Account Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    اسم الحساب (اختياري)
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="مثال: حساب الأخبار"
                    className="input-neon"
                  />
                </div>

                {/* Platform Fields */}
                {platforms.find(p => p.id === selectedPlatform)?.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="select-neon"
                      >
                        <option value="">اختر...</option>
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="input-neon"
                      />
                    )}
                  </div>
                ))}

                {/* Help Text */}
                <div className="p-3 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
                  <p className="text-sm text-neon-blue flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {selectedPlatform === 'telegram' && (
                        <>
                          أنشئ بوت من @BotFather واحصل على Token.
                          <br />
                          Chat ID: أرسل رسالة للبوت ثم استخدم api.telegram.org/bot[TOKEN]/getUpdates
                        </>
                      )}
                      {selectedPlatform === 'facebook' && (
                        <>
                          احصل على Access Token من developers.facebook.com
                          <br />
                          تأكد من صلاحيات pages_manage_posts
                        </>
                      )}
                      {selectedPlatform === 'twitter' && (
                        <>
                          احصل على المفاتيح من developer.twitter.com
                          <br />
                          تأكد من تفعيل OAuth 1.0a
                        </>
                      )}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddAccount}
                  className="btn-neon-green flex-1"
                >
                  <Plus className="w-5 h-5 inline ml-2" />
                  إضافة
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddAccount(false)}
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

export default SocialAccounts;
