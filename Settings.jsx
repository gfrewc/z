import React from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Palette,
  Type,
  Monitor,
  Moon,
  Sun,
  Zap,
  Flame,
  Leaf,
  Star,
  Check
} from 'lucide-react';
import useStore from '../store/useStore';

const themes = [
  { id: 'cyber', name: 'سايبر', icon: Zap, colors: ['#00f3ff', '#ff00ff', '#00ff88'] },
  { id: 'fire', name: 'ناري', icon: Flame, colors: ['#ff8800', '#ff0044', '#ffff00'] },
  { id: 'matrix', name: 'ماتريكس', icon: Leaf, colors: ['#00ff88', '#00f3ff', '#88ff00'] },
  { id: 'galaxy', name: 'مجرة', icon: Star, colors: ['#8800ff', '#ff00ff', '#00f3ff'] }
];

const fontSizes = [
  { id: 'sm', name: 'صغير', size: '14px' },
  { id: 'md', name: 'متوسط', size: '16px' },
  { id: 'lg', name: 'كبير', size: '18px' },
  { id: 'xl', name: 'كبير جداً', size: '20px' },
  { id: '2xl', name: 'ضخم', size: '22px' }
];

function Settings() {
  const { theme, setTheme, fontSize, setFontSize, addNotification } = useStore();

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    addNotification({
      type: 'success',
      message: `تم تغيير الثيم إلى ${themes.find(t => t.id === newTheme)?.name}`
    });
  };

  const handleFontSizeChange = (newSize) => {
    setFontSize(newSize);
    document.documentElement.style.setProperty('--font-size-base', fontSizes.find(f => f.id === newSize)?.size);
    addNotification({
      type: 'success',
      message: `تم تغيير حجم الخط إلى ${fontSizes.find(f => f.id === newSize)?.name}`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-neon-yellow" />
          الإعدادات
        </h1>
      </div>

      {/* Theme Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-3d p-6"
      >
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-neon-pink" />
          الثيم والمظهر
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.id;
            
            return (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleThemeChange(t.id)}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-white shadow-lg'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                {isActive && (
                  <div className="absolute top-2 left-2">
                    <Check className="w-5 h-5 text-neon-green" />
                  </div>
                )}
                
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`
                    }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <span className="font-medium">{t.name}</span>
                  
                  <div className="flex gap-1">
                    {t.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Font Size */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-3d p-6"
      >
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Type className="w-5 h-5 text-neon-blue" />
          حجم الخط
        </h3>
        
        <div className="grid grid-cols-5 gap-3">
          {fontSizes.map((size) => {
            const isActive = fontSize === size.id;
            
            return (
              <motion.button
                key={size.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleFontSizeChange(size.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-neon-blue bg-neon-blue/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <p style={{ fontSize: size.size }} className="font-bold mb-1">
                  أ
                </p>
                <p className="text-xs text-gray-400">{size.name}</p>
              </motion.button>
            );
          })}
        </div>
        
        {/* Preview */}
        <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <h4 className="text-sm font-medium text-gray-400 mb-3">معاينة</h4>
          <p style={{ fontSize: fontSizes.find(f => f.id === fontSize)?.size }}>
            هذا نص تجريبي لمعاينة حجم الخط المختار. يمكنك رؤية كيف سيظهر النص في التطبيق.
          </p>
        </div>
      </motion.div>

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-3d p-6"
      >
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-neon-green" />
          حول التطبيق
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <span className="text-gray-400">الإصدار</span>
            <span className="font-mono">2.0.0</span>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <span className="text-gray-400">المطور</span>
            <span>RT News Team</span>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <span className="text-gray-400">التقنيات</span>
            <span>React, Electron, Tailwind</span>
          </div>
        </div>
        
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-neon-blue/10 to-neon-pink/10 border border-white/10">
          <p className="text-sm text-gray-300">
            RT News Intelligence هو نظام ذكي لجمع الأخبار من مصادر متعددة، 
            إعادة صياغتها بأسلوب جذاب، ونشرها على منصات التواصل الاجتماعي المختلفة.
          </p>
        </div>
      </motion.div>

      {/* Keyboard Shortcuts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-3d p-6"
      >
        <h3 className="font-bold mb-4">اختصارات لوحة المفاتيح</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { keys: ['Ctrl', 'S'], action: 'بحث جديد' },
            { keys: ['Ctrl', 'P'], action: 'فتح قائمة النشر' },
            { keys: ['Ctrl', 'K'], action: 'إدارة المفاتيح' },
            { keys: ['Ctrl', ','], action: 'الإعدادات' },
            { keys: ['Esc'], action: 'إغلاق النافذة المنبثقة' }
          ].map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5"
            >
              <span className="text-gray-400">{shortcut.action}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <React.Fragment key={i}>
                    <kbd className="px-2 py-1 rounded bg-dark-600 text-xs font-mono">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && (
                      <span className="text-gray-500">+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default Settings;
